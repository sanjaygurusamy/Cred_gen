from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

# ==================== CAMPUS & ELEMENT SCHEMAS ====================

class CampusBase(BaseModel):
    name: str
    code: str
    location: Optional[str] = None
    total_area_sqm: Optional[float] = None
    student_count: Optional[int] = 0
    staff_count: Optional[int] = 0

class CampusOut(CampusBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class CampusBodyBase(BaseModel):
    name: str
    type: str
    floor_area_sqm: Optional[float] = None
    occupant_capacity: Optional[int] = None
    primary_contact: Optional[str] = None

class CampusBodyOut(CampusBodyBase):
    id: str
    campus_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ElementBase(BaseModel):
    name: str
    category: str # electricity, transportation, kitchen_lpg, food_waste, water_wastewater, air_conditioning, fabrication_construction
    scope: str # Scope 1, Scope 2, Scope 3
    operational_status: Optional[str] = "active"
    baseline_value: Optional[float] = None
    baseline_unit: Optional[str] = None
    is_archived: Optional[bool] = False
    metadata_json: Optional[Dict[str, Any]] = {}

class ElementOut(ElementBase):
    id: str
    campus_id: str
    campus_body_id: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ==================== EMISSION FACTOR & ACTIVITY SCHEMAS ====================

class EmissionFactorBase(BaseModel):
    category: str
    sub_type: str
    factor_value: float
    factor_unit: str
    source: str
    region: Optional[str] = "National"
    year: Optional[int] = 2024
    uncertainty_percentage: Optional[float] = 5.0
    data_quality: Optional[str] = "high"
    notes: Optional[str] = None

class EmissionFactorOut(EmissionFactorBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ActivityRecordBase(BaseModel):
    reporting_period_start: datetime
    reporting_period_end: datetime
    activity_value: float
    activity_unit: str
    value_type: Optional[str] = "measured" # measured, supplied, estimated, predicted
    data_quality: Optional[str] = "high"
    cost_rate: Optional[float] = None
    cost_currency: Optional[str] = "USD"
    notes: Optional[str] = None
    recorded_by: Optional[str] = "facilities_admin"

class ActivityRecordCreate(ActivityRecordBase):
    element_id: str

class ActivityRecordOut(ActivityRecordBase):
    id: str
    campus_id: str
    element_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ==================== SDG MAPPING SCHEMAS ====================

class SDGMappingBase(BaseModel):
    sdg_number: int
    sdg_title: str
    intervention: str
    explanation: str
    measurable_indicator: str
    supporting_evidence: Optional[str] = None
    is_measured_outcome: Optional[bool] = False

class SDGMappingOut(SDGMappingBase):
    id: str
    recommendation_id: Optional[str] = None
    scenario_id: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ==================== RECOMMENDATION SCHEMAS ====================

class LLMRecommendationItem(BaseModel):
    title: str
    category: str
    target_element_id: Optional[str] = None
    problem: str
    proposed_action: str
    reasoning: str
    required_data: List[str] = Field(default_factory=list)
    potential_benefits: List[str] = Field(default_factory=list)
    operational_benefits: List[str] = Field(default_factory=list)
    implementation_constraints: List[str] = Field(default_factory=list)
    sdgs: List[int] = Field(default_factory=list)
    reduction_estimate: Optional[float] = None
    cost_estimate: Optional[float] = None
    status: str = "requires_assessment"

class LLMRecommendationOutput(BaseModel):
    recommendations: List[LLMRecommendationItem]

class RecommendationGenerateRequest(BaseModel):
    campus_id: str
    element_id: Optional[str] = None
    force_refresh: Optional[bool] = False

class RecommendationRejectRequest(BaseModel):
    reason: str

class RecommendationOut(BaseModel):
    id: str
    campus_id: str
    campus_body_id: Optional[str] = None
    element_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    category: str
    problem: str
    proposed_action: str
    reasoning: str
    expected_environmental_benefit: Optional[str] = None
    potential_operational_benefit: Optional[str] = None
    required_additional_info: List[str] = []
    implementation_prerequisites: List[str] = []
    potential_risks_constraints: List[str] = []
    confidence_score: float
    priority_score: float
    priority_level: str
    status: str
    rejection_reason: Optional[str] = None
    source: str # rule_based, llm, hybrid
    evidence_references: List[Any] = []
    estimation_assumptions: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    sdg_mappings: List[SDGMappingOut] = []
    
    # Associated names for UI convenience
    campus_body_name: Optional[str] = None
    element_name: Optional[str] = None
    element_category: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class RecommendationSummary(BaseModel):
    total_recommendations: int
    awaiting_review: int
    approved: int
    implemented: int
    rejected: int
    requires_assessment: int
    potential_emissions_reduction_kg: float
    potential_emissions_reduction_tco2e: float
    active_scenarios_count: int

# ==================== SCENARIO SCHEMAS ====================

class ScenarioAssumptionItem(BaseModel):
    assumption_key: str
    assumption_value: float
    unit: Optional[str] = None
    notes: Optional[str] = None
    is_user_modified: Optional[bool] = False

class ScenarioAssumptionOut(ScenarioAssumptionItem):
    id: str
    scenario_id: str
    model_config = ConfigDict(from_attributes=True)

class ScenarioCalculationResultOut(BaseModel):
    id: str
    scenario_id: str
    baseline_activity: float
    baseline_unit: str
    alternative_activity: float
    alternative_unit: str
    baseline_emissions_kg: float
    alternative_emissions_kg: float
    potential_reduction_kg: float
    potential_reduction_percentage: float
    annual_reduction_tco2e: Optional[float] = None
    financial_savings_currency: str = "USD"
    financial_savings_amount: Optional[float] = None
    calculation_method: str
    data_quality: str
    double_counting_safeguard_verified: bool
    calculation_timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class ScenarioCreate(BaseModel):
    campus_id: str
    element_id: str
    recommendation_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    reduction_percentage_assumption: float # e.g. 10.0 for 10%
    alternative_activity_override: Optional[float] = None
    cost_per_unit_override: Optional[float] = None
    notes: Optional[str] = None

class ScenarioCalculateRequest(BaseModel):
    element_id: str
    baseline_activity: Optional[float] = None
    reduction_percentage: Optional[float] = None # e.g. 10.0
    alternative_activity: Optional[float] = None
    alternative_ef_id: Optional[str] = None
    cost_per_unit: Optional[float] = None

class ScenarioOut(BaseModel):
    id: str
    campus_id: str
    element_id: str
    recommendation_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    status: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    assumptions: List[ScenarioAssumptionOut] = []
    results: List[ScenarioCalculationResultOut] = []
    sdg_mappings: List[SDGMappingOut] = []
    element_name: Optional[str] = None
    element_category: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ScenarioCompareRequest(BaseModel):
    scenario_ids: List[str]

class ScenarioComparisonItem(BaseModel):
    scenario_id: str
    title: str
    element_name: str
    element_category: str
    baseline_activity: float
    baseline_unit: str
    alternative_activity: float
    baseline_emissions_kg: float
    alternative_emissions_kg: float
    potential_reduction_kg: float
    potential_reduction_percentage: float
    annual_reduction_tco2e: float
    financial_savings_amount: Optional[float] = None
    status: str

class ScenarioCompareResult(BaseModel):
    scenarios: List[ScenarioComparisonItem]
    total_potential_reduction_kg: float
    total_annual_reduction_tco2e: float
    total_potential_financial_savings: float
    double_counting_warning: Optional[str] = None

# ==================== INTERVENTION IMPLEMENTATION & POST-MEASUREMENT ====================

class InterventionImplementationCreate(BaseModel):
    campus_id: str
    recommendation_id: Optional[str] = None
    scenario_id: Optional[str] = None
    element_id: str
    title: str
    implementation_date: datetime
    capital_cost: Optional[float] = None
    operational_cost_annual: Optional[float] = None
    notes: Optional[str] = None

class PostMeasurementCreate(BaseModel):
    measurement_period_start: datetime
    measurement_period_end: datetime
    measured_activity: float
    measured_unit: str
    notes: Optional[str] = None

class PostMeasurementOut(BaseModel):
    id: str
    intervention_id: str
    measurement_period_start: datetime
    measurement_period_end: datetime
    measured_activity: float
    measured_unit: str
    measured_emissions_kg: float
    baseline_emissions_kg: float
    actual_reduction_kg: float
    actual_reduction_percentage: float
    verified_by: str
    notes: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class InterventionImplementationOut(BaseModel):
    id: str
    campus_id: str
    recommendation_id: Optional[str] = None
    scenario_id: Optional[str] = None
    element_id: str
    title: str
    implementation_date: datetime
    completion_date: Optional[datetime] = None
    status: str
    capital_cost: Optional[float] = None
    operational_cost_annual: Optional[float] = None
    notes: Optional[str] = None
    implemented_by: str
    created_at: datetime
    measurements: List[PostMeasurementOut] = []
    model_config = ConfigDict(from_attributes=True)

class OutcomeComparisonOut(BaseModel):
    intervention_id: str
    element_id: str
    element_name: str
    baseline_activity: float
    baseline_emissions_kg: float
    measured_activity: float
    measured_emissions_kg: float
    predicted_reduction_kg: Optional[float] = None
    actual_reduction_kg: float
    actual_reduction_percentage: float
    target_achieved_ratio: Optional[float] = None # actual / predicted
    status: str # exceeded_target, met_target, below_target, underperforming
    evaluation_notes: str
