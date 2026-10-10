import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ElectricityPage } from '../pages/ElectricityPage';
import { apiClient } from '../api/client';
import {
  CampusBlock,
  ElectricityBaseline,
  DailyEstimatePreviewResponse,
  ElectricityComparisonResponse,
  DailyElectricityEstimate,
} from '../types';

const mockBlocks: CampusBlock[] = [
  {
    id: 'block-ab1',
    campus_id: 'cbe-campus-01',
    name: 'Academic Block 1',
    code: 'AB1',
    category: 'academic',
    floor_area_sqm: 18500,
    occupant_capacity: 3200,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'block-gargi',
    campus_id: 'cbe-campus-01',
    name: 'Gargi',
    code: 'HST-GARGI',
    category: 'hostel',
    floor_area_sqm: 12500,
    occupant_capacity: 750,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
];

const mockBaseline: ElectricityBaseline = {
  id: 'base-ab1-01',
  organization_id: 'org-01',
  campus_id: 'cbe-campus-01',
  block_id: 'block-ab1',
  version: 1,
  name: 'AB1 Standard Academic Baseline Profile',
  description: 'Audited baseline profile',
  is_active: true,
  effective_start_date: '2026-01-01',
  effective_end_date: null,
  source_rationale: 'Energy audit team baseline assessment 2026',
  total_default_daily_kwh: 1008.0,
  created_at: '',
  updated_at: '',
  items: [
    {
      id: 'item-1',
      baseline_id: 'base-ab1-01',
      facility_type: 'standard_classroom',
      facility_name: 'Standard Classroom (Non-AC)',
      quantity: 30,
      average_power_kw: 1.2,
      default_operating_hours: 8.0,
      calculated_default_daily_kwh: 288.0,
      is_active: true,
      order_index: 0,
      source_rationale: 'Lighting and ceiling fans',
      created_at: '',
      updated_at: '',
    },
    {
      id: 'item-2',
      baseline_id: 'base-ab1-01',
      facility_type: 'computer_lab',
      facility_name: 'Computer Lab (60 Workstations + AC)',
      quantity: 4,
      average_power_kw: 18.0,
      default_operating_hours: 10.0,
      calculated_default_daily_kwh: 720.0,
      is_active: true,
      order_index: 1,
      source_rationale: 'Workstations, server racks and cooling load',
      created_at: '',
      updated_at: '',
    },
  ],
};

const mockPreview: DailyEstimatePreviewResponse = {
  block_id: 'block-ab1',
  reporting_date: '2026-10-15',
  baseline_version: 1,
  operational_mode: 'regular_day',
  is_holiday: false,
  is_zero_consumption: false,
  total_estimated_kwh: 1008.0,
  items: [
    {
      facility_type: 'standard_classroom',
      facility_name: 'Standard Classroom (Non-AC)',
      quantity: 30,
      average_power_kw: 1.2,
      operating_hours: 8.0,
      estimated_kwh: 288.0,
    },
    {
      facility_type: 'computer_lab',
      facility_name: 'Computer Lab (60 Workstations + AC)',
      quantity: 4,
      average_power_kw: 18.0,
      operating_hours: 10.0,
      estimated_kwh: 720.0,
    },
  ],
};

const mockComparison: ElectricityComparisonResponse = {
  block_id: 'block-ab1',
  block_name: 'Academic Block 1',
  block_code: 'AB1',
  start_date: '2026-10-01',
  end_date: '2026-10-03',
  total_days: 3,
  matched_days: 1,
  estimated_only_days: 1,
  actual_only_days: 0,
  missing_days: 1,
  total_estimated_kwh: 2000.0,
  total_actual_kwh: 1150.0,
  net_variance_kwh: 150.0,
  records: [
    {
      reporting_date: '2026-10-01',
      block_id: 'block-ab1',
      block_name: 'Academic Block 1',
      block_code: 'AB1',
      has_estimate: true,
      has_actual: true,
      status: 'matched',
      baseline_version: 1,
      operational_mode: 'regular_day',
      is_holiday: false,
      is_zero_consumption: false,
      estimated_kwh: 1000.0,
      actual_kwh: 1150.0,
      difference_kwh: 150.0,
      percentage_difference: 15.0,
      recommended_reporting_value: 1150.0,
      recommended_reporting_source: 'measured',
      solar_generation_kwh: 250.0,
      meter_boundary: 'grid_import',
    },
    {
      reporting_date: '2026-10-02',
      block_id: 'block-ab1',
      block_name: 'Academic Block 1',
      block_code: 'AB1',
      has_estimate: true,
      has_actual: false,
      status: 'estimated_only',
      baseline_version: 1,
      operational_mode: 'regular_day',
      is_holiday: false,
      is_zero_consumption: false,
      estimated_kwh: 1000.0,
      actual_kwh: null,
      difference_kwh: null,
      percentage_difference: null,
      recommended_reporting_value: 1000.0,
      recommended_reporting_source: 'estimated',
      solar_generation_kwh: null,
      meter_boundary: null,
    },
    {
      reporting_date: '2026-10-03',
      block_id: 'block-ab1',
      block_name: 'Academic Block 1',
      block_code: 'AB1',
      has_estimate: false,
      has_actual: false,
      status: 'missing',
      baseline_version: null,
      operational_mode: null,
      is_holiday: false,
      is_zero_consumption: false,
      estimated_kwh: null,
      actual_kwh: null,
      difference_kwh: null,
      percentage_difference: null,
      recommended_reporting_value: null,
      recommended_reporting_source: 'missing',
      solar_generation_kwh: null,
      meter_boundary: null,
    },
  ],
};

const mockSavedEstimate: DailyElectricityEstimate = {
  id: 'est-001',
  organization_id: 'org-01',
  campus_id: 'cbe-campus-01',
  block_id: 'block-ab1',
  reporting_date: '2026-10-15',
  baseline_id: 'base-ab1-01',
  baseline_version: 1,
  operational_mode: 'regular_day',
  is_holiday: false,
  is_zero_consumption: false,
  total_estimated_kwh: 1008.0,
  calculation_details: [],
  notes: 'Regular academic schedule',
  version: 1,
  created_at: '',
  updated_at: '',
  block_name: 'Academic Block 1',
  block_code: 'AB1',
};

describe('CampusCarbon AI — Phase 4 ElectricityPage Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiClient, 'getBlocks').mockResolvedValue({
      total: 2,
      items: mockBlocks,
      category_summary: [],
    });
    vi.spyOn(apiClient, 'getBaselineForBlock').mockResolvedValue(mockBaseline);
    vi.spyOn(apiClient, 'getBaselineVersionsForBlock').mockResolvedValue([mockBaseline]);
    vi.spyOn(apiClient, 'calculateDailyEstimatePreview').mockResolvedValue(mockPreview);
    vi.spyOn(apiClient, 'createDailyEstimate').mockResolvedValue(mockSavedEstimate);
    vi.spyOn(apiClient, 'getElectricityComparison').mockResolvedValue(mockComparison);
    vi.spyOn(apiClient, 'getDailyEstimates').mockResolvedValue([mockSavedEstimate]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Renders page branding, 27-block selector, and baseline header', async () => {
    render(<ElectricityPage />);

    expect(await screen.findByText('Electricity Baselines & MRV Telemetry')).toBeInTheDocument();
    expect(screen.getByText('Amrita Vishwa Vidyapeetham')).toBeInTheDocument();
    expect(screen.getByText('Coimbatore Campus (AVV-CBE)')).toBeInTheDocument();
    expect(screen.getByText('Phase 4 Active')).toBeInTheDocument();
    expect(screen.getByText('Sync Baselines (27 Blocks)')).toBeInTheDocument();

    // Verify tabs
    expect(screen.getByText('Baselines & Profiles')).toBeInTheDocument();
    expect(screen.getByText('Daily Electricity Estimation')).toBeInTheDocument();
    expect(screen.getByText('Actual Meter Ingestion')).toBeInTheDocument();
    expect(screen.getByText('Estimated vs Actual Comparison')).toBeInTheDocument();
    expect(screen.getByText('Audit Log & History')).toBeInTheDocument();
  });

  it('2. Renders active baseline profile and facility profiles table', async () => {
    render(<ElectricityPage />);

    expect(await screen.findByText('AB1 Standard Academic Baseline Profile')).toBeInTheDocument();
    expect(screen.getByText(/1,008 kWh\/day/i)).toBeInTheDocument();
    expect(screen.getByText('Energy audit team baseline assessment 2026')).toBeInTheDocument();

    // Facility items
    expect(screen.getByText('Standard Classroom (Non-AC)')).toBeInTheDocument();
    expect(screen.getByText('Computer Lab (60 Workstations + AC)')).toBeInTheDocument();
    expect(screen.getByText('288 kWh')).toBeInTheDocument();
    expect(screen.getByText('720 kWh')).toBeInTheDocument();
  });

  it('3. Switches to Daily Electricity Estimation tab and shows dynamic calculation', async () => {
    render(<ElectricityPage />);

    await screen.findByText('AB1 Standard Academic Baseline Profile');

    const estimateTab = screen.getByText('Daily Electricity Estimation');
    fireEvent.click(estimateTab);

    expect(await screen.findByText('Deterministic Daily Electricity Estimation')).toBeInTheDocument();
    expect(screen.getByText('Campus Holiday')).toBeInTheDocument();
    expect(screen.getByText('Zero-Consumption Day')).toBeInTheDocument();

    // Verify total preview is displayed
    expect(screen.getByText(/1,008 kWh/i)).toBeInTheDocument();
  });

  it('4. Submits daily electricity estimate and shows success message', async () => {
    const createEstimateSpy = vi.spyOn(apiClient, 'createDailyEstimate').mockResolvedValue(mockSavedEstimate);

    render(<ElectricityPage />);

    await screen.findByText('AB1 Standard Academic Baseline Profile');

    const estimateTab = screen.getByText('Daily Electricity Estimation');
    fireEvent.click(estimateTab);

    await screen.findByText('Deterministic Daily Electricity Estimation');

    const saveBtn = screen.getByRole('button', { name: /Save Daily Estimate/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(createEstimateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          block_id: 'block-ab1',
          operational_mode: 'regular_day',
          is_holiday: false,
          is_zero_consumption: false,
          replace_existing: true,
        })
      );
    });

    expect(await screen.findByText(/saved successfully/i)).toBeInTheDocument();
  });

  it('5. Ingests actual meter reading with meter boundary and values', async () => {
    const recordActualSpy = vi.spyOn(apiClient, 'recordActualElectricity').mockResolvedValue({
      id: 'rec-act-001',
      block_id: 'block-ab1',
      block_name: 'Academic Block 1',
      block_code: 'AB1',
      reporting_date: '2026-10-15',
      quantity_kwh: 1450.5,
      meter_boundary: 'grid_import',
      measurement_method: 'utility_meter',
      reading_identifier: 'official_daily_total',
      meter_start_reading: 12500,
      meter_end_reading: 13950.5,
      data_status: 'measured',
      version: 1,
      created_at: '',
    });

    render(<ElectricityPage />);

    await screen.findByText('AB1 Standard Academic Baseline Profile');

    const actualTab = screen.getByText('Actual Meter Ingestion');
    fireEvent.click(actualTab);

    expect(await screen.findByText('Record Actual Electricity Measurement')).toBeInTheDocument();

    // Enter active electricity consumption
    const kwhInput = screen.getByPlaceholderText(/e\.g\. 1450\.5/i);
    fireEvent.change(kwhInput, { target: { value: '1450.5' } });

    // Enter serial reference
    const serialInput = screen.getByPlaceholderText(/e\.g\. EM-AB1-MAIN-01/i);
    fireEvent.change(serialInput, { target: { value: 'EM-AB1-MAIN-01' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Record Actual Measurement/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(recordActualSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          block_id: 'block-ab1',
          quantity_kwh: 1450.5,
          meter_boundary: 'grid_import',
          source_reference: 'EM-AB1-MAIN-01',
          replace_existing: true,
        })
      );
    });

    expect(await screen.findByText(/Actual meter reading of 1450.5 kWh/i)).toBeInTheDocument();
  });

  it('6. Switches to Comparison tab and displays variance, zero-handling, and missing actuals', async () => {
    render(<ElectricityPage />);

    await screen.findByText('AB1 Standard Academic Baseline Profile');

    const compTab = screen.getByText('Estimated vs Actual Comparison');
    fireEvent.click(compTab);

    expect(await screen.findByText(/Day-by-Day Variance Analysis/i)).toBeInTheDocument();

    // KPI Cards
    expect(screen.getByText('2,000 kWh')).toBeInTheDocument(); // total estimated
    expect(screen.getAllByText('1,150 kWh').length).toBeGreaterThanOrEqual(1); // total actual & table row
    expect(screen.getAllByText('+150 kWh').length).toBeGreaterThanOrEqual(1); // net variance & table row
    expect(screen.getByText('1 Matched')).toBeInTheDocument();
    expect(screen.getByText('1 Est Only')).toBeInTheDocument();
    expect(screen.getByText('1 Missing')).toBeInTheDocument();

    // Table rows
    expect(screen.getByText('2026-10-01')).toBeInTheDocument();
    expect(screen.getByText('2026-10-02')).toBeInTheDocument();
    expect(screen.getByText('2026-10-03')).toBeInTheDocument();

    // Verify row statuses
    expect(screen.getByText('+15%')).toBeInTheDocument();
    expect(screen.getAllByText('Missing Actual').length).toBe(2);
    expect(screen.getByText('No Estimate')).toBeInTheDocument();
    expect(screen.getByText('250 kWh')).toBeInTheDocument(); // solar generation
  });
});
