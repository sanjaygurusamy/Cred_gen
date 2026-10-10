"""
Intervention Implementation and Post-Measurement Outcome Comparison API Endpoints.
Tracks implementation progress and compares empirical post-implementation measurements
against baseline activity and predicted scenario targets.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import (
    InterventionImplementation, PostImplementationMeasurement,
    Element, ActivityRecord, EmissionFactor, ReductionScenario, Recommendation
)
from app.schemas import (
    InterventionImplementationCreate, InterventionImplementationOut,
    PostMeasurementCreate, PostMeasurementOut, OutcomeComparisonOut
)
from app.auth import get_current_user, CurrentUser, UserRole
from app.carbon_engine.calculator import CarbonCalculator

router = APIRouter(prefix="/api/interventions", tags=["Implementation & Outcomes"])

@router.post("/implementation", response_model=InterventionImplementationOut)
def record_implementation(
    req: InterventionImplementationCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Records an intervention as implemented or in-progress."""
    if current_user.role == UserRole.VIEWER:
        raise HTTPException(status_code=403, detail="Viewers cannot record implementations.")

    element = db.query(Element).filter(Element.id == req.element_id).first()
    if not element:
        raise HTTPException(status_code=404, detail="Target element not found.")

    intervention = InterventionImplementation(
        campus_id=req.campus_id or current_user.campus_id,
        recommendation_id=req.recommendation_id,
        scenario_id=req.scenario_id,
        element_id=req.element_id,
        title=req.title,
        implementation_date=req.implementation_date,
        completion_date=datetime.utcnow(),
        status="completed",
        capital_cost=req.capital_cost,
        operational_cost_annual=req.operational_cost_annual,
        notes=req.notes,
        implemented_by=current_user.user_id
    )
    db.add(intervention)

    # If linked to a recommendation, update recommendation status to implemented
    if req.recommendation_id:
        rec = db.query(Recommendation).filter(Recommendation.id == req.recommendation_id).first()
        if rec:
            rec.status = "implemented"
            rec.updated_at = datetime.utcnow()

    # If linked to a scenario, update scenario status to implemented
    if req.scenario_id:
        scen = db.query(ReductionScenario).filter(ReductionScenario.id == req.scenario_id).first()
        if scen:
            scen.status = "implemented"
            scen.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(intervention)
    return intervention

@router.get("", response_model=List[InterventionImplementationOut])
def list_implementations(
    campus_id: Optional[str] = Query(None),
    element_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Lists intervention implementations."""
    target_campus = campus_id or current_user.campus_id
    query = db.query(InterventionImplementation).filter(InterventionImplementation.campus_id == target_campus)
    if element_id:
        query = query.filter(InterventionImplementation.element_id == element_id)
    return query.order_by(InterventionImplementation.implementation_date.desc()).all()

@router.post("/{intervention_id}/measurements", response_model=PostMeasurementOut)
def record_post_measurement(
    intervention_id: str,
    req: PostMeasurementCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Records post-implementation empirical measurement and calculates actual reduction against baseline.
    """
    if current_user.role == UserRole.VIEWER:
        raise HTTPException(status_code=403, detail="Viewers cannot record measurements.")

    intervention = db.query(InterventionImplementation).filter(InterventionImplementation.id == intervention_id).first()
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention implementation record not found.")

    element = db.query(Element).filter(Element.id == intervention.element_id).first()
    ef = db.query(EmissionFactor).filter(EmissionFactor.category == element.category).order_by(EmissionFactor.year.desc()).first()
    if not ef:
        raise HTTPException(status_code=400, detail="No emission factor found for element category.")

    # Fetch baseline activity
    baseline_record = (
        db.query(ActivityRecord)
        .filter(ActivityRecord.element_id == intervention.element_id)
        .filter(ActivityRecord.reporting_period_end <= intervention.implementation_date)
        .order_by(ActivityRecord.reporting_period_end.desc())
        .first()
    )
    if not baseline_record:
        # Fallback to any latest baseline record
        baseline_record = db.query(ActivityRecord).filter(ActivityRecord.element_id == intervention.element_id).first()

    baseline_act = baseline_record.activity_value if baseline_record else element.baseline_value
    baseline_emissions = baseline_act * ef.factor_value

    measured_emissions = req.measured_activity * ef.factor_value
    actual_red_kg = round(baseline_emissions - measured_emissions, 4)
    actual_red_pct = round((actual_red_kg / baseline_emissions) * 100.0, 2) if baseline_emissions > 0 else 0.0

    post_meas = PostImplementationMeasurement(
        intervention_id=intervention.id,
        measurement_period_start=req.measurement_period_start,
        measurement_period_end=req.measurement_period_end,
        measured_activity=req.measured_activity,
        measured_unit=req.measured_unit,
        measured_emissions_kg=measured_emissions,
        baseline_emissions_kg=baseline_emissions,
        actual_reduction_kg=actual_red_kg,
        actual_reduction_percentage=actual_red_pct,
        verified_by=current_user.user_id,
        notes=req.notes
    )
    db.add(post_meas)
    db.commit()
    db.refresh(post_meas)
    return post_meas

@router.get("/{intervention_id}/compare-outcome", response_model=OutcomeComparisonOut)
def compare_outcome(
    intervention_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Compares actual post-implementation measurements against the original baseline
    and against predicted scenario estimates.
    """
    intervention = db.query(InterventionImplementation).filter(InterventionImplementation.id == intervention_id).first()
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention not found.")

    element = db.query(Element).filter(Element.id == intervention.element_id).first()

    # Get latest post measurement
    meas = (
        db.query(PostImplementationMeasurement)
        .filter(PostImplementationMeasurement.intervention_id == intervention_id)
        .order_by(PostImplementationMeasurement.measurement_period_end.desc())
        .first()
    )
    if not meas:
        raise HTTPException(status_code=404, detail="No post-implementation measurements recorded yet for this intervention.")

    # Check predicted scenario reduction if linked
    predicted_red = None
    if intervention.scenario_id:
        scen = db.query(ReductionScenario).filter(ReductionScenario.id == intervention.scenario_id).first()
        if scen and scen.results:
            predicted_red = scen.results[0].potential_reduction_kg

    ratio = None
    if predicted_red and predicted_red > 0:
        ratio = round(meas.actual_reduction_kg / predicted_red, 2)

    if ratio is not None:
        if ratio >= 1.05:
            outcome_status = "exceeded_target"
            eval_notes = f"Intervention exceeded predicted targets by {round((ratio - 1.0)*100, 1)}%."
        elif ratio >= 0.90:
            outcome_status = "met_target"
            eval_notes = f"Intervention successfully met predicted reduction targets ({round(ratio*100, 1)}% of target achieved)."
        else:
            outcome_status = "below_target"
            eval_notes = f"Actual performance is below predicted targets ({round(ratio*100, 1)}% of target achieved). Investigation recommended."
    else:
        outcome_status = "verified_reduction" if meas.actual_reduction_kg > 0 else "underperforming"
        eval_notes = f"Empirical reduction of {meas.actual_reduction_kg} kgCO2e ({meas.actual_reduction_percentage}%) measured."

    # Baseline activity
    baseline_rec = db.query(ActivityRecord).filter(ActivityRecord.element_id == element.id).first()
    baseline_act = baseline_rec.activity_value if baseline_rec else element.baseline_value

    return OutcomeComparisonOut(
        intervention_id=intervention.id,
        element_id=element.id,
        element_name=element.name,
        baseline_activity=baseline_act,
        baseline_emissions_kg=meas.baseline_emissions_kg,
        measured_activity=meas.measured_activity,
        measured_emissions_kg=meas.measured_emissions_kg,
        predicted_reduction_kg=predicted_red,
        actual_reduction_kg=meas.actual_reduction_kg,
        actual_reduction_percentage=meas.actual_reduction_percentage,
        target_achieved_ratio=ratio,
        status=outcome_status,
        evaluation_notes=eval_notes
    )
