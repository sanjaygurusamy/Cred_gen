"""
Scenario API Endpoints for CampusCarbon AI.
Includes create, list, get, calculate preview, recalculate, and compare endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import ReductionScenario, Element, EmissionFactor, ActivityRecord
from app.schemas import (
    ScenarioCreate, ScenarioOut, ScenarioCalculateRequest,
    ScenarioCompareRequest, ScenarioCompareResult
)
from app.auth import get_current_user, CurrentUser, UserRole
from app.recommendation_engine.scenario_simulator import ScenarioSimulator
from app.carbon_engine.calculator import CarbonCalculator, CalculationError

router = APIRouter(prefix="/api/scenarios", tags=["Scenarios"])

def _format_scenario_out(s: ReductionScenario) -> dict:
    return {
        "id": s.id,
        "campus_id": s.campus_id,
        "element_id": s.element_id,
        "recommendation_id": s.recommendation_id,
        "title": s.title,
        "description": s.description,
        "status": s.status,
        "created_by": s.created_by,
        "created_at": s.created_at,
        "updated_at": s.updated_at,
        "assumptions": s.assumptions or [],
        "results": s.results or [],
        "sdg_mappings": s.sdg_mappings or [],
        "element_name": s.element.name if s.element else None,
        "element_category": s.element.category if s.element else None
    }

@router.post("", response_model=ScenarioOut)
def create_scenario(
    req: ScenarioCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Creates, simulates, and saves a reduction scenario."""
    if current_user.role == UserRole.VIEWER:
        raise HTTPException(status_code=403, detail="Viewers cannot create scenarios.")

    try:
        scenario = ScenarioSimulator.simulate_and_save_scenario(
            db=db,
            campus_id=req.campus_id or current_user.campus_id,
            element_id=req.element_id,
            title=req.title,
            reduction_percentage_assumption=req.reduction_percentage_assumption,
            description=req.description,
            recommendation_id=req.recommendation_id,
            alternative_activity_override=req.alternative_activity_override,
            cost_per_unit_override=req.cost_per_unit_override,
            created_by=current_user.user_id
        )
        return _format_scenario_out(scenario)
    except CalculationError as ce:
        raise HTTPException(status_code=400, detail=str(ce))

@router.post("/calculate-preview")
def calculate_scenario_preview(
    req: ScenarioCalculateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Computes an instant deterministic reduction preview without persisting to DB.
    Ideal for real-time frontend sliders and what-if exploration.
    """
    element = db.query(Element).filter(Element.id == req.element_id).first()
    if not element:
        raise HTTPException(status_code=404, detail="Element not found.")

    latest_act = (
        db.query(ActivityRecord)
        .filter(ActivityRecord.element_id == req.element_id)
        .order_by(ActivityRecord.reporting_period_end.desc())
        .first()
    )
    if not latest_act and req.baseline_activity is None:
        raise HTTPException(
            status_code=400,
            detail=f"No activity records exist for '{element.name}'. Please supply a baseline activity value."
        )

    baseline_act = req.baseline_activity if req.baseline_activity is not None else float(latest_act.activity_value)
    baseline_unit = latest_act.activity_unit if latest_act else element.baseline_unit or "unit"
    cost_rate = req.cost_per_unit if req.cost_per_unit is not None else (latest_act.cost_rate if latest_act else None)
    cost_curr = latest_act.cost_currency if latest_act else "USD"

    # Fetch emission factor
    ef = (
        db.query(EmissionFactor)
        .filter(EmissionFactor.category == element.category)
        .order_by(EmissionFactor.year.desc())
        .first()
    )
    if not ef:
        raise HTTPException(status_code=400, detail=f"No approved emission factor found for category '{element.category}'.")

    # Alternative
    alt_ef_val = ef.factor_value
    alt_ef_unit = ef.factor_unit
    if req.alternative_ef_id:
        alt_ef = db.query(EmissionFactor).filter(EmissionFactor.id == req.alternative_ef_id).first()
        if alt_ef:
            alt_ef_val = alt_ef.factor_value
            alt_ef_unit = alt_ef.factor_unit

    if req.alternative_activity is not None:
        alt_act = req.alternative_activity
    elif req.reduction_percentage is not None:
        alt_act = round(baseline_act * (1.0 - (req.reduction_percentage / 100.0)), 4)
    else:
        alt_act = baseline_act

    try:
        result = CarbonCalculator.calculate_reduction_scenario(
            baseline_activity=baseline_act,
            baseline_unit=baseline_unit,
            baseline_ef_value=ef.factor_value,
            baseline_ef_unit=ef.factor_unit,
            alternative_activity=alt_act,
            alternative_unit=baseline_unit,
            alternative_ef_value=alt_ef_val,
            alternative_ef_unit=alt_ef_unit,
            period_days=1,
            cost_rate=cost_rate,
            cost_currency=cost_curr
        )
        return result
    except CalculationError as ce:
        raise HTTPException(status_code=400, detail=str(ce))

@router.get("", response_model=List[ScenarioOut])
def list_scenarios(
    campus_id: Optional[str] = Query(None),
    element_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Lists saved reduction scenarios."""
    target_campus = campus_id or current_user.campus_id
    query = db.query(ReductionScenario).filter(ReductionScenario.campus_id == target_campus)
    if element_id:
        query = query.filter(ReductionScenario.element_id == element_id)
    scenarios = query.order_by(ReductionScenario.created_at.desc()).all()
    return [_format_scenario_out(s) for s in scenarios]

@router.get("/{scenario_id}", response_model=ScenarioOut)
def get_scenario(
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Retrieves single scenario with assumptions and calculation results."""
    scenario = db.query(ReductionScenario).filter(ReductionScenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found.")
    return _format_scenario_out(scenario)

@router.post("/compare", response_model=ScenarioCompareResult)
def compare_scenarios(
    req: ScenarioCompareRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Compares multiple scenarios side-by-side with double-counting verification."""
    result = ScenarioSimulator.compare_scenarios(db=db, scenario_ids=req.scenario_ids)
    return result
