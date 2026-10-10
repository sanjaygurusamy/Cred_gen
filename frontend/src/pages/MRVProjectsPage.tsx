import React from 'react';
import { Target } from 'lucide-react';
import { PlaceholderPage } from '../components/common/PlaceholderPage';

export const MRVProjectsPage: React.FC = () => {
  return (
    <PlaceholderPage
      title="Digital MRV Reduction Projects"
      description="Measurement, Reporting, and Verification lifecycle management for commissioned campus decarbonization interventions and post-implementation outcome tracking."
      phaseNumber={7}
      phaseName="Evidence Management & Digital MRV"
      icon={<Target className="w-6 h-6 text-emerald-400" />}
      sampleActionName="Create Intervention"
      features={[
        {
          title: 'Decarbonization Intervention Pipeline',
          description: 'Tracking lifecycle states: proposed, approved, in-progress, completed, and verified.',
        },
        {
          title: 'Outcome Measurement & Variance Analysis',
          description: 'Comparing actual measured post-implementation consumption directly against historical pre-intervention baselines.',
        },
        {
          title: 'Avoided Emission Quantification',
          description: 'Computing verified net carbon reductions (Baseline Emissions - Measured Emissions) and financial payback.',
        },
        {
          title: 'UN SDG Impact Documentation',
          description: 'Documenting contributions toward UN Sustainable Development Goals (SDG 6, 7, 9, 11, 12, 13).',
        },
      ]}
    />
  );
};
