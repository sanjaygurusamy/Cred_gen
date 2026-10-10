"""
Recommendations API Endpoints for CampusCarbon AI.
Includes generate, list, get, approve, reject, refresh, and summary endpoints.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import (
    Recommendation, Element, ActivityRecord, EmissionFactor, CampusBody,
    SDGMapping, RecommendationEvidence, ReductionScenario, ScenarioCalculationResult
)
from app.schemas import (
    RecommendationOut, RecommendationGenerateRequest, RecommendationRejectRequest,
    RecommendationSummary
)
from app.auth import get_current_user, CurrentUser, UserRole
from app.recommendation_engine.llm_service import LLMService
from app.recommendation_engine.sdg_mapper import SDGMapper
from app.recommendation_engine.prioritization import PrioritizationEngine

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])

def _format_rec_out(rec: Recommendation) -> dict:
    """Helper to convert DB model to RecommendationOut dict with joined names."""
    data = {
        "id": rec.id,
        "campus_id": rec.campus_id,
        "campus_body_id": rec.campus_body_id,
        "element_id": rec.element_id,
        "title": rec.title,
        "description": rec.description,
        "category": rec.category,
        "problem": rec.problem,
        "proposed_action": rec.proposed_action,
        "reasoning": rec.reasoning,
        "expected_environmental_benefit": rec.expected_environmental_benefit,
        "potential_operational_benefit": rec.potential_operational_benefit,
        "required_additional_info": rec.required_additional_info or [],
        "implementation_prerequisites": rec.implementation_prerequisites or [],
        "potential_risks_constraints": rec.potential_risks_constraints or [],
        "confidence_score": rec.confidence_score,
        "priority_score": rec.priority_score,
        "priority_level": rec.priority_level,
        "status": rec.status,
        "rejection_reason": rec.rejection_reason,
        "source": rec.source,
        "evidence_references": rec.evidence_references or [],
        "estimation_assumptions": rec.estimation_assumptions or {},
        "created_at": rec.created_at,
        "updated_at": rec.updated_at,
        "reviewed_by": rec.reviewed_by,
        "reviewed_at": rec.reviewed_at,
        "sdg_mappings": rec.sdg_mappings or [],
        "campus_body_name": rec.campus_body.name if rec.campus_body else None,
        "element_name": rec.element.name if rec.element else None,
        "element_category": rec.element.category if rec.element else None
    }
    return data

@router.post("/generate", response_model=List[RecommendationOut])
def generate_recommendations(
    req: RecommendationGenerateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Generates AI & rule-based recommendations for elements in a campus.
    """
    # Permission check
    if current_user.role == UserRole.VIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewers cannot generate recommendations."
        )

    # Campus isolation
    target_campus = req.campus_id or current_user.campus_id

    # Select target elements
    elem_query = db.query(Element).filter(Element.campus_id == target_campus, Element.is_archived == False)
    if req.element_id:
        elem_query = elem_query.filter(Element.id == req.element_id)
    
    elements = elem_query.all()
    if not elements:
        raise HTTPException(status_code=404, detail="No active elements found for recommendation generation.")

    generated_db_recs = []

    for elem in elements:
        # Fetch activity records and emission factors
        activity_records = (
            db.query(ActivityRecord)
            .filter(ActivityRecord.element_id == elem.id)
            .order_by(ActivityRecord.reporting_period_end.desc())
            .all()
        )
        act_dicts = [
            {
                "activity_value": r.activity_value,
                "activity_unit": r.activity_unit,
                "value_type": r.value_type,
                "data_quality": r.data_quality,
                "cost_rate": r.cost_rate
            }
            for r in activity_records
        ]
        
        ef_list = db.query(EmissionFactor).filter(EmissionFactor.category == elem.category).all()
        ef_dicts = [{"factor_value": f.factor_value, "factor_unit": f.factor_unit, "source": f.source} for f in ef_list]
        
        elem_dict = {
            "id": elem.id,
            "name": elem.name,
            "category": elem.category,
            "scope": elem.scope,
            "campus_id": elem.campus_id,
            "campus_body_id": elem.campus_body_id
        }

        body_dict = {"name": elem.campus_body.name, "type": elem.campus_body.type} if elem.campus_body else None

        # Call recommendation engine (hybrid LLM + fallback rules)
        candidate_recs, source, fallback_reason = LLMService.generate_recommendations(
            element_data=elem_dict,
            activity_records=act_dicts,
            emission_factors=ef_dicts,
            campus_body=body_dict,
            force_refresh=req.force_refresh
        )

        for cand in candidate_recs:
            # Check for existing duplicate active recommendation to avoid clutter
            existing = (
                db.query(Recommendation)
                .filter(
                    Recommendation.element_id == elem.id,
                    Recommendation.title == cand["title"]
                )
                .first()
            )
            if existing and not req.force_refresh:
                generated_db_recs.append(existing)
                continue

            # Prioritization scoring
            p_res = PrioritizationEngine.score_recommendation(
                rec_data=cand,
                has_measured_baseline=(len(act_dicts) > 0 and act_dicts[0]["value_type"] == "measured"),
                cost_rate=act_dicts[0]["cost_rate"] if act_dicts else None
            )

            rec_obj = Recommendation(
                campus_id=target_campus,
                campus_body_id=elem.campus_body_id,
                element_id=elem.id,
                title=cand["title"],
                description=cand.get("description"),
                category=cand.get("category", elem.category),
                problem=cand["problem"],
                proposed_action=cand["proposed_action"],
                reasoning=cand["reasoning"],
                expected_environmental_benefit=cand.get("expected_environmental_benefit"),
                potential_operational_benefit=cand.get("potential_operational_benefit"),
                required_additional_info=cand.get("required_additional_info", []),
                implementation_prerequisites=cand.get("implementation_prerequisites", []),
                potential_risks_constraints=cand.get("potential_risks_constraints", []),
                confidence_score=cand.get("confidence_score", 0.85),
                priority_score=p_res["score"],
                priority_level=p_res["level"],
                status=cand.get("status", "pending_review"),
                source=source,
                evidence_references=cand.get("evidence_references", []),
                estimation_assumptions=cand.get("estimation_assumptions", {})
            )
            db.add(rec_obj)
            db.flush()

            # Generate SDG mappings
            sdg_nums = cand.get("sdgs", [13])
            mapped_sdgs = SDGMapper.map_sdgs_for_intervention(
                intervention_title=cand["title"],
                category=elem.category,
                sdg_numbers=sdg_nums,
                is_measured_outcome=False
            )
            for m in mapped_sdgs:
                sdg_record = SDGMapping(
                    recommendation_id=rec_obj.id,
                    sdg_number=m["sdg_number"],
                    sdg_title=m["sdg_title"],
                    intervention=m["intervention"],
                    explanation=m["explanation"],
                    measurable_indicator=m["measurable_indicator"],
                    supporting_evidence=m["supporting_evidence"],
                    is_measured_outcome=False
                )
                db.add(sdg_record)

            generated_db_recs.append(rec_obj)

    db.commit()
    return [_format_rec_out(r) for r in generated_db_recs]

@router.get("", response_model=List[RecommendationOut])
def list_recommendations(
    campus_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    element_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Lists recommendations with optional filters."""
    target_campus = campus_id or current_user.campus_id
    query = db.query(Recommendation).filter(Recommendation.campus_id == target_campus)
    
    if category and category.lower() != "all":
        query = query.filter(Recommendation.category == category)
    if status and status.lower() != "all":
        query = query.filter(Recommendation.status == status)
    if element_id:
        query = query.filter(Recommendation.element_id == element_id)

    recs = query.order_by(Recommendation.priority_score.desc()).all()
    return [_format_rec_out(r) for r in recs]

@router.get("/summary", response_model=RecommendationSummary)
def get_recommendation_summary(
    campus_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Returns overview statistics across all recommendations in the campus."""
    target_campus = campus_id or current_user.campus_id
    recs = db.query(Recommendation).filter(Recommendation.campus_id == target_campus).all()

    total = len(recs)
    awaiting = sum(1 for r in recs if r.status == "pending_review")
    approved = sum(1 for r in recs if r.status == "approved")
    implemented = sum(1 for r in recs if r.status == "implemented")
    rejected = sum(1 for r in recs if r.status == "rejected")
    requires_assessment = sum(1 for r in recs if r.status == "requires_assessment")

    # Calculate potential emissions reduction from active approved/proposed scenarios
    # without double-counting!
    scenarios = db.query(ReductionScenario).filter(ReductionScenario.campus_id == target_campus).all()
    scenario_results_raw = []
    for s in scenarios:
        if s.results:
            scenario_results_raw.append({
                "element_id": s.element_id,
                "title": s.title,
                "potential_reduction_kg": s.results[0].potential_reduction_kg,
                "annual_reduction_tco2e": s.results[0].annual_reduction_tco2e or 0.0
            })

    from app.carbon_engine.aggregator import CarbonAggregator
    agg_scenarios, _ = CarbonAggregator.aggregate_scenario_reductions(scenario_results_raw)

    return RecommendationSummary(
        total_recommendations=total,
        awaiting_review=awaiting,
        approved=approved,
        implemented=implemented,
        rejected=rejected,
        requires_assessment=requires_assessment,
        potential_emissions_reduction_kg=agg_scenarios["total_potential_reduction_kg"],
        potential_emissions_reduction_tco2e=agg_scenarios["total_annual_reduction_tco2e"],
        active_scenarios_count=len(scenarios)
    )

@router.get("/{recommendation_id}", response_model=RecommendationOut)
def get_recommendation_detail(
    recommendation_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Retrieves full detail of a specific recommendation."""
    rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found.")
    return _format_rec_out(rec)

@router.post("/{recommendation_id}/approve", response_model=RecommendationOut)
def approve_recommendation(
    recommendation_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Approves a recommendation for implementation planning."""
    if current_user.role == UserRole.VIEWER:
        raise HTTPException(status_code=403, detail="Viewers cannot approve recommendations.")

    rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found.")

    rec.status = "approved"
    rec.reviewed_by = current_user.user_id
    rec.reviewed_at = datetime.utcnow()
    rec.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rec)
    return _format_rec_out(rec)

@router.post("/{recommendation_id}/reject", response_model=RecommendationOut)
def reject_recommendation(
    recommendation_id: str,
    req: RecommendationRejectRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Rejects a recommendation with a documented rationale."""
    if current_user.role == UserRole.VIEWER:
        raise HTTPException(status_code=403, detail="Viewers cannot reject recommendations.")

    if not req.reason or not req.reason.strip():
        raise HTTPException(status_code=400, detail="Rejection reason is mandatory.")

    rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found.")

    rec.status = "rejected"
    rec.rejection_reason = req.reason.strip()
    rec.reviewed_by = current_user.user_id
    rec.reviewed_at = datetime.utcnow()
    rec.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rec)
    return _format_rec_out(rec)

@router.post("/{recommendation_id}/refresh", response_model=RecommendationOut)
def refresh_recommendation(
    recommendation_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Refreshes a recommendation against updated element activity."""
    if current_user.role == UserRole.VIEWER:
        raise HTTPException(status_code=403, detail="Viewers cannot refresh recommendations.")

    rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found.")

    # Call generation for this element with force_refresh
    gen_req = RecommendationGenerateRequest(
        campus_id=rec.campus_id,
        element_id=rec.element_id,
        force_refresh=True
    )
    recs = generate_recommendations(gen_req, db, current_user)
    return recs[0] if recs else _format_rec_out(rec)
