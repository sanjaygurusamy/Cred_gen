import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TreesPage } from '../pages/TreesPage';
import { apiClient } from '../api/client';
import {
  SequestrationSummary,
  TreeInventory,
  PlantationRecord,
  GreenSpace,
  BlockListResponse,
} from '../types';

const mockTreesSummary: SequestrationSummary = {
  total_trees: 1015,
  total_species_count: 5,
  total_green_spaces: 5,
  total_green_space_area_sqm: 16800,
  total_annual_sequestration_kg_co2e: 11382.5,
  total_annual_sequestration_t_co2e: 11.38,
  total_saplings_planted: 215,
  total_saplings_surviving: 195,
  average_survival_rate_percent: 90.7,
  methodology: 'IPCC 2006 AFOLU Vol 4 & Forest Survey of India (FSI) Allometric Biomass Standard',
  methodology_assumptions: 'Annual carbon sequestration rate derived from species-specific growth curves and health multipliers.',
  species_breakdown: [
    {
      common_name: 'Neem',
      species_name: 'Azadirachta indica',
      tree_count: 240,
      annual_sequestration_kg: 3168.0,
      annual_sequestration_t: 3.17,
      percentage_of_total: 27.83,
    },
    {
      common_name: 'Teak',
      species_name: 'Tectona grandis',
      tree_count: 180,
      annual_sequestration_kg: 2721.6,
      annual_sequestration_t: 2.72,
      percentage_of_total: 23.91,
    },
  ],
  green_space_breakdown: [
    {
      id: 'gs-01',
      name: 'North Miyawaki Forest',
      code: 'GS-MIYAWAKI-N',
      plantation_type: 'Miyawaki Forest',
      area_sqm: 2500,
      tree_count: 350,
      annual_sequestration_kg: 3850.0,
    },
  ],
  data_quality_label: 'Tier 2 Semi-Empirical (Verified Census)',
};

const mockTreeList: TreeInventory[] = [
  {
    id: 'tree-01',
    campus_id: 'cbe-campus-01',
    block_id: 'b-01',
    green_space_id: 'gs-01',
    species_name: 'Azadirachta indica',
    common_name: 'Neem',
    tree_count: 45,
    planting_year: 2015,
    estimated_age_years: 11,
    health_status: 'Healthy',
    location_description: 'Adjacent to Academic Block 1 eastern lawn',
    data_source: 'Campus Botanical Census 2024',
    verification_status: 'Verified Field Census',
    sequestration_rate_kg_year: 22.0,
    annual_sequestration_kg: 990.0,
    annual_sequestration_t: 0.99,
    block_name: 'Academic Block 1',
    green_space_name: 'North Miyawaki Forest',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'tree-02',
    campus_id: 'cbe-campus-01',
    block_id: null,
    green_space_id: null,
    species_name: 'Ficus benghalensis',
    common_name: 'Banyan Tree',
    tree_count: 5,
    planting_year: 1998,
    estimated_age_years: 28,
    health_status: 'Healthy',
    location_description: 'Central Administrative Circle',
    data_source: 'Estate Registry Records',
    verification_status: 'Verified Field Census',
    sequestration_rate_kg_year: 35.0,
    annual_sequestration_kg: 175.0,
    annual_sequestration_t: 0.175,
    block_name: null,
    green_space_name: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const mockPlantationList: PlantationRecord[] = [
  {
    id: 'plt-01',
    campus_id: 'cbe-campus-01',
    block_id: 'b-01',
    green_space_id: 'gs-01',
    event_name: 'World Environment Day Drive 2024',
    plantation_date: '2024-06-05',
    species_planted: 'Azadirachta indica, Pongamia pinnata',
    saplings_planted: 100,
    saplings_surviving: 94,
    survival_rate_percent: 94.0,
    plantation_location: 'North Perimeter Zone',
    maintenance_notes: 'Drip irrigation connected and organic mulch applied',
    block_name: 'Academic Block 1',
    green_space_name: 'North Miyawaki Forest',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const mockGreenSpaceList: GreenSpace[] = [
  {
    id: 'gs-01',
    campus_id: 'cbe-campus-01',
    block_id: 'b-01',
    name: 'North Miyawaki Forest',
    code: 'GS-MIYAWAKI-N',
    plantation_type: 'Miyawaki Forest',
    area_sqm: 2500,
    area_unit: 'sqm',
    description: 'High-density native afforestation plot',
    is_active: true,
    block_name: 'Academic Block 1',
    tree_count: 350,
    annual_sequestration_kg: 3850.0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

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

describe('CampusCarbon AI — Trees & Plantation Campus Body Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiClient, 'getTreesSummary').mockResolvedValue(mockTreesSummary);
    vi.spyOn(apiClient, 'getTreeInventory').mockResolvedValue(mockTreeList);
    vi.spyOn(apiClient, 'getPlantationRecords').mockResolvedValue(mockPlantationList);
    vi.spyOn(apiClient, 'getGreenSpaces').mockResolvedValue(mockGreenSpaceList);
    vi.spyOn(apiClient, 'getBlocks').mockResolvedValue(mockBlocksResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Renders institutional branding, banner, and KPI summary statistics', async () => {
    render(<TreesPage />);

    expect(await screen.findByText(/Amrita Vishwa Vidyapeetham • Coimbatore Campus \(AVV-CBE\)/i)).toBeInTheDocument();
    expect(screen.getByText('Trees, Plantations & Carbon Sequestration')).toBeInTheDocument();
    expect(screen.getByText('Eco-Campus Body')).toBeInTheDocument();

    // Check KPI cards
    expect(screen.getByText('1,015')).toBeInTheDocument();
    expect(screen.getByText('11.38 t CO₂e/yr')).toBeInTheDocument();
    expect(screen.getByText('16,800 m²')).toBeInTheDocument();
    expect(screen.getByText('90.7%')).toBeInTheDocument();
  });

  it('2. Renders tree inventory items with scientific name and sequestration', async () => {
    render(<TreesPage />);

    expect(await screen.findByText('Neem')).toBeInTheDocument();
    expect(screen.getByText(/Azadirachta indica/i)).toBeInTheDocument();
    expect(screen.getByText('Banyan Tree')).toBeInTheDocument();
    expect(screen.getByText(/Ficus benghalensis/i)).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('990 kg')).toBeInTheDocument();
  });

  it('3. Filters tree inventory list via search input', async () => {
    render(<TreesPage />);

    expect(await screen.findByText('Neem')).toBeInTheDocument();
    const searchInput = screen.getByPlaceholderText('Search species or location...');
    fireEvent.change(searchInput, { target: { value: 'Banyan' } });

    expect(screen.queryByText('Neem')).not.toBeInTheDocument();
    expect(screen.getByText('Banyan Tree')).toBeInTheDocument();
  });

  it('4. Switches between tabs to inspect Plantation Drives, Green Spaces, and Methodology', async () => {
    render(<TreesPage />);

    // Switch to Plantation Drives Tab
    const plantationsTab = await screen.findByRole('button', { name: /Plantation Drives/i });
    fireEvent.click(plantationsTab);
    expect(await screen.findByText('World Environment Day Drive 2024')).toBeInTheDocument();
    expect(screen.getByText('94.0%')).toBeInTheDocument();

    // Switch to Green Spaces Tab
    const greenSpacesTab = screen.getByRole('button', { name: /Green Spaces/i });
    fireEvent.click(greenSpacesTab);
    expect(await screen.findByText('North Miyawaki Forest')).toBeInTheDocument();
    expect(screen.getByText('2,500 m²')).toBeInTheDocument();

    // Switch to Sequestration Methodology Tab
    const methodologyTab = screen.getByRole('button', { name: /Sequestration Methodology/i });
    fireEvent.click(methodologyTab);
    expect(await screen.findByText(/Documented Allometric Sequestration Standard/i)).toBeInTheDocument();
    expect(screen.getByText(/2006 IPCC Guidelines for National Greenhouse Gas Inventories/i)).toBeInTheDocument();
  });

  it('5. Opens Tree Census Modal and handles submission correctly', async () => {
    const createSpy = vi.spyOn(apiClient, 'createTreeInventory').mockResolvedValue({
      id: 'tree-new-01',
      campus_id: 'cbe-campus-01',
      block_id: null,
      green_space_id: null,
      species_name: 'Pongamia pinnata',
      common_name: 'Indian Beech',
      tree_count: 20,
      planting_year: 2020,
      estimated_age_years: 6,
      health_status: 'Healthy',
      location_description: 'South boundary line',
      data_source: 'Field Survey',
      verification_status: 'Verified Field Census',
      sequestration_rate_kg_year: 20.0,
      annual_sequestration_kg: 400.0,
      annual_sequestration_t: 0.4,
      block_name: null,
      green_space_name: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });

    render(<TreesPage />);

    const openModalBtn = await screen.findByRole('button', { name: /Record Tree Stand/i });
    fireEvent.click(openModalBtn);

    expect(screen.getByText('Record Tree Inventory Stand')).toBeInTheDocument();

    const commonNameInput = screen.getByPlaceholderText('e.g. Neem');
    fireEvent.change(commonNameInput, { target: { value: 'Indian Beech' } });

    const speciesNameInput = screen.getByPlaceholderText('e.g. Azadirachta indica');
    fireEvent.change(speciesNameInput, { target: { value: 'Pongamia pinnata' } });

    const submitBtn = screen.getByRole('button', { name: /Save Tree Stand/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalled();
    });
  });

  it('6. Shows empty state when no trees exist', async () => {
    vi.spyOn(apiClient, 'getTreeInventory').mockResolvedValue([]);
    render(<TreesPage />);

    expect(await screen.findByText('No tree inventory records match your filter criteria.')).toBeInTheDocument();
  });
});
