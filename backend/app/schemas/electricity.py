from typing import List, Optional, Any
from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict


# ==============================================================================
# Baseline Item Schemas
# ==============================================================================

class ElectricityBaselineItemBase(BaseModel):
    facility_type: str = Field(..., min_length=2, max_length=64, description="Profile category key (e.g., standard_classroom, ac_classroom, computer_lab_ac, hostel_room, etc.)")
    facility_name: str = Field(..., min_length=2, max_length=128, description="Human readable facility name")
    quantity: int = Field(..., ge=1, description="Quantity of rooms or units")
    average_power_kw: float = Field(..., gt=0.0, description="Average active power rating in kW per unit")
    default_operating_hours: float = Field(..., ge=0.0, le=24.0, description="Typical operating hours per day (0 - 24)")
    source_rationale: Optional[str] = Field(None, max_length=500, description="Source or audit rationale for assumptions")
    is_active: bool = Field(True, description="Whether facility profile is currently active")
    order_index: int = Field(0, description="Display order index")


class ElectricityBaselineItemCreate(ElectricityBaselineItemBase):
    pass


class ElectricityBaselineItemResponse(ElectricityBaselineItemBase):
    id: str
    baseline_id: str
    calculated_default_daily_kwh: float = Field(..., description="Default daily kWh contribution = quantity * average_power_kw * default_operating_hours")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Baseline Schemas
# ==============================================================================

class ElectricityBaselineCreate(BaseModel):
    block_id: str = Field(..., min_length=1, description="Campus Block UUID")
    name: str = Field("Standard Baseline Profile", min_length=2, max_length=128)
    description: Optional[str] = Field(None, max_length=500)
    source_rationale: Optional[str] = Field(None, max_length=500)
    effective_start_date: date = Field(..., description="Effective start date of baseline")
    effective_end_date: Optional[date] = Field(None, description="Effective end date (null = currently active)")
    items: List[ElectricityBaselineItemCreate] = Field(..., min_length=1, description="At least one facility profile item is required")

    @field_validator("effective_end_date")
    def validate_dates(cls, v, values):
        return v


class ElectricityBaselineRevision(BaseModel):
    name: Optional[str] = Field(None, max_length=128)
    description: Optional[str] = Field(None, max_length=500)
    source_rationale: Optional[str] = Field(None, max_length=500)
    effective_start_date: date = Field(..., description="Effective start date of new baseline version")
    effective_end_date: Optional[date] = Field(None)
    items: List[ElectricityBaselineItemCreate] = Field(..., min_length=1)


class ElectricityBaselineResponse(BaseModel):
    id: str
    organization_id: str
    campus_id: str
    block_id: str
    block_name: Optional[str] = None
    block_code: Optional[str] = None
    version: int
    name: str
    description: Optional[str] = None
    source_rationale: Optional[str] = None
    effective_start_date: date
    effective_end_date: Optional[date] = None
    is_active: bool
    items: List[ElectricityBaselineItemResponse] = []
    total_default_daily_kwh: float = 0.0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Daily Electricity Estimation Schemas
# ==============================================================================

class DailyEstimateItemInput(BaseModel):
    facility_type: str
    facility_name: str
    quantity: int = Field(..., ge=1)
    average_power_kw: float = Field(..., gt=0.0)
    operating_hours: float = Field(..., ge=0.0, le=24.0)
    source_rationale: Optional[str] = None


class DailyEstimateItemResult(BaseModel):
    facility_type: str
    facility_name: str
    quantity: int
    average_power_kw: float
    operating_hours: float
    estimated_kwh: float
    source_rationale: Optional[str] = None


class DailyEstimateCalculateRequest(BaseModel):
    block_id: str
    reporting_date: date
    operational_mode: str = Field("regular_day", description="regular_day, exam_day, weekend, vacation, holiday, maintenance")
    is_holiday: bool = False
    is_zero_consumption: bool = False
    baseline_id: Optional[str] = None
    custom_items: Optional[List[DailyEstimateItemInput]] = None


class DailyEstimatePreviewResponse(BaseModel):
    block_id: str
    block_name: Optional[str] = None
    reporting_date: date
    baseline_id: Optional[str] = None
    baseline_version: int
    operational_mode: str
    is_holiday: bool
    is_zero_consumption: bool
    items: List[DailyEstimateItemResult]
    total_estimated_kwh: float


class DailyElectricityEstimateCreate(BaseModel):
    block_id: str
    reporting_date: date
    baseline_id: Optional[str] = None
    operational_mode: str = Field("regular_day", max_length=64)
    is_holiday: bool = False
    is_zero_consumption: bool = False
    notes: Optional[str] = Field(None, max_length=500)
    items: List[DailyEstimateItemInput] = Field(default=[], description="Line items for calculation. Can be empty for holidays/zero-days.")
    replace_existing: bool = Field(False, description="Explicit flag to overwrite an existing estimate for this date")


class DailyElectricityEstimateResponse(BaseModel):
    id: str
    organization_id: str
    campus_id: str
    block_id: str
    block_name: Optional[str] = None
    block_code: Optional[str] = None
    baseline_id: Optional[str] = None
    baseline_version: int
    reporting_date: date
    total_estimated_kwh: float
    is_holiday: bool
    is_zero_consumption: bool
    operational_mode: str
    notes: Optional[str] = None
    calculation_details: List[DailyEstimateItemResult] = []
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Actual Electricity Reading Schemas
# ==============================================================================

class ActualElectricityRecordCreate(BaseModel):
    block_id: str
    reporting_date: date
    quantity_kwh: float = Field(..., ge=0.0, description="Total active consumption in kWh")
    meter_boundary: str = Field("grid_import", description="grid_import | solar_generation | solar_consumption | solar_export | total_consumption")
    measurement_method: str = Field("utility_meter", description="utility_meter | sub_meter | invoice | logbook")
    source_reference: Optional[str] = Field(None, max_length=255, description="Meter serial number or reference ID")
    meter_start_reading: Optional[float] = Field(None, ge=0.0)
    meter_end_reading: Optional[float] = Field(None, ge=0.0)
    reading_identifier: str = Field("official_daily_total", max_length=64)
    notes: Optional[str] = Field(None, max_length=500)
    replace_existing: bool = Field(False, description="Explicit flag to overwrite or correct existing reading")

    @field_validator("meter_end_reading")
    def validate_meter_readings(cls, v, values):
        return v


class ActualElectricityRecordResponse(BaseModel):
    id: str
    block_id: str
    block_name: Optional[str] = None
    block_code: Optional[str] = None
    reporting_date: date
    quantity_kwh: float
    meter_boundary: str
    measurement_method: str
    source_reference: Optional[str] = None
    meter_start_reading: Optional[float] = None
    meter_end_reading: Optional[float] = None
    reading_identifier: str
    data_status: str
    notes: Optional[str] = None
    version: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# Comparison & History Schemas
# ==============================================================================

class ElectricityComparisonRecord(BaseModel):
    block_id: str
    block_name: str
    block_code: str
    reporting_date: date

    # Estimated data
    has_estimate: bool
    estimated_kwh: Optional[float] = None
    baseline_version: Optional[int] = None
    operational_mode: Optional[str] = None
    is_holiday: bool = False
    is_zero_consumption: bool = False
    estimate_notes: Optional[str] = None

    # Actual data
    has_actual: bool
    actual_kwh: Optional[float] = None
    meter_boundary: Optional[str] = None
    measurement_method: Optional[str] = None
    source_reference: Optional[str] = None
    actual_notes: Optional[str] = None

    # Variance analysis
    difference_kwh: Optional[float] = None  # Actual - Estimated
    percentage_difference: Optional[float] = None  # (Actual - Estimated) / Estimated * 100
    recommended_reporting_value: Optional[float] = None
    recommended_reporting_source: str = "missing"  # "measured" | "estimated" | "missing"
    status: str = "missing_both"  # "matched" | "estimated_only" | "actual_only" | "missing_both"

    # Solar distinction
    solar_generation_kwh: Optional[float] = None
    solar_export_kwh: Optional[float] = None


class ElectricityComparisonResponse(BaseModel):
    records: List[ElectricityComparisonRecord]
    total_days: int
    matched_days: int
    estimated_only_days: int
    actual_only_days: int
    missing_days: int
    total_estimated_kwh: float
    total_actual_kwh: float
    net_variance_kwh: Optional[float] = None
