"""
Structured UN Sustainable Development Goals (SDG) mapping library for CampusCarbon AI.

Defines deterministic mappings between campus operations, greenhouse gas emissions,
energy baselines, waste streams, and ecological preservation initiatives with
official UN 2030 Sustainable Development Goal indicators.
"""
from typing import Dict, List, Any, Optional
from pydantic import BaseModel


class SDGIndicator(BaseModel):
    indicator_code: str
    indicator_title: str
    target_metric: str
    campus_activities: List[str]
    supporting_body: str
    alignment_rationale: str


class SDGGoal(BaseModel):
    goal_number: int
    title: str
    subtitle: str
    color_hex: str
    un_icon_slug: str
    summary: str
    relevance_to_campus: str
    indicators: List[SDGIndicator]


# Static predefined catalog of relevant SDGs for higher-education campus decarbonization
CAMPUS_SDG_CATALOG: Dict[int, SDGGoal] = {
    6: SDGGoal(
        goal_number=6,
        title="Clean Water & Sanitation",
        subtitle="Ensure availability and sustainable management of water and sanitation for all",
        color_hex="#26bde2",
        un_icon_slug="sdg-6-clean-water",
        summary="Water efficiency, zero effluent discharge, greywater recycling, and on-campus sewage treatment.",
        relevance_to_campus="Amrita Coimbatore operates dual on-campus Sewage Treatment Plants (STP 1 and STP 2) with membrane bio-reactor systems that recycle 100% of treated wastewater for toilet flushing and campus landscape irrigation, protecting freshwater aquifers in the Western Ghats foothills.",
        indicators=[
            SDGIndicator(
                indicator_code="6.3.1",
                indicator_title="Safe Wastewater Treatment & Recycling",
                target_metric="kL treated & recycled wastewater / year",
                campus_activities=["Sewage Treatment Plant Operations", "Treated Effluent Horticulture Reuse"],
                supporting_body="Sewage Treatment Plants (STP 1 & 2)",
                alignment_rationale="Continuous digital monitoring of wastewater effluent recycling diverts municipal raw water demand and ensures zero untreated chemical or biological discharge into local watersheds."
            ),
            SDGIndicator(
                indicator_code="6.4.1",
                indicator_title="Water-Use Efficiency in Campus Facilities",
                target_metric="Litres / occupant / day",
                campus_activities=["Freshwater Borewell Telemetry", "Hostel & Dining Water Consumption"],
                supporting_body="Hostels & Residential Quarters",
                alignment_rationale="Benchmarking per-capita water usage in student dormitories and central kitchens identifies pipeline leaks and drives low-flow aerator installations."
            )
        ]
    ),
    7: SDGGoal(
        goal_number=7,
        title="Affordable & Clean Energy",
        subtitle="Ensure access to affordable, reliable, sustainable and modern energy for all",
        color_hex="#fcc30b",
        un_icon_slug="sdg-7-clean-energy",
        summary="Energy efficiency benchmarking, rooftop solar PV integration, and diesel generator displacement.",
        relevance_to_campus="Electricity is the largest single contributor to Amrita Coimbatore's gross carbon footprint (~91% Scope 2). Upgrading building energy baselines, installing solar arrays, and minimizing diesel standby operations directly accelerate campus clean energy transition.",
        indicators=[
            SDGIndicator(
                indicator_code="7.2.1",
                indicator_title="Renewable Energy Share in Electricity Consumption",
                target_metric="% solar PV generation vs grid purchased electricity",
                campus_activities=["Rooftop Solar Generation", "Grid Electricity Consumption"],
                supporting_body="Academic Complex & Solar Canopies",
                alignment_rationale="Tracking onsite solar power generation alongside grid imports quantifies direct displacement of thermal grid carbon intensity (0.716 kg CO2e/kWh)."
            ),
            SDGIndicator(
                indicator_code="7.3.1",
                indicator_title="Energy Intensity per Built-up Floor Area",
                target_metric="kWh / m² gross built area / year",
                campus_activities=["Classroom HVAC Telemetry", "Hostel Lighting & Power Baselines"],
                supporting_body="Academic Blocks (AB1, AB2, AB3)",
                alignment_rationale="Facility-specific baseline benchmarking identifies anomalous electricity consumption and validates energy-conservation measure (ECM) savings."
            )
        ]
    ),
    11: SDGGoal(
        goal_number=11,
        title="Sustainable Cities & Communities",
        subtitle="Make cities and human settlements inclusive, safe, resilient and sustainable",
        color_hex="#fd9d24",
        un_icon_slug="sdg-11-sustainable-cities",
        summary="Low-carbon campus mobility, electric fleet transition, and resilient institutional infrastructure.",
        relevance_to_campus="As a self-contained campus with over 10,000 residents, Amrita Coimbatore functions as a micro-city. Deploying electric transit shuttles, pedestrianizing academic corridors, and managing green zones promote an inclusive, low-emission living habitat.",
        indicators=[
            SDGIndicator(
                indicator_code="11.2.1",
                indicator_title="Public Transit & Clean Fleet Accessibility",
                target_metric="% fleet electrification and clean transport passenger-km",
                campus_activities=["Campus Transit Shuttle Operation", "Electric Vehicle Charging Depot"],
                supporting_body="Campus Transportation Depot",
                alignment_rationale="Operating dedicated campus shuttle routes reduces private vehicular traffic and lowers tailpipe particulate and direct Scope 1 fossil fuel combustion."
            ),
            SDGIndicator(
                indicator_code="11.7.1",
                indicator_title="Open Green Spaces & Campus Public Canopy",
                target_metric="m² green space per campus resident",
                campus_activities=["Green Space Maintenance", "Botanical Garden Preservation"],
                supporting_body="Green Canopy & Ecological Grounds",
                alignment_rationale="Preserving dedicated recreational and botanical green zones (16,800 m²) buffers urban heat island effects and enhances student health and well-being."
            )
        ]
    ),
    12: SDGGoal(
        goal_number=12,
        title="Responsible Consumption & Production",
        subtitle="Ensure sustainable consumption and production patterns",
        color_hex="#cf8d2a",
        un_icon_slug="sdg-12-responsible-consumption",
        summary="Kitchen food waste reduction, biomethanation, solid waste segregation, and resource circularity.",
        relevance_to_campus="Central kitchens prepare thousands of meals daily. Implementing source segregation, organic biomethanation, and compost diversion reduces Scope 3 municipal landfill methane emissions while producing organic fertilizer for campus agriculture.",
        indicators=[
            SDGIndicator(
                indicator_code="12.3.1",
                indicator_title="Food Waste Reduction & Organic Diversion",
                target_metric="kg food waste diverted from landfill / month",
                campus_activities=["Kitchen Food Waste Sorting", "Organic Waste Biomethanation / Composting"],
                supporting_body="Central Dining & Canteens",
                alignment_rationale="Feeding kitchen food waste into bio-digesters produces biogas that displaces commercial LPG cylinders and prevents fugitive landfill methane emissions."
            ),
            SDGIndicator(
                indicator_code="12.5.1",
                indicator_title="Institutional Solid Waste Recycling Rate",
                target_metric="% recyclable waste sorted and recycled",
                campus_activities=["Dry Recyclable Sorting", "Hazardous E-Waste Consolidation"],
                supporting_body="Central Waste Yard",
                alignment_rationale="Rigorous multi-stream waste classification prevents contamination and returns valuable materials (paper, metals, plastics) into the industrial circular economy."
            )
        ]
    ),
    13: SDGGoal(
        goal_number=13,
        title="Climate Action",
        subtitle="Take urgent action to combat climate change and its impacts",
        color_hex="#48773e",
        un_icon_slug="sdg-13-climate-action",
        summary="Comprehensive GHG Protocol digital MRV, Scope 1-3 carbon reduction targets, and climate resilience.",
        relevance_to_campus="CampusCarbon AI provides the institutional foundation for carbon accounting, establishing verifiable activity baselines across stationary fuel, grid electricity, campus transport, and waste handling for institutional decarbonization targets.",
        indicators=[
            SDGIndicator(
                indicator_code="13.2.1",
                indicator_title="Institutional GHG Emissions Inventory (Scope 1, 2, 3)",
                target_metric="Tonnes CO₂e gross campus emissions / year",
                campus_activities=["Grid Electricity Accounting", "Stationary Fuel Combustion", "Transportation Fleet Diesel", "Organic Waste Disposals"],
                supporting_body="All 27 Campus Facilities",
                alignment_rationale="Transparent carbon accounting compliant with ISO 14064 and GHG Protocol Corporate Standard enables data-driven climate action plans and public sustainability disclosures."
            ),
            SDGIndicator(
                indicator_code="13.3.1",
                indicator_title="Climate Literacy & Decarbonization Governance",
                target_metric="Number of actionable energy and carbon reduction initiatives",
                campus_activities=["Sustainability Recommendation Engine", "Data Completeness Audits"],
                supporting_body="Institutional Carbon Task Force",
                alignment_rationale="Transparently publishing telemetry data gaps and verified emission factors empowers campus leadership and academic departments to act on verified carbon reduction opportunities."
            )
        ]
    ),
    15: SDGGoal(
        goal_number=15,
        title="Life on Land",
        subtitle="Protect, restore and promote sustainable use of terrestrial ecosystems",
        color_hex="#3fab49",
        un_icon_slug="sdg-15-life-on-land",
        summary="Campus biodiversity conservation, Miyawaki afforestation, and biological carbon sequestration.",
        relevance_to_campus="Located near the Western Ghats biosphere, Amrita Coimbatore actively nurtures indigenous flora, maintains over 1,000 mature trees, and expands dense native Miyawaki forests that naturally sequester atmospheric carbon dioxide and provide avian habitats.",
        indicators=[
            SDGIndicator(
                indicator_code="15.1.1",
                indicator_title="Terrestrial Tree Biomass & Carbon Sinks",
                target_metric="Tonnes CO₂e sequestered / year (AFOLU allometric models)",
                campus_activities=["Tree Census Inventory", "Miyawaki Forest Expansion"],
                supporting_body="Campus Green Spaces & Miyawaki Forest",
                alignment_rationale="Documented allometric tree carbon sequestration models (IPCC AFOLU Vol 4 & FSI) quantify biological carbon absorption and incentivize campus canopy preservation."
            ),
            SDGIndicator(
                indicator_code="15.2.1",
                indicator_title="Afforestation & Sapling Survival Monitoring",
                target_metric="% sapling survival rate across plantation drives",
                campus_activities=["Student Plantation Drives", "Sapling Health & Irrigation Monitoring"],
                supporting_body="Green Zones & Botanical Grounds",
                alignment_rationale="Longitudinal tracking of sapling survival rates ensures that campus plantation drives achieve lasting forest canopy establishment rather than one-time planting events."
            )
        ]
    )
}


def get_all_campus_sdgs() -> List[Dict[str, Any]]:
    """Retrieve all structured SDG goal mappings."""
    return [sdg.model_dump() for sdg in CAMPUS_SDG_CATALOG.values()]


def get_sdg_by_number(goal_num: int) -> Optional[Dict[str, Any]]:
    """Retrieve detailed metadata for a specific SDG goal."""
    sdg = CAMPUS_SDG_CATALOG.get(goal_num)
    return sdg.model_dump() if sdg else None


def get_sdgs_for_activity(activity_name: str) -> List[int]:
    """Find all matching SDG goal numbers for a given activity."""
    act_lower = activity_name.lower()
    matched_goals = set()
    for goal_num, goal in CAMPUS_SDG_CATALOG.items():
        for ind in goal.indicators:
            for mapped_act in ind.campus_activities:
                if mapped_act.lower() in act_lower or act_lower in mapped_act.lower():
                    matched_goals.add(goal_num)
    return sorted(list(matched_goals))
