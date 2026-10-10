from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.database import get_db
from app.models.campus import Campus
from app.models.organization import Organization
from app.schemas.campus import (
    CampusCreate, CampusUpdate,
    CampusResponse, CampusDetailResponse
)
from app.schemas.block import BlockResponse, CATEGORY_DISPLAY_CONFIG
from app.services.seed_phase2 import seed_phase2_inventory

router = APIRouter(prefix="/campuses", tags=["Campuses"])


@router.get("", response_model=List[CampusResponse])
def list_campuses(
    organization_id: Optional[str] = Query(None, description="Filter campuses by organization UUID"),
    db: Session = Depends(get_db)
):
    """Retrieve all university campuses with facility counts."""
    query = db.query(Campus)
    if organization_id:
        query = query.filter(Campus.organization_id == organization_id)
    campuses = query.order_by(Campus.name).all()

    results = []
    for c in campuses:
        resp = CampusResponse.model_validate(c)
        resp.block_count = len(c.blocks)
        results.append(resp)
    return results


@router.get("/{campus_id}", response_model=CampusDetailResponse)
def get_campus(campus_id: str, db: Session = Depends(get_db)):
    """Retrieve a specific campus with its complete block inventory."""
    c = db.query(Campus).filter(Campus.id == campus_id).first()
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campus with ID '{campus_id}' not found."
        )

    resp = CampusDetailResponse.model_validate(c)
    resp.block_count = len(c.blocks)
    block_resps = []
    for b in c.blocks:
        b_resp = BlockResponse.model_validate(b)
        meta = CATEGORY_DISPLAY_CONFIG.get(b.category, {})
        b_resp.category_label = meta.get("label", b.category.replace("_", " ").title())
        block_resps.append(b_resp)
    resp.blocks = block_resps
    return resp


@router.post("", response_model=CampusResponse, status_code=status.HTTP_201_CREATED)
def create_campus(payload: CampusCreate, db: Session = Depends(get_db)):
    """Add a new physical campus to an organization."""
    org = db.query(Organization).filter(Organization.id == payload.organization_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with ID '{payload.organization_id}' does not exist."
        )

    existing = db.query(Campus).filter(
        Campus.organization_id == payload.organization_id,
        (Campus.code == payload.code) | (Campus.name == payload.name)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Campus with name '{payload.name}' or code '{payload.code}' already exists for this organization."
        )

    campus = Campus(**payload.model_dump())
    db.add(campus)
    try:
        db.commit()
        db.refresh(campus)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflict or constraint violation while creating campus."
        )

    resp = CampusResponse.model_validate(campus)
    resp.block_count = 0
    return resp


@router.put("/{campus_id}", response_model=CampusResponse)
def update_campus(campus_id: str, payload: CampusUpdate, db: Session = Depends(get_db)):
    """Update campus metadata."""
    campus = db.query(Campus).filter(Campus.id == campus_id).first()
    if not campus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campus with ID '{campus_id}' not found."
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(campus, field, val)

    try:
        db.commit()
        db.refresh(campus)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflict with another campus in the same organization."
        )

    resp = CampusResponse.model_validate(campus)
    resp.block_count = len(campus.blocks)
    return resp


@router.delete("/{campus_id}", status_code=status.HTTP_200_OK)
def delete_campus(campus_id: str, db: Session = Depends(get_db)):
    """Delete a campus and all affiliated blocks."""
    campus = db.query(Campus).filter(Campus.id == campus_id).first()
    if not campus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campus with ID '{campus_id}' not found."
        )

    name = campus.name
    db.delete(campus)
    db.commit()
    return {"message": f"Campus '{name}' deleted successfully."}


@router.post("/seed", status_code=status.HTTP_200_OK)
def seed_inventory(db: Session = Depends(get_db)):
    """
    Idempotent seeding endpoint for Coimbatore Campus and the 27 required blocks.
    Can be invoked safely without creating duplicate blocks or campuses.
    """
    result = seed_phase2_inventory(db)
    return result
