"""
General Carbon Footprint Calculator Route for CampusCarbon AI (Component 1).
Provides ad-hoc multi-activity deterministic carbon calculations,
Scope 1/2/3 classification, tangible equivalencies, and UN SDG-mapped recommendations.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from app.carbon_engine.calculator import CarbonCalculator
from app.recommendation_engine.sdg_mapper import SDGMapper

calculator_router = APIRouter(prefix="/api/calculator", tags=["General Carbon Calculator"])

# Standard Emission Factors (DEFRA 2024, CEA Baseline, IPCC)
EF_GRID_ELECTRICITY = 0.716        # kgCO2e/kWh (Central CEA grid baseline)
EF_LPG_KG = 2.983                  # kgCO2e/kg (DEFRA commercial LPG)
EF_DIESEL_LITER = 2.680            # kgCO2e/liter (DEFRA diesel)
EF_PETROL_LITER = 2.310            # kgCO2e/liter (DEFRA petrol)
EF_CNG_KG = 2.750                  # kgCO2e/kg (DEFRA CNG)
EF_WATER_M3 = 0.344                # kgCO2e/m3 (supply and treatment pumping)

# Distance-based vehicle emission factors (kgCO2e per vehicle-km)
EF_VEHICLE_BUS = 0.850             # Standard campus transit bus
EF_VEHICLE_CAR_PETROL = 0.170      # Average passenger petrol car
EF_VEHICLE_CAR_DIESEL = 0.165      # Average passenger diesel car
EF_VEHICLE_TWO_WHEELER = 0.035     # Motorcycle / Scooter
EF_VEHICLE_EV = 0.053              # Electric car powered by grid

# Waste emission factors (kgCO2e per kg waste)
EF_FOOD_WASTE_LANDFILL = 1.250     # Anaerobic degradation in landfill (high methane)
EF_FOOD_WASTE_COMPOST = 0.100      # Managed aerobic composting
EF_FOOD_WASTE_BIOGAS = -0.450      # Net avoided emissions via biomethanation offset
EF_PAPER_WASTE_LANDFILL = 1.050    # Landfilled paper
EF_PAPER_WASTE_RECYCLED = 0.180    # Closed-loop recycling
EF_PLASTIC_WASTE_LANDFILL = 0.080  # Inert landfill storage
EF_PLASTIC_WASTE_RECYCLED = 0.040  # Segregated recycling
EF_DRY_WASTE_MIXED = 0.550         # Municipal mixed dry waste

class GeneralCalculatorRequest(BaseModel):
    # 1. Electricity
    grid_electricity_kwh: float = Field(0.0, ge=0.0)
    solar_offset_kwh: float = Field(0.0, ge=0.0)
    
    # 2. Thermal Fuels & Generators
    lpg_kg: float = Field(0.0, ge=0.0)
    diesel_liters: float = Field(0.0, ge=0.0)
    
    # 3. Transportation (Distance-based and/or Fuel-based)
    bus_km: float = Field(0.0, ge=0.0)
    car_km: float = Field(0.0, ge=0.0)
    two_wheeler_km: float = Field(0.0, ge=0.0)
    ev_km: float = Field(0.0, ge=0.0)
    fuel_petrol_liters: float = Field(0.0, ge=0.0)
    fuel_diesel_liters: float = Field(0.0, ge=0.0)
    
    # 4. Water
    water_m3: float = Field(0.0, ge=0.0)
    
    # 5. Waste Streams & Disposal Pathways
    food_waste_kg: float = Field(0.0, ge=0.0)
    food_waste_pathway: str = Field("landfill", description="landfill | compost | biogas")
    
    paper_waste_kg: float = Field(0.0, ge=0.0)
    paper_waste_pathway: str = Field("landfill", description="landfill | recycled")
    
    plastic_waste_kg: float = Field(0.0, ge=0.0)
    plastic_waste_pathway: str = Field("landfill", description="landfill | recycled")
    
    dry_waste_kg: float = Field(0.0, ge=0.0)


@calculator_router.post("/general")
def calculate_general_footprint(req: GeneralCalculatorRequest) -> Dict[str, Any]:
    """
    Computes ad-hoc carbon emissions across all 5 major activity streams deterministically.
    Categorizes into Scope 1, 2, and 3, provides real-world equivalencies,
    and returns tailored UN SDG-mapped recommendations.
    """
    breakdown = []
    scope_1_kg = 0.0
    scope_2_kg = 0.0
    scope_3_kg = 0.0

    # 1. Electricity
    net_kwh = max(0.0, req.grid_electricity_kwh - req.solar_offset_kwh)
    elec_emissions = round(net_kwh * EF_GRID_ELECTRICITY, 3)
    scope_2_kg += elec_emissions
    if req.grid_electricity_kwh > 0 or req.solar_offset_kwh > 0:
        breakdown.append({
            "category": "Electricity",
            "item": "Grid Electricity (Net)",
            "activity_value": net_kwh,
            "unit": "kWh",
            "emission_factor": EF_GRID_ELECTRICITY,
            "factor_unit": "kgCO2e/kWh",
            "emissions_kg": elec_emissions,
            "scope": "Scope 2",
            "note": f"{req.grid_electricity_kwh} kWh consumed with {req.solar_offset_kwh} kWh solar offset."
        })

    # 2. Fuels & Thermal
    if req.lpg_kg > 0:
        lpg_emissions = round(req.lpg_kg * EF_LPG_KG, 3)
        scope_1_kg += lpg_emissions
        breakdown.append({
            "category": "Thermal & Fuels",
            "item": "Commercial LPG",
            "activity_value": req.lpg_kg,
            "unit": "kg",
            "emission_factor": EF_LPG_KG,
            "factor_unit": "kgCO2e/kg",
            "emissions_kg": lpg_emissions,
            "scope": "Scope 1",
            "note": "Combustion emissions from kitchen/heating LPG"
        })

    if req.diesel_liters > 0:
        diesel_emissions = round(req.diesel_liters * EF_DIESEL_LITER, 3)
        scope_1_kg += diesel_emissions
        breakdown.append({
            "category": "Thermal & Fuels",
            "item": "Diesel Generators",
            "activity_value": req.diesel_liters,
            "unit": "Liters",
            "emission_factor": EF_DIESEL_LITER,
            "factor_unit": "kgCO2e/L",
            "emissions_kg": diesel_emissions,
            "scope": "Scope 1",
            "note": "Backup genset stationary fuel combustion"
        })

    # 3. Transportation
    transport_emissions = 0.0
    # Distance-based
    if req.bus_km > 0:
        bus_em = round(req.bus_km * EF_VEHICLE_BUS, 3)
        transport_emissions += bus_em
        scope_1_kg += bus_em
        breakdown.append({
            "category": "Transportation",
            "item": "Campus Shuttle Buses",
            "activity_value": req.bus_km,
            "unit": "km",
            "emission_factor": EF_VEHICLE_BUS,
            "factor_unit": "kgCO2e/km",
            "emissions_kg": bus_em,
            "scope": "Scope 1",
            "note": "Campus fleet transit distance"
        })

    if req.car_km > 0:
        car_em = round(req.car_km * EF_VEHICLE_CAR_PETROL, 3)
        transport_emissions += car_em
        scope_3_kg += car_em
        breakdown.append({
            "category": "Transportation",
            "item": "Passenger Cars / Cabs",
            "activity_value": req.car_km,
            "unit": "km",
            "emission_factor": EF_VEHICLE_CAR_PETROL,
            "factor_unit": "kgCO2e/km",
            "emissions_kg": car_em,
            "scope": "Scope 3",
            "note": "Faculty/visitor passenger vehicle travel"
        })

    if req.two_wheeler_km > 0:
        tw_em = round(req.two_wheeler_km * EF_VEHICLE_TWO_WHEELER, 3)
        transport_emissions += tw_em
        scope_3_kg += tw_em
        breakdown.append({
            "category": "Transportation",
            "item": "Two-Wheelers / Scooters",
            "activity_value": req.two_wheeler_km,
            "unit": "km",
            "emission_factor": EF_VEHICLE_TWO_WHEELER,
            "factor_unit": "kgCO2e/km",
            "emissions_kg": tw_em,
            "scope": "Scope 3",
            "note": "Student & staff motorcycle/scooter commuting"
        })

    if req.ev_km > 0:
        ev_em = round(req.ev_km * EF_VEHICLE_EV, 3)
        transport_emissions += ev_em
        scope_2_kg += ev_em
        breakdown.append({
            "category": "Transportation",
            "item": "Electric Vehicles",
            "activity_value": req.ev_km,
            "unit": "km",
            "emission_factor": EF_VEHICLE_EV,
            "factor_unit": "kgCO2e/km",
            "emissions_kg": ev_em,
            "scope": "Scope 2",
            "note": "EV grid charging embodied emissions"
        })

    # Direct fuel-based transport
    if req.fuel_petrol_liters > 0:
        petrol_em = round(req.fuel_petrol_liters * EF_PETROL_LITER, 3)
        scope_1_kg += petrol_em
        breakdown.append({
            "category": "Transportation",
            "item": "Fleet Petrol Consumption",
            "activity_value": req.fuel_petrol_liters,
            "unit": "Liters",
            "emission_factor": EF_PETROL_LITER,
            "factor_unit": "kgCO2e/L",
            "emissions_kg": petrol_em,
            "scope": "Scope 1",
            "note": "Direct fuel logged by campus fleet"
        })

    if req.fuel_diesel_liters > 0:
        fleet_diesel_em = round(req.fuel_diesel_liters * EF_DIESEL_LITER, 3)
        scope_1_kg += fleet_diesel_em
        breakdown.append({
            "category": "Transportation",
            "item": "Fleet Diesel Consumption",
            "activity_value": req.fuel_diesel_liters,
            "unit": "Liters",
            "emission_factor": EF_DIESEL_LITER,
            "factor_unit": "kgCO2e/L",
            "emissions_kg": fleet_diesel_em,
            "scope": "Scope 1",
            "note": "Direct diesel fuel logged by buses/machinery"
        })

    # 4. Water
    if req.water_m3 > 0:
        water_em = round(req.water_m3 * EF_WATER_M3, 3)
        scope_3_kg += water_em
        breakdown.append({
            "category": "Water & Wastewater",
            "item": "Municipal Water Supply",
            "activity_value": req.water_m3,
            "unit": "m³",
            "emission_factor": EF_WATER_M3,
            "factor_unit": "kgCO2e/m³",
            "emissions_kg": water_em,
            "scope": "Scope 3",
            "note": "Supply pumping, distribution, and filtration treatment"
        })

    # 5. Waste Streams
    if req.food_waste_kg > 0:
        if req.food_waste_pathway == "compost":
            fw_factor = EF_FOOD_WASTE_COMPOST
            fw_note = "Aerobic composting on campus (minimal methane)"
        elif req.food_waste_pathway == "biogas":
            fw_factor = EF_FOOD_WASTE_BIOGAS
            fw_note = "Anaerobic biomethanation avoiding LPG & landfill"
        else:
            fw_factor = EF_FOOD_WASTE_LANDFILL
            fw_note = "Mixed landfill disposal (anaerobic methane emissions)"

        fw_em = round(req.food_waste_kg * fw_factor, 3)
        scope_3_kg += fw_em
        breakdown.append({
            "category": "Waste Generation",
            "item": f"Food Waste ({req.food_waste_pathway.capitalize()})",
            "activity_value": req.food_waste_kg,
            "unit": "kg",
            "emission_factor": fw_factor,
            "factor_unit": "kgCO2e/kg",
            "emissions_kg": fw_em,
            "scope": "Scope 3",
            "note": fw_note
        })

    if req.paper_waste_kg > 0:
        paper_factor = EF_PAPER_WASTE_RECYCLED if req.paper_waste_pathway == "recycled" else EF_PAPER_WASTE_LANDFILL
        paper_em = round(req.paper_waste_kg * paper_factor, 3)
        scope_3_kg += paper_em
        breakdown.append({
            "category": "Waste Generation",
            "item": f"Paper Waste ({req.paper_waste_pathway.capitalize()})",
            "activity_value": req.paper_waste_kg,
            "unit": "kg",
            "emission_factor": paper_factor,
            "factor_unit": "kgCO2e/kg",
            "emissions_kg": paper_em,
            "scope": "Scope 3",
            "note": "Segregated recycling vs unmanaged landfill"
        })

    if req.plastic_waste_kg > 0:
        plastic_factor = EF_PLASTIC_WASTE_RECYCLED if req.plastic_waste_pathway == "recycled" else EF_PLASTIC_WASTE_LANDFILL
        plastic_em = round(req.plastic_waste_kg * plastic_factor, 3)
        scope_3_kg += plastic_em
        breakdown.append({
            "category": "Waste Generation",
            "item": f"Plastic Waste ({req.plastic_waste_pathway.capitalize()})",
            "activity_value": req.plastic_waste_kg,
            "unit": "kg",
            "emission_factor": plastic_factor,
            "factor_unit": "kgCO2e/kg",
            "emissions_kg": plastic_em,
            "scope": "Scope 3",
            "note": "Sorted recyclable vs mixed landfill"
        })

    if req.dry_waste_kg > 0:
        dry_em = round(req.dry_waste_kg * EF_DRY_WASTE_MIXED, 3)
        scope_3_kg += dry_em
        breakdown.append({
            "category": "Waste Generation",
            "item": "Dry / Mixed Solid Waste",
            "activity_value": req.dry_waste_kg,
            "unit": "kg",
            "emission_factor": EF_DRY_WASTE_MIXED,
            "factor_unit": "kgCO2e/kg",
            "emissions_kg": dry_em,
            "scope": "Scope 3",
            "note": "Standard institutional municipal solid waste"
        })

    total_emissions_kg = max(0.0, round(scope_1_kg + scope_2_kg + scope_3_kg, 3))
    total_emissions_tco2e = round(total_emissions_kg / 1000.0, 5)

    # Compute category sums for share breakdown
    category_totals: Dict[str, float] = {}
    for item in breakdown:
        cat = item["category"]
        category_totals[cat] = round(category_totals.get(cat, 0.0) + max(0.0, item["emissions_kg"]), 3)

    category_percentages = {}
    if total_emissions_kg > 0:
        for cat, val in category_totals.items():
            category_percentages[cat] = round((val / total_emissions_kg) * 100.0, 1)

    # Find highest culprit
    top_category = max(category_totals.items(), key=lambda x: x[1])[0] if category_totals else "None"

    # Tangible Equivalencies
    trees_needed = round(total_emissions_kg / 20.0, 1)     # 1 tree absorbs ~20 kg CO2/year
    car_km_equiv = round(total_emissions_kg / 0.170, 0)     # Petrol car emits ~0.17 kg/km
    smartphones_charged = round(total_emissions_kg / 0.008, 0)

    # Generate Tailored SDG-Mapped Recommendations
    sdg_recommendations = _generate_sdg_recommendations(req, category_totals, total_emissions_kg)

    return {
        "total_emissions_kg": total_emissions_kg,
        "total_emissions_tco2e": total_emissions_tco2e,
        "scope_breakdown": {
            "scope_1_kg": round(scope_1_kg, 3),
            "scope_2_kg": round(scope_2_kg, 3),
            "scope_3_kg": round(scope_3_kg, 3),
            "scope_1_pct": round((scope_1_kg / total_emissions_kg * 100), 1) if total_emissions_kg > 0 else 0,
            "scope_2_pct": round((scope_2_kg / total_emissions_kg * 100), 1) if total_emissions_kg > 0 else 0,
            "scope_3_pct": round((scope_3_kg / total_emissions_kg * 100), 1) if total_emissions_kg > 0 else 0,
        },
        "category_totals": category_totals,
        "category_percentages": category_percentages,
        "top_contributor": top_category,
        "equivalencies": {
            "trees_needed_annual": trees_needed,
            "car_km_equivalent": car_km_equiv,
            "smartphones_charged": smartphones_charged
        },
        "itemized_breakdown": breakdown,
        "sdg_recommendations": sdg_recommendations
    }


def _generate_sdg_recommendations(req: GeneralCalculatorRequest, category_totals: Dict[str, float], total_emissions: float) -> List[Dict[str, Any]]:
    """
    Generates high-impact, deterministic recommendations tied to UN SDGs
    specifically based on what the user inputted in the general calculator.
    """
    recs = []

    # 1. Electricity Recommendation
    if req.grid_electricity_kwh > 200:
        # Potential: 25% reduction via LED retrofit, smart occupancy sensors, or solar PV
        est_save_kwh = req.grid_electricity_kwh * 0.25
        reduction_kg = round(est_save_kwh * EF_GRID_ELECTRICITY, 2)
        sdg_mappings = SDGMapper.map_sdgs_for_intervention(
            "Rooftop Solar PV & LED Retrofit",
            "Electricity",
            [7, 13]
        )
        recs.append({
            "title": "Rooftop Solar PV & Smart LED Retrofit",
            "category": "Electricity",
            "description": f"Transition lighting fixtures to smart LEDs with PIR sensors and utilize solar PV. An estimated 25% power reduction saves ~{round(est_save_kwh, 1)} kWh.",
            "potential_reduction_kg": reduction_kg,
            "potential_reduction_pct": round((reduction_kg / total_emissions * 100), 1) if total_emissions > 0 else 25.0,
            "action_type": "Energy Efficiency & Renewables",
            "sdgs": sdg_mappings,
            "primary_sdg": 7,
            "feasibility": "High: Standard roof structural audit and off-the-shelf LED retrofits."
        })

    # 2. Kitchen LPG & Food Waste Circular Synergy
    if req.lpg_kg > 20 and req.food_waste_kg > 30 and req.food_waste_pathway == "landfill":
        # Synergy: Digester converts food waste to biogas, displacing ~30% LPG
        lpg_displaced_kg = min(req.lpg_kg * 0.35, req.food_waste_kg * 0.25)
        reduction_kg = round(lpg_displaced_kg * EF_LPG_KG + (req.food_waste_kg * (EF_FOOD_WASTE_LANDFILL - EF_FOOD_WASTE_BIOGAS)), 2)
        sdg_mappings = SDGMapper.map_sdgs_for_intervention(
            "Food Waste to Biogas Kitchen Energy Closed-Loop",
            "Kitchen & Waste",
            [7, 12, 13]
        )
        recs.append({
            "title": "On-Campus Biogas Digester (Food Waste to Kitchen Gas)",
            "category": "Thermal & Fuels",
            "description": f"Divert {req.food_waste_kg} kg of kitchen food waste to an anaerobic digester to produce clean biogas, offsetting ~{round(lpg_displaced_kg, 1)} kg of commercial LPG.",
            "potential_reduction_kg": reduction_kg,
            "potential_reduction_pct": round((reduction_kg / total_emissions * 100), 1) if total_emissions > 0 else 30.0,
            "action_type": "Circular Economy & Fuel Substitution",
            "sdgs": sdg_mappings,
            "primary_sdg": 12,
            "feasibility": "Medium: Requires 15m safety setback and dedicated organic slurry tank."
        })
    elif req.food_waste_kg > 20 and req.food_waste_pathway == "landfill":
        # Pure composting recommendation
        reduction_kg = round(req.food_waste_kg * (EF_FOOD_WASTE_LANDFILL - EF_FOOD_WASTE_COMPOST), 2)
        sdg_mappings = SDGMapper.map_sdgs_for_intervention(
            "Aerobic Composting for Food Scraps",
            "Waste Generation",
            [12, 13]
        )
        recs.append({
            "title": "Decentralized Aerobic Composting Facility",
            "category": "Waste Generation",
            "description": f"Divert {req.food_waste_kg} kg food waste from anaerobic landfill conditions to compost piles, eliminating fugitive methane emissions.",
            "potential_reduction_kg": reduction_kg,
            "potential_reduction_pct": round((reduction_kg / total_emissions * 100), 1) if total_emissions > 0 else 15.0,
            "action_type": "Methane Avoidance",
            "sdgs": sdg_mappings,
            "primary_sdg": 12,
            "feasibility": "High: Can be setup immediately in campus grounds/gardening section."
        })

    # 3. Transportation Recommendation
    if (req.bus_km + req.car_km) > 50 or req.fuel_diesel_liters > 20:
        km_total = req.bus_km + req.car_km
        reduction_kg = round(km_total * 0.20 * EF_VEHICLE_BUS, 2)
        sdg_mappings = SDGMapper.map_sdgs_for_intervention(
            "Campus Transit Route Consolidation & Fleet Electrification",
            "Transportation",
            [11, 13]
        )
        recs.append({
            "title": "Fleet Route Optimization & Electric Shuttles",
            "category": "Transportation",
            "description": "Optimize campus shuttle schedules to improve passenger load factors and introduce electric transit vehicles for internal campus mobility.",
            "potential_reduction_kg": max(15.0, reduction_kg),
            "potential_reduction_pct": round((reduction_kg / total_emissions * 100), 1) if total_emissions > 0 else 18.0,
            "action_type": "Sustainable Mobility",
            "sdgs": sdg_mappings,
            "primary_sdg": 11,
            "feasibility": "High: Route telematics and schedule adjustments require zero upfront capital."
        })

    # 4. Water Conservation
    if req.water_m3 > 50:
        reduction_kg = round(req.water_m3 * 0.30 * EF_WATER_M3, 2)
        sdg_mappings = SDGMapper.map_sdgs_for_intervention(
            "Low-Flow Aerators & Smart Leak Detection",
            "Water & Wastewater",
            [6, 13]
        )
        recs.append({
            "title": "Low-Flow Tap Aerators & Decentralized Greywater Reuse",
            "category": "Water & Wastewater",
            "description": f"Install aerators on taps across bathrooms and reuse treated greywater for landscape irrigation, saving ~{round(req.water_m3 * 0.30, 1)} m³ of water.",
            "potential_reduction_kg": reduction_kg,
            "potential_reduction_pct": round((reduction_kg / total_emissions * 100), 1) if total_emissions > 0 else 10.0,
            "action_type": "Resource Conservation",
            "sdgs": sdg_mappings,
            "primary_sdg": 6,
            "feasibility": "High: Rapid payback under 6 months with minimal plumbing retrofits."
        })

    # 5. Paper & Plastic Recycling
    if (req.paper_waste_kg + req.plastic_waste_kg) > 20 and (req.paper_waste_pathway == "landfill" or req.plastic_waste_pathway == "landfill"):
        avoided_paper = req.paper_waste_kg * (EF_PAPER_WASTE_LANDFILL - EF_PAPER_WASTE_RECYCLED) if req.paper_waste_pathway == "landfill" else 0
        avoided_plastic = req.plastic_waste_kg * (EF_PLASTIC_WASTE_LANDFILL - EF_PLASTIC_WASTE_RECYCLED) if req.plastic_waste_pathway == "landfill" else 0
        reduction_kg = round(avoided_paper + avoided_plastic, 2)
        sdg_mappings = SDGMapper.map_sdgs_for_intervention(
            "Campus Source-Segregation & Circular Materials Recovery",
            "Waste Generation",
            [12, 13]
        )
        recs.append({
            "title": "Campus Material Segregation & Closed-Loop Recycling",
            "category": "Waste Generation",
            "description": "Establish 3-bin source segregation in academic blocks and hostels, diverting recyclable paper and polymers from municipal landfills.",
            "potential_reduction_kg": max(5.0, reduction_kg),
            "potential_reduction_pct": round((reduction_kg / total_emissions * 100), 1) if total_emissions > 0 else 8.0,
            "action_type": "Circular Materials",
            "sdgs": sdg_mappings,
            "primary_sdg": 12,
            "feasibility": "High: Bin deployment and campus student awareness campaign."
        })

    return recs
