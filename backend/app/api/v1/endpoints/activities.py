from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from app.core.database import get_db
from app.models.activity import ActivityDefinition
from app.schemas.activity import (
    ActivityDefinitionCreate, ActivityDefinitionUpdate, ActivityDefinitionResponse
)
from app.services.seed_phase3 import seed_phase3_catalogue

router = APIRouter(prefix="/activities", tags=["Activity Catalogue"])


@router.get("", response_model=List[ActivityDefinitionResponse])
def list_activities(
    category: Optional[str] = Query(None, description="Filter by category (e.g. electricity, water, solid_waste)"),
    search: Optional[str] = Query(None, description="Search by name, code or description"),
    is_enabled: Optional[bool] = Query(None, description="Filter by enabled status"),
    db: Session = Depends(get_db)
):
    """Retrieve all activity definitions from the database catalogue."""
    query = db.query(ActivityDefinition)
    if category:
        query = query.filter(ActivityDefinition.category == category)
    if is_enabled is not None:
        query = query.filter(ActivityDefinition.is_enabled == is_enabled)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                ActivityDefinition.name.ilike(search_pattern),
                ActivityDefinition.code.ilike(search_pattern),
                ActivityDefinition.description.ilike(search_pattern)
            )
        )
    return query.order_by(ActivityDefinition.category, ActivityDefinition.name).all()


@router.get("/{activity_id}", response_model=ActivityDefinitionResponse)
def get_activity(activity_id: str, db: Session = Depends(get_db)):
    """Retrieve details for a specific activity definition."""
    activity = db.query(ActivityDefinition).filter(ActivityDefinition.id == activity_id).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity definition with ID '{activity_id}' not found."
        )
    return activity


@router.post("", response_model=ActivityDefinitionResponse, status_code=status.HTTP_201_CREATED)
def create_activity(payload: ActivityDefinitionCreate, db: Session = Depends(get_db)):
    """Add a new activity definition to the institutional catalogue."""
    existing = db.query(ActivityDefinition).filter(ActivityDefinition.code == payload.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Activity definition with code '{payload.code}' already exists."
        )

    activity = ActivityDefinition(**payload.model_dump())
    db.add(activity)
    try:
        db.commit()
        db.refresh(activity)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflict with existing activity definition."
        )
    return activity


@router.put("/{activity_id}", response_model=ActivityDefinitionResponse)
def update_activity(activity_id: str, payload: ActivityDefinitionUpdate, db: Session = Depends(get_db)):
    """Update activity metadata or supported units."""
    activity = db.query(ActivityDefinition).filter(ActivityDefinition.id == activity_id).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity definition with ID '{activity_id}' not found."
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(activity, field, val)

    db.commit()
    db.refresh(activity)
    return activity


@router.post("/seed", status_code=status.HTTP_200_OK)
def seed_activity_catalogue(db: Session = Depends(get_db)):
    """Idempotently seed the canonical Phase 3 activity catalogue and block assignments."""
    return seed_phase3_catalogue(db)
