import logging
from datetime import date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.core.database import get_db
from app.models.carbon import EmissionFactor, CarbonCalculationRecord
from app.models.block import CampusBlock
from app.schemas.carbon import (
    EmissionFactorCreate, EmissionFactorUpdate, EmissionFactorResponse,
    EmissionFactorListResponse, CarbonCalculationRequest, CarbonCalculationResponse,
    CarbonCalculationListResponse, CarbonRecalculateRequest
)
from app.services.carbon_engine import calculate_emissions, CalculationValidationError
from app.services.seed_phase5 import seed_canonical_emission_factors

logger = logging.getLogger("campuscarbon.api.carbon")

router = APIRouter(prefix="/carbon", tags=["Carbon Calculation Engine"])


# ==============================================================================
# 1. Emission Factor Catalogue Endpoints
# ==============================================================================

@router.get("/factors", response_model=EmissionFactorListResponse)
def list_emission_factors(
    category: Optional[str] = Query(None, description="Filter by category (e.g. electricity, fuels)"),
    scope: Optional[str] = Query(None, description="Filter by scope (scope_1, scope_2, scope_3)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (verified, provisional, retired)"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name or factor_code"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """List emission factors with categorization and source traceability."""
    query = db.query(EmissionFactor)

    if category:
        query = query.filter(EmissionFactor.category == category)
    if scope:
        query = query.filter(EmissionFactor.scope == scope)
    if status_filter:
        query = query.filter(EmissionFactor.status == status_filter)
    if is_active is not None:
        query = query.filter(EmissionFactor.is_active == is_active)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (EmissionFactor.name.ilike(search_fmt)) |
            (EmissionFactor.factor_code.ilike(search_fmt)) |
            (EmissionFactor.source_organization.ilike(search_fmt))
        )

    total = query.count()
    items = query.order_by(EmissionFactor.scope, EmissionFactor.category, EmissionFactor.factor_code).offset(offset).limit(limit).all()

    return EmissionFactorListResponse(items=items, total=total)


@router.get("/factors/{factor_id}", response_model=EmissionFactorResponse)
def get_emission_factor_by_id(factor_id: str, db: Session = Depends(get_db)):
    """Retrieve full metadata for a specific emission factor."""
    factor = db.query(EmissionFactor).filter(EmissionFactor.id == factor_id).first()
    if not factor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Emission factor '{factor_id}' not found.")
    return factor


@router.post("/factors", response_model=EmissionFactorResponse, status_code=status.HTTP_201_CREATED)
def create_emission_factor(payload: EmissionFactorCreate, db: Session = Depends(get_db)):
    """Create a new versioned emission factor with traceability citations."""
    existing = (
        db.query(EmissionFactor)
        .filter(
            EmissionFactor.factor_code == payload.factor_code,
            EmissionFactor.version == payload.version
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Emission factor '{payload.factor_code}' v{payload.version} already exists. Increment version for revisions."
        )

    factor = EmissionFactor(**payload.model_dump())
    db.add(factor)
    db.commit()
    db.refresh(factor)
    return factor


@router.put("/factors/{factor_id}", response_model=EmissionFactorResponse)
def update_emission_factor(factor_id: str, payload: EmissionFactorUpdate, db: Session = Depends(get_db)):
    """Update non-versioning metadata or retire an emission factor."""
    factor = db.query(EmissionFactor).filter(EmissionFactor.id == factor_id).first()
    if not factor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Emission factor '{factor_id}' not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(factor, field, val)

    db.commit()
    db.refresh(factor)
    return factor


@router.post("/factors/seed")
def seed_emission_factors_endpoint(db: Session = Depends(get_db)):
    """Idempotently seeds authoritative Indian and IPCC emission factors into PostgreSQL."""
    res = seed_canonical_emission_factors(db)
    return {
        "status": "success",
        "message": "Canonical emission factors synced successfully",
        **res
    }


# ==============================================================================
# 2. Calculation Engine Endpoints
# ==============================================================================

def _enrich_calculation_response(record: CarbonCalculationRecord, db: Session) -> CarbonCalculationResponse:
    """Helper to enrich calculation response with block metadata."""
    block = db.query(CampusBlock).filter(CampusBlock.id == record.block_id).first()
    data = CarbonCalculationResponse.model_validate(record)
    if block:
        data.block_name = block.name
        data.block_code = block.code
    return data


@router.post("/calculate", response_model=CarbonCalculationResponse, status_code=status.HTTP_201_CREATED)
def calculate_carbon_emissions(payload: CarbonCalculationRequest, db: Session = Depends(get_db)):
    """
    Executes a deterministic greenhouse gas calculation based on institutional telemetry.
    Persists immutable audit snapshot into PostgreSQL.
    """
    try:
        calc_record = calculate_emissions(
            db=db,
            block_id=payload.block_id,
            reporting_date=payload.reporting_date,
            activity_code=payload.activity_code,
            activity_record_id=payload.activity_record_id,
            electricity_source=payload.electricity_source or "auto",
            custom_quantity=payload.custom_quantity,
            custom_unit=payload.custom_unit,
            factor_id=payload.factor_id,
            notes=payload.notes,
        )
        return _enrich_calculation_response(calc_record, db)

    except CalculationValidationError as cve:
        logger.warning("Calculation rejected: %s (%s)", cve.message, cve.warning_code)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": cve.message, "warning_code": cve.warning_code}
        )
    except Exception as exc:
        logger.error("Internal calculation failure: %s", exc, exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.get("/calculations/{calculation_id}", response_model=CarbonCalculationResponse)
def get_calculation_record(calculation_id: str, db: Session = Depends(get_db)):
    """Retrieve full audit record of a past carbon calculation."""
    record = db.query(CarbonCalculationRecord).filter(CarbonCalculationRecord.id == calculation_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Calculation record '{calculation_id}' not found.")
    return _enrich_calculation_response(record, db)


@router.post("/calculations/{calculation_id}/recalculate", response_model=CarbonCalculationResponse)
def recalculate_carbon_record(
    calculation_id: str,
    payload: Optional[CarbonRecalculateRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Safely recalculates a historical calculation using updated factor or inputs.
    Marks prior record as superseded and preserves complete audit trail.
    """
    old_record = db.query(CarbonCalculationRecord).filter(CarbonCalculationRecord.id == calculation_id).first()
    if not old_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Calculation record '{calculation_id}' not found.")

    new_factor_id = payload.new_factor_id if payload else None
    notes = payload.reason if payload else "Recalculation requested via MRV audit interface."

    try:
        new_record = calculate_emissions(
            db=db,
            block_id=old_record.block_id,
            reporting_date=old_record.reporting_date,
            activity_code=old_record.activity_code,
            activity_record_id=old_record.activity_record_id,
            electricity_source=old_record.selected_reporting_source if old_record.activity_code == "ELEC_CONSUMPTION" else "auto",
            custom_quantity=old_record.reported_quantity if old_record.activity_data_type == "ad_hoc_input" else None,
            custom_unit=old_record.reported_unit if old_record.activity_data_type == "ad_hoc_input" else None,
            factor_id=new_factor_id or old_record.emission_factor_id,
            notes=notes,
            recalculating_record_id=old_record.id,
        )
        return _enrich_calculation_response(new_record, db)

    except CalculationValidationError as cve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": cve.message, "warning_code": cve.warning_code}
        )


@router.get("/calculations", response_model=CarbonCalculationListResponse)
def query_carbon_calculations(
    block_id: Optional[str] = Query(None, description="Filter by campus block"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    scope: Optional[str] = Query(None, description="Filter by scope (scope_1, scope_2, scope_3)"),
    activity_category: Optional[str] = Query(None, description="Filter by activity category"),
    include_superseded: bool = Query(False, description="Whether to include superseded calculation revisions"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Query persisted carbon calculations with institutional aggregations by scope and category."""
    query = db.query(CarbonCalculationRecord)

    if block_id:
        query = query.filter(CarbonCalculationRecord.block_id == block_id)
    if start_date:
        query = query.filter(CarbonCalculationRecord.reporting_date >= start_date)
    if end_date:
        query = query.filter(CarbonCalculationRecord.reporting_date <= end_date)
    if scope:
        query = query.filter(CarbonCalculationRecord.scope == scope)
    if activity_category:
        query = query.filter(CarbonCalculationRecord.activity_category == activity_category)
    if not include_superseded:
        query = query.filter(CarbonCalculationRecord.is_superseded == False)

    total = query.count()
    records = query.order_by(desc(CarbonCalculationRecord.reporting_date), desc(CarbonCalculationRecord.created_at)).offset(offset).limit(limit).all()

    # Calculate institutional aggregation totals
    active_query = query.filter(CarbonCalculationRecord.is_superseded == False)
    all_active = active_query.all()

    total_kg = round(sum(r.emissions_kg_co2e for r in all_active), 4)
    total_t = round(total_kg / 1000.0, 6)

    by_scope: Dict[str, float] = {"scope_1": 0.0, "scope_2": 0.0, "scope_3": 0.0}
    by_category: Dict[str, float] = {}

    for r in all_active:
        by_scope[r.scope] = round(by_scope.get(r.scope, 0.0) + r.emissions_kg_co2e, 4)
        by_category[r.activity_category] = round(by_category.get(r.activity_category, 0.0) + r.emissions_kg_co2e, 4)

    # Enrich block details
    enriched_items = [_enrich_calculation_response(r, db) for r in records]

    return CarbonCalculationListResponse(
        items=enriched_items,
        total=total,
        total_emissions_kg_co2e=total_kg,
        total_emissions_t_co2e=total_t,
        by_scope=by_scope,
        by_category=by_category,
    )
