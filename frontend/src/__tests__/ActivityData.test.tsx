import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ActivityDataPage } from '../pages/ActivityDataPage';
import { apiClient } from '../api/client';
import {
  CampusBlock,
  ActivityDefinition,
  BlockActivitiesSummary,
  DailyActivityRecord,
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

const mockActivities: ActivityDefinition[] = [
  {
    id: 'act-elec',
    code: 'ELEC_CONSUMPTION',
    name: 'Grid Electricity Consumption',
    category: 'electricity',
    default_unit: 'kWh',
    supported_units: ['kWh', 'MWh'],
    unit_conversions: { MWh: 1000 },
    is_enabled: true,
    is_transfer_activity: false,
    validation_rules: {},
    created_at: '',
    updated_at: '',
  },
  {
    id: 'act-water',
    code: 'WATER_CONSUMPTION',
    name: 'Fresh Water Consumption',
    category: 'water',
    default_unit: 'm3',
    supported_units: ['m3', 'litres', 'kL'],
    unit_conversions: { litres: 0.001, kL: 1.0 },
    is_enabled: true,
    is_transfer_activity: false,
    validation_rules: {},
    created_at: '',
    updated_at: '',
  },
  {
    id: 'act-food',
    code: 'WASTE_FOOD',
    name: 'Cooked Food Waste Generated',
    category: 'food_waste',
    default_unit: 'kg',
    supported_units: ['kg', 'tonnes'],
    unit_conversions: { tonnes: 1000 },
    is_enabled: true,
    is_transfer_activity: false,
    validation_rules: {},
    created_at: '',
    updated_at: '',
  },
];

const mockAB1Summary: BlockActivitiesSummary = {
  block_id: 'block-ab1',
  block_name: 'Academic Block 1',
  block_code: 'AB1',
  total_assigned: 2,
  activities: [
    {
      id: 'assign-1',
      block_id: 'block-ab1',
      activity_id: 'act-elec',
      is_enabled: true,
      created_at: '',
      updated_at: '',
      activity: mockActivities[0],
    },
    {
      id: 'assign-2',
      block_id: 'block-ab1',
      activity_id: 'act-water',
      is_enabled: true,
      created_at: '',
      updated_at: '',
      activity: mockActivities[1],
    },
  ],
};

const mockGargiSummary: BlockActivitiesSummary = {
  block_id: 'block-gargi',
  block_name: 'Gargi',
  block_code: 'HST-GARGI',
  total_assigned: 2,
  activities: [
    {
      id: 'assign-3',
      block_id: 'block-gargi',
      activity_id: 'act-elec',
      is_enabled: true,
      created_at: '',
      updated_at: '',
      activity: mockActivities[0],
    },
    {
      id: 'assign-4',
      block_id: 'block-gargi',
      activity_id: 'act-food',
      is_enabled: true,
      created_at: '',
      updated_at: '',
      activity: mockActivities[2],
    },
  ],
};

const mockRecords: DailyActivityRecord[] = [
  {
    id: 'rec-01',
    organization_id: 'org-01',
    campus_id: 'cbe-campus-01',
    block_id: 'block-ab1',
    activity_id: 'act-elec',
    reporting_date: '2026-10-15',
    quantity: 1250,
    unit: 'kWh',
    standardized_quantity: 1250,
    standardized_unit: 'kWh',
    data_status: 'measured',
    measurement_method: 'utility_meter',
    reading_identifier: 'official_daily_total',
    is_daily_total: true,
    is_transfer: false,
    version: 1,
    created_at: '',
    updated_at: '',
    block_name: 'Academic Block 1',
    block_code: 'AB1',
    activity_name: 'Grid Electricity Consumption',
    activity_code: 'ELEC_CONSUMPTION',
  },
];

describe('CampusCarbon AI — Phase 3 ActivityDataPage Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiClient, 'getBlocks').mockResolvedValue({
      total: 2,
      items: mockBlocks,
      category_summary: [],
    });
    vi.spyOn(apiClient, 'getActivities').mockResolvedValue(mockActivities);
    vi.spyOn(apiClient, 'getBlockActivities').mockImplementation(async (bId) => {
      if (bId === 'block-gargi') return mockGargiSummary;
      return mockAB1Summary;
    });
    vi.spyOn(apiClient, 'getActivityRecords').mockResolvedValue({
      total: 1,
      items: mockRecords,
      limit: 50,
      offset: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Renders page branding, tabs and initial form fields', async () => {
    render(<ActivityDataPage />);

    expect(await screen.findByText('Daily Activity Telemetry & Entry')).toBeInTheDocument();
    expect(screen.getByText('Amrita Vishwa Vidyapeetham')).toBeInTheDocument();
    expect(screen.getByText('Phase 3 Active')).toBeInTheDocument();
    expect(screen.getByText('New Daily Entry')).toBeInTheDocument();
    expect(screen.getByText('Daily History & Audit Log')).toBeInTheDocument();
  });

  it('2. Loads assigned activities dynamically when block is selected', async () => {
    render(<ActivityDataPage />);

    expect(await screen.findByText(/Academic Block 1/i)).toBeInTheDocument();

    // Select Gargi hostel
    const blockSelect = screen.getByDisplayValue(/Academic Block 1/i);
    fireEvent.change(blockSelect, { target: { value: 'block-gargi' } });

    await waitFor(() => {
      expect(screen.getByText(/Cooked Food Waste Generated/i)).toBeInTheDocument();
    });
  });

  it('3. Calculates real-time unit conversion preview', async () => {
    render(<ActivityDataPage />);

    await screen.findByText(/Academic Block 1/i);

    // Enter quantity: 500
    const qtyInput = screen.getByPlaceholderText(/e\.g\. 1500/i);
    fireEvent.change(qtyInput, { target: { value: '500' } });

    // Canonical preview should show 500 kWh
    expect(await screen.findByText(/500 kWh/i)).toBeInTheDocument();
  });

  it('4. Submits daily record to backend API', async () => {
    const createSpy = vi.spyOn(apiClient, 'createActivityRecord').mockResolvedValue({
      id: 'new-rec-id',
      organization_id: 'org-01',
      campus_id: 'cbe-campus-01',
      block_id: 'block-ab1',
      activity_id: 'act-elec',
      reporting_date: '2026-10-15',
      quantity: 450,
      unit: 'kWh',
      standardized_quantity: 450,
      standardized_unit: 'kWh',
      data_status: 'measured',
      measurement_method: 'utility_meter',
      reading_identifier: 'official_daily_total',
      is_daily_total: true,
      is_transfer: false,
      version: 1,
      created_at: '',
      updated_at: '',
      block_name: 'Academic Block 1',
    });

    render(<ActivityDataPage />);

    await screen.findByText(/Academic Block 1/i);

    const qtyInput = screen.getByPlaceholderText(/e\.g\. 1500/i);
    fireEvent.change(qtyInput, { target: { value: '450' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Daily Record/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          block_id: 'block-ab1',
          quantity: 450,
          unit: 'kWh',
        })
      );
    });
  });

  it('5. Switches to History tab and displays records table', async () => {
    render(<ActivityDataPage />);

    await screen.findByText('Daily History & Audit Log');

    const historyTab = screen.getByText('Daily History & Audit Log');
    fireEvent.click(historyTab);

    const qtyCells = await screen.findAllByText(/1,250\s*kWh/i);
    expect(qtyCells.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Grid Electricity Consumption').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('v1')).toBeInTheDocument();
  });
});
