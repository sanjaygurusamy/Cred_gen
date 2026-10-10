// Domain types for CampusCarbon AI

export type EmissionScope = 'Scope 1' | 'Scope 2' | 'Scope 3';

export type SustainabilityCategory =
  | 'electricity'
  | 'transportation'
  | 'kitchen_lpg'
  | 'food_waste'
  | 'water_wastewater'
  | 'air_conditioning'
  | 'fabrication_construction';

export interface Campus {
  id: string;
  name: string;
  code: string;
  location?: string;
  total_area_sqm?: number;
  student_count: number;
  staff_count: number;
}

export interface CampusBlock {
  id: string;
  campus_id: string;
  name: string;
  type: string;
  floor_area_sqm?: number;
  occupant_capacity?: number;
  primary_contact?: string;
}

export interface SystemInfo {
  status: string;
  phase: string;
  supported_phases: string[];
}
