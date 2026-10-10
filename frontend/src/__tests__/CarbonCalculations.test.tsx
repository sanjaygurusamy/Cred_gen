import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CarbonCalculationsPage } from '../pages/CarbonCalculationsPage';
import { apiClient } from '../api/client';
import {
  CampusBlock,
  EmissionFactor,
  CarbonCalculationResponse,
  CarbonCalculationListResponse,
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
    id: 'block-solar',
    campus_id: 'cbe-campus-01',
    name: 'Rooftop Solar PV Array',
    code: 'SOL-01',
    category: 'other_facility',
    floor_area_sqm: 4500,
    occupant_capacity: 0,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
];

const mockFactors: EmissionFactor[] = [
  {
    id: 'ef-cea-01',
    factor_code: 'EF_IN_GRID_CEA_V19',
    name: 'Indian National Grid Electricity (CEA v19)',
    category: 'electricity',
    scope: 'scope_2',
    factor_value: 0.716,
    factor_unit: 'kg CO2e/kWh',
    target_activity_unit: 'kWh',
    applicable_activity_code: 'ELEC_CONSUMPTION',
    geography: 'India (National Average)',
    source_organization: 'Central Electricity Authority (CEA), Ministry of Power, GoI',
    reference_document: 'CO2 Baseline Database for the Indian Power Sector, User Guide Version 19.0 (Dec 2023)',
    publication_year: 2023,
    applicable_reporting_year: 2023,
    effective_start_date: '2023-01-01',
    effective_end_date: null,
    is_active: true,
    status: 'verified',
    version: 1,
    calculation_methodology: 'Combined margin emission factor',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'ef-solar-01',
    factor_code: 'EF_SOLAR_PV_ONSITE',
    name: 'Onsite Solar PV Generation (Zero Scope 2)',
    category: 'electricity',
    scope: 'scope_2',
    factor_value: 0.0,
    factor_unit: 'kg CO2e/kWh',
    target_activity_unit: 'kWh',
    applicable_activity_code: 'SOLAR_ELEC_GEN',
    geography: 'Amrita Coimbatore Campus',
    source_organization: 'GHG Protocol Scope 2 Guidance',
    reference_document: 'GHG Protocol Scope 2 Guidance (Direct Zero Emissions)',
    publication_year: 2015,
    applicable_reporting_year: 2026,
    effective_start_date: '2020-01-01',
    effective_end_date: null,
    is_active: true,
    status: 'verified',
    version: 1,
    calculation_methodology: 'Direct zero emission factor for onsite solar generation',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'ef-diesel-01',
    factor_code: 'EF_DIESEL_STATIONARY',
    name: 'Stationary Diesel Combustion (DG Sets)',
    category: 'fuel',
    scope: 'scope_1',
    factor_value: 2.68,
    factor_unit: 'kg CO2e/litre',
    target_activity_unit: 'litres',
    applicable_activity_code: 'GEN_DIESEL_CONSUMPTION',
    geography: 'India',
    source_organization: 'IPCC 2006 Guidelines for National GHG Inventories',
    reference_document: 'IPCC 2006 Guidelines, Vol 2 Energy, Stationary Combustion',
    publication_year: 2006,
    applicable_reporting_year: 2024,
    effective_start_date: '2020-01-01',
    effective_end_date: null,
    is_active: true,
    status: 'verified',
    version: 1,
    calculation_methodology: 'Tier 1 default emission factor for stationary combustion of gas/diesel oil',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const mockCalculationResult: CarbonCalculationResponse = {
  id: 'calc-001',
  organization_id: 'org-01',
  campus_id: 'cbe-campus-01',
  block_id: 'block-ab1',
  block_name: 'Academic Block 1',
  block_code: 'AB1',
  reporting_date: '2026-10-11',
  reporting_period_end: null,
  activity_record_id: null,
  electricity_estimate_id: null,
  activity_code: 'ELEC_CONSUMPTION',
  activity_category: 'electricity',
  scope: 'scope_2',
  activity_data_type: 'actual_meter',
  reported_quantity: 1000.0,
  reported_unit: 'kWh',
  standardized_quantity: 1000.0,
  standardized_unit: 'kWh',
  conversion_factor_applied: 1.0,
  conversion_steps: 'Standard conversion 1:1',
  emission_factor_id: 'ef-cea-01',
  emission_factor_code: 'EF_IN_GRID_CEA_V19',
  emission_factor_version: 1,
  emission_factor_value: 0.716,
  emission_factor_unit: 'kg CO2e/kWh',
  emission_factor_source: 'Central Electricity Authority (CEA) CO2 Baseline Database v19',
  formula: '1000.0000 kWh * 0.716000 kg CO2e/kWh / 1000 = 0.7160 tonnes CO2e',
  emissions_kg_co2e: 716.0,
  emissions_t_co2e: 0.716,
  selected_reporting_source: 'actual_meter',
  selection_reason: 'Actual meter reading verified',
  baseline_id: null,
  baseline_version: null,
  is_superseded: false,
  superseded_by_id: null,
  status: 'valid',
  version: 1,
  methodology_notes: 'Scope 2 Location-based grid emission factor (CEA v19). Standard conversion 1:1.',
  validation_warnings: [],
  created_at: '2026-10-11T10:00:00Z',
  updated_at: '2026-10-11T10:00:00Z',
};

const mockCalculationList: CarbonCalculationListResponse = {
  items: [mockCalculationResult],
  total: 1,
  total_emissions_kg_co2e: 716.0,
  total_emissions_t_co2e: 0.716,
  by_scope: {
    scope_1: 0,
    scope_2: 716.0,
    scope_3: 0,
  },
  by_category: {
    electricity: 716.0,
  },
};

describe('CampusCarbon AI — Phase 5 Carbon Calculations & Emission Factors', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiClient, 'getBlocks').mockResolvedValue({
      items: mockBlocks,
      total: mockBlocks.length,
      category_summary: [
        { category: 'academic', label: 'Academic', count: 1, total_floor_area_sqm: 18500, total_capacity: 3200 },
        { category: 'other_facility', label: 'Other Facility', count: 1, total_floor_area_sqm: 4500, total_capacity: 0 },
      ],
    });
    vi.spyOn(apiClient, 'getEmissionFactors').mockImplementation(async (params) => {
      let filtered = [...mockFactors];
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (f) => f.name.toLowerCase().includes(q) || f.factor_code.toLowerCase().includes(q)
        );
      }
      if (params?.scope && params.scope !== 'all') {
        filtered = filtered.filter((f) => f.scope === params.scope);
      }
      return { items: filtered, total: filtered.length };
    });
    vi.spyOn(apiClient, 'getCarbonCalculations').mockResolvedValue(mockCalculationList);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Renders the Carbon Calculations engine with title, block selector, and 3 operational tabs', async () => {
    render(<CarbonCalculationsPage />);

    expect(await screen.findByText(/Carbon Calculation Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/greenhouse gas emissions calculations/i)).toBeInTheDocument();

    // Verify 3 operational tabs
    expect(screen.getByRole('button', { name: /Calculate Emissions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Emission Factor Catalogue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Audit Log & History/i })).toBeInTheDocument();

    // Block selector loaded
    await waitFor(() => {
      expect(screen.getByText(/Academic Block 1 \(AB1\)/i)).toBeInTheDocument();
    });
  });

  it('2. Navigates to Emission Factor Catalogue tab and renders verified Indian factors', async () => {
    render(<CarbonCalculationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Academic Block 1 \(AB1\)/i)).toBeInTheDocument();
    });

    const factorTabBtn = screen.getByRole('button', { name: /Emission Factor Catalogue/i });
    fireEvent.click(factorTabBtn);

    // Factors loaded
    expect(await screen.findByText('Indian National Grid Electricity (CEA v19)')).toBeInTheDocument();
    expect(screen.getByText('Stationary Diesel Combustion (DG Sets)')).toBeInTheDocument();
    expect(screen.getByText('Onsite Solar PV Generation (Zero Scope 2)')).toBeInTheDocument();

    // Verify factor value and units are visible
    expect(screen.getByText('0.716')).toBeInTheDocument();
    expect(screen.getAllByText('kg CO2e/kWh').length).toBeGreaterThanOrEqual(1);
  });

  it('3. Filters factors in catalogue by search query', async () => {
    render(<CarbonCalculationsPage />);

    const factorTabBtn = screen.getByRole('button', { name: /Emission Factor Catalogue/i });
    fireEvent.click(factorTabBtn);

    await screen.findByText('Indian National Grid Electricity (CEA v19)');

    const searchInput = screen.getByPlaceholderText(/Search factors or sources/i);
    fireEvent.change(searchInput, { target: { value: 'diesel' } });

    // Diesel should be present, Grid should be filtered out
    expect(await screen.findByText('Stationary Diesel Combustion (DG Sets)')).toBeInTheDocument();
    expect(screen.queryByText('Indian National Grid Electricity (CEA v19)')).not.toBeInTheDocument();
  });

  it('4. Executes emission calculation with CEA Grid factor and renders transparent breakdown', async () => {
    const calcSpy = vi.spyOn(apiClient, 'calculateCarbon').mockResolvedValue(mockCalculationResult);

    render(<CarbonCalculationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Academic Block 1 \(AB1\)/i)).toBeInTheDocument();
    });

    // Enter custom quantity
    const customQtyCheckbox = screen.getByLabelText(/Manually enter ad-hoc quantity instead of fetching existing ledger record/i);
    fireEvent.click(customQtyCheckbox);

    const qtyInput = screen.getByPlaceholderText(/e\.g\. 1500/i);
    fireEvent.change(qtyInput, { target: { value: '1000' } });

    // Click Calculate
    const calcBtn = screen.getByRole('button', { name: /Execute Deterministic Calculation/i });
    fireEvent.click(calcBtn);

    await waitFor(() => {
      expect(calcSpy).toHaveBeenCalledTimes(1);
    });

    // Verify calculation breakdown is rendered
    expect(await screen.findByText(/Calculated Greenhouse Gas Emissions/i)).toBeInTheDocument();
    expect(screen.getByText('716')).toBeInTheDocument(); // kg CO2e
    expect(screen.getByText(/\(0\.716 tonnes CO2e\)/i)).toBeInTheDocument();
    expect(screen.getByText(/1000.0000 kWh \* 0.716000 kg CO2e\/kWh \/ 1000 = 0.7160 tonnes CO2e/i)).toBeInTheDocument();
  });

  it('5. Switches to Audit Log & History tab, displays Scope aggregation cards and recalculation action', async () => {
    render(<CarbonCalculationsPage />);

    const historyTabBtn = screen.getByRole('button', { name: /Audit Log & History/i });
    fireEvent.click(historyTabBtn);

    // Verify scope aggregation cards
    expect(await screen.findByText(/Scope 2 \(Purchased Grid\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/716\s*kg CO2e/i).length).toBeGreaterThanOrEqual(1);

    // Verify calculation record in list
    expect(await screen.findByText(/EF_IN_GRID_CEA_V19 \(v1\)/i)).toBeInTheDocument();

    // Check Recalculate button is available and click it
    const recalcBtn = screen.getByRole('button', { name: /Recalculate/i });
    expect(recalcBtn).toBeInTheDocument();
    fireEvent.click(recalcBtn);

    // Modal opens
    expect(await screen.findByText(/Safe Recalculation Request/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm Recalculation/i })).toBeInTheDocument();
  });

  it('6. Handles API errors gracefully during calculation execution', async () => {
    vi.spyOn(apiClient, 'calculateCarbon').mockRejectedValue(new Error('No actual reading or baseline available'));

    render(<CarbonCalculationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Academic Block 1 \(AB1\)/i)).toBeInTheDocument();
    });

    const calcBtn = screen.getByRole('button', { name: /Execute Deterministic Calculation/i });
    fireEvent.click(calcBtn);

    expect(await screen.findByText(/No actual reading or baseline available/i)).toBeInTheDocument();
  });
});
