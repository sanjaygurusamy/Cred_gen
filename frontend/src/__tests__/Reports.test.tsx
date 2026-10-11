import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ReportsPage } from '../pages/ReportsPage';
import { apiClient } from '../api/client';
import {
  DashboardMetricsResponse,
  CategoryEmissionsResponse,
  BlockEmissionsResponse,
  DataQualityResponse,
  BlockListResponse,
} from '../types';

const mockMetrics: DashboardMetricsResponse = {
  reporting_period_start: '2024-04-01',
  reporting_period_end: '2024-04-30',
  total_emissions_kg_co2e: 45250.75,
  total_emissions_t_co2e: 45.251,
  scope_1_kg: 3750.25,
  scope_1_t: 3.750,
  scope_2_kg: 41528.0,
  scope_2_t: 41.528,
  scope_3_kg: 0.0,
  scope_3_t: 0.0,
  total_electricity_kwh: 58000.0,
  actual_electricity_kwh: 50000.0,
  estimated_electricity_kwh: 8000.0,
  total_records: 50,
  measured_records: 45,
  estimated_records: 5,
  measured_coverage_pct: 90.0,
  active_blocks_count: 27,
  reporting_blocks_count: 24,
  reporting_coverage_pct: 88.89,
  has_data: true,
};

const mockCategories: CategoryEmissionsResponse = {
  items: [
    {
      category: 'electricity',
      category_name: 'Purchased Electricity',
      scope: 'scope_2',
      emissions_kg_co2e: 41528.0,
      emissions_t_co2e: 41.528,
      percentage_of_total: 91.77,
      record_count: 30,
      measured_count: 25,
      estimated_count: 5,
    },
    {
      category: 'fuel',
      category_name: 'Stationary Combustion Fuel',
      scope: 'scope_1',
      emissions_kg_co2e: 3722.75,
      emissions_t_co2e: 3.723,
      percentage_of_total: 8.23,
      record_count: 20,
      measured_count: 20,
      estimated_count: 0,
    },
  ],
  total_emissions_kg_co2e: 45250.75,
  total_emissions_t_co2e: 45.251,
  by_scope: { scope_1: 3722.75, scope_2: 41528.0, scope_3: 0.0 },
};

const mockBlockEmissions: BlockEmissionsResponse = {
  items: [
    {
      block_id: 'b-01',
      block_name: 'Academic Block 1',
      block_code: 'AB1',
      block_category: 'academic',
      floor_area_sqm: 18500.0,
      occupant_capacity: 3200,
      total_emissions_kg_co2e: 12450.5,
      total_emissions_t_co2e: 12.451,
      emissions_per_sqm: 0.67,
      emissions_per_occupant: 3.89,
      percentage_of_campus: 60.5,
      electricity_kwh: 17388.9,
      record_count: 30,
      measured_pct: 95.0,
      scope_1_kg: 0,
      scope_2_kg: 12450.5,
      scope_3_kg: 0,
      has_data: true,
    },
    {
      block_id: 'b-07',
      block_name: 'Gargi Hostel',
      block_code: 'HST-GARGI',
      block_category: 'hostel',
      floor_area_sqm: 12500.0,
      occupant_capacity: 750,
      total_emissions_kg_co2e: 8120.0,
      total_emissions_t_co2e: 8.12,
      emissions_per_sqm: 0.65,
      emissions_per_occupant: 10.83,
      percentage_of_campus: 39.5,
      electricity_kwh: 11340.7,
      record_count: 20,
      measured_pct: 90.0,
      scope_1_kg: 0,
      scope_2_kg: 8120.0,
      scope_3_kg: 0,
      has_data: true,
    },
  ],
  total_campus_emissions_t_co2e: 20.571,
  blocks_reporting_count: 2,
  blocks_total_count: 27,
};

const mockDataQuality: DataQualityResponse = {
  total_campus_blocks: 27,
  blocks_with_data_count: 2,
  blocks_missing_data_count: 25,
  blocks_with_missing_expectations: [],
  measured_records_count: 45,
  estimated_records_count: 5,
  uncalculated_activity_records_count: 0,
  uncalculated_records_details: [],
  safeguard_checks: {
    no_distance_fuel_calculations: true,
    no_generator_gross_kwh_emissions: true,
    no_transfer_double_counting: true,
    no_volume_only_stp_emissions: true,
  },
};

const mockBlocksResponse: BlockListResponse = {
  items: [
    {
      id: 'b-01',
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
  ],
  total: 1,
  category_summary: [],
};

describe('CampusCarbon AI — Phase 6 Reports & Disclosures Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiClient, 'getBlocks').mockResolvedValue(mockBlocksResponse);
    vi.spyOn(apiClient, 'getDashboardMetrics').mockResolvedValue(mockMetrics);
    vi.spyOn(apiClient, 'getEmissionsByCategory').mockResolvedValue(mockCategories);
    vi.spyOn(apiClient, 'getEmissionsByBlock').mockResolvedValue(mockBlockEmissions);
    vi.spyOn(apiClient, 'getDataQuality').mockResolvedValue(mockDataQuality);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Renders institutional header, campus branding, and export buttons', async () => {
    render(<ReportsPage />);

    expect(await screen.findByText('Amrita Vishwa Vidyapeetham')).toBeInTheDocument();
    expect(screen.getByText('Coimbatore Campus (AVV-CBE)')).toBeInTheDocument();
    expect(screen.getByText('Sustainability & GHG Reporting Disclosures')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download CSV Export/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download Executive PDF/i })).toBeInTheDocument();
  });

  it('2. Displays reporting period selector and quick date presets', async () => {
    render(<ReportsPage />);

    expect(await screen.findByText('Reporting Window:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /7 Days/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /30 Days/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /YTD/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All Records/i })).toBeInTheDocument();
  });

  it('3. Renders Executive GHG Protocol scope summary KPIs', async () => {
    render(<ReportsPage />);

    expect(await screen.findByText('Gross Campus Footprint')).toBeInTheDocument();
    expect(screen.getByText('45.251 t')).toBeInTheDocument();
    expect(screen.getByText('Scope 1 (Direct Fuel)')).toBeInTheDocument();
    expect(screen.getByText('Scope 2 (Electricity)')).toBeInTheDocument();
    expect(screen.getByText('Scope 3 (Waste Streams)')).toBeInTheDocument();
  });

  it('4. Renders Category Breakdown table and Scope badges in Scopes Tab', async () => {
    render(<ReportsPage />);

    expect(await screen.findByText('Emissions by Activity Category')).toBeInTheDocument();
    expect(screen.getByText('Purchased Electricity')).toBeInTheDocument();
    expect(screen.getByText('Stationary Combustion Fuel')).toBeInTheDocument();
    expect(screen.getByText('Scope 2')).toBeInTheDocument();
    expect(screen.getByText('Scope 1')).toBeInTheDocument();
  });

  it('5. Switches to Campus Block Inventories tab and shows block data', async () => {
    render(<ReportsPage />);

    await screen.findByText('Gross Campus Footprint');
    const blocksTab = screen.getByRole('button', { name: /Campus Block Inventories/i });
    fireEvent.click(blocksTab);

    expect(await screen.findByText('Campus Block Footprint & Intensity')).toBeInTheDocument();
    expect(screen.getByText('Academic Block 1')).toBeInTheDocument();
    expect(screen.getByText('AB1')).toBeInTheDocument();
    expect(screen.getByText('HST-GARGI')).toBeInTheDocument();
  });

  it('6. Switches to Authoritative Factor Schedule tab and displays CEA & IPCC factors', async () => {
    render(<ReportsPage />);

    await screen.findByText('Gross Campus Footprint');
    const factorsTab = screen.getByRole('button', { name: /Authoritative Factor Schedule/i });
    fireEvent.click(factorsTab);

    expect(await screen.findByText('Grid Electricity Consumption')).toBeInTheDocument();
    expect(screen.getByText('0.7160')).toBeInTheDocument();
    expect(screen.getByText('Central Electricity Authority (CEA)')).toBeInTheDocument();
    expect(screen.getByText('LPG Stationary Combustion')).toBeInTheDocument();
    expect(screen.getByText('2.9830')).toBeInTheDocument();
  });

  it('7. Switches to MRV Safeguards tab and validates institutional compliance rules', async () => {
    render(<ReportsPage />);

    await screen.findByText('Gross Campus Footprint');
    const safeguardsTab = screen.getByRole('button', { name: /MRV Safeguards & Integrity/i });
    fireEvent.click(safeguardsTab);

    expect(await screen.findByText('Institutional Safeguards Active')).toBeInTheDocument();
    expect(screen.getByText(/No Distance Proxies/i)).toBeInTheDocument();
    expect(screen.getByText(/Generator Gross Separation/i)).toBeInTheDocument();
    expect(screen.getByText(/Water Transfer Exclusion/i)).toBeInTheDocument();
    expect(screen.getByText(/STP Volume Safeguard/i)).toBeInTheDocument();
  });

  it('8. Triggers CSV download when clicking Download CSV Export button', async () => {
    const csvSpy = vi.spyOn(apiClient, 'downloadCsvReport').mockResolvedValue(undefined);

    render(<ReportsPage />);

    const csvBtn = await screen.findByRole('button', { name: /Download CSV Export/i });
    fireEvent.click(csvBtn);

    await waitFor(() => {
      expect(csvSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('9. Triggers PDF download when clicking Download Executive PDF button', async () => {
    const pdfSpy = vi.spyOn(apiClient, 'downloadPdfReport').mockResolvedValue(undefined);

    render(<ReportsPage />);

    const pdfBtn = await screen.findByRole('button', { name: /Download Executive PDF/i });
    fireEvent.click(pdfBtn);

    await waitFor(() => {
      expect(pdfSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('10. Handles API error gracefully and displays user alert', async () => {
    vi.spyOn(apiClient, 'getDashboardMetrics').mockRejectedValue(new Error('PostgreSQL timeout'));

    render(<ReportsPage />);

    expect(await screen.findByText('PostgreSQL timeout')).toBeInTheDocument();
  });

  it('11. Renders honest empty state message when no data exists', async () => {
    vi.spyOn(apiClient, 'getDashboardMetrics').mockResolvedValue({
      ...mockMetrics,
      has_data: false,
      total_emissions_kg_co2e: 0,
      total_emissions_t_co2e: 0,
    });
    vi.spyOn(apiClient, 'getEmissionsByCategory').mockResolvedValue({
      items: [],
      total_emissions_kg_co2e: 0,
      total_emissions_t_co2e: 0,
      by_scope: {},
    });

    render(<ReportsPage />);

    expect(
      await screen.findByText('No category calculation records found for the selected reporting period.')
    ).toBeInTheDocument();
  });
});
