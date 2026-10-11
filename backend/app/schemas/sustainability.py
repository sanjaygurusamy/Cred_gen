from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class SDGIndicatorSchema(BaseModel):
    indicator_code: str
    indicator_title: str
    target_metric: str
    campus_activities: List[str]
    supporting_body: str
    alignment_rationale: str


class SDGGoalSchema(BaseModel):
    goal_number: int
    title: str
    subtitle: str
    color_hex: str
    un_icon_slug: str
    summary: str
    relevance_to_campus: str
    indicators: List[SDGIndicatorSchema]


# ==============================================================================
# RECOMMENDATIONS SCHEMAS
# ==============================================================================

class RecommendationBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    category: str = Field(..., description="Category: electricity_efficiency, fuel_transport, food_waste, water_conservation, tree_canopy, data_collection")
    priority: str = Field("medium", description="Priority level: high, medium, low")
    proposed_action: str = Field(..., min_length=10)
    supporting_evidence: str = Field(..., min_length=5)
    related_sdgs: List[int] = Field(default_factory=list, description="Associated SDG numbers e.g. [7, 13]")
    potential_co2e_reduction_t_year: Optional[float] = Field(None, ge=0)
    calculation_rationale: Optional[str] = None
    assumptions: Optional[str] = None
    status: str = Field("proposed", description="Implementation status: proposed, approved, in_progress, completed, rejected")
    block_id: Optional[str] = None


class RecommendationCreate(RecommendationBase):
    campus_id: str


class RecommendationUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    proposed_action: Optional[str] = None
    supporting_evidence: Optional[str] = None
    related_sdgs: Optional[List[int]] = None
    potential_co2e_reduction_t_year: Optional[float] = None
    calculation_rationale: Optional[str] = None
    assumptions: Optional[str] = None
    status: Optional[str] = None
    block_id: Optional[str] = None


class RecommendationStatusUpdate(BaseModel):
    status: str = Field(..., description="Target status: proposed, approved, in_progress, completed, rejected")


class RecommendationResponse(BaseModel):
    id: str
    campus_id: str
    block_id: Optional[str] = None
    block_name: Optional[str] = None
    title: str
    category: str
    priority: str
    proposed_action: str
    supporting_evidence: str
    related_sdgs: List[int]
    potential_co2e_reduction_t_year: Optional[float] = None
    calculation_rationale: Optional[str] = None
    assumptions: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# INSTITUTIONAL EVIDENCE SCHEMAS
# ==============================================================================

class InstitutionalEvidenceBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    category: str = Field(..., description="Category: electricity_bill, waste_register, plantation_log, water_audit, policy_document, green_initiative")
    reference_number: str = Field(..., min_length=2, max_length=64)
    reporting_period: str = Field(..., min_length=2, max_length=64)
    associated_sdgs: List[int] = Field(default_factory=list)
    framework_tags: List[str] = Field(default_factory=list, description="e.g. ['NIRF', 'NAAC', 'UN-SDG']")
    verification_status: str = Field("verified", description="verified, user_provided, awaiting_verification")
    document_url_or_ref: Optional[str] = None
    description: Optional[str] = None


class InstitutionalEvidenceCreate(InstitutionalEvidenceBase):
    campus_id: str


class InstitutionalEvidenceUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    reference_number: Optional[str] = None
    reporting_period: Optional[str] = None
    associated_sdgs: Optional[List[int]] = None
    framework_tags: Optional[List[str]] = None
    verification_status: Optional[str] = None
    document_url_or_ref: Optional[str] = None
    description: Optional[str] = None


class InstitutionalEvidenceResponse(BaseModel):
    id: str
    campus_id: str
    title: str
    category: str
    reference_number: str
    reporting_period: str
    associated_sdgs: List[int]
    framework_tags: List[str]
    verification_status: str
    document_url_or_ref: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# DASHBOARD SUMMARY SCHEMA
# ==============================================================================

class SustainabilitySummaryResponse(BaseModel):
    campus_name: str
    campus_code: str
    gross_emissions_t_co2e: float
    scope_1_t: float
    scope_2_t: float
    scope_3_t: float
    total_electricity_kwh: float
    biological_sequestration_t_co2e: float
    standing_trees_count: int
    green_space_area_sqm: float
    active_sdgs_count: int
    recommendations_count: int
    potential_reduction_t_co2e: float
    data_quality_breakdown: Dict[str, int]
    sdgs: List[SDGGoalSchema]
    priority_recommendations: List[RecommendationResponse]
    institutional_evidence_items: List[InstitutionalEvidenceResponse]
