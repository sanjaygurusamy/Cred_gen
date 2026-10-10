from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


# ==============================================================================
# Emission Factor Schemas
# ==============================================================================

class EmissionFactorBase(BaseModel):
    factor_code: str = Field(..., max_length=64, description="Unique identifier code, e.g. EF_IN_GRID_CEA_V19")
    name: str = Field(..., max_length=255)
    category: str = Field(..., max_length=64)
    applicable_activity_code: Optional[str] = Field(None, max_length=64)
    fuel_or_material: Optional[str] = Field(None, max_length=64)
    scope: str = Field(..., max_length=16, description="scope_1, scope_2, or scope_3")
    factor_value: float = Field(..., ge=0.0, description="Emissions in kg CO2e per target unit")
    factor_unit: str = Field(..., max_length=32, description="e.g. kg CO2e/kWh, kg CO2e/litre, kg CO2e/kg")
    target_activity_unit: str = Field(..., max_length=32, description="Standard unit for activity data, e.g. kWh, litres, kg")
    geography: str = Field(..., max_length=128)
    source_organization: str = Field(..., max_length=255)
    reference_document: str = Field(..., max_length=255)
    reference_url: Optional[str] = None
    publication_year: int = Field(..., ge=1990, le=2100)
    applicable_reporting_year: Optional[int] = Field(None, ge=1990, le=2100)
    effective_start_date: date
    effective_end_date: Optional[date] = None
    version: int = Field(default=1, ge=1)
    calculation_methodology: Optional[str] = None
    status: str = Field(default="verified", description="verified | provisional | retired")
    is_active: bool = True


class EmissionFactorCreate(EmissionFactorBase):
    pass


class EmissionFactorUpdate(BaseModel):
    name: Optional[str] = None
    factor_value: Optional[float] = Field(None, ge=0.0)
    status: Optional[str] = None
    reference_document: Optional[str] = None
    reference_url: Optional[str] = None
    calculation_methodology: Optional[str] = None
    effective_end_date: Optional[date] = None
    is_active: Optional[bool] = None


class EmissionFactorResponse(EmissionFactorBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmissionFactorListResponse(BaseModel):
    items: List[EmissionFactorResponse]
    total: int


# ==============================================================================
# Calculation Request & Response Schemas
# ==============================================================================

class CarbonCalculationRequest(BaseModel):
    block_id: str = Field(..., description="Target campus block ID")
    reporting_date: date = Field(..., description="Reporting date for activity data")
    activity_code: str = Field(..., description="Activity code, e.g. ELEC_CONSUMPTION, FUEL_DIESEL, etc.")
    activity_record_id: Optional[str] = Field(None, description="Optional specific DailyActivityRecord ID")
    electricity_source: Optional[str] = Field("auto", description="For electricity: 'measured', 'estimated', or 'auto'")
    custom_quantity: Optional[float] = Field(None, ge=0.0, description="Optional ad-hoc quantity")
    custom_unit: Optional[str] = Field(None, description="Optional ad-hoc unit")
    factor_id: Optional[str] = Field(None, description="Optional explicit emission factor ID")
    notes: Optional[str] = None


class CarbonCalculationResponse(BaseModel):
    id: str
    organization_id: str
    campus_id: str
    block_id: str
    block_name: Optional[str] = None
    block_code: Optional[str] = None
    reporting_date: date
    reporting_period_end: Optional[date] = None

    activity_record_id: Optional[str] = None
    electricity_estimate_id: Optional[str] = None
    activity_code: str
    activity_category: str
    scope: str
    activity_data_type: str

    reported_quantity: float
    reported_unit: str
    standardized_quantity: float
    standardized_unit: str
    conversion_factor_applied: float
    conversion_steps: Optional[str] = None

    emission_factor_id: Optional[str] = None
    emission_factor_code: str
    emission_factor_version: int
    emission_factor_value: float
    emission_factor_unit: str
    emission_factor_source: str

    formula: str
    emissions_kg_co2e: float
    emissions_t_co2e: float

    selected_reporting_source: str
    selection_reason: Optional[str] = None
    baseline_id: Optional[str] = None
    baseline_version: Optional[int] = None

    is_superseded: bool
    superseded_by_id: Optional[str] = None
    status: str
    version: int
    methodology_notes: Optional[str] = None
    validation_warnings: Optional[List[str]] = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CarbonCalculationListResponse(BaseModel):
    items: List[CarbonCalculationResponse]
    total: int
    total_emissions_kg_co2e: float
    total_emissions_t_co2e: float
    by_scope: Dict[str, float]  # {"scope_1": ..., "scope_2": ..., "scope_3": ...}
    by_category: Dict[str, float]


class CarbonRecalculateRequest(BaseModel):
    new_factor_id: Optional[str] = Field(None, description="Optional updated factor ID")
    reason: Optional[str] = Field(None, description="Audit reason for recalculation")
