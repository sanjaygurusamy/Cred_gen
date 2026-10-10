import React from 'react';
import { Activity } from 'lucide-react';
import { PlaceholderPage } from '../components/common/PlaceholderPage';

export const ActivityDataPage: React.FC = () => {
  return (
    <PlaceholderPage
      title="Daily Activity Telemetry"
      description="Standardized time-series recording for institutional physical activity including electrical kWh, kitchen LPG kg, fleet diesel liters, and cafeteria organic waste mass."
      phaseNumber={3}
      phaseName="Activity Definitions & Daily Activity Records"
      icon={<Activity className="w-6 h-6 text-emerald-400" />}
      sampleActionName="Log Daily Activity"
      features={[
        {
          title: 'Validated Physical Measurement Units',
          description: 'Strict unit enforcement (kWh, kg, liters, m³) with physical feasibility boundary validation and non-negative constraints.',
        },
        {
          title: 'Data Quality & Provenance Flags',
          description: 'Classification of incoming values by data quality: measured (smart meter / weighbridge), utility supplied, or estimated.',
        },
        {
          title: 'Batch Ingestion REST Endpoints',
          description: 'High-throughput time-interval telemetry endpoints with timestamp alignment and deduplication guards.',
        },
        {
          title: 'Activity Definition Master Registry',
          description: 'Extensible activity schemas linking physical assets directly to approved emission calculation methodologies.',
        },
      ]}
    />
  );
};
