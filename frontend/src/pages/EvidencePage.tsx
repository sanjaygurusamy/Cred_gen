import React from 'react';
import { FileText } from 'lucide-react';
import { PlaceholderPage } from '../components/common/PlaceholderPage';

export const EvidencePage: React.FC = () => {
  return (
    <PlaceholderPage
      title="Evidence & Audit Documents"
      description="Cryptographically hashed digital evidence locker for meter logs, utility receipts, engineering specifications, and calibration certificates."
      phaseNumber={7}
      phaseName="Evidence Management & Digital MRV"
      icon={<FileText className="w-6 h-6 text-emerald-400" />}
      sampleActionName="Upload Evidence"
      features={[
        {
          title: 'Tamper-Evident SHA-256 Hashing',
          description: 'Generating verifiable checksums for every uploaded utility invoice, meter telemetry extract, and calibration log.',
        },
        {
          title: 'Evidence-to-Calculation Linking',
          description: 'Associating specific activity records directly with audited physical documentation to guarantee complete audit readiness.',
        },
        {
          title: 'Confidentiality & Role-Based Access Control',
          description: 'Enforcing document permissions (facility manager vs. auditor vs. viewer) with strict privacy safeguards.',
        },
        {
          title: 'Audit Trail Export',
          description: 'One-click generation of audit packages ready for external third-party verification.',
        },
      ]}
    />
  );
};
