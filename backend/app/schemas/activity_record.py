from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class DailyRecordBase(BaseModel):
    block_id: str = Field(..., description="Target campus block UUID")
    activity_id: str = Field(..., description="Activity definition UUID")
    reporting_date: date = Field(..., description="Date of measurement YYYY-MM-DD")
    quantity: float = Field(..., ge=0, description="Reported positive numeric measurement quantity")
    unit: str = Field(..., min_length=1, max_length=32, description="Unit symbol of measurement (e.g. kWh, m3, kg, litres)")
    data_status: str = Field("measured", description="'measured' or 'estimated'")
    measurement_method: str = Field(..., min_length=2, max_length=64, description="Method: utility_meter, sub_meter, invoice, logbook, weighbridge, etc.")
    reading_identifier: str = Field("official_daily_total", max_length=64, description="Identifier: 'official_daily_total' or sub-meter/run reference")
    is_daily_total: bool = Field(True, description="Whether this is the consolidated daily total")
    source_reference: Optional[str] = Field(None, max_length=255, description="Meter serial, vehicle reg, invoice/manifest number")
    destination_details: Optional[str] = Field(None, max_length=255, description="Recycler name, sludge destination, disposal facility")
    is_transfer: bool = Field(False, description="True if this is an inter-block transfer or dispatched waste")
    notes: Optional[str] = Field(None, max_length=2000)


class DailyRecordCreate(DailyRecordBase):
    pass


class DailyRecordUpdate(BaseModel):
    quantity: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = Field(None, min_length=1, max_length=32)
    data_status: Optional[str] = None
    measurement_method: Optional[str] = Field(None, min_length=2, max_length=64)
    source_reference: Optional[str] = Field(None, max_length=255)
    destination_details: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = Field(None, max_length=2000)


class DailyRecordResponse(DailyRecordBase):
    id: str
    organization_id: str
    campus_id: str
    standardized_quantity: float
    standardized_unit: str
    version: int
    created_at: datetime
    updated_at: datetime

    # Display conveniences
    block_name: Optional[str] = None
    block_code: Optional[str] = None
    activity_name: Optional[str] = None
    activity_code: Optional[str] = None
    activity_category: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DailyRecordListResponse(BaseModel):
    total: int
    items: List[DailyRecordResponse]
    limit: int
    offset: int


class DailyRecordHistorySummary(BaseModel):
    block_id: str
    activity_id: str
    activity_name: str
    standardized_unit: str
    records_count: int
    total_standardized_quantity: float
    date_range_start: Optional[date] = None
    date_range_end: Optional[date] = None
    records: List[DailyRecordResponse]
