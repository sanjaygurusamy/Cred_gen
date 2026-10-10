from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.database import get_db
from app.models.block import CampusBlock
from app.models.activity import ActivityDefinition, BlockActivityAssignment
from app.schemas.activity import (
    BlockActivityAssignmentCreate, BlockActivityAssignmentResponse,
    BlockActivitiesSummaryResponse
)

router = APIRouter(prefix="/blocks", tags=["Block Activity Assignments"])


@router.get("/{block_id}/activities", response_model=BlockActivitiesSummaryResponse)
def get_block_activities(block_id: str, db: Session = Depends(get_db)):
    """Retrieve all activities assigned to a specific campus block."""
    block = db.query(CampusBlock).filter(CampusBlock.id == block_id).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campus block with ID '{block_id}' not found."
        )

    assignments = db.query(BlockActivityAssignment).filter(
        BlockActivityAssignment.block_id == block_id,
        BlockActivityAssignment.is_enabled == True
    ).all()

    items = []
    for a in assignments:
        resp = BlockActivityAssignmentResponse.model_validate(a)
        items.append(resp)

    return BlockActivitiesSummaryResponse(
        block_id=block.id,
        block_name=block.name,
        block_code=block.code,
        total_assigned=len(items),
        activities=items
    )


@router.post("/{block_id}/activities", response_model=BlockActivityAssignmentResponse, status_code=status.HTTP_201_CREATED)
def assign_activity_to_block(
    block_id: str,
    payload: BlockActivityAssignmentCreate,
    db: Session = Depends(get_db)
):
    """Assign an activity definition to a campus block."""
    block = db.query(CampusBlock).filter(CampusBlock.id == block_id).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campus block with ID '{block_id}' not found."
        )

    activity = db.query(ActivityDefinition).filter(ActivityDefinition.id == payload.activity_id).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity definition with ID '{payload.activity_id}' not found."
        )

    existing = db.query(BlockActivityAssignment).filter(
        BlockActivityAssignment.block_id == block_id,
        BlockActivityAssignment.activity_id == payload.activity_id
    ).first()
    if existing:
        if not existing.is_enabled:
            existing.is_enabled = True
            db.commit()
            db.refresh(existing)
            return BlockActivityAssignmentResponse.model_validate(existing)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Activity '{activity.name}' is already assigned to block '{block.name}'."
        )

    assignment = BlockActivityAssignment(
        block_id=block_id,
        activity_id=payload.activity_id,
        is_enabled=payload.is_enabled,
        custom_unit=payload.custom_unit,
        notes=payload.notes
    )
    db.add(assignment)
    try:
        db.commit()
        db.refresh(assignment)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Assignment already exists."
        )

    return BlockActivityAssignmentResponse.model_validate(assignment)


@router.delete("/{block_id}/activities/{activity_id}", status_code=status.HTTP_200_OK)
def remove_activity_from_block(
    block_id: str,
    activity_id: str,
    db: Session = Depends(get_db)
):
    """Remove or disable an activity assignment for a campus block."""
    assignment = db.query(BlockActivityAssignment).filter(
        BlockActivityAssignment.block_id == block_id,
        BlockActivityAssignment.activity_id == activity_id
    ).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment between block and activity not found."
        )

    db.delete(assignment)
    db.commit()
    return {"message": "Activity assignment removed successfully."}
