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
  occupant_capacity?: number | null;
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
  occupant_capacity?: number;
  is_active?: boolean;
}

export interface BlockUpdatePayload {
  name?: string;
  code?: string;
  category?: BlockCategory;
  description?: string;
  floor_area_sqm?: number;
  occupant_capacity?: number;
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

