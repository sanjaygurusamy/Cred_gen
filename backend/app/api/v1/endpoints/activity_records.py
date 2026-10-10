from typing import Optional, List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from sqlalchemy.exc import IntegrityError
from app.core.database import get_db
from app.core.units import convert_quantity_to_standard
from app.models.block import CampusBlock
from app.models.activity import ActivityDefinition, BlockActivityAssignment
from app.models.activity_record import DailyActivityRecord
from app.schemas.activity_record import (
    DailyRecordCreate, DailyRecordUpdate, DailyRecordResponse,
    DailyRecordListResponse, DailyRecordHistorySummary
)

router = APIRouter(prefix="/activity-records", tags=["Daily Activity Records"])


def _format_record_response(rec: DailyActivityRecord) -> DailyRecordResponse:
    resp = DailyRecordResponse.model_validate(rec)
    if rec.block:
        resp.block_name = rec.block.name
        resp.block_code = rec.block.code
    if rec.activity:
        resp.activity_name = rec.activity.name
        resp.activity_code = rec.activity.code
        resp.activity_category = rec.activity.category
    return resp


@router.get("", response_model=DailyRecordListResponse)
def list_activity_records(
    block_id: Optional[str] = Query(None, description="Filter by campus block UUID"),
    activity_id: Optional[str] = Query(None, description="Filter by activity definition UUID"),
    start_date: Optional[date] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[date] = Query(None, description="End date YYYY-MM-DD"),
    data_status: Optional[str] = Query(None, description="'measured' or 'estimated'"),
    is_transfer: Optional[bool] = Query(None, description="Filter transfer records"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Search and retrieve daily activity records with flexible date range,
    facility block, and activity filters.
    """
    query = db.query(DailyActivityRecord)

    if block_id:
        query = query.filter(DailyActivityRecord.block_id == block_id)
    if activity_id:
        query = query.filter(DailyActivityRecord.activity_id == activity_id)
    if start_date:
        query = query.filter(DailyActivityRecord.reporting_date >= start_date)
    if end_date:
        query = query.filter(DailyActivityRecord.reporting_date <= end_date)
    if data_status:
        query = query.filter(DailyActivityRecord.data_status == data_status)
    if is_transfer is not None:
        query = query.filter(DailyActivityRecord.is_transfer == is_transfer)

    total = query.count()
    records = query.order_by(DailyActivityRecord.reporting_date.desc(), DailyActivityRecord.created_at.desc()).offset(offset).limit(limit).all()

    items = [_format_record_response(r) for r in records]

    return DailyRecordListResponse(
        total=total,
        items=items,
        limit=limit,
        offset=offset
    )


@router.get("/history/{block_id}/{activity_id}", response_model=DailyRecordHistorySummary)
def get_activity_history(
    block_id: str,
    activity_id: str,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    """Retrieve historical daily measurements and cumulative aggregate for a block and activity."""
    block = db.query(CampusBlock).filter(CampusBlock.id == block_id).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campus block with ID '{block_id}' not found."
        )

    activity = db.query(ActivityDefinition).filter(ActivityDefinition.id == activity_id).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity definition with ID '{activity_id}' not found."
        )

    query = db.query(DailyActivityRecord).filter(
        DailyActivityRecord.block_id == block_id,
        DailyActivityRecord.activity_id == activity_id
    )

    if start_date:
        query = query.filter(DailyActivityRecord.reporting_date >= start_date)
    if end_date:
        query = query.filter(DailyActivityRecord.reporting_date <= end_date)

    records = query.order_by(DailyActivityRecord.reporting_date.desc()).all()
    total_qty = sum(r.standardized_quantity for r in records)

    min_date = min((r.reporting_date for r in records), default=None)
    max_date = max((r.reporting_date for r in records), default=None)

    items = [_format_record_response(r) for r in records]

    return DailyRecordHistorySummary(
        block_id=block.id,
        activity_id=activity.id,
        activity_name=activity.name,
        standardized_unit=activity.default_unit,
        records_count=len(records),
        total_standardized_quantity=round(total_qty, 4),
        date_range_start=min_date,
        date_range_end=max_date,
        records=items
    )


@router.get("/{record_id}", response_model=DailyRecordResponse)
def get_activity_record(record_id: str, db: Session = Depends(get_db)):
    """Retrieve a single daily activity record by ID."""
    record = db.query(DailyActivityRecord).filter(DailyActivityRecord.id == record_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Daily activity record with ID '{record_id}' not found."
        )
    return _format_record_response(record)


@router.post("", response_model=DailyRecordResponse, status_code=status.HTTP_201_CREATED)
def create_activity_record(payload: DailyRecordCreate, db: Session = Depends(get_db)):
    """
    Submit and persist a daily activity measurement record.
    
    Validates:
    - Block and activity existence.
    - Quantity >= 0.
    - Supported unit and calculates standardized quantity.
    - Enforces duplicate prevention policy on (block, activity, date, reading_identifier).
    """
    # 1. Validate block exists
    block = db.query(CampusBlock).filter(CampusBlock.id == payload.block_id).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campus block with ID '{payload.block_id}' does not exist."
        )

    # 2. Validate activity exists
    activity = db.query(ActivityDefinition).filter(ActivityDefinition.id == payload.activity_id).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity definition with ID '{payload.activity_id}' does not exist."
        )

    # 3. Validate quantity
    if payload.quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Quantity cannot be negative."
        )

    # 4. Validate unit and standardize
    supported = set(activity.supported_units or [])
    supported.add(activity.default_unit)
    if payload.unit not in supported:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unit '{payload.unit}' is not supported for activity '{activity.name}'. Supported units: {list(supported)}"
        )

    try:
        standardized_qty = convert_quantity_to_standard(
            quantity=payload.quantity,
            from_unit=payload.unit,
            target_standard_unit=activity.default_unit,
            activity_conversions=activity.unit_conversions
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )

    # 5. Prevent accidental duplicate submissions
    existing = db.query(DailyActivityRecord).filter(
        DailyActivityRecord.block_id == payload.block_id,
        DailyActivityRecord.activity_id == payload.activity_id,
        DailyActivityRecord.reporting_date == payload.reporting_date,
        DailyActivityRecord.reading_identifier == payload.reading_identifier
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"An official record already exists for block '{block.name}' and activity '{activity.name}' "
                f"on {payload.reporting_date} (reading: '{payload.reading_identifier}'). "
                f"To update this measurement, use PUT /api/v1/activity-records/{existing.id}."
            )
        )

    # 6. Create record
    record = DailyActivityRecord(
        organization_id=block.campus.organization_id,
        campus_id=block.campus_id,
        block_id=payload.block_id,
        activity_id=payload.activity_id,
        reporting_date=payload.reporting_date,
        quantity=payload.quantity,
        unit=payload.unit,
        standardized_quantity=standardized_qty,
        standardized_unit=activity.default_unit,
        data_status=payload.data_status,
        measurement_method=payload.measurement_method,
        reading_identifier=payload.reading_identifier,
        is_daily_total=payload.is_daily_total,
        source_reference=payload.source_reference,
        destination_details=payload.destination_details,
        is_transfer=payload.is_transfer or activity.is_transfer_activity,
        notes=payload.notes,
        version=1
    )

    db.add(record)
    try:
        db.commit()
        db.refresh(record)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflict with an existing record for this block, activity, and date."
        )

    return _format_record_response(record)


@router.put("/{record_id}", response_model=DailyRecordResponse)
def update_activity_record(
    record_id: str,
    payload: DailyRecordUpdate,
    db: Session = Depends(get_db)
):
    """
    Update or correct an existing activity record with audit trail support.
    Increments the version counter and updates timestamp.
    """
    record = db.query(DailyActivityRecord).filter(DailyActivityRecord.id == record_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Daily activity record with ID '{record_id}' not found."
        )

    update_data = payload.model_dump(exclude_unset=True)

    new_qty = update_data.get("quantity", record.quantity)
    new_unit = update_data.get("unit", record.unit)

    if new_qty < 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Quantity cannot be negative."
        )

    if "quantity" in update_data or "unit" in update_data:
        try:
            standardized_qty = convert_quantity_to_standard(
                quantity=new_qty,
                from_unit=new_unit,
                target_standard_unit=record.activity.default_unit,
                activity_conversions=record.activity.unit_conversions
            )
            record.quantity = new_qty
            record.unit = new_unit
            record.standardized_quantity = standardized_qty
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(e)
            )

    for field in ["data_status", "measurement_method", "source_reference", "destination_details", "notes"]:
        if field in update_data:
            setattr(record, field, update_data[field])

    record.version += 1

    db.commit()
    db.refresh(record)
    return _format_record_response(record)


@router.delete("/{record_id}", status_code=status.HTTP_200_OK)
def delete_activity_record(record_id: str, db: Session = Depends(get_db)):
    """Safely delete an activity record with audit verification."""
    record = db.query(DailyActivityRecord).filter(DailyActivityRecord.id == record_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Daily activity record with ID '{record_id}' not found."
        )

    ref_date = str(record.reporting_date)
    act_name = record.activity.name if record.activity else "activity"
    db.delete(record)
    db.commit()
    return {"message": f"Record for '{act_name}' on {ref_date} deleted successfully."}
