import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { PlaceholderPage } from '../components/common/PlaceholderPage';

export const VerificationPage: React.FC = () => {
  return (
    <PlaceholderPage
      title="Audit & Independent Verification"
      description="Independent verification workflows for accredited sustainability auditors to review calculation baselines, evidence documents, and mitigation integrity."
      phaseNumber={7}
      phaseName="Evidence Management & Digital MRV"
      icon={<ShieldCheck className="w-6 h-6 text-emerald-400" />}
      sampleActionName="Initiate Audit"
      features={[
        {
          title: 'Auditor Review Workbench',
          description: 'Dedicated portal for certified external verifiers to approve, dispute, or request additional telemetry records.',
        },
        {
          title: 'Automated Sanity & Outlier Detection',
          description: 'Statistical validation flagging anomalous telemetry or discrepancies between sub-meters and main campus incoming feeds.',
        },
        {
          title: 'Double-Counting Prevention Checks',
          description: 'Multi-layer validation ensuring emission reductions are attributed solely once across institutional scopes.',
        },
        {
          title: 'Hyperledger Fabric Milestone Minting',
          description: 'Preparation for Phase 9 decentralized ledger submission upon auditor sign-off.',
        },
      ]}
    />
  );
};
