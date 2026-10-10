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
