"""
Campus, CampusBody, Element, and Emission Factor endpoints for CampusCarbon AI.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import Campus, CampusBody, Element, EmissionFactor, ActivityRecord, EmissionCalculation
from app.schemas import (
    CampusOut, CampusBodyOut, ElementOut, EmissionFactorOut, ActivityRecordOut
)
from app.auth import get_current_user, CurrentUser

router = APIRouter(prefix="/api/campus", tags=["Campus & Assets"])

@router.get("", response_model=List[CampusOut])
def list_campuses(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Returns list of all campuses."""
    return db.query(Campus).all()

@router.get("/bodies", response_model=List[CampusBodyOut])
def list_campus_bodies(
    campus_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Returns campus bodies (departments, hostels, dining halls, labs)."""
    target_campus = campus_id or current_user.campus_id
    return db.query(CampusBody).filter(CampusBody.campus_id == target_campus).all()

@router.get("/elements", response_model=List[ElementOut])
def list_elements(
    campus_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Returns elements filtered by campus and category."""
    target_campus = campus_id or current_user.campus_id
    query = db.query(Element).filter(Element.campus_id == target_campus, Element.is_archived == False)
    if category:
        query = query.filter(Element.category == category)
    return query.all()

@router.get("/emission-factors", response_model=List[EmissionFactorOut])
def list_emission_factors(
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Returns verified emission factors from approved registry."""
    query = db.query(EmissionFactor)
    if category:
        query = query.filter(EmissionFactor.category == category)
    return query.all()

@router.get("/elements/{element_id}/activity", response_model=List[ActivityRecordOut])
def get_element_activity(
    element_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Returns historical activity records for a specific element."""
    element = db.query(Element).filter(Element.id == element_id).first()
    if not element:
        raise HTTPException(status_code=404, detail="Element not found.")
    return db.query(ActivityRecord).filter(ActivityRecord.element_id == element_id).order_by(ActivityRecord.reporting_period_end.desc()).all()
