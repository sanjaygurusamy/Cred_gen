# CampusCarbon AI — Domain Specification & Business Rules

## 1. Product Requirements & Objectives
CampusCarbon AI provides institutions with:
1. **Deterministic GHG Accounting**: Audit-ready Scope 1, 2, and 3 accounting adhering to the GHG Protocol Corporate Standard.
2. **Actionable Recommendations**: Curated sustainability interventions covering 7 categories with transparent priority scoring.
3. **Reduction Scenario Simulation**: What-If modeling for proposed retrofits and energy efficiency measures.
4. **UN Sustainable Development Goals (SDG) Alignment**: Linking physical carbon interventions to global development targets.
5. **Digital MRV (Measurement, Reporting, and Verification)**: Closed-loop verification comparing post-implementation telemetry against baselines.

---

## 2. Mathematical Formulations (GHG Protocol Standard)

### Base Formulations
1. **Single Emission Calculation**:
   $$E = \text{Activity} \times \text{Emission Factor}$$
   - Activity: Measured or reported physical consumption (e.g., $kWh$, $kg$, $liter$, $m^3$).
   - Emission Factor: Regional/national intensity coefficient (e.g., $kgCO_2e/\text{unit}$).

2. **Reduction Scenario Potential**:
   $$E_{\text{baseline}} = A_{\text{baseline}} \times EF_{\text{baseline}}$$
   $$E_{\text{alternative}} = A_{\text{alternative}} \times EF_{\text{alternative}}$$
   $$\text{Potential Reduction } (kgCO_2e) = E_{\text{baseline}} - E_{\text{alternative}}$$
   $$\text{Percentage Reduction } (\%) = \left( \frac{\text{Potential Reduction}}{E_{\text{baseline}}} \right) \times 100$$
   $$\text{Annualized Reduction } (tCO_2e/\text{year}) = \frac{\text{Potential Reduction } \times 365}{1000}$$
   $$\text{Annual Financial Savings } (\$) = (A_{\text{baseline}} - A_{\text{alternative}}) \times \text{Tariff Rate} \times 365$$

### Audited Reference Case (Dining Hall LPG)
- **Baseline Activity**: $80\text{ kg/day}$ Commercial LPG.
- **Emission Factor ($EF_{\text{LPG}}$)**: $2.983\text{ kgCO}_2\text{e/kg}$ (DEFRA 2024 Scope 1).
- **Baseline Emissions**: $80 \times 2.983 = 238.64\text{ kgCO}_2\text{e/day}$.
- **Intervention (10% Reduction via pre-mix burners)**:
  - Alternative Activity: $72\text{ kg/day}$.
  - Alternative Emissions: $214.776\text{ kgCO}_2\text{e/day}$.
  - Daily Reduction: $23.864\text{ kgCO}_2\text{e/day}$ ($8.71\text{ tCO}_2\text{e/year}$).
  - Annual Tariff Savings (@ \$1.45/kg): $8 \times 1.45 \times 365 = \$4,234.00/\text{year}$.

---

## 3. Seven Sustainability Categories & Curated Rule Concepts

1. **Electricity**:
   - Scope 2 grid electricity consumption.
   - Interventions: Campus-wide LED retrofits with PIR occupancy sensors, rooftop solar PV peak shaving.
2. **Transportation**:
   - Scope 1 diesel/petrol fleet operations.
   - Interventions: Dynamic transit shuttle route consolidation, utility vehicle electrification.
3. **Kitchen & LPG**:
   - Scope 1 thermal combustion for cooking.
   - Interventions: High-efficiency pre-mix burners, biogas biomethanation pre-feasibility (with safety buffer compliance).
4. **Food Waste**:
   - Scope 3 organic waste disposal.
   - Interventions: Cafeteria portioning, enclosed aerobic in-vessel composting.
5. **Water & Wastewater**:
   - Scope 2 pumping energy & effluent treatment.
   - Interventions: Variable Frequency Drives (VFDs) on distribution pumps, acoustic leak abatement, decentralized greywater recycling.
6. **Air Conditioning (HVAC)**:
   - Scope 2 centralized chilling and district cooling.
   - Interventions: Chilled water setpoint optimization ($24^\circ\text{C}-25^\circ\text{C}$ per ASHRAE 55), condenser coil descaling.
7. **Fabrication & Construction**:
   - Scope 2 workshop power & Scope 3 embodied materials.
   - Interventions: Automated machinery idle power cut-offs, blended slag/Pozzolanic low-carbon cement.

---

## 4. Deterministic Prioritization Scoring Formula

Every recommendation is scored deterministically ($0 - 100$):
$$\text{Score} = 0.35 \times S_{\text{reduction}} + 0.25 \times S_{\text{confidence}} + 0.20 \times S_{\text{feasibility}} + 0.20 \times S_{\text{financial}} - \text{Penalty}_{\text{safety/risk}}$$
- $S_{\text{reduction}}$ (35%): Normalized magnitude of carbon reduction.
- $S_{\text{confidence}}$ (25%): Quality of input telemetry (measured vs. estimated).
- $S_{\text{feasibility}}$ (20%): Operational disruption index and installation complexity.
- $S_{\text{financial}}$ (20%): Payback period and recurring operational savings.
- $\text{Penalty}_{\text{safety/risk}}$: Substantial penalty if safety or regulatory prerequisites are unresolved (e.g. hazardous setbacks).

---

## 5. Reference Campus Hierarchy (GreenTech University)
- **Institution / Campus**: GreenTech University Main Campus (`GTU-MAIN`, `green-tech-univ-01`)
  - Area: 450,000 $m^2$, Students: 14,500, Staff: 1,200, Location: Silicon Valley, CA.
- **Campus Blocks / Bodies**:
  1. `body-dining-01`: Central Dining Hall & Kitchen Complex (Dining/Cafeteria, 6,500 $m^2$, cap: 2,500)
  2. `body-eng-01`: Engineering Academic Complex (Academic, 42,000 $m^2$, cap: 4,000)
  3. `body-hostel-01`: Student Residential Hostels (Towers A-D) (Residence, 65,000 $m^2$, cap: 3,800)
  4. `body-fleet-01`: Campus Transit & Facilities Fleet Depot (Transit, 12,000 $m^2$, cap: 150)
  5. `body-water-01`: Water Utility & Wastewater Treatment Plant (Utility, 8,000 $m^2$, cap: 45)
  6. `body-chiller-01`: Central District Chiller Plant (Utility, 4,500 $m^2$, cap: 20)
  7. `body-fab-01`: Mechanical Workshop & Innovation Fabrication Lab (Workshop, 9,500 $m^2$, cap: 350)
- **Standard Inventory Elements**:
  - `LPG_001` (Kitchen & LPG, Scope 1, 80 kg/day)
  - `ELEC_001` (Electricity, Scope 2, 4,200 kWh/day)
  - `TRANS_001` (Transportation, Scope 1, 180 liter/day)
  - `WASTE_001` (Food Waste, Scope 3, 350 kg/day)
  - `WATER_001` (Water & Wastewater, Scope 2, 450 m³/day)
  - `HVAC_001` (Air Conditioning, Scope 2, 3,800 kWh/day)
  - `FAB_001` (Fabrication & Construction, Scope 2, 620 kWh/day)
