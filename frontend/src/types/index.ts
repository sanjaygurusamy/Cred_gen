// Central TypeScript domain and system definitions for CampusCarbon AI

export type ConnectionState = 'loading' | 'connected' | 'degraded' | 'disconnected';

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  app: string;
  version: string;
  environment: string;
}

export interface DatabaseStatus {
  connected: boolean;
  status: 'connected' | 'unavailable';
  engine: string;
  message?: string | null;
}

export interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  timestamp: string;
  database: DatabaseStatus;
  phase: string;
}

export interface SystemInfoResponse {
  app_name: string;
  version: string;
  environment: string;
  current_phase: string;
  architecture: string;
  database_engine: string;
  features_active: string[];
  features_planned: string[];
}

export type MetricAvailability = 
  | 'no_data'            // Feature ready or tracking planned, but zero records exist in database
  | 'not_implemented'    // Feature/engine scheduled for future development phase
  | 'recorded_zero'      // Genuine measured zero consumption
  | 'available';         // Verified live data

export interface PlannedMetric {
  id: string;
  title: string;
  category: string;
  plannedPhase: string;
  unit: string;
  description: string;
  availability: MetricAvailability;
}

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  iconName: string;
  phaseTag?: string;
}

// Phase 2: Campus Organization and Block Inventory Types
export type BlockCategory =
  | 'academic'
  | 'hostel'
  | 'faculty_quarters'
  | 'kitchen_canteen'
  | 'transportation'
  | 'sewage_treatment'
  | 'other_facility';

export interface CategoryStat {
  category: string;
  label: string;
  count: number;
  total_floor_area_sqm: number;
  total_capacity: number;
}

export interface CampusBlock {
  id: string;
  campus_id: string;
  name: string;
  code: string;
  category: BlockCategory;
  category_label?: string;
  description?: string | null;
  floor_area_sqm?: number | null;
  area_unit?: string | null;
  occupant_capacity?: number | null;
  current_occupancy?: number | null;
  floors_count?: number | null;
  classrooms_count?: number | null;
  laboratories_count?: number | null;
  operating_hours_per_day?: number | null;
  verification_status?: string | null;
  metadata_json?: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlockCreatePayload {
  campus_id: string;
  name: string;
  code: string;
  category: BlockCategory;
  description?: string;
  floor_area_sqm?: number;
  area_unit?: string;
  occupant_capacity?: number;
  current_occupancy?: number;
  floors_count?: number;
  classrooms_count?: number;
  laboratories_count?: number;
  operating_hours_per_day?: number;
  verification_status?: string;
  metadata_json?: Record<string, any>;
  is_active?: boolean;
}

export interface BlockUpdatePayload {
  name?: string;
  code?: string;
  category?: BlockCategory;
  description?: string;
  floor_area_sqm?: number;
  area_unit?: string;
  occupant_capacity?: number;
  current_occupancy?: number;
  floors_count?: number;
  classrooms_count?: number;
  laboratories_count?: number;
  operating_hours_per_day?: number;
  verification_status?: string;
  metadata_json?: Record<string, any>;
  is_active?: boolean;
}

export interface BlockListResponse {
  total: number;
  campus_id?: string | null;
  items: CampusBlock[];
  category_summary: CategoryStat[];
}

export interface Campus {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  total_area_sqm?: number | null;
  is_active: boolean;
  block_count: number;
  created_at: string;
  updated_at: string;
  blocks?: CampusBlock[];
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  website?: string | null;
  is_active: boolean;
  campuses_count: number;
  created_at: string;
  updated_at: string;
}

// Phase 3: Activity Catalogue & Daily Activity Records Types
export interface ActivityDefinition {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string | null;
  default_unit: string;
  supported_units: string[];
  unit_conversions: Record<string, number>;
  is_enabled: boolean;
  is_transfer_activity: boolean;
  validation_rules: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BlockActivityAssignment {
  id: string;
  block_id: string;
  activity_id: string;
  is_enabled: boolean;
  custom_unit?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  activity?: ActivityDefinition | null;
}

export interface BlockActivitiesSummary {
  block_id: string;
  block_name: string;
  block_code: string;
  total_assigned: number;
  activities: BlockActivityAssignment[];
}

export type MeasurementDataStatus = 'measured' | 'estimated';

export interface DailyActivityRecord {
  id: string;
  organization_id: string;
  campus_id: string;
  block_id: string;
  activity_id: string;
  reporting_date: string;
  quantity: number;
  unit: string;
  standardized_quantity: number;
  standardized_unit: string;
  data_status: MeasurementDataStatus;
  measurement_method: string;
  reading_identifier: string;
  is_daily_total: boolean;
  source_reference?: string | null;
  destination_details?: string | null;
  is_transfer: boolean;
  notes?: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  block_name?: string | null;
  block_code?: string | null;
  activity_name?: string | null;
  activity_code?: string | null;
  activity_category?: string | null;
}

export interface DailyRecordCreatePayload {
  block_id: string;
  activity_id: string;
  reporting_date: string;
  quantity: number;
  unit: string;
  data_status: MeasurementDataStatus;
  measurement_method: string;
  reading_identifier?: string;
  is_daily_total?: boolean;
  source_reference?: string;
  destination_details?: string;
  is_transfer?: boolean;
  notes?: string;
}

export interface DailyRecordUpdatePayload {
  quantity?: number;
  unit?: string;
  data_status?: MeasurementDataStatus;
  measurement_method?: string;
  source_reference?: string;
  destination_details?: string;
  notes?: string;
}

export interface DailyRecordListResponse {
  total: number;
  items: DailyActivityRecord[];
  limit: number;
  offset: number;
}

export interface DailyRecordHistorySummary {
  block_id: string;
  activity_id: string;
  activity_name: string;
  standardized_unit: string;
  records_count: number;
  total_standardized_quantity: number;
  date_range_start?: string | null;
  date_range_end?: string | null;
  records: DailyActivityRecord[];
}

// Phase 4: Electricity Baselines, Estimation, and Comparison Types
export interface ElectricityBaselineItem {
  id: string;
  baseline_id: string;
  facility_type: string;
  facility_name: string;
  quantity: number;
  average_power_kw: number;
  default_operating_hours: number;
  source_rationale?: string | null;
  is_active: boolean;
  order_index: number;
  calculated_default_daily_kwh: number;
  created_at: string;
  updated_at: string;
}

export interface ElectricityBaselineItemCreate {
  facility_type: string;
  facility_name: string;
  quantity: number;
  average_power_kw: number;
  default_operating_hours: number;
  source_rationale?: string;
  is_active?: boolean;
  order_index?: number;
}

export interface ElectricityBaseline {
  id: string;
  organization_id: string;
  campus_id: string;
  block_id: string;
  block_name?: string | null;
  block_code?: string | null;
  version: number;
  name: string;
  description?: string | null;
  source_rationale?: string | null;
  effective_start_date: string;
  effective_end_date?: string | null;
  is_active: boolean;
  items: ElectricityBaselineItem[];
  total_default_daily_kwh: number;
  created_at: string;
  updated_at: string;
}

export interface ElectricityBaselineCreatePayload {
  block_id: string;
  name?: string;
  description?: string;
  source_rationale?: string;
  effective_start_date: string;
  effective_end_date?: string;
  items: ElectricityBaselineItemCreate[];
}

export interface ElectricityBaselineRevisionPayload {
  name?: string;
  description?: string;
  source_rationale?: string;
  effective_start_date: string;
  effective_end_date?: string;
  items: ElectricityBaselineItemCreate[];
}

export interface DailyEstimateItemInput {
  facility_type: string;
  facility_name: string;
  quantity: number;
  average_power_kw: number;
  operating_hours: number;
  source_rationale?: string;
}

export interface DailyEstimateItemResult {
  facility_type: string;
  facility_name: string;
  quantity: number;
  average_power_kw: number;
  operating_hours: number;
  estimated_kwh: number;
  source_rationale?: string;
}

export interface DailyEstimateCalculateRequest {
  block_id: string;
  reporting_date: string;
  operational_mode?: string;
  is_holiday?: boolean;
  is_zero_consumption?: boolean;
  baseline_id?: string;
  custom_items?: DailyEstimateItemInput[];
}

export interface DailyEstimatePreviewResponse {
  block_id: string;
  block_name?: string | null;
  reporting_date: string;
  baseline_id?: string | null;
  baseline_version: number;
  operational_mode: string;
  is_holiday: boolean;
  is_zero_consumption: boolean;
  items: DailyEstimateItemResult[];
  total_estimated_kwh: number;
}

export interface DailyElectricityEstimateCreatePayload {
  block_id: string;
  reporting_date: string;
  baseline_id?: string;
  operational_mode?: string;
  is_holiday?: boolean;
  is_zero_consumption?: boolean;
  notes?: string;
  items: DailyEstimateItemInput[];
  replace_existing?: boolean;
}

export interface DailyElectricityEstimate {
  id: string;
  organization_id: string;
  campus_id: string;
  block_id: string;
  block_name?: string | null;
  block_code?: string | null;
  baseline_id?: string | null;
  baseline_version: number;
  reporting_date: string;
  total_estimated_kwh: number;
  is_holiday: boolean;
  is_zero_consumption: boolean;
  operational_mode: string;
  notes?: string | null;
  calculation_details: DailyEstimateItemResult[];
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ActualElectricityRecordCreatePayload {
  block_id: string;
  reporting_date: string;
  quantity_kwh: number;
  meter_boundary?: string;
  measurement_method?: string;
  source_reference?: string;
  meter_start_reading?: number;
  meter_end_reading?: number;
  reading_identifier?: string;
  notes?: string;
  replace_existing?: boolean;
}

export interface ActualElectricityRecord {
  id: string;
  block_id: string;
  block_name?: string | null;
  block_code?: string | null;
  reporting_date: string;
  quantity_kwh: number;
  meter_boundary: string;
  measurement_method: string;
  source_reference?: string | null;
  meter_start_reading?: number | null;
  meter_end_reading?: number | null;
  reading_identifier: string;
  data_status: string;
  notes?: string | null;
  version: number;
  created_at: string;
}

export interface ElectricityComparisonRecord {
  block_id: string;
  block_name: string;
  block_code: string;
  reporting_date: string;
  has_estimate: boolean;
  estimated_kwh?: number | null;
  baseline_version?: number | null;
  operational_mode?: string | null;
  is_holiday: boolean;
  is_zero_consumption: boolean;
  estimate_notes?: string | null;
  has_actual: boolean;
  actual_kwh?: number | null;
  meter_boundary?: string | null;
  measurement_method?: string | null;
  source_reference?: string | null;
  actual_notes?: string | null;
  difference_kwh?: number | null;
  percentage_difference?: number | null;
  recommended_reporting_value?: number | null;
  recommended_reporting_source: string;
  status: string;
  solar_generation_kwh?: number | null;
  solar_export_kwh?: number | null;
}

export interface ElectricityComparisonResponse {
  block_id?: string;
  block_name?: string;
  block_code?: string;
  start_date?: string;
  end_date?: string;
  records: ElectricityComparisonRecord[];
  total_days: number;
  matched_days: number;
  estimated_only_days: number;
  actual_only_days: number;
  missing_days: number;
  total_estimated_kwh: number;
  total_actual_kwh: number;
  net_variance_kwh?: number | null;
}

// Phase 5: Carbon Calculation Engine & Emission Factors
export interface EmissionFactor {
  id: string;
  factor_code: string;
  name: string;
  category: string;
  applicable_activity_code?: string | null;
  fuel_or_material?: string | null;
  scope: string; // scope_1, scope_2, scope_3
  factor_value: number;
  factor_unit: string;
  target_activity_unit: string;
  geography: string;
  source_organization: string;
  reference_document: string;
  reference_url?: string | null;
  publication_year: number;
  applicable_reporting_year?: number | null;
  effective_start_date: string;
  effective_end_date?: string | null;
  version: number;
  calculation_methodology?: string | null;
  status: string; // verified, provisional, retired
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmissionFactorListResponse {
  items: EmissionFactor[];
  total: number;
}

export interface CarbonCalculationRequest {
  block_id: string;
  reporting_date: string;
  activity_code: string;
  activity_record_id?: string;
  electricity_source?: string; // auto, measured, estimated
  custom_quantity?: number;
  custom_unit?: string;
  factor_id?: string;
  notes?: string;
}

export interface CarbonCalculationResponse {
  id: string;
  organization_id: string;
  campus_id: string;
  block_id: string;
  block_name?: string | null;
  block_code?: string | null;
  reporting_date: string;
  reporting_period_end?: string | null;
  activity_record_id?: string | null;
  electricity_estimate_id?: string | null;
  activity_code: string;
  activity_category: string;
  scope: string;
  activity_data_type: string;
  reported_quantity: number;
  reported_unit: string;
  standardized_quantity: number;
  standardized_unit: string;
  conversion_factor_applied: number;
  conversion_steps?: string | null;
  emission_factor_id?: string | null;
  emission_factor_code: string;
  emission_factor_version: number;
  emission_factor_value: number;
  emission_factor_unit: string;
  emission_factor_source: string;
  formula: string;
  emissions_kg_co2e: number;
  emissions_t_co2e: number;
  selected_reporting_source: string;
  selection_reason?: string | null;
  baseline_id?: string | null;
  baseline_version?: number | null;
  is_superseded: boolean;
  superseded_by_id?: string | null;
  status: string;
  version: number;
  methodology_notes?: string | null;
  validation_warnings?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CarbonCalculationListResponse {
  items: CarbonCalculationResponse[];
  total: number;
  total_emissions_kg_co2e: number;
  total_emissions_t_co2e: number;
  by_scope: Record<string, number>;
  by_category: Record<string, number>;
}

export interface CarbonRecalculateRequest {
  new_factor_id?: string;
  reason?: string;
}

// =============================================================================
// Phase 6: Campus Carbon Dashboard & Reporting Engine Types
// =============================================================================

export interface DashboardMetricsResponse {
  reporting_period_start?: string | null;
  reporting_period_end?: string | null;
  total_emissions_kg_co2e: number;
  total_emissions_t_co2e: number;
  scope_1_kg: number;
  scope_1_t: number;
  scope_2_kg: number;
  scope_2_t: number;
  scope_3_kg: number;
  scope_3_t: number;
  total_electricity_kwh: number;
  actual_electricity_kwh: number;
  estimated_electricity_kwh: number;
  total_records: number;
  measured_records: number;
  estimated_records: number;
  measured_coverage_pct: number;
  active_blocks_count: number;
  reporting_blocks_count: number;
  reporting_coverage_pct: number;
  has_data: boolean;
}

export interface CategoryEmissionsItem {
  category: string;
  category_name: string;
  scope: string;
  emissions_kg_co2e: number;
  emissions_t_co2e: number;
  percentage_of_total: number;
  record_count: number;
  measured_count: number;
  estimated_count: number;
}

export interface CategoryEmissionsResponse {
  items: CategoryEmissionsItem[];
  total_emissions_kg_co2e: number;
  total_emissions_t_co2e: number;
  by_scope: Record<string, number>;
}

export interface BlockEmissionsItem {
  block_id: string;
  block_name: string;
  block_code: string;
  block_category: string;
  floor_area_sqm: number;
  occupant_capacity: number;
  total_emissions_kg_co2e: number;
  total_emissions_t_co2e: number;
  emissions_per_sqm: number;
  emissions_per_occupant?: number | null;
  percentage_of_campus: number;
  electricity_kwh: number;
  record_count: number;
  measured_pct: number;
  scope_1_kg: number;
  scope_2_kg: number;
  scope_3_kg: number;
  has_data: boolean;
}

export interface BlockEmissionsResponse {
  items: BlockEmissionsItem[];
  total_campus_emissions_t_co2e: number;
  blocks_reporting_count: number;
  blocks_total_count: number;
}

export interface TrendPoint {
  period: string;
  date?: string | null;
  total_emissions_kg_co2e: number;
  total_emissions_t_co2e: number;
  scope_1_kg: number;
  scope_2_kg: number;
  scope_3_kg: number;
  electricity_kwh: number;
  measured_count: number;
  estimated_count: number;
}

export interface TrendsResponse {
  group_by: string;
  data_points: TrendPoint[];
  sufficient_data_for_trend: boolean;
  total_points: number;
}

export interface BlockDetailAnalyticsResponse {
  block: CampusBlock;
  total_emissions_kg_co2e: number;
  total_emissions_t_co2e: number;
  emissions_per_sqm: number;
  scope_1_kg: number;
  scope_2_kg: number;
  scope_3_kg: number;
  electricity_kwh: number;
  activities_breakdown: Array<{
    activity_code: string;
    category: string;
    scope: string;
    reported_quantity: number;
    reported_unit: string;
    standardized_quantity: number;
    standardized_unit: string;
    emissions_kg_co2e: number;
    emission_factor_code: string;
    record_count: number;
  }>;
  configured_expected_activities: string[];
  missing_expected_activities: string[];
  records_count: number;
  measured_records: number;
  estimated_records: number;
}

export interface DataQualityResponse {
  total_campus_blocks: number;
  blocks_with_data_count: number;
  blocks_missing_data_count: number;
  blocks_with_missing_expectations: Array<{
    block_id: string;
    block_name: string;
    block_code: string;
    block_category: string;
    missing_activities: Array<{
      activity_code: string;
      activity_name: string;
      category: string;
      default_unit: string;
    }>;
  }>;
  measured_records_count: number;
  estimated_records_count: number;
  uncalculated_activity_records_count: number;
  uncalculated_records_details: Array<{
    activity_record_id: string;
    block_id: string;
    reporting_date: string;
    quantity: number;
    unit: string;
    is_transfer: boolean;
    reason: string;
  }>;
  safeguard_checks: Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// Trees, Green Spaces & Carbon Sequestration Types
// ---------------------------------------------------------------------------

export interface GreenSpace {
  id: string;
  campus_id: string;
  block_id?: string | null;
  name: string;
  code: string;
  plantation_type: string;
  area_sqm?: number | null;
  area_unit: string;
  description?: string | null;
  is_active: boolean;
  tree_count: number;
  annual_sequestration_kg: number;
  block_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TreeInventory {
  id: string;
  campus_id: string;
  block_id?: string | null;
  green_space_id?: string | null;
  species_name: string;
  common_name: string;
  tree_count: number;
  planting_year?: number | null;
  estimated_age_years?: number | null;
  health_status: string;
  location_description?: string | null;
  data_source: string;
  verification_status: string;
  sequestration_rate_kg_year: number;
  annual_sequestration_kg: number;
  annual_sequestration_t: number;
  methodology_notes?: string | null;
  notes?: string | null;
  block_name?: string | null;
  green_space_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlantationRecord {
  id: string;
  campus_id: string;
  block_id?: string | null;
  green_space_id?: string | null;
  event_name: string;
  plantation_date: string;
  species_planted: string;
  saplings_planted: number;
  saplings_surviving: number;
  survival_rate_percent: number;
  plantation_location: string;
  maintenance_notes?: string | null;
  block_name?: string | null;
  green_space_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpeciesSequestrationBreakdown {
  common_name: string;
  species_name: string;
  tree_count: number;
  annual_sequestration_kg: number;
  annual_sequestration_t: number;
  percentage_of_total: number;
}

export interface GreenSpaceSummaryBreakdown {
  id: string;
  name: string;
  code: string;
  plantation_type: string;
  area_sqm?: number | null;
  tree_count: number;
  annual_sequestration_kg: number;
}

export interface SequestrationSummary {
  total_trees: number;
  total_species_count: number;
  total_green_spaces: number;
  total_green_space_area_sqm: number;
  total_annual_sequestration_kg_co2e: number;
  total_annual_sequestration_t_co2e: number;
  total_saplings_planted: number;
  total_saplings_surviving: number;
  average_survival_rate_percent: number;
  methodology: string;
  methodology_assumptions: string;
  species_breakdown: SpeciesSequestrationBreakdown[];
  green_space_breakdown: GreenSpaceSummaryBreakdown[];
  data_quality_label: string;
}

// Workstream B: UN SDG Mapping, Recommendations & Institutional Evidence Types
export interface SDGIndicator {
  indicator_code: string;
  name: string;
  description: string;
  campus_applicability: string;
  metric_unit: string;
}

export interface SDGTarget {
  target_code: string;
  title: string;
  indicators: SDGIndicator[];
}

export interface SDGItem {
  sdg_number: number;
  title: string;
  short_name: string;
  theme_color: string;
  icon_name: string;
  institutional_relevance: string;
  targets: SDGTarget[];
}

export type RecommendationStatus = 'proposed' | 'approved' | 'in_progress' | 'completed' | 'rejected';
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface SustainabilityRecommendationItem {
  id: string;
  campus_id: string;
  block_id?: string | null;
  block_name?: string | null;
  title: string;
  category: string;
  priority: RecommendationPriority;
  proposed_action: string;
  supporting_evidence: string;
  related_sdgs: number[];
  potential_co2e_reduction_t_year: number;
  calculation_rationale: string;
  assumptions: string;
  status: RecommendationStatus;
  created_at: string;
  updated_at: string;
}

export interface InstitutionalEvidenceItem {
  id: string;
  campus_id: string;
  title: string;
  category: string;
  reference_number: string;
  reporting_period: string;
  associated_sdgs: number[];
  framework_tags: string[];
  verification_status: string;
  document_url_or_ref?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SustainabilitySummary {
  campus_name: string;
  campus_code: string;
  gross_emissions_t_co2e: number;
  scope_1_t: number;
  scope_2_t: number;
  scope_3_t: number;
  total_electricity_kwh: number;
  biological_sequestration_t_co2e: number;
  standing_trees_count: number;
  green_space_area_sqm: number;
  active_sdgs_count: number;
  recommendations_count: number;
  potential_reduction_t_co2e: number;
  data_quality_breakdown: Record<string, number>;
  sdgs: SDGItem[];
  priority_recommendations: SustainabilityRecommendationItem[];
  institutional_evidence_items: InstitutionalEvidenceItem[];
}
