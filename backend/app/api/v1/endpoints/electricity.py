import logging
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, desc

from app.core.database import get_db
from app.models.organization import Organization
from app.models.campus import Campus
from app.models.block import CampusBlock
from app.models.activity import ActivityDefinition
from app.models.activity_record import DailyActivityRecord
from app.models.baseline import (
    ElectricityBaseline,
    ElectricityBaselineItem,
    DailyElectricityEstimate
)
from app.schemas.electricity import (
    ElectricityBaselineCreate,
    ElectricityBaselineRevision,
    ElectricityBaselineResponse,
    ElectricityBaselineItemResponse,
    DailyEstimateCalculateRequest,
    DailyEstimatePreviewResponse,
    DailyEstimateItemResult,
    DailyElectricityEstimateCreate,
    DailyElectricityEstimateResponse,
    ActualElectricityRecordCreate,
    ActualElectricityRecordResponse,
    ElectricityComparisonRecord,
    ElectricityComparisonResponse,
)
from app.services.seed_phase4 import seed_phase4_baselines

logger = logging.getLogger(__name__)

router = APIRouter()


# ==============================================================================
# Helper functions
# ==============================================================================

def _format_baseline_response(baseline: ElectricityBaseline) -> ElectricityBaselineResponse:
    total_default_kwh = 0.0
    items_resp = []
    for item in baseline.items:
        daily_kwh = round(item.quantity * item.average_power_kw * item.default_operating_hours, 3)
        total_default_kwh += daily_kwh
        items_resp.append(
            ElectricityBaselineItemResponse(
                id=item.id,
                baseline_id=item.baseline_id,
                facility_type=item.facility_type,
                facility_name=item.facility_name,
                quantity=item.quantity,
                average_power_kw=item.average_power_kw,
                default_operating_hours=item.default_operating_hours,
                source_rationale=item.source_rationale,
                is_active=item.is_active,
                order_index=item.order_index,
                calculated_default_daily_kwh=daily_kwh,
                created_at=item.created_at,
                updated_at=item.updated_at,
            )
        )

    return ElectricityBaselineResponse(
        id=baseline.id,
        organization_id=baseline.organization_id,
        campus_id=baseline.campus_id,
        block_id=baseline.block_id,
        block_name=baseline.block.name if baseline.block else None,
        block_code=baseline.block.code if baseline.block else None,
        version=baseline.version,
        name=baseline.name,
        description=baseline.description,
        source_rationale=baseline.source_rationale,
        effective_start_date=baseline.effective_start_date,
        effective_end_date=baseline.effective_end_date,
        is_active=baseline.is_active,
        items=items_resp,
        total_default_daily_kwh=round(total_default_kwh, 3),
        created_at=baseline.created_at,
        updated_at=baseline.updated_at,
    )


# ==============================================================================
# Facility Profiles & Templates
# ==============================================================================

@router.get("/facility-types")
def get_facility_type_templates() -> Dict[str, Any]:
    """
    Returns initial facility profile types and typical power rating reference guides
    for academic blocks, hostels, faculty quarters, and common campus facilities.
    """
    return {
        "categories": {
            "academic": [
                {
                    "facility_type": "standard_classroom",
                    "default_name": "Standard Classroom (Non-AC)",
                    "typical_kw": 1.2,
                    "typical_hours": 8.0,
                    "description": "Lighting, 4 ceiling fans, projector, student laptop load"
                },
                {
                    "facility_type": "ac_classroom",
                    "default_name": "AC Smart Lecture Hall",
                    "typical_kw": 4.5,
                    "typical_hours": 7.0,
                    "description": "Dual 2-ton split AC units, interactive board, sound system"
                },
                {
                    "facility_type": "computer_lab_ac",
                    "default_name": "Computer Lab with AC",
                    "typical_kw": 12.0,
                    "typical_hours": 8.0,
                    "description": "60 workstations (150W each = 9kW) + dual 3-ton precision AC units"
                }
            ],
            "hostels": [
                {
                    "facility_type": "hostel_room",
                    "default_name": "Standard Student Room (Non-AC)",
                    "typical_kw": 0.35,
                    "typical_hours": 14.0,
                    "description": "Dual ceiling fans, 2 tube lights, laptop chargers, active evenings/nights"
                },
                {
                    "facility_type": "hostel_room_ac",
                    "default_name": "AC Hostel Room",
                    "typical_kw": 2.2,
                    "typical_hours": 10.0,
                    "description": "Climate controlled warden and guest residential rooms"
                },
                {
                    "facility_type": "hostel_dining",
                    "default_name": "Hostel Dining & Common Hall",
                    "typical_kw": 6.5,
                    "typical_hours": 6.0,
                    "description": "Dining illumination, high-speed fans, hot water dispensers"
                }
            ],
            "residential": [
                {
                    "facility_type": "faculty_residence",
                    "default_name": "Standard Residential Flat (Non-AC)",
                    "typical_kw": 1.6,
                    "typical_hours": 16.0,
                    "description": "Household refrigerator, washing machine, LED lights, kitchen appliances"
                },
                {
                    "facility_type": "faculty_residence_ac",
                    "default_name": "AC Residential Flat",
                    "typical_kw": 3.8,
                    "typical_hours": 12.0,
                    "description": "Residential flat with master bedroom inverter AC in addition to domestic load"
                }
            ],
            "general": [
                {
                    "facility_type": "office_suite",
                    "default_name": "Office Suite (AC)",
                    "typical_kw": 2.2,
                    "typical_hours": 9.0,
                    "description": "Desktop PCs, printers, lighting, and split AC units"
                },
                {
                    "facility_type": "conference_room",
                    "default_name": "Conference Room / Boardroom (AC)",
                    "typical_kw": 8.0,
                    "typical_hours": 5.0,
                    "description": "High-capacity air conditioning, conferencing displays, and sound systems"
                },
                {
                    "facility_type": "custom",
                    "default_name": "Custom Facility Profile",
                    "typical_kw": 1.0,
                    "typical_hours": 8.0,
                    "description": "Configurable profile for unique building facilities"
                }
            ]
        }
    }


# ==============================================================================
# Baseline Management Endpoints
# ==============================================================================

@router.post("/baselines/seed", status_code=status.HTTP_200_OK)
def seed_baselines_endpoint(db: Session = Depends(get_db)):
    """
    Idempotently seeds canonical electricity baselines for Coimbatore Campus blocks.
    """
    return seed_phase4_baselines(db)


@router.get("/baselines", response_model=List[ElectricityBaselineResponse])
def list_baselines(
    block_id: Optional[str] = Query(None, description="Filter by Block UUID"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db)
):
    """
    List all electricity baselines with their facility profile items.
    """
    stmt = select(ElectricityBaseline)
    if block_id:
        stmt = stmt.where(ElectricityBaseline.block_id == block_id)
    if is_active is not None:
        stmt = stmt.where(ElectricityBaseline.is_active == is_active)

    stmt = stmt.order_by(ElectricityBaseline.block_id, desc(ElectricityBaseline.version))
    baselines = db.execute(stmt).scalars().all()
    return [_format_baseline_response(b) for b in baselines]


@router.get("/baselines/block/{block_id}", response_model=ElectricityBaselineResponse)
def get_active_baseline_for_block(
    block_id: str,
    as_of_date: Optional[date] = Query(None, description="Lookup baseline effective on this specific date"),
    db: Session = Depends(get_db)
):
    """
    Retrieve the active baseline profile for a block, optionally evaluating effective dates.
    """
    target_date = as_of_date or date.today()

    stmt = select(ElectricityBaseline).where(
        ElectricityBaseline.block_id == block_id,
        ElectricityBaseline.is_active == True,
        ElectricityBaseline.effective_start_date <= target_date,
        or_(
            ElectricityBaseline.effective_end_date.is_(None),
            ElectricityBaseline.effective_end_date >= target_date
        )
    ).order_by(desc(ElectricityBaseline.version))

    baseline = db.execute(stmt).scalars().first()

    # Fallback to latest active baseline if no exact date match
    if not baseline:
        stmt_fallback = select(ElectricityBaseline).where(
            ElectricityBaseline.block_id == block_id,
            ElectricityBaseline.is_active == True
        ).order_by(desc(ElectricityBaseline.version))
        baseline = db.execute(stmt_fallback).scalars().first()

    if not baseline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No electricity baseline profile found for block '{block_id}'. Please create one first."
        )

    return _format_baseline_response(baseline)


@router.get("/baselines/block/{block_id}/versions", response_model=List[ElectricityBaselineResponse])
def get_all_baseline_versions_for_block(
    block_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieve all historical baseline versions for a block, preserving full traceability.
    """
    stmt = select(ElectricityBaseline).where(
        ElectricityBaseline.block_id == block_id
    ).order_by(desc(ElectricityBaseline.version))

    baselines = db.execute(stmt).scalars().all()
    return [_format_baseline_response(b) for b in baselines]


@router.get("/baselines/{baseline_id}", response_model=ElectricityBaselineResponse)
def get_baseline_by_id(
    baseline_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieve an electricity baseline by its UUID.
    """
    baseline = db.execute(
        select(ElectricityBaseline).where(ElectricityBaseline.id == baseline_id)
    ).scalars().first()

    if not baseline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Baseline '{baseline_id}' not found"
        )

    return _format_baseline_response(baseline)


@router.post("/baselines", response_model=ElectricityBaselineResponse, status_code=status.HTTP_201_CREATED)
def create_baseline(
    payload: ElectricityBaselineCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new electricity baseline profile for a block.
    If baselines already exist for this block, sets version to highest + 1.
    """
    block = db.execute(
        select(CampusBlock).where(CampusBlock.id == payload.block_id)
    ).scalars().first()

    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Block '{payload.block_id}' does not exist"
        )

    # Determine next version
    latest = db.execute(
        select(ElectricityBaseline)
        .where(ElectricityBaseline.block_id == payload.block_id)
        .order_by(desc(ElectricityBaseline.version))
    ).scalars().first()

    next_version = (latest.version + 1) if latest else 1

    # If new baseline has effective date, close previous active baseline
    if latest and latest.is_active:
        if payload.effective_start_date > latest.effective_start_date:
            latest.effective_end_date = payload.effective_start_date - timedelta(days=1)
        latest.is_active = False

    new_baseline = ElectricityBaseline(
        organization_id=block.campus.organization_id if block.campus else "org-amrita",
        campus_id=block.campus_id,
        block_id=payload.block_id,
        version=next_version,
        name=payload.name,
        description=payload.description,
        source_rationale=payload.source_rationale,
        effective_start_date=payload.effective_start_date,
        effective_end_date=payload.effective_end_date,
        is_active=True
    )
    db.add(new_baseline)
    db.flush()

    for idx, it in enumerate(payload.items):
        item = ElectricityBaselineItem(
            baseline_id=new_baseline.id,
            facility_type=it.facility_type,
            facility_name=it.facility_name,
            quantity=it.quantity,
            average_power_kw=it.average_power_kw,
            default_operating_hours=it.default_operating_hours,
            source_rationale=it.source_rationale,
            is_active=it.is_active,
            order_index=idx
        )
        db.add(item)

    db.commit()
    db.refresh(new_baseline)
    return _format_baseline_response(new_baseline)


@router.post("/baselines/{baseline_id}/revise", response_model=ElectricityBaselineResponse)
def revise_baseline(
    baseline_id: str,
    payload: ElectricityBaselineRevision,
    db: Session = Depends(get_db)
):
    """
    Revises a baseline by creating a new version.
    Historical baselines and associated daily estimates are preserved untouched.
    """
    old_baseline = db.execute(
        select(ElectricityBaseline).where(ElectricityBaseline.id == baseline_id)
    ).scalars().first()

    if not old_baseline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Baseline '{baseline_id}' not found"
        )

    # Retire or update end date of the previous version
    if payload.effective_start_date > old_baseline.effective_start_date:
        old_baseline.effective_end_date = payload.effective_start_date - timedelta(days=1)
    old_baseline.is_active = False

    # Get max version for block
    max_ver = db.execute(
        select(ElectricityBaseline.version)
        .where(ElectricityBaseline.block_id == old_baseline.block_id)
        .order_by(desc(ElectricityBaseline.version))
    ).scalars().first() or old_baseline.version

    new_version = max_ver + 1

    new_baseline = ElectricityBaseline(
        organization_id=old_baseline.organization_id,
        campus_id=old_baseline.campus_id,
        block_id=old_baseline.block_id,
        version=new_version,
        name=payload.name or f"{old_baseline.name} (Rev {new_version})",
        description=payload.description or old_baseline.description,
        source_rationale=payload.source_rationale or old_baseline.source_rationale,
        effective_start_date=payload.effective_start_date,
        effective_end_date=payload.effective_end_date,
        is_active=True
    )
    db.add(new_baseline)
    db.flush()

    for idx, it in enumerate(payload.items):
        item = ElectricityBaselineItem(
            baseline_id=new_baseline.id,
            facility_type=it.facility_type,
            facility_name=it.facility_name,
            quantity=it.quantity,
            average_power_kw=it.average_power_kw,
            default_operating_hours=it.default_operating_hours,
            source_rationale=it.source_rationale,
            is_active=it.is_active,
            order_index=idx
        )
        db.add(item)

    db.commit()
    db.refresh(new_baseline)
    return _format_baseline_response(new_baseline)


# ==============================================================================
# Daily Electricity Estimation Endpoints
# ==============================================================================

@router.post("/estimates/calculate", response_model=DailyEstimatePreviewResponse)
def calculate_estimate_preview(
    payload: DailyEstimateCalculateRequest,
    db: Session = Depends(get_db)
):
    """
    Deterministic calculation preview of daily electricity consumption.
    Formula: E_daily = SUM(quantity * average_power_kW * operating_hours)
    Does not save to database.
    """
    block = db.execute(
        select(CampusBlock).where(CampusBlock.id == payload.block_id)
    ).scalars().first()

    if not block:
        raise HTTPException(status_code=404, detail=f"Block '{payload.block_id}' not found")

    # If holiday or genuine zero-consumption day
    if payload.is_holiday or payload.is_zero_consumption:
        return DailyEstimatePreviewResponse(
            block_id=block.id,
            block_name=block.name,
            reporting_date=payload.reporting_date,
            baseline_id=payload.baseline_id,
            baseline_version=1,
            operational_mode=payload.operational_mode,
            is_holiday=payload.is_holiday,
            is_zero_consumption=payload.is_zero_consumption,
            items=[],
            total_estimated_kwh=0.0
        )

    # If custom items provided, calculate directly
    if payload.custom_items:
        results = []
        total_kwh = 0.0
        for item in payload.custom_items:
            kwh = round(item.quantity * item.average_power_kw * item.operating_hours, 3)
            total_kwh += kwh
            results.append(
                DailyEstimateItemResult(
                    facility_type=item.facility_type,
                    facility_name=item.facility_name,
                    quantity=item.quantity,
                    average_power_kw=item.average_power_kw,
                    operating_hours=item.operating_hours,
                    estimated_kwh=kwh,
                    source_rationale=item.source_rationale
                )
            )

        baseline_ver = 1
        if payload.baseline_id:
            b = db.execute(select(ElectricityBaseline).where(ElectricityBaseline.id == payload.baseline_id)).scalars().first()
            if b:
                baseline_ver = b.version

        return DailyEstimatePreviewResponse(
            block_id=block.id,
            block_name=block.name,
            reporting_date=payload.reporting_date,
            baseline_id=payload.baseline_id,
            baseline_version=baseline_ver,
            operational_mode=payload.operational_mode,
            is_holiday=payload.is_holiday,
            is_zero_consumption=payload.is_zero_consumption,
            items=results,
            total_estimated_kwh=round(total_kwh, 3)
        )

    # Otherwise load effective baseline
    baseline_query = select(ElectricityBaseline).where(ElectricityBaseline.block_id == block.id)
    if payload.baseline_id:
        baseline_query = baseline_query.where(ElectricityBaseline.id == payload.baseline_id)
    else:
        baseline_query = baseline_query.where(
            ElectricityBaseline.is_active == True,
            ElectricityBaseline.effective_start_date <= payload.reporting_date,
            or_(
                ElectricityBaseline.effective_end_date.is_(None),
                ElectricityBaseline.effective_end_date >= payload.reporting_date
            )
        ).order_by(desc(ElectricityBaseline.version))

    baseline = db.execute(baseline_query).scalars().first()

    if not baseline:
        # Fallback to any active baseline for block
        baseline = db.execute(
            select(ElectricityBaseline)
            .where(ElectricityBaseline.block_id == block.id, ElectricityBaseline.is_active == True)
            .order_by(desc(ElectricityBaseline.version))
        ).scalars().first()

    if not baseline:
        raise HTTPException(
            status_code=404,
            detail=f"No baseline profile found for block '{block.name}' to prefill estimation."
        )

    results = []
    total_kwh = 0.0
    for it in baseline.items:
        if not it.is_active:
            continue
        kwh = round(it.quantity * it.average_power_kw * it.default_operating_hours, 3)
        total_kwh += kwh
        results.append(
            DailyEstimateItemResult(
                facility_type=it.facility_type,
                facility_name=it.facility_name,
                quantity=it.quantity,
                average_power_kw=it.average_power_kw,
                operating_hours=it.default_operating_hours,
                estimated_kwh=kwh,
                source_rationale=it.source_rationale
            )
        )

    return DailyEstimatePreviewResponse(
        block_id=block.id,
        block_name=block.name,
        reporting_date=payload.reporting_date,
        baseline_id=baseline.id,
        baseline_version=baseline.version,
        operational_mode=payload.operational_mode,
        is_holiday=payload.is_holiday,
        is_zero_consumption=payload.is_zero_consumption,
        items=results,
        total_estimated_kwh=round(total_kwh, 3)
    )


@router.post("/estimates", response_model=DailyElectricityEstimateResponse, status_code=status.HTTP_201_CREATED)
def create_daily_estimate(
    payload: DailyElectricityEstimateCreate,
    db: Session = Depends(get_db)
):
    """
    Persist daily electricity consumption estimate for a block and date.
    Stores the exact inputs, operating hours, baseline version, and calculation details.
    Guards against accidental duplicates unless replace_existing=True.
    """
    block = db.execute(
        select(CampusBlock).where(CampusBlock.id == payload.block_id)
    ).scalars().first()

    if not block:
        raise HTTPException(status_code=404, detail=f"Block '{payload.block_id}' not found")

    # Check for existing estimate
    existing = db.execute(
        select(DailyElectricityEstimate).where(
            DailyElectricityEstimate.block_id == payload.block_id,
            DailyElectricityEstimate.reporting_date == payload.reporting_date
        )
    ).scalars().first()

    if existing and not payload.replace_existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"An estimate already exists for {block.name} on {payload.reporting_date} "
                f"({existing.total_estimated_kwh} kWh). Set replace_existing=True to recalculate."
            )
        )

    # Calculate line items
    calc_details = []
    total_kwh = 0.0

    if not (payload.is_holiday or payload.is_zero_consumption):
        for item in payload.items:
            kwh = round(item.quantity * item.average_power_kw * item.operating_hours, 3)
            total_kwh += kwh
            calc_details.append({
                "facility_type": item.facility_type,
                "facility_name": item.facility_name,
                "quantity": item.quantity,
                "average_power_kw": item.average_power_kw,
                "operating_hours": item.operating_hours,
                "estimated_kwh": kwh,
                "source_rationale": item.source_rationale
            })
    else:
        total_kwh = 0.0

    # Determine baseline version
    baseline_version = 1
    if payload.baseline_id:
        b = db.execute(select(ElectricityBaseline).where(ElectricityBaseline.id == payload.baseline_id)).scalars().first()
        if b:
            baseline_version = b.version
    else:
        # Look up baseline active on reporting date
        b = db.execute(
            select(ElectricityBaseline).where(
                ElectricityBaseline.block_id == payload.block_id,
                ElectricityBaseline.effective_start_date <= payload.reporting_date
            ).order_by(desc(ElectricityBaseline.version))
        ).scalars().first()
        if b:
            baseline_version = b.version
            payload.baseline_id = b.id

    if existing and payload.replace_existing:
        existing.baseline_id = payload.baseline_id
        existing.baseline_version = baseline_version
        existing.total_estimated_kwh = round(total_kwh, 3)
        existing.is_holiday = payload.is_holiday
        existing.is_zero_consumption = payload.is_zero_consumption
        existing.operational_mode = payload.operational_mode
        existing.notes = payload.notes
        existing.calculation_details = calc_details
        existing.version += 1
        db.commit()
        db.refresh(existing)
        return _format_estimate_response(existing, block)

    estimate = DailyElectricityEstimate(
        organization_id=block.campus.organization_id if block.campus else "org-amrita",
        campus_id=block.campus_id,
        block_id=block.id,
        baseline_id=payload.baseline_id,
        baseline_version=baseline_version,
        reporting_date=payload.reporting_date,
        total_estimated_kwh=round(total_kwh, 3),
        is_holiday=payload.is_holiday,
        is_zero_consumption=payload.is_zero_consumption,
        operational_mode=payload.operational_mode,
        notes=payload.notes,
        calculation_details=calc_details,
        version=1
    )
    db.add(estimate)
    db.commit()
    db.refresh(estimate)
    return _format_estimate_response(estimate, block)


def _format_estimate_response(est: DailyElectricityEstimate, block: CampusBlock) -> DailyElectricityEstimateResponse:
    details = [
        DailyEstimateItemResult(
            facility_type=d["facility_type"],
            facility_name=d["facility_name"],
            quantity=d["quantity"],
            average_power_kw=d["average_power_kw"],
            operating_hours=d["operating_hours"],
            estimated_kwh=d["estimated_kwh"],
            source_rationale=d.get("source_rationale")
        )
        for d in (est.calculation_details or [])
    ]

    return DailyElectricityEstimateResponse(
        id=est.id,
        organization_id=est.organization_id,
        campus_id=est.campus_id,
        block_id=est.block_id,
        block_name=block.name if block else None,
        block_code=block.code if block else None,
        baseline_id=est.baseline_id,
        baseline_version=est.baseline_version,
        reporting_date=est.reporting_date,
        total_estimated_kwh=est.total_estimated_kwh,
        is_holiday=est.is_holiday,
        is_zero_consumption=est.is_zero_consumption,
        operational_mode=est.operational_mode,
        notes=est.notes,
        calculation_details=details,
        version=est.version,
        created_at=est.created_at,
        updated_at=est.updated_at
    )


@router.get("/estimates", response_model=List[DailyElectricityEstimateResponse])
def list_daily_estimates(
    block_id: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    List daily electricity estimates with filtering.
    """
    stmt = select(DailyElectricityEstimate)
    if block_id:
        stmt = stmt.where(DailyElectricityEstimate.block_id == block_id)
    if start_date:
        stmt = stmt.where(DailyElectricityEstimate.reporting_date >= start_date)
    if end_date:
        stmt = stmt.where(DailyElectricityEstimate.reporting_date <= end_date)

    stmt = stmt.order_by(desc(DailyElectricityEstimate.reporting_date)).offset(offset).limit(limit)
    estimates = db.execute(stmt).scalars().all()

    return [_format_estimate_response(e, e.block) for e in estimates]


@router.get("/estimates/block/{block_id}/date/{reporting_date}", response_model=DailyElectricityEstimateResponse)
def get_daily_estimate_by_date(
    block_id: str,
    reporting_date: date,
    db: Session = Depends(get_db)
):
    """
    Get estimate for a specific block and date.
    """
    est = db.execute(
        select(DailyElectricityEstimate).where(
            DailyElectricityEstimate.block_id == block_id,
            DailyElectricityEstimate.reporting_date == reporting_date
        )
    ).scalars().first()

    if not est:
        raise HTTPException(
            status_code=404,
            detail=f"No estimate recorded for block '{block_id}' on {reporting_date}"
        )

    return _format_estimate_response(est, est.block)


# ==============================================================================
# Actual Electricity Reading Endpoints (Extending Phase 3)
# ==============================================================================

@router.post("/actual", response_model=ActualElectricityRecordResponse, status_code=status.HTTP_201_CREATED)
def record_actual_electricity(
    payload: ActualElectricityRecordCreate,
    db: Session = Depends(get_db)
):
    """
    Record an actual electricity meter reading.
    Reuses the Phase 3 daily activity record architecture and ELEC_CONSUMPTION activity,
    preserving meter boundaries (grid_import, solar_generation, etc.) and start/end meter values.
    """
    block = db.execute(
        select(CampusBlock).where(CampusBlock.id == payload.block_id)
    ).scalars().first()
    if not block:
        raise HTTPException(status_code=404, detail=f"Block '{payload.block_id}' not found")

    # Get ELEC_CONSUMPTION activity
    act = db.execute(
        select(ActivityDefinition).where(ActivityDefinition.code == "ELEC_CONSUMPTION")
    ).scalars().first()

    if not act:
        raise HTTPException(status_code=500, detail="ELEC_CONSUMPTION activity definition not found in catalogue")

    # Check for existing record
    existing = db.execute(
        select(DailyActivityRecord).where(
            DailyActivityRecord.block_id == payload.block_id,
            DailyActivityRecord.activity_id == act.id,
            DailyActivityRecord.reporting_date == payload.reporting_date,
            DailyActivityRecord.reading_identifier == payload.reading_identifier
        )
    ).scalars().first()

    if existing and not payload.replace_existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"An electricity record already exists for {block.name} on {payload.reporting_date} "
                f"({existing.quantity} kWh). Use replace_existing=True to revise."
            )
        )

    if existing and payload.replace_existing:
        existing.quantity = payload.quantity_kwh
        existing.standardized_quantity = payload.quantity_kwh
        existing.unit = "kWh"
        existing.standardized_unit = "kWh"
        existing.data_status = "measured"
        existing.measurement_method = payload.measurement_method
        existing.meter_boundary = payload.meter_boundary
        existing.source_reference = payload.source_reference
        existing.meter_start_reading = payload.meter_start_reading
        existing.meter_end_reading = payload.meter_end_reading
        existing.notes = payload.notes
        existing.version += 1
        db.commit()
        db.refresh(existing)
        rec = existing
    else:
        rec = DailyActivityRecord(
            organization_id=block.campus.organization_id if block.campus else "org-amrita",
            campus_id=block.campus_id,
            block_id=block.id,
            activity_id=act.id,
            reporting_date=payload.reporting_date,
            quantity=payload.quantity_kwh,
            unit="kWh",
            standardized_quantity=payload.quantity_kwh,
            standardized_unit="kWh",
            data_status="measured",
            measurement_method=payload.measurement_method,
            reading_identifier=payload.reading_identifier,
            is_daily_total=True,
            meter_boundary=payload.meter_boundary,
            source_reference=payload.source_reference,
            meter_start_reading=payload.meter_start_reading,
            meter_end_reading=payload.meter_end_reading,
            notes=payload.notes,
            version=1
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)

    return ActualElectricityRecordResponse(
        id=rec.id,
        block_id=block.id,
        block_name=block.name,
        block_code=block.code,
        reporting_date=rec.reporting_date,
        quantity_kwh=rec.quantity,
        meter_boundary=rec.meter_boundary or "grid_import",
        measurement_method=rec.measurement_method,
        source_reference=rec.source_reference,
        meter_start_reading=rec.meter_start_reading,
        meter_end_reading=rec.meter_end_reading,
        reading_identifier=rec.reading_identifier,
        data_status=rec.data_status,
        notes=rec.notes,
        version=rec.version,
        created_at=rec.created_at
    )


# ==============================================================================
# Estimated-versus-Actual Comparison Endpoints
# ==============================================================================

@router.get("/comparison", response_model=ElectricityComparisonResponse)
def compare_estimated_vs_actual(
    block_id: str,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db)
):
    """
    Comparison interface for a selected block across a date range.
    Calculates:
      Difference = Actual - Estimated
      Percentage difference = (Actual - Estimated) / Estimated * 100
    Guarantees:
      - Never divides by zero (if estimated is zero, percentage is null).
      - If actual data is missing, it is NOT treated as zero.
      - Never adds estimated and actual values together.
      - Distinguishes meter boundary (grid import vs solar).
      - Recommends the reporting value (actual if available, else estimated).
    """
    block = db.execute(
        select(CampusBlock).where(CampusBlock.id == block_id)
    ).scalars().first()

    if not block:
        raise HTTPException(status_code=404, detail=f"Block '{block_id}' not found")

    if end_date < start_date:
        raise HTTPException(status_code=400, detail="end_date must be greater than or equal to start_date")

    # Fetch estimates in range
    estimates = db.execute(
        select(DailyElectricityEstimate).where(
            DailyElectricityEstimate.block_id == block_id,
            DailyElectricityEstimate.reporting_date >= start_date,
            DailyElectricityEstimate.reporting_date <= end_date
        )
    ).scalars().all()
    est_map = {e.reporting_date: e for e in estimates}

    # Fetch actual electricity records in range
    elec_act = db.execute(
        select(ActivityDefinition).where(ActivityDefinition.code == "ELEC_CONSUMPTION")
    ).scalars().first()

    actual_map: Dict[date, List[DailyActivityRecord]] = {}
    if elec_act:
        actual_recs = db.execute(
            select(DailyActivityRecord).where(
                DailyActivityRecord.block_id == block_id,
                DailyActivityRecord.activity_id == elec_act.id,
                DailyActivityRecord.reporting_date >= start_date,
                DailyActivityRecord.reporting_date <= end_date
            )
        ).scalars().all()
        for r in actual_recs:
            actual_map.setdefault(r.reporting_date, []).append(r)

    # Build comparison day-by-day
    records: List[ElectricityComparisonRecord] = []
    curr = start_date

    matched_count = 0
    estimated_only_count = 0
    actual_only_count = 0
    missing_both_count = 0

    total_est = 0.0
    total_act = 0.0

    while curr <= end_date:
        est = est_map.get(curr)
        act_list = actual_map.get(curr, [])

        # Filter grid import or total consumption record for primary comparison
        grid_act = next((a for a in act_list if a.meter_boundary in ("grid_import", "total_consumption", None)), None)
        if not grid_act and act_list:
            grid_act = act_list[0]

        solar_gen = next((a.quantity for a in act_list if a.meter_boundary == "solar_generation"), None)
        solar_exp = next((a.quantity for a in act_list if a.meter_boundary == "solar_export"), None)

        has_est = est is not None
        has_act = grid_act is not None

        est_kwh = est.total_estimated_kwh if est else None
        act_kwh = grid_act.quantity if grid_act else None

        diff_kwh = None
        pct_diff = None
        status_label = "missing_both"
        rec_val = None
        rec_src = "missing"

        if has_est and has_act:
            diff_kwh = round(act_kwh - est_kwh, 3)
            if est_kwh > 0.0:
                pct_diff = round(((act_kwh - est_kwh) / est_kwh) * 100.0, 2)
            else:
                pct_diff = None  # Prevent division by zero
            status_label = "matched"
            rec_val = act_kwh
            rec_src = "measured"
            matched_count += 1
            total_est += est_kwh
            total_act += act_kwh
        elif has_est and not has_act:
            status_label = "estimated_only"
            rec_val = est_kwh
            rec_src = "estimated"
            estimated_only_count += 1
            total_est += est_kwh
        elif not has_est and has_act:
            status_label = "actual_only"
            rec_val = act_kwh
            rec_src = "measured"
            actual_only_count += 1
            total_act += act_kwh
        else:
            status_label = "missing_both"
            missing_both_count += 1

        record = ElectricityComparisonRecord(
            block_id=block.id,
            block_name=block.name,
            block_code=block.code,
            reporting_date=curr,
            has_estimate=has_est,
            estimated_kwh=est_kwh,
            baseline_version=est.baseline_version if est else None,
            operational_mode=est.operational_mode if est else None,
            is_holiday=est.is_holiday if est else False,
            is_zero_consumption=est.is_zero_consumption if est else False,
            estimate_notes=est.notes if est else None,
            has_actual=has_act,
            actual_kwh=act_kwh,
            meter_boundary=grid_act.meter_boundary if grid_act else None,
            measurement_method=grid_act.measurement_method if grid_act else None,
            source_reference=grid_act.source_reference if grid_act else None,
            actual_notes=grid_act.notes if grid_act else None,
            difference_kwh=diff_kwh,
            percentage_difference=pct_diff,
            recommended_reporting_value=rec_val,
            recommended_reporting_source=rec_src,
            status=status_label,
            solar_generation_kwh=solar_gen,
            solar_export_kwh=solar_exp
        )
        records.append(record)
        curr += timedelta(days=1)

    net_variance = round(total_act - total_est, 3) if (matched_count > 0) else None

    return ElectricityComparisonResponse(
        records=records,
        total_days=len(records),
        matched_days=matched_count,
        estimated_only_days=estimated_only_count,
        actual_only_days=actual_only_count,
        missing_days=missing_both_count,
        total_estimated_kwh=round(total_est, 3),
        total_actual_kwh=round(total_act, 3),
        net_variance_kwh=net_variance
    )
