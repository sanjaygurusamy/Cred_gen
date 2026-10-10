"""
Seed Data Generator for CampusCarbon AI.
Populates realistic, audit-grade university campus data, DEFRA/EPA emission factors,
activity records, and elements across all 7 sustainability categories.
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import (
    Campus, CampusBody, Element, EmissionFactor, ActivityRecord, EmissionCalculation
)
from app.carbon_engine.calculator import CarbonCalculator

def seed_database(db: Session):
    # Check if already seeded
    existing_campus = db.query(Campus).filter(Campus.code == "GTU-MAIN").first()
    if existing_campus:
        return existing_campus.id

    print("[INFO] Seeding CampusCarbon AI database...")

    # 1. Create Campus
    campus = Campus(
        id="green-tech-univ-01",
        name="GreenTech University Main Campus",
        code="GTU-MAIN",
        location="Silicon Valley, CA",
        total_area_sqm=450000.0,
        student_count=14500,
        staff_count=1200
    )
    db.add(campus)
    db.flush()

    # 2. Create Campus Bodies
    bodies = [
        CampusBody(
            id="body-dining-01",
            campus_id=campus.id,
            name="Central Dining Hall & Kitchen Complex",
            type="dining_cafeteria",
            floor_area_sqm=6500.0,
            occupant_capacity=2500,
            primary_contact="culinary_director@greentech.edu"
        ),
        CampusBody(
            id="body-eng-01",
            campus_id=campus.id,
            name="Engineering Academic Complex",
            type="academic",
            floor_area_sqm=42000.0,
            occupant_capacity=4000,
            primary_contact="facilities_eng@greentech.edu"
        ),
        CampusBody(
            id="body-hostel-01",
            campus_id=campus.id,
            name="Student Residential Hostels (Towers A-D)",
            type="residence_hostel",
            floor_area_sqm=65000.0,
            occupant_capacity=3800,
            primary_contact="housing_admin@greentech.edu"
        ),
        CampusBody(
            id="body-fleet-01",
            campus_id=campus.id,
            name="Campus Transit & Facilities Fleet Depot",
            type="facilities_fleet",
            floor_area_sqm=12000.0,
            occupant_capacity=150,
            primary_contact="transit_manager@greentech.edu"
        ),
        CampusBody(
            id="body-water-01",
            campus_id=campus.id,
            name="Water Utility & Wastewater Treatment Plant",
            type="utility",
            floor_area_sqm=8000.0,
            occupant_capacity=45,
            primary_contact="water_engineer@greentech.edu"
        ),
        CampusBody(
            id="body-chiller-01",
            campus_id=campus.id,
            name="Central District Chiller Plant",
            type="utility",
            floor_area_sqm=4500.0,
            occupant_capacity=20,
            primary_contact="hvac_lead@greentech.edu"
        ),
        CampusBody(
            id="body-fab-01",
            campus_id=campus.id,
            name="Mechanical Workshop & Innovation Fabrication Lab",
            type="workshop",
            floor_area_sqm=9500.0,
            occupant_capacity=350,
            primary_contact="workshop_super@greentech.edu"
        )
    ]
    for b in bodies:
        db.add(b)
    db.flush()

    # 3. Create Emission Factors (DEFRA / EPA eGRID / IPCC Standards)
    emission_factors = [
        EmissionFactor(
            id="ef-lpg-01",
            category="kitchen_lpg",
            sub_type="lpg",
            factor_value=2.983, # kgCO2e per kg LPG (DEFRA 2024 standard)
            factor_unit="kgCO2e/kg",
            source="DEFRA 2024 GHG Conversion Factors",
            region="National Standard",
            year=2024,
            uncertainty_percentage=3.0,
            data_quality="high",
            notes="Commercial Liquefied Petroleum Gas direct Scope 1 combustion factor."
        ),
        EmissionFactor(
            id="ef-grid-elec-01",
            category="electricity",
            sub_type="grid_electricity",
            factor_value=0.716, # kgCO2e per kWh
            factor_unit="kgCO2e/kWh",
            source="EPA eGRID / National Grid Average",
            region="Regional Grid",
            year=2024,
            uncertainty_percentage=4.0,
            data_quality="high",
            notes="Scope 2 location-based grid electricity average emission intensity."
        ),
        EmissionFactor(
            id="ef-diesel-01",
            category="transportation",
            sub_type="diesel",
            factor_value=2.687, # kgCO2e per liter diesel
            factor_unit="kgCO2e/liter",
            source="DEFRA 2024 Fuels",
            region="National Standard",
            year=2024,
            uncertainty_percentage=2.5,
            data_quality="high",
            notes="Scope 1 100% mineral road diesel combustion factor."
        ),
        EmissionFactor(
            id="ef-food-waste-01",
            category="food_waste",
            sub_type="mixed_organic_waste",
            factor_value=0.627, # kgCO2e per kg landfill organic decomposition
            factor_unit="kgCO2e/kg",
            source="EPA WARM Model v16",
            region="National Average",
            year=2024,
            uncertainty_percentage=10.0,
            data_quality="medium",
            notes="Scope 3 downstream landfill anaerobic decomposition methane factor."
        ),
        EmissionFactor(
            id="ef-water-01",
            category="water_wastewater",
            sub_type="municipal_water_supply",
            factor_value=0.344, # kgCO2e per m3
            factor_unit="kgCO2e/m3",
            source="DEFRA 2024 Water Supply",
            region="National Average",
            year=2024,
            uncertainty_percentage=5.0,
            data_quality="high",
            notes="Upstream municipal water treatment and conveyance energy emissions."
        ),
        EmissionFactor(
            id="ef-ac-elec-01",
            category="air_conditioning",
            sub_type="chiller_electricity",
            factor_value=0.716,
            factor_unit="kgCO2e/kWh",
            source="EPA eGRID 2024",
            region="Regional Grid",
            year=2024,
            uncertainty_percentage=4.0,
            data_quality="high",
            notes="Scope 2 grid electricity used by chillers and air handling units."
        ),
        EmissionFactor(
            id="ef-fab-elec-01",
            category="fabrication_construction",
            sub_type="workshop_machinery",
            factor_value=0.716,
            factor_unit="kgCO2e/kWh",
            source="EPA eGRID 2024",
            region="Regional Grid",
            year=2024,
            uncertainty_percentage=4.0,
            data_quality="high",
            notes="Scope 2 electricity consumed by fabrication heavy equipment."
        )
    ]
    for ef in emission_factors:
        db.add(ef)
    db.flush()

    # 4. Create Elements across categories
    elements = [
        # Kitchen & LPG (Matches Section 10: 80 kg/day baseline)
        Element(
            id="LPG_001",
            campus_id=campus.id,
            campus_body_id="body-dining-01",
            name="Central Kitchen Cooking Range & Main Burners",
            category="kitchen_lpg",
            scope="Scope 1",
            operational_status="active",
            baseline_value=80.0,
            baseline_unit="kg",
            metadata_json={"equipment_type": "Commercial Pre-mix Burners", "burner_count": 8, "service_hours": 12}
        ),
        # Electricity
        Element(
            id="ELEC_001",
            campus_id=campus.id,
            campus_body_id="body-eng-01",
            name="Engineering Academic Complex Lighting & Plug Loads",
            category="electricity",
            scope="Scope 2",
            operational_status="active",
            baseline_value=4200.0,
            baseline_unit="kWh",
            metadata_json={"fixture_count": 1850, "operating_hours_daily": 14}
        ),
        # Transportation
        Element(
            id="TRANS_001",
            campus_id=campus.id,
            campus_body_id="body-fleet-01",
            name="Campus Transit Diesel Shuttle Fleet",
            category="transportation",
            scope="Scope 1",
            operational_status="active",
            baseline_value=180.0,
            baseline_unit="liter",
            metadata_json={"fleet_size": 6, "daily_route_km": 420}
        ),
        # Food Waste
        Element(
            id="WASTE_001",
            campus_id=campus.id,
            campus_body_id="body-dining-01",
            name="Dining Hall Unsegregated Organic Waste",
            category="food_waste",
            scope="Scope 3",
            operational_status="active",
            baseline_value=350.0,
            baseline_unit="kg",
            metadata_json={"disposal_route": "Municipal Landfill", "organic_fraction_pct": 82}
        ),
        # Water & Wastewater
        Element(
            id="WATER_001",
            campus_id=campus.id,
            campus_body_id="body-water-01",
            name="Main Raw Water Pumping & Distribution Grid",
            category="water_wastewater",
            scope="Scope 2",
            operational_status="active",
            baseline_value=450.0,
            baseline_unit="m3",
            metadata_json={"pump_hp": 75, "pressure_bar": 4.5}
        ),
        # Air Conditioning
        Element(
            id="HVAC_001",
            campus_id=campus.id,
            campus_body_id="body-chiller-01",
            name="Central Chiller Plant Chillers 1-3",
            category="air_conditioning",
            scope="Scope 2",
            operational_status="active",
            baseline_value=3800.0,
            baseline_unit="kWh",
            metadata_json={"tons_refrigeration": 600, "chilled_water_setpoint_c": 21.0}
        ),
        # Fabrication & Construction
        Element(
            id="FAB_001",
            campus_id=campus.id,
            campus_body_id="body-fab-01",
            name="Mechanical Workshop Machine Tools & Compressors",
            category="fabrication_construction",
            scope="Scope 2",
            operational_status="active",
            baseline_value=620.0,
            baseline_unit="kWh",
            metadata_json={"connected_load_kw": 140, "idling_load_pct": 32}
        )
    ]
    for el in elements:
        db.add(el)
    db.flush()

    # 5. Create Activity Records & Initial Deterministic Calculations
    now = datetime.utcnow()
    yesterday = now - timedelta(days=1)

    element_activity_map = [
        ("LPG_001", 80.0, "kg", "ef-lpg-01", 1.45, "USD"),
        ("ELEC_001", 4200.0, "kWh", "ef-grid-elec-01", 0.14, "USD"),
        ("TRANS_001", 180.0, "liter", "ef-diesel-01", 1.15, "USD"),
        ("WASTE_001", 350.0, "kg", "ef-food-waste-01", 0.08, "USD"),
        ("WATER_001", 450.0, "m3", "ef-water-01", 0.95, "USD"),
        ("HVAC_001", 3800.0, "kWh", "ef-ac-elec-01", 0.14, "USD"),
        ("FAB_001", 620.0, "kWh", "ef-fab-elec-01", 0.14, "USD")
    ]

    for elem_id, act_val, unit, ef_id, cost_rate, curr in element_activity_map:
        rec = ActivityRecord(
            campus_id=campus.id,
            element_id=elem_id,
            reporting_period_start=yesterday,
            reporting_period_end=now,
            activity_value=act_val,
            activity_unit=unit,
            value_type="measured",
            data_quality="high",
            cost_rate=cost_rate,
            cost_currency=curr,
            notes=f"Standard daily facility reading for {elem_id}.",
            recorded_by="facilities_supervisor"
        )
        db.add(rec)
        db.flush()

        ef_obj = db.query(EmissionFactor).filter(EmissionFactor.id == ef_id).first()
        res = CarbonCalculator.calculate_single_emission(
            activity_value=act_val,
            activity_unit=unit,
            emission_factor_value=ef_obj.factor_value,
            emission_factor_unit=ef_obj.factor_unit,
            emission_factor_source=ef_obj.source
        )

        calc = EmissionCalculation(
            campus_id=campus.id,
            element_id=elem_id,
            activity_record_id=rec.id,
            emission_factor_id=ef_id,
            calculated_emissions_kg=res["calculated_emissions_kg"],
            calculation_method="deterministic_ghg_protocol",
            data_quality="high",
            calculation_timestamp=now,
            details_json=res
        )
        db.add(calc)

    db.commit()
    print("[SUCCESS] Seed data populated successfully!")
    return campus.id
