from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.database import get_db
from app.models.organization import Organization
from app.schemas.organization import (
    OrganizationCreate, OrganizationUpdate,
    OrganizationResponse, OrganizationWithCampuses
)

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("", response_model=List[OrganizationResponse])
def list_organizations(db: Session = Depends(get_db)):
    """Retrieve all institutional organizations."""
    orgs = db.query(Organization).order_by(Organization.name).all()
    results = []
    for org in orgs:
        resp = OrganizationResponse.model_validate(org)
        resp.campuses_count = len(org.campuses)
        results.append(resp)
    return results


@router.get("/{org_id}", response_model=OrganizationWithCampuses)
def get_organization(org_id: str, db: Session = Depends(get_db)):
    """Retrieve a specific organization with its campus affiliations."""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with ID '{org_id}' not found."
        )
    resp = OrganizationWithCampuses.model_validate(org)
    resp.campuses_count = len(org.campuses)
    return resp


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(payload: OrganizationCreate, db: Session = Depends(get_db)):
    """Register a new institution or university organization."""
    existing_code = db.query(Organization).filter(Organization.code == payload.code).first()
    if existing_code:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Organization code '{payload.code}' is already registered."
        )
    existing_name = db.query(Organization).filter(Organization.name == payload.name).first()
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Organization with name '{payload.name}' already exists."
        )

    org = Organization(**payload.model_dump())
    db.add(org)
    try:
        db.commit()
        db.refresh(org)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Integrity violation while creating organization."
        )

    resp = OrganizationResponse.model_validate(org)
    resp.campuses_count = 0
    return resp


@router.put("/{org_id}", response_model=OrganizationResponse)
def update_organization(org_id: str, payload: OrganizationUpdate, db: Session = Depends(get_db)):
    """Update organization attributes."""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with ID '{org_id}' not found."
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(org, field, val)

    try:
        db.commit()
        db.refresh(org)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflict with existing organization name or code."
        )

    resp = OrganizationResponse.model_validate(org)
    resp.campuses_count = len(org.campuses)
    return resp


@router.delete("/{org_id}", status_code=status.HTTP_200_OK)
def delete_organization(org_id: str, db: Session = Depends(get_db)):
    """Delete an organization and associated campuses with safeguards."""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with ID '{org_id}' not found."
        )

    name = org.name
    db.delete(org)
    db.commit()
    return {"message": f"Organization '{name}' deleted successfully."}
