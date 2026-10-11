import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.sdg_mapping import get_all_campus_sdgs, get_sdg_by_number
from app.schemas.sustainability import (
    SDGGoalSchema,
    RecommendationResponse,
    RecommendationStatusUpdate,
    InstitutionalEvidenceResponse,
    InstitutionalEvidenceCreate,
    InstitutionalEvidenceUpdate,
    SustainabilitySummaryResponse,
)
from app.services.sustainability_service import SustainabilityService
from app.models.sustainability import InstitutionalEvidence

router = APIRouter()


@router.get("/sdgs", response_model=List[SDGGoalSchema])
def list_sdgs():
    """Retrieve all structured UN Sustainable Development Goal mappings for campus operations."""
    return get_all_campus_sdgs()


@router.get("/sdgs/{goal_num}", response_model=SDGGoalSchema)
def get_sdg(goal_num: int):
    """Retrieve metadata and specific indicators for a single SDG."""
    sdg = get_sdg_by_number(goal_num)
    if not sdg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SDG Goal {goal_num} is not mapped in campus sustainability catalog."
        )
    return sdg


@router.get("/summary", response_model=SustainabilitySummaryResponse)
def get_sustainability_summary(
    campus_id: Optional[str] = Query(None, description="Campus UUID"),
    db: Session = Depends(get_db)
):
    """Retrieve comprehensive campus sustainability, SDG alignment, and decarbonization summary."""
    summary = SustainabilityService.get_sustainability_summary(db, campus_id=campus_id)
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campus sustainability metrics could not be computed."
        )
    return summary


@router.get("/recommendations", response_model=List[RecommendationResponse])
def list_recommendations(
    campus_id: Optional[str] = Query(None, description="Campus UUID"),
    category: Optional[str] = Query(None, description="Category filter"),
    status: Optional[str] = Query(None, description="Status filter: proposed, approved, in_progress, completed, rejected"),
    db: Session = Depends(get_db)
):
    """List actionable decarbonization and sustainability recommendations."""
    return SustainabilityService.list_recommendations(
        db, campus_id=campus_id, category=category, status=status
    )


@router.post("/recommendations/generate", response_model=List[RecommendationResponse])
def generate_recommendations(
    campus_id: Optional[str] = Query(None, description="Campus UUID"),
    db: Session = Depends(get_db)
):
    """Trigger deterministic recommendation generation based on current telemetry and baselines."""
    return SustainabilityService.generate_recommendations(db, campus_id=campus_id)


@router.patch("/recommendations/{rec_id}/status", response_model=RecommendationResponse)
def update_recommendation_status(
    rec_id: str,
    payload: RecommendationStatusUpdate,
    db: Session = Depends(get_db)
):
    """Update implementation status of a recommendation (proposed, approved, in_progress, completed, rejected)."""
    valid_statuses = {"proposed", "approved", "in_progress", "completed", "rejected"}
    if payload.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status '{payload.status}'. Must be one of: {list(valid_statuses)}"
        )

    updated = SustainabilityService.update_recommendation_status(db, rec_id=rec_id, new_status=payload.status)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recommendation with ID '{rec_id}' not found."
        )
    return updated


@router.get("/evidence", response_model=List[InstitutionalEvidenceResponse])
def list_evidence(
    campus_id: Optional[str] = Query(None, description="Campus UUID"),
    category: Optional[str] = Query(None, description="Category filter"),
    status: Optional[str] = Query(None, description="Verification status filter"),
    db: Session = Depends(get_db)
):
    """List institutional assessment evidence items for NIRF, NAAC, and SDG compliance."""
    return SustainabilityService.list_evidence(
        db, campus_id=campus_id, category=category, status=status
    )


@router.post("/evidence", response_model=InstitutionalEvidenceResponse, status_code=status.HTTP_201_CREATED)
def create_evidence(
    payload: InstitutionalEvidenceCreate,
    db: Session = Depends(get_db)
):
    """Register a new institutional evidence document or verification record."""
    evi = InstitutionalEvidence(
        campus_id=payload.campus_id,
        title=payload.title,
        category=payload.category,
        reference_number=payload.reference_number,
        reporting_period=payload.reporting_period,
        associated_sdgs=json.dumps(payload.associated_sdgs),
        framework_tags=json.dumps(payload.framework_tags),
        verification_status=payload.verification_status,
        document_url_or_ref=payload.document_url_or_ref,
        description=payload.description
    )
    db.add(evi)
    db.commit()
    db.refresh(evi)
    return SustainabilityService._format_evidence(evi)


@router.post("/seed")
def seed_sustainability_baseline(
    campus_id: Optional[str] = Query(None, description="Campus UUID"),
    db: Session = Depends(get_db)
):
    """Seed canonical institutional evidence and baseline recommendations for Coimbatore Campus."""
    recs = SustainabilityService.generate_recommendations(db, campus_id=campus_id)
    cid = campus_id if campus_id else (recs[0]["campus_id"] if recs else None)
    if cid:
        evidence = SustainabilityService.seed_initial_evidence(db, campus_id=cid)
    else:
        evidence = []

    return {
        "message": "Sustainability baseline seeded successfully.",
        "recommendations_count": len(recs),
        "evidence_items_count": len(evidence),
    }
