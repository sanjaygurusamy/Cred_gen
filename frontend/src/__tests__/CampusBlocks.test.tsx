import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CampusBlocksPage } from '../pages/CampusBlocksPage';
import { apiClient } from '../api/client';
import { Campus, CampusBlock, BlockListResponse, CategoryStat } from '../types';

const mockCampus: Campus = {
  id: 'cbe-campus-01',
  organization_id: 'avv-org-01',
  name: 'Coimbatore Campus',
  code: 'CBE',
  location: 'Ettimadai, Coimbatore, Tamil Nadu 641112',
  latitude: 10.9003,
  longitude: 76.9015,
  total_area_sqm: 1821085,
  is_active: true,
  block_count: 27,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mock27Blocks: CampusBlock[] = [
  // 6 Academic
  { id: '1', campus_id: 'cbe-campus-01', name: 'Academic Block 1', code: 'AB1', category: 'academic', floor_area_sqm: 18500, occupant_capacity: 3200, is_active: true, created_at: '', updated_at: '' },
  { id: '2', campus_id: 'cbe-campus-01', name: 'Academic Block 2', code: 'AB2', category: 'academic', floor_area_sqm: 22000, occupant_capacity: 3800, is_active: true, created_at: '', updated_at: '' },
  { id: '3', campus_id: 'cbe-campus-01', name: 'Academic Block 3', code: 'AB3', category: 'academic', floor_area_sqm: 16000, occupant_capacity: 2500, is_active: true, created_at: '', updated_at: '' },
  { id: '4', campus_id: 'cbe-campus-01', name: 'Academic Block 4', code: 'AB4', category: 'academic', floor_area_sqm: 14500, occupant_capacity: 2000, is_active: true, created_at: '', updated_at: '' },
  { id: '5', campus_id: 'cbe-campus-01', name: 'MBA', code: 'MBA', category: 'academic', floor_area_sqm: 8500, occupant_capacity: 900, is_active: true, created_at: '', updated_at: '' },
  { id: '6', campus_id: 'cbe-campus-01', name: 'CIR', code: 'CIR', category: 'academic', floor_area_sqm: 4200, occupant_capacity: 600, is_active: true, created_at: '', updated_at: '' },
  // 10 Hostels
  { id: '7', campus_id: 'cbe-campus-01', name: 'Gargi', code: 'HST-GARGI', category: 'hostel', floor_area_sqm: 12500, occupant_capacity: 750, is_active: true, created_at: '', updated_at: '' },
  { id: '8', campus_id: 'cbe-campus-01', name: 'Mythri', code: 'HST-MYTHRI', category: 'hostel', floor_area_sqm: 11000, occupant_capacity: 650, is_active: true, created_at: '', updated_at: '' },
  { id: '9', campus_id: 'cbe-campus-01', name: 'Adithi', code: 'HST-ADITHI', category: 'hostel', floor_area_sqm: 11500, occupant_capacity: 680, is_active: true, created_at: '', updated_at: '' },
  { id: '10', campus_id: 'cbe-campus-01', name: 'Savithri', code: 'HST-SAVITHRI', category: 'hostel', floor_area_sqm: 9800, occupant_capacity: 550, is_active: true, created_at: '', updated_at: '' },
  { id: '11', campus_id: 'cbe-campus-01', name: 'Kashyapa', code: 'HST-KASHYAPA', category: 'hostel', floor_area_sqm: 13500, occupant_capacity: 850, is_active: true, created_at: '', updated_at: '' },
  { id: '12', campus_id: 'cbe-campus-01', name: 'Vashita', code: 'HST-VASHITA', category: 'hostel', floor_area_sqm: 13000, occupant_capacity: 800, is_active: true, created_at: '', updated_at: '' },
  { id: '13', campus_id: 'cbe-campus-01', name: 'Agastya', code: 'HST-AGASTYA', category: 'hostel', floor_area_sqm: 12800, occupant_capacity: 780, is_active: true, created_at: '', updated_at: '' },
  { id: '14', campus_id: 'cbe-campus-01', name: 'Bhrighu', code: 'HST-BHRIGHU', category: 'hostel', floor_area_sqm: 12000, occupant_capacity: 720, is_active: true, created_at: '', updated_at: '' },
  { id: '15', campus_id: 'cbe-campus-01', name: 'Yagnavalkya', code: 'HST-YAGNAVALKYA', category: 'hostel', floor_area_sqm: 10500, occupant_capacity: 620, is_active: true, created_at: '', updated_at: '' },
  { id: '16', campus_id: 'cbe-campus-01', name: 'Nachiketas', code: 'HST-NACHIKETAS', category: 'hostel', floor_area_sqm: 11200, occupant_capacity: 660, is_active: true, created_at: '', updated_at: '' },
  // 1 Faculty Quarters
  { id: '17', campus_id: 'cbe-campus-01', name: 'Faculty Quarters', code: 'RES-FQ', category: 'faculty_quarters', floor_area_sqm: 35000, occupant_capacity: 1200, is_active: true, created_at: '', updated_at: '' },
  // 4 Kitchens & Canteens
  { id: '18', campus_id: 'cbe-campus-01', name: 'Central Kitchen', code: 'CUL-CK', category: 'kitchen_canteen', floor_area_sqm: 4800, occupant_capacity: 250, is_active: true, created_at: '', updated_at: '' },
  { id: '19', campus_id: 'cbe-campus-01', name: 'Sopanam Canteen', code: 'CUL-SOPANAM', category: 'kitchen_canteen', floor_area_sqm: 3200, occupant_capacity: 1100, is_active: true, created_at: '', updated_at: '' },
  { id: '20', campus_id: 'cbe-campus-01', name: 'Prasada Canteen', code: 'CUL-PRASADA', category: 'kitchen_canteen', floor_area_sqm: 2800, occupant_capacity: 900, is_active: true, created_at: '', updated_at: '' },
  { id: '21', campus_id: 'cbe-campus-01', name: 'Samudhra Canteen', code: 'CUL-SAMUDHRA', category: 'kitchen_canteen', floor_area_sqm: 2100, occupant_capacity: 650, is_active: true, created_at: '', updated_at: '' },
  // 1 Transportation
  { id: '22', campus_id: 'cbe-campus-01', name: 'Transportation', code: 'OPS-TRANS', category: 'transportation', floor_area_sqm: 6500, occupant_capacity: 120, is_active: true, created_at: '', updated_at: '' },
  // 2 Sewage Treatment
  { id: '23', campus_id: 'cbe-campus-01', name: 'Sewage Treatment Plant 1', code: 'UTL-STP1', category: 'sewage_treatment', floor_area_sqm: 3500, occupant_capacity: 25, is_active: true, created_at: '', updated_at: '' },
  { id: '24', campus_id: 'cbe-campus-01', name: 'Sewage Treatment Plant 2', code: 'UTL-STP2', category: 'sewage_treatment', floor_area_sqm: 3200, occupant_capacity: 20, is_active: true, created_at: '', updated_at: '' },
  // 3 Other Facilities
  { id: '25', campus_id: 'cbe-campus-01', name: 'Central Waste Collection', code: 'UTL-CWC', category: 'other_facility', floor_area_sqm: 2400, occupant_capacity: 35, is_active: true, created_at: '', updated_at: '' },
  { id: '26', campus_id: 'cbe-campus-01', name: 'Fabrication', code: 'OPS-FAB', category: 'other_facility', floor_area_sqm: 4100, occupant_capacity: 80, is_active: true, created_at: '', updated_at: '' },
  { id: '27', campus_id: 'cbe-campus-01', name: 'Generator', code: 'UTL-GEN', category: 'other_facility', floor_area_sqm: 1800, occupant_capacity: 15, is_active: true, created_at: '', updated_at: '' },
];

const mockCategoryStats: CategoryStat[] = [
  { category: 'academic', label: 'Academic', count: 6, total_floor_area_sqm: 83700, total_capacity: 13100 },
  { category: 'hostel', label: 'Hostels', count: 10, total_floor_area_sqm: 117800, total_capacity: 7060 },
  { category: 'faculty_quarters', label: 'Faculty Quarters', count: 1, total_floor_area_sqm: 35000, total_capacity: 1200 },
  { category: 'kitchen_canteen', label: 'Kitchens & Canteens', count: 4, total_floor_area_sqm: 12900, total_capacity: 2900 },
  { category: 'transportation', label: 'Transportation', count: 1, total_floor_area_sqm: 6500, total_capacity: 120 },
  { category: 'sewage_treatment', label: 'Sewage Treatment', count: 2, total_floor_area_sqm: 6700, total_capacity: 45 },
  { category: 'other_facility', label: 'Other Facilities', count: 3, total_floor_area_sqm: 8300, total_capacity: 130 },
];

const mockBlockListResponse: BlockListResponse = {
  total: 27,
  campus_id: 'cbe-campus-01',
  items: mock27Blocks,
  category_summary: mockCategoryStats,
};

describe('CampusCarbon AI — Phase 2 CampusBlocksPage Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiClient, 'getCampuses').mockResolvedValue([mockCampus]);
    vi.spyOn(apiClient, 'getBlocks').mockResolvedValue(mockBlockListResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Renders campus institution details and KPIs', async () => {
    render(<CampusBlocksPage />);

    expect(await screen.findByText('Amrita Vishwa Vidyapeetham')).toBeInTheDocument();
    expect(screen.getByText('Coimbatore Campus (AVV-CBE)')).toBeInTheDocument();
    expect(screen.getByText('27 Canonical Facilities')).toBeInTheDocument();
    expect(screen.getAllByText('27').length).toBeGreaterThanOrEqual(1);
  });

  it('2. Renders all 27 canonical blocks in the default view', async () => {
    render(<CampusBlocksPage />);

    expect(await screen.findByText('Academic Block 1')).toBeInTheDocument();
    expect(screen.getByText('Gargi')).toBeInTheDocument();
    expect(screen.getAllByText('Faculty Quarters').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Central Kitchen')).toBeInTheDocument();
    expect(screen.getAllByText('Transportation').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Sewage Treatment Plant 1')).toBeInTheDocument();
    expect(screen.getByText('Generator')).toBeInTheDocument();
  });

  it('3. Filters blocks by category', async () => {
    render(<CampusBlocksPage />);

    await screen.findByText('Academic Block 1');

    // Click "Hostels" filter tab
    const hostelTabs = screen.getAllByRole('button', { name: /Hostels/i });
    fireEvent.click(hostelTabs[0]);

    // Hostel blocks should be visible
    expect(screen.getByText('Gargi')).toBeInTheDocument();
    expect(screen.getByText('Mythri')).toBeInTheDocument();

    // Academic block should be filtered out
    expect(screen.queryByText('Academic Block 1')).not.toBeInTheDocument();
  });

  it('4. Filters blocks by search input', async () => {
    render(<CampusBlocksPage />);

    await screen.findByText('Academic Block 1');

    const searchInput = screen.getByPlaceholderText(/Search blocks by name, code/i);
    fireEvent.change(searchInput, { target: { value: 'Gargi' } });

    expect(screen.getByText('Gargi')).toBeInTheDocument();
    expect(screen.queryByText('Academic Block 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Central Kitchen')).not.toBeInTheDocument();
  });

  it('5. Shows empty state when no blocks match search query', async () => {
    render(<CampusBlocksPage />);

    await screen.findByText('Academic Block 1');

    const searchInput = screen.getByPlaceholderText(/Search blocks by name, code/i);
    fireEvent.change(searchInput, { target: { value: 'NonExistentBlockXYZ' } });

    expect(await screen.findByText('No Facilities Found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear Filters/i })).toBeInTheDocument();
  });

  it('6. Opens and submits Add Block modal', async () => {
    const createSpy = vi.spyOn(apiClient, 'createBlock').mockResolvedValue({
      id: 'new-block-01',
      campus_id: 'cbe-campus-01',
      name: 'New Test Lab',
      code: 'LAB-01',
      category: 'academic',
      floor_area_sqm: 500,
      occupant_capacity: 60,
      is_active: true,
      created_at: '',
      updated_at: '',
    });

    render(<CampusBlocksPage />);

    await screen.findByText('Academic Block 1');

    // Click "Add Block" button
    const addBtn = screen.getByRole('button', { name: /Add Block/i });
    fireEvent.click(addBtn);

    expect(screen.getByText('Add Campus Block')).toBeInTheDocument();

    // Fill inputs
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Academic Block 5/i), {
      target: { value: 'New Test Lab' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. AB5/i), {
      target: { value: 'LAB-01' },
    });

    // Submit form (in modal)
    const submitBtns = screen.getAllByRole('button', { name: /Add Block/i });
    // Modal submit button is the last one
    fireEvent.click(submitBtns[submitBtns.length - 1]);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Test Lab',
          code: 'LAB-01',
        })
      );
    });
  });

  it('7. Handles deletion confirmation flow', async () => {
    const deleteSpy = vi.spyOn(apiClient, 'deleteBlock').mockResolvedValue({
      message: 'Block deleted successfully.',
    });

    render(<CampusBlocksPage />);

    await screen.findByText('Academic Block 1');

    // Find delete button for first block
    const deleteButtons = screen.getAllByTitle('Delete Block');
    fireEvent.click(deleteButtons[0]);

    expect(await screen.findByText('Confirm Deletion')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirm Delete/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('1');
    });
  });
});
