import datetime as dt
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.block import BlockResponse


class ReportingPeriodFilter(BaseModel):
    """Filter parameters for campus reporting queries."""
    start_date: Optional[dt.date] = None
    end_date: Optional[dt.date] = None
    campus_id: Optional[str] = None
    block_id: Optional[str] = None


class DashboardMetricsResponse(BaseModel):
    """Executive campus carbon accounting metrics for selected period."""
    reporting_period_start: Optional[dt.date] = None
    reporting_period_end: Optional[dt.date] = None
    
    total_emissions_kg_co2e: float = 0.0
    total_emissions_t_co2e: float = 0.0
    
    scope_1_kg: float = 0.0
    scope_1_t: float = 0.0
    scope_2_kg: float = 0.0
    scope_2_t: float = 0.0
    scope_3_kg: float = 0.0
    scope_3_t: float = 0.0
    
    total_electricity_kwh: float = 0.0
    actual_electricity_kwh: float = 0.0
    estimated_electricity_kwh: float = 0.0
    
    total_records: int = 0
    measured_records: int = 0
    estimated_records: int = 0
    measured_coverage_pct: float = 0.0
    
    active_blocks_count: int = 27
    reporting_blocks_count: int = 0
    reporting_coverage_pct: float = 0.0
    
    has_data: bool = False


class CategoryEmissionsItem(BaseModel):
    """Aggregated emissions for an activity category."""
    category: str
    category_name: str
    scope: str
    emissions_kg_co2e: float
    emissions_t_co2e: float
    percentage_of_total: float
    record_count: int
    measured_count: int
    estimated_count: int


class CategoryEmissionsResponse(BaseModel):
    """Emissions broken down by activity category."""
    items: List[CategoryEmissionsItem]
    total_emissions_kg_co2e: float
    total_emissions_t_co2e: float
    by_scope: Dict[str, float]


class BlockEmissionsItem(BaseModel):
    """Aggregated emissions and carbon intensity metrics for a campus block."""
    block_id: str
    block_name: str
    block_code: str
    block_category: str
    floor_area_sqm: float
    occupant_capacity: int
    total_emissions_kg_co2e: float
    total_emissions_t_co2e: float
    emissions_per_sqm: float
    emissions_per_occupant: Optional[float] = None
    percentage_of_campus: float
    electricity_kwh: float
    record_count: int
    measured_pct: float
    scope_1_kg: float
    scope_2_kg: float
    scope_3_kg: float
    has_data: bool


class BlockEmissionsResponse(BaseModel):
    """Campus blocks emissions ranking and distribution."""
    items: List[BlockEmissionsItem]
    total_campus_emissions_t_co2e: float
    blocks_reporting_count: int
    blocks_total_count: int


class TrendPoint(BaseModel):
    """Single time-bucket data point for trend charts."""
    period: str
    date: Optional[dt.date] = None
    total_emissions_kg_co2e: float
    total_emissions_t_co2e: float
    scope_1_kg: float
    scope_2_kg: float
    scope_3_kg: float
    electricity_kwh: float
    measured_count: int
    estimated_count: int


class TrendsResponse(BaseModel):
    """Time-series aggregation for campus trends."""
    group_by: str  # day | month
    data_points: List[TrendPoint]
    sufficient_data_for_trend: bool
    total_points: int


class BlockDetailAnalyticsResponse(BaseModel):
    """Detailed analytics drilldown for a single block."""
    block: BlockResponse
    total_emissions_kg_co2e: float
    total_emissions_t_co2e: float
    emissions_per_sqm: float
    scope_1_kg: float
    scope_2_kg: float
    scope_3_kg: float
    electricity_kwh: float
    activities_breakdown: List[Dict[str, Any]]
    configured_expected_activities: List[str]
    missing_expected_activities: List[str]
    records_count: int
    measured_records: int
    estimated_records: int


class DataQualityResponse(BaseModel):
    """Data completeness, missing record indicators, and safeguard compliance."""
    total_campus_blocks: int
    blocks_with_data_count: int
    blocks_missing_data_count: int
    blocks_with_missing_expectations: List[Dict[str, Any]]
    measured_records_count: int
    estimated_records_count: int
    uncalculated_activity_records_count: int
    uncalculated_records_details: List[Dict[str, Any]]
    safeguard_checks: Dict[str, bool]
