import React from 'react';
import { BarChart3 } from 'lucide-react';
import { PlaceholderPage } from '../components/common/PlaceholderPage';

export const ReportsPage: React.FC = () => {
  return (
    <PlaceholderPage
      title="Sustainability & SDG Reporting"
      description="Executive greenhouse gas inventory disclosures, compliance reports, and UN Sustainable Development Goal indicator scorecards."
      phaseNumber={6}
      phaseName="Dashboard & Reporting Engine"
      icon={<BarChart3 className="w-6 h-6 text-emerald-400" />}
      sampleActionName="Generate Disclosure"
      features={[
        {
          title: 'Scope 1, 2, and 3 Rollup Disclosures',
          description: 'Aggregation by reporting year, fiscal quarter, departmental block, and sustainability intervention category.',
        },
        {
          title: 'UN SDG Indicator Mapping (SDGs 6, 7, 9, 11, 12, 13)',
          description: 'Automated synthesis linking campus physical interventions directly to quantitative targets (e.g. Target 7.2 energy efficiency).',
        },
        {
          title: 'Standardized Export Formats (PDF & CSV)',
          description: 'Audit-ready tabular downloads and executive presentation decks formatted according to international reporting standards.',
        },
        {
          title: 'Historical Baseline Trend Analysis',
          description: 'Multi-year trajectory modeling showing institutional progress toward net-zero decarbonization milestones.',
        },
      ]}
    />
  );
};
