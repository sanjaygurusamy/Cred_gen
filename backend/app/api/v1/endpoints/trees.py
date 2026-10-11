"""
Trees, Green Spaces, Plantations & Carbon Sequestration Endpoints
Organization: Amrita Vishwa Vidyapeetham | Coimbatore Campus (AVV-CBE)
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.tree_service import TreeService
from app.schemas.trees import (
    GreenSpaceCreate, GreenSpaceUpdate, GreenSpaceResponse,
    TreeInventoryCreate, TreeInventoryUpdate, TreeInventoryResponse,
    PlantationRecordCreate, PlantationRecordUpdate, PlantationRecordResponse,
    SequestrationSummary
)

router = APIRouter(prefix="/trees", tags=["Trees, Plantation & Sequestration"])


# ---------------------------------------------------------------------------
# Sequestration & Analytics
# ---------------------------------------------------------------------------

@router.get("/summary", response_model=SequestrationSummary)
def get_sequestration_summary(
    campus_id: Optional[str] = Query(None, description="Campus ID filter"),
    db: Session = Depends(get_db)
):
    """
    Returns aggregated campus tree inventory, green space coverage, and annual
    allometric carbon sequestration estimates based on IPCC/FSI standards.
    """
    service = TreeService(db)
    # Proactively ensure initial seed data exists if table is empty
    service.seed_initial_trees_and_plantations()
    return service.get_sequestration_summary(campus_id)


@router.post("/seed")
def seed_trees_data(db: Session = Depends(get_db)):
    """Seeds canonical tree species, green spaces, and plantation records for Coimbatore campus."""
    service = TreeService(db)
    result = service.seed_initial_trees_and_plantations()
    return {"message": "Tree inventory and green spaces seeded successfully.", "seeded": result}


# ---------------------------------------------------------------------------
# Tree Inventory
# ---------------------------------------------------------------------------

@router.get("/inventory", response_model=List[TreeInventoryResponse])
def list_tree_inventory(
    campus_id: Optional[str] = Query(None),
    block_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Lists standing tree inventory with health, age, count, and sequestration."""
    service = TreeService(db)
    service.seed_initial_trees_and_plantations()
    return service.list_trees(campus_id=campus_id, block_id=block_id)


@router.post("/inventory", response_model=TreeInventoryResponse, status_code=status.HTTP_201_CREATED)
def create_tree_inventory(
    data: TreeInventoryCreate,
    db: Session = Depends(get_db)
):
    """Creates a new tree inventory entry with automatic allometric sequestration calculation."""
    service = TreeService(db)
    tree = service.create_tree_inventory(data)
    trees = service.list_trees()
    matching = next((t for t in trees if t["id"] == tree.id), None)
    return matching or tree


@router.put("/inventory/{tree_id}", response_model=TreeInventoryResponse)
def update_tree_inventory(
    tree_id: str,
    data: TreeInventoryUpdate,
    db: Session = Depends(get_db)
):
    """Updates an existing tree inventory entry and recalculates sequestration."""
    service = TreeService(db)
    tree = service.update_tree_inventory(tree_id, data)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree inventory entry not found.")
    trees = service.list_trees()
    matching = next((t for t in trees if t["id"] == tree_id), None)
    return matching or tree


@router.delete("/inventory/{tree_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tree_inventory(
    tree_id: str,
    db: Session = Depends(get_db)
):
    """Removes a tree inventory entry."""
    service = TreeService(db)
    if not service.delete_tree_inventory(tree_id):
        raise HTTPException(status_code=404, detail="Tree inventory entry not found.")
    return None


# ---------------------------------------------------------------------------
# Green Spaces
# ---------------------------------------------------------------------------

@router.get("/green-spaces", response_model=List[GreenSpaceResponse])
def list_green_spaces(
    campus_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Lists campus green spaces, Miyawaki forests, and herbal gardens."""
    service = TreeService(db)
    service.seed_initial_trees_and_plantations()
    return service.list_green_spaces(campus_id)


@router.post("/green-spaces", response_model=GreenSpaceResponse, status_code=status.HTTP_201_CREATED)
def create_green_space(
    data: GreenSpaceCreate,
    db: Session = Depends(get_db)
):
    """Creates a new green space or garden zone."""
    service = TreeService(db)
    gs = service.create_green_space(data)
    spaces = service.list_green_spaces()
    matching = next((s for s in spaces if s["id"] == gs.id), None)
    return matching or gs


@router.put("/green-spaces/{space_id}", response_model=GreenSpaceResponse)
def update_green_space(
    space_id: str,
    data: GreenSpaceUpdate,
    db: Session = Depends(get_db)
):
    """Updates green space details."""
    service = TreeService(db)
    gs = service.update_green_space(space_id, data)
    if not gs:
        raise HTTPException(status_code=404, detail="Green space not found.")
    spaces = service.list_green_spaces()
    matching = next((s for s in spaces if s["id"] == space_id), None)
    return matching or gs


# ---------------------------------------------------------------------------
# Plantation Records
# ---------------------------------------------------------------------------

@router.get("/plantations", response_model=List[PlantationRecordResponse])
def list_plantation_records(
    campus_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Lists campus plantation drives, survival counts, and monitoring notes."""
    service = TreeService(db)
    service.seed_initial_trees_and_plantations()
    return service.list_plantations(campus_id)


@router.post("/plantations", response_model=PlantationRecordResponse, status_code=status.HTTP_201_CREATED)
def create_plantation_record(
    data: PlantationRecordCreate,
    db: Session = Depends(get_db)
):
    """Creates a new plantation drive record with survival rate calculation."""
    if data.saplings_surviving > data.saplings_planted:
        raise HTTPException(
            status_code=400,
            detail="Surviving saplings cannot exceed total saplings planted."
        )
    service = TreeService(db)
    pr = service.create_plantation(data)
    records = service.list_plantations()
    matching = next((r for r in records if r["id"] == pr.id), None)
    return matching or pr


@router.put("/plantations/{record_id}", response_model=PlantationRecordResponse)
def update_plantation_record(
    record_id: str,
    data: PlantationRecordUpdate,
    db: Session = Depends(get_db)
):
    """Updates a plantation drive record."""
    if data.saplings_planted is not None and data.saplings_surviving is not None:
        if data.saplings_surviving > data.saplings_planted:
            raise HTTPException(
                status_code=400,
                detail="Surviving saplings cannot exceed total saplings planted."
            )
    service = TreeService(db)
    pr = service.update_plantation(record_id, data)
    if not pr:
        raise HTTPException(status_code=404, detail="Plantation record not found.")
    records = service.list_plantations()
    matching = next((r for r in records if r["id"] == record_id), None)
    return matching or pr
