import React from 'react';
import { Building2 } from 'lucide-react';
import { PlaceholderPage } from '../components/common/PlaceholderPage';

export const CampusBlocksPage: React.FC = () => {
  return (
    <PlaceholderPage
      title="Campus & Blocks Management"
      description="Centralized facility hierarchy modeling institutions, physical campus grounds, departmental academic blocks, residential towers, utility depots, and workshops."
      phaseNumber={2}
      phaseName="Campus, Campus Hierarchy & Block Inventory"
      icon={<Building2 className="w-6 h-6 text-emerald-400" />}
      sampleActionName="Register New Block"
      features={[
        {
          title: 'Institutional Boundary Modeling',
          description: 'Multi-campus isolation, organizational codes (e.g. GTU-MAIN), site geographical coordinates, and gross floor area tracking.',
        },
        {
          title: 'Campus Block Categorization',
          description: 'Classifications covering Academic, Dining & Culinary, Residential Hostels, Utility & Wastewater, District Cooling, and Fabrication Workshops.',
        },
        {
          title: 'Emission Element Inventory Catalog',
          description: 'Unique asset registration for cooking ranges (LPG_001), lighting panels (ELEC_001), shuttle fleets (TRANS_001), and chillers (HVAC_001).',
        },
        {
          title: 'SQLAlchemy Models & Alembic Migrations',
          description: 'Normalized database schema tables: campuses, campus_blocks, and inventory_elements with referential integrity.',
        },
      ]}
    />
  );
};
