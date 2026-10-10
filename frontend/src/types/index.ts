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
