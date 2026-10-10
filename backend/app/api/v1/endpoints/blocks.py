from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from sqlalchemy.exc import IntegrityError
from app.core.database import get_db
from app.models.block import CampusBlock
from app.models.campus import Campus
from app.schemas.block import (
    BlockCreate, BlockUpdate, BlockResponse,
    BlockListResponse, CategoryStat, BlockCategory,
    CATEGORY_DISPLAY_CONFIG
)

router = APIRouter(prefix="/blocks", tags=["Campus Blocks"])


def _format_block_response(b: CampusBlock) -> BlockResponse:
    resp = BlockResponse.model_validate(b)
    meta = CATEGORY_DISPLAY_CONFIG.get(b.category, {})
    resp.category_label = meta.get("label", b.category.replace("_", " ").title())
    return resp


@router.get("", response_model=BlockListResponse)
def list_blocks(
    campus_id: Optional[str] = Query(None, description="Filter by campus UUID"),
    category: Optional[str] = Query(None, description="Filter by operational category"),
    search: Optional[str] = Query(None, description="Search by name, code or description"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db)
):
    """
    Search and retrieve campus blocks with category and text filters.
    Includes comprehensive category summary statistics for UI badges and counters.
    """
    query = db.query(CampusBlock)

    if campus_id:
        query = query.filter(CampusBlock.campus_id == campus_id)
    if category:
        query = query.filter(CampusBlock.category == category)
    if is_active is not None:
        query = query.filter(CampusBlock.is_active == is_active)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                CampusBlock.name.ilike(search_pattern),
                CampusBlock.code.ilike(search_pattern),
                CampusBlock.description.ilike(search_pattern)
            )
        )

    blocks = query.order_by(CampusBlock.category, CampusBlock.name).all()
    items = [_format_block_response(b) for b in blocks]

    # Calculate category summary across the filtered campus or whole dataset
    base_summary_query = db.query(
        CampusBlock.category,
        func.count(CampusBlock.id).label("count"),
        func.coalesce(func.sum(CampusBlock.floor_area_sqm), 0.0).label("total_area"),
        func.coalesce(func.sum(CampusBlock.occupant_capacity), 0).label("total_capacity")
    )
    if campus_id:
        base_summary_query = base_summary_query.filter(CampusBlock.campus_id == campus_id)

    stats = base_summary_query.group_by(CampusBlock.category).all()
    summary_list: List[CategoryStat] = []
    
    # Ensure all defined categories are present in summary
    stats_map = {s[0]: s for s in stats}
    for cat in BlockCategory:
        c_val = cat.value
        s_data = stats_map.get(c_val)
        meta = CATEGORY_DISPLAY_CONFIG.get(c_val, {})
        summary_list.append(
            CategoryStat(
                category=c_val,
                label=meta.get("label", c_val.replace("_", " ").title()),
                count=s_data[1] if s_data else 0,
                total_floor_area_sqm=float(s_data[2]) if s_data else 0.0,
                total_capacity=int(s_data[3]) if s_data else 0
            )
        )

    return BlockListResponse(
        total=len(items),
        campus_id=campus_id,
        items=items,
        category_summary=summary_list
    )


@router.get("/categories", response_model=List[CategoryStat])
def get_categories_overview(
    campus_id: Optional[str] = Query(None, description="Campus UUID"),
    db: Session = Depends(get_db)
):
    """Retrieve category overview statistics across all campus facilities."""
    query = db.query(
        CampusBlock.category,
        func.count(CampusBlock.id).label("count"),
        func.coalesce(func.sum(CampusBlock.floor_area_sqm), 0.0).label("total_area"),
        func.coalesce(func.sum(CampusBlock.occupant_capacity), 0).label("total_capacity")
    )
    if campus_id:
        query = query.filter(CampusBlock.campus_id == campus_id)

    stats = query.group_by(CampusBlock.category).all()
    stats_map = {s[0]: s for s in stats}

    results: List[CategoryStat] = []
    for cat in BlockCategory:
        c_val = cat.value
        s_data = stats_map.get(c_val)
        meta = CATEGORY_DISPLAY_CONFIG.get(c_val, {})
        results.append(
            CategoryStat(
                category=c_val,
                label=meta.get("label", c_val.replace("_", " ").title()),
                count=s_data[1] if s_data else 0,
                total_floor_area_sqm=float(s_data[2]) if s_data else 0.0,
                total_capacity=int(s_data[3]) if s_data else 0
            )
        )
    return results


@router.get("/{block_id}", response_model=BlockResponse)
def get_block(block_id: str, db: Session = Depends(get_db)):
    """Retrieve detailed metadata for a specific block."""
    block = db.query(CampusBlock).filter(CampusBlock.id == block_id).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campus block with ID '{block_id}' not found."
        )
    return _format_block_response(block)


@router.post("", response_model=BlockResponse, status_code=status.HTTP_201_CREATED)
def create_block(payload: BlockCreate, db: Session = Depends(get_db)):
    """Add a new physical block to campus inventory."""
    campus = db.query(Campus).filter(Campus.id == payload.campus_id).first()
    if not campus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campus with ID '{payload.campus_id}' does not exist."
        )

    # Check unique constraints on (campus_id, name) and (campus_id, code)
    existing_name = db.query(CampusBlock).filter(
        CampusBlock.campus_id == payload.campus_id,
        CampusBlock.name == payload.name
    ).first()
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Block with name '{payload.name}' already exists in this campus."
        )

    existing_code = db.query(CampusBlock).filter(
        CampusBlock.campus_id == payload.campus_id,
        CampusBlock.code == payload.code
    ).first()
    if existing_code:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Block with code '{payload.code}' already exists in this campus."
        )

    block = CampusBlock(**payload.model_dump())
    db.add(block)
    try:
        db.commit()
        db.refresh(block)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflict or constraint violation while creating block."
        )

    return _format_block_response(block)


@router.put("/{block_id}", response_model=BlockResponse)
def update_block(block_id: str, payload: BlockUpdate, db: Session = Depends(get_db)):
    """Update block configuration, capacity, or area attributes."""
    block = db.query(CampusBlock).filter(CampusBlock.id == block_id).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campus block with ID '{block_id}' not found."
        )

    update_data = payload.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != block.name:
        dup = db.query(CampusBlock).filter(
            CampusBlock.campus_id == block.campus_id,
            CampusBlock.name == update_data["name"],
            CampusBlock.id != block.id
        ).first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another block in this campus already has the name '{update_data['name']}'."
            )

    if "code" in update_data and update_data["code"] != block.code:
        dup = db.query(CampusBlock).filter(
            CampusBlock.campus_id == block.campus_id,
            CampusBlock.code == update_data["code"],
            CampusBlock.id != block.id
        ).first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another block in this campus already has the code '{update_data['code']}'."
            )

    for field, val in update_data.items():
        setattr(block, field, val)

    try:
        db.commit()
        db.refresh(block)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Constraint violation while updating block."
        )

    return _format_block_response(block)


@router.delete("/{block_id}", status_code=status.HTTP_200_OK)
def delete_block(block_id: str, db: Session = Depends(get_db)):
    """Safely delete a block from inventory."""
    block = db.query(CampusBlock).filter(CampusBlock.id == block_id).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campus block with ID '{block_id}' not found."
        )

    name = block.name
    db.delete(block)
    db.commit()
    return {"message": f"Block '{name}' removed from inventory successfully."}
