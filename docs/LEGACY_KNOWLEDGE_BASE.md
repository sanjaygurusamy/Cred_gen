# CampusCarbon AI — Legacy Knowledge Base & Domain Archive

This document preserves the institutional sustainability rules, simulation algorithms, calculation formulations, and UI interaction designs previously stored in the `legacy/` directory before its retirement.

---

## 1. Curated Sustainability Rule Library

The legacy rule library contained multi-attribute decision metrics across 7 campus operational categories:

### A. Electricity & Energy Efficiency
1. **LED Retrofit & Smart Occupancy Controls (`ELEC-001`)**
   - **Problem**: Continuous operation of fluorescent/metal-halide luminaires in low-occupancy corridors and classrooms.
   - **Proposed Action**: Transition to high-efficiency LED luminaires combined with passive infrared (PIR) sensors.
   - **Technical Reasoning**: LEDs consume 50–65% less energy than T8/T12 fluorescent systems and exhibit superior lumen maintenance (50,000+ hours).
   - **Typical Reduction**: 18.0% of targeted lighting circuit electricity.
   - **Confidence**: 0.90 | **Cost**: Medium | **Difficulty**: Low.
   - **Mapped SDGs**: 7 (Affordable Clean Energy), 9, 12, 13 (Climate Action).

2. **Rooftop Solar PV Feasibility & Peak Shaving (`ELEC-002`)**
   - **Problem**: Grid dependency during daytime peak tariffs and maximum campus air conditioning load.
   - **Proposed Action**: Structural load analysis and installation of rooftop monocrystalline solar PV arrays on major academic blocks.
   - **Technical Reasoning**: Solar generation profile matches campus daytime load curves (9:00 AM – 4:00 PM), offsetting peak grid tariffs.
   - **Typical Reduction**: 25.0% of targeted block electricity.
   - **Confidence**: 0.85 | **Cost**: High | **Difficulty**: Medium.
   - **Mapped SDGs**: 7, 9, 11, 13.

### B. Transportation & Fleet Management
1. **Campus Fleet Route Optimization & Shuttle Consolidation (`TRANS-001`)**
   - **Problem**: Fixed-schedule diesel shuttles operating with low passenger load factors.
   - **Proposed Action**: Dynamic demand-responsive routing and frequency consolidation during off-peak hours.
   - **Typical Reduction**: 15.0% fleet fuel consumption.
   - **Confidence**: 0.85 | **Cost**: Low | **Difficulty**: Low.
   - **Mapped SDGs**: 11, 12, 13.

2. **Electric Vehicle (EV) Transition for Campus Service Vehicles (`TRANS-002`)**
   - **Problem**: Tailpipe diesel emissions from utility vehicles, security patrols, and maintenance carts.
   - **Proposed Action**: Phase-out internal combustion service vehicles in favor of low-speed commercial EVs charged via campus solar.
   - **Typical Reduction**: 35.0% fleet tailpipe emissions.
   - **Confidence**: 0.90 | **Cost**: Medium | **Difficulty**: Medium.
   - **Mapped SDGs**: 7, 11, 13.

### C. Kitchen & Dining Facilities (LPG & Thermal Energy)
1. **Commercial Induction Cooktop Retrofits in Hostels & Canteens (`KITCH-001`)**
   - **Problem**: Low thermal efficiency (~40%) of open-flame commercial LPG burners causing heat dissipation and high fuel burn.
   - **Proposed Action**: Replace bulk liquid-boiling flame burners with magnetic induction commercial cooktops (>85% thermal efficiency).
   - **Typical Reduction**: 22.0% kitchen LPG consumption.
   - **Confidence**: 0.80 | **Cost**: Medium | **Difficulty**: Medium.
   - **Mapped SDGs**: 7, 12, 13.

2. **Kitchen Waste Heat Recovery for Water Pre-Heating (`KITCH-002`)**
   - **Problem**: Exhaust heat from bakery ovens, dishwashing cauldrons, and large burners vented directly into atmosphere.
   - **Proposed Action**: Heat exchanger coils installed in kitchen chimney hoods to preheat incoming water supplies for dining halls.
   - **Typical Reduction**: 12.0% LPG / thermal power.
   - **Confidence**: 0.75 | **Cost**: Medium | **Difficulty**: High.
   - **Mapped SDGs**: 7, 12, 13.

### D. Food Waste Management
1. **On-Campus Anaerobic Bio-Methanation Plant (`WASTE-001`)**
   - **Problem**: Landfill disposal of post-consumer wet food waste generating fugitive methane (CH₄).
   - **Proposed Action**: Direct wet food waste into an on-site continuous anaerobic digester, piping produced biogas to canteen stoves.
   - **Technical Conversion**: ~0.045 m³ biogas per kg wet organic waste (~60% CH₄ content); offsets commercial LPG at a 1:0.43 equivalent ratio.
   - **Typical Reduction**: 40.0% food-waste fugitive emissions + LPG displacement.
   - **Confidence**: 0.85 | **Cost**: High | **Difficulty**: Medium.
   - **Mapped SDGs**: 11, 12, 13.

2. **Aerobic In-Vessel Composting for Botanical & Kitchen Prep Scrap (`WASTE-002`)**
   - **Problem**: Co-mingling of vegetable prep scraps with general municipal waste.
   - **Proposed Action**: Mechanized rotary drum composter converting prep waste into pathogen-free organic humus for campus gardens within 14 days.
   - **Typical Reduction**: 20.0% waste footprint.
   - **Confidence**: 0.90 | **Cost**: Low | **Difficulty**: Low.
   - **Mapped SDGs**: 12, 13, 15.

### E. Water Supply, Greywater & Wastewater
1. **Low-Flow Aerator Retrofit on Academic & Hostel Fixtures (`WATER-001`)**
   - **Problem**: Standard 12 L/min washbasin taps causing high volumetric water withdrawal and excessive pump electricity consumption.
   - **Proposed Action**: Install pressure-compensating 1.9–3.5 L/min aerators across hostel blocks and academic washrooms.
   - **Typical Reduction**: 28.0% tap water throughput; secondary 15% reduction in pump energy.
   - **Confidence**: 0.95 | **Cost**: Low | **Difficulty**: Low.
   - **Mapped SDGs**: 6 (Clean Water & Sanitation), 12, 13.

2. **Decentralized Sewage Treatment Plant (STP) Greywater Recycling (`WATER-002`)**
   - **Problem**: Treated effluent discharged off-campus while freshwater is pumped for lawn irrigation and cooling towers.
   - **Proposed Action**: Tertiary filtration (sand + activated carbon + UV) on existing STP outlet for dual-plumbing toilet flushing and campus tree watering.
   - **Typical Reduction**: 45.0% freshwater withdrawal.
   - **Confidence**: 0.85 | **Cost**: High | **Difficulty**: High.
   - **Mapped SDGs**: 6, 11, 12, 15.

### F. HVAC & Air Conditioning
1. **Cooling Setpoint Standardization & Scheduling Controls (`HVAC-001`)**
   - **Problem**: Split ACs left running at 18–20°C in unoccupied seminar halls and labs.
   - **Proposed Action**: Mandatory institutional thermostat policy set to 24°C–25°C with centralized IoT cut-offs.
   - **Rule-of-Thumb**: Every 1°C increase in temperature setpoint reduces chiller/compressor energy by 6%.
   - **Typical Reduction**: 18.0% AC energy consumption.
   - **Confidence**: 0.90 | **Cost**: Low | **Difficulty**: Low.
   - **Mapped SDGs**: 7, 12, 13.

2. **Inverter AC & High-COP Chiller Upgrade (`HVAC-002`)**
   - **Problem**: Non-inverter R-22 fixed-speed compressor units operating with low Seasonal Energy Efficiency Ratio (ISEER < 3.1).
   - **Proposed Action**: Replacement with 5-star ISEER > 5.0 R-32/R-454B variable-refrigerant-flow (VRF) units.
   - **Typical Reduction**: 30.0% targeted cooling electricity.
   - **Confidence**: 0.90 | **Cost**: High | **Difficulty**: Medium.
   - **Mapped SDGs**: 7, 12, 13.

---

## 2. Recommendation Prioritization Algorithm

The legacy engine used a deterministic multi-criteria scoring function to rank interventions:

$$\text{Score} = w_{\text{red}} \cdot \bar{R}_{\text{CO}_2} + w_{\text{conf}} \cdot C + w_{\text{cost}} \cdot (1 - \bar{K}) + w_{\text{diff}} \cdot (1 - \bar{D})$$

Where:
- $\bar{R}_{\text{CO}_2} \in [0, 1]$: Normalized carbon reduction potential (relative to highest potential in dataset).
- $C \in [0, 1]$: Empirical engineering confidence.
- $\bar{K} \in \{0.33, 0.66, 1.0\}$: Normalized capital expenditure level (Low, Medium, High).
- $\bar{D} \in \{0.33, 0.66, 1.0\}$: Normalized operational difficulty (Low, Medium, High).
- Default weights:
  - $w_{\text{red}} = 0.40$
  - $w_{\text{conf}} = 0.25$
  - $w_{\text{cost}} = 0.20$
  - $w_{\text{diff}} = 0.15$

---

## 3. Scenario Simulation & Rebound Modeling

In `scenario_simulator.py`, simultaneous implementation of multiple recommendations was modeled using diminishing return dampening:

$$\Delta E_{\text{combined}} = 1 - \prod_{i=1}^{n} (1 - r_i \cdot \alpha_i)$$

Where:
- $r_i$: Individual percentage reduction of intervention $i$.
- $\alpha_i \in (0, 1]$: Interaction attenuation factor (e.g., LED retrofits combined with solar PV exhibit a co-dependency factor $\alpha \approx 0.85$ due to baseline grid compression).

---

## 4. UI Interaction & Component Workflows

The legacy React prototype (`legacy/frontend/src/components/`) featured several interactive workflows whose designs informed current components:
1. **General Calculator Modal**: Allowed ad-hoc GHG estimations by selecting Scope (1, 2, or 3), category, quantity, and unit. Fully superseded by `CarbonCalculationsPage.tsx`.
2. **Scenario Comparison Simulator**: Sliders to simulate implementation percentage (0–100%) and project capital cost vs annual savings. Incorporated into `SustainabilityPage.tsx` and `DashboardPage.tsx`.
3. **Recommendation Detail & Implementation Tracking**: Workflow states transitioning interventions from `Proposed` $\to$ `Approved` $\to$ `In Progress` $\to$ `Completed`.
