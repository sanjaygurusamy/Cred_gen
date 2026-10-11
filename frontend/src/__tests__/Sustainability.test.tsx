import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SustainabilityPage } from '../pages/SustainabilityPage';
import { apiClient } from '../api/client';
import { SustainabilitySummary } from '../types';

const mockSummary: SustainabilitySummary = {
  campus_name: 'Amrita Vishwa Vidyapeetham — Coimbatore Campus',
  campus_code: 'AVV-CBE',
  gross_emissions_t_co2e: 450.25,
  scope_1_t: 50.1,
  scope_2_t: 380.0,
  scope_3_t: 20.15,
  total_electricity_kwh: 530726.0,
  biological_sequestration_t_co2e: 22.51,
  standing_trees_count: 1015,
  green_space_area_sqm: 16800.0,
  active_sdgs_count: 6,
  recommendations_count: 3,
  potential_reduction_t_co2e: 142.5,
  data_quality_breakdown: {
    verified: 15,
    user_provided: 6,
    estimated: 4,
    awaiting_verification: 2,
    not_applicable: 0,
  },
  sdgs: [
    {
      sdg_number: 6,
      title: 'Clean Water and Sanitation',
      short_name: 'Clean Water',
      theme_color: '#26BDE2',
      icon_name: 'Droplets',
      institutional_relevance: '100% wastewater recycling through 450 KLD Sewage Treatment Plant.',
      targets: [
        {
          target_code: '6.3',
          title: 'Improve Water Quality and Wastewater Treatment',
          indicators: [
            {
              indicator_code: '6.3.1',
              name: 'Proportion of safely treated domestic wastewater',
              description: 'Treated STP effluent reused for campus landscaping.',
              campus_applicability: '100% of treated effluent tested quarterly to TNPCB norms.',
              metric_unit: 'kL/month',
            },
          ],
        },
      ],
    },
    {
      sdg_number: 7,
      title: 'Affordable and Clean Energy',
      short_name: 'Clean Energy',
      theme_color: '#FCC30B',
      icon_name: 'Zap',
      institutional_relevance: '1.2 MWp distributed rooftop solar PV arrays.',
      targets: [
        {
          target_code: '7.2',
          title: 'Increase Substantially the Share of Renewable Energy',
          indicators: [
            {
              indicator_code: '7.2.1',
              name: 'Renewable energy share in total final energy consumption',
              description: 'Onsite solar generation vs grid import.',
              campus_applicability: 'Rooftop solar displacement calculated at 0.716 kg CO2e/kWh.',
              metric_unit: 'kWh/month',
            },
          ],
        },
      ],
    },
  ],
  priority_recommendations: [
    {
      id: 'rec-01',
      campus_id: 'cbe-campus-01',
      block_id: 'block-ab1',
      block_name: 'Academic Block 1',
      title: 'High-Efficiency LED Retrofit and Occupancy Sensors in AB1',
      category: 'energy_efficiency',
      priority: 'high',
      proposed_action: 'Replace T8 fluorescents with 18W smart LED fixtures.',
      supporting_evidence: 'Energy audit log Q1 2024.',
      related_sdgs: [7, 12, 13],
      potential_co2e_reduction_t_year: 42.5,
      calculation_rationale: 'Avoided grid electricity * CEA v19 factor',
      assumptions: 'Based on 59,350 kWh/year savings',
      status: 'proposed',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
  institutional_evidence_items: [
    {
      id: 'evi-01',
      campus_id: 'cbe-campus-01',
      title: 'TANGEDCO High-Tension (HT) 11kV Grid Electricity Invoices',
      category: 'electricity_bill',
      reference_number: 'TANGEDCO-HT-CBE-2024-Q1',
      reporting_period: '2024-Q1 / 2024-Q2',
      associated_sdgs: [7, 13],
      framework_tags: ['NIRF-Green', 'NAAC-Criteria-7'],
      verification_status: 'verified',
      document_url_or_ref: 'docs/evidence/energy/tangedco_ht_meter.pdf',
      description: 'Certified utility bills from TANGEDCO.',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
};

describe('SustainabilityPage', () => {
  beforeEach(() => {
    vi.spyOn(apiClient, 'getSustainabilitySummary').mockResolvedValue(mockSummary);
    vi.spyOn(apiClient, 'updateRecommendationStatus').mockResolvedValue({
      ...mockSummary.priority_recommendations[0],
      status: 'approved',
    });
    vi.spyOn(apiClient, 'downloadPdfReport').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders overall institutional KPI metrics correctly', async () => {
    render(<SustainabilityPage />);

    await waitFor(() => {
      expect(screen.getByText('Sustainability & Decarbonization Roadmap')).toBeInTheDocument();
    });

    // Check Gross Footprint
    expect(screen.getByText('450.25 t')).toBeInTheDocument();

    // Check Biomass Sequestration Sink
    expect(screen.getByText('22.51 t/yr')).toBeInTheDocument();

    // Check Reduction Potential
    expect(screen.getByText('142.5 t/yr')).toBeInTheDocument();

    // Check Active UN SDGs
    expect(screen.getByText('6 Goals')).toBeInTheDocument();
  });

  it('renders UN SDG Alignment cards and allows target modal view', async () => {
    render(<SustainabilityPage />);

    await waitFor(() => {
      expect(screen.getByText('Clean Water and Sanitation')).toBeInTheDocument();
    });

    expect(screen.getByText('Affordable and Clean Energy')).toBeInTheDocument();

    // Open Target details
    const viewButtons = await screen.findAllByRole('button', { name: /View Specific Indicators/i });
    fireEvent.click(viewButtons[0]);

    expect(await screen.findByText('Amrita Coimbatore Institutional Relevance')).toBeInTheDocument();
    expect(screen.getAllByText(/Target 6\.3/i).length).toBeGreaterThanOrEqual(1);

    // Close Modal
    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => {
      expect(screen.queryByText('Amrita Coimbatore Institutional Relevance')).not.toBeInTheDocument();
    });
  });

  it('switches to Decarbonization Pathways tab and updates recommendation status', async () => {
    render(<SustainabilityPage />);

    await waitFor(() => {
      expect(screen.getByText('Sustainability & Decarbonization Roadmap')).toBeInTheDocument();
    });

    const tabBtn = screen.getByRole('button', { name: /Decarbonization Pathways/i });
    fireEvent.click(tabBtn);

    await waitFor(() => {
      expect(
        screen.getByText('High-Efficiency LED Retrofit and Occupancy Sensors in AB1')
      ).toBeInTheDocument();
    });

    // Check reduction pill
    expect(screen.getByText('-42.5 t CO₂e/yr')).toBeInTheDocument();

    // Change status from proposed to approved
    const statusSelect = screen.getByDisplayValue('Proposed');
    fireEvent.change(statusSelect, { target: { value: 'approved' } });

    await waitFor(() => {
      expect(apiClient.updateRecommendationStatus).toHaveBeenCalledWith('rec-01', 'approved');
    });
  });

  it('switches to NAAC & NIRF Evidence tab and Data Quality tab', async () => {
    render(<SustainabilityPage />);

    await waitFor(() => {
      expect(screen.getByText(/NAAC & NIRF Evidence/i)).toBeInTheDocument();
    });

    // Click Evidence tab
    fireEvent.click(screen.getByText(/NAAC & NIRF Evidence/i));

    await waitFor(() => {
      expect(
        screen.getByText('TANGEDCO High-Tension (HT) 11kV Grid Electricity Invoices')
      ).toBeInTheDocument();
    });
    expect(screen.getByText('TANGEDCO-HT-CBE-2024-Q1')).toBeInTheDocument();

    // Click Data Quality tab
    fireEvent.click(screen.getByText(/Data Quality & Audit Gaps/i));

    await waitFor(() => {
      expect(screen.getByText('Campus Data Quality & Verification Audit')).toBeInTheDocument();
    });
    expect(screen.getByText('Physical sub-metered / lab')).toBeInTheDocument();
  });
});
