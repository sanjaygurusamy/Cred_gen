import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.activity import ActivityDefinition, BlockActivityAssignment
from app.models.block import CampusBlock
from app.models.campus import Campus
from app.models.organization import Organization

logger = logging.getLogger("campuscarbon.seed_phase3")

CANONICAL_ACTIVITIES: List[Dict[str, Any]] = [
    # 1. Electricity & Renewables
    {
        "code": "ELEC_CONSUMPTION",
        "name": "Grid Electricity Consumption",
        "category": "electricity",
        "description": "Active electricity drawn from institutional grid sub-stations or distribution boards.",
        "default_unit": "kWh",
        "supported_units": ["kWh", "MWh"],
        "unit_conversions": {"MWh": 1000.0},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0, "max_daily_kwh": 500000.0},
    },
    {
        "code": "SOLAR_ELEC_GEN",
        "name": "Rooftop Solar Electricity Generated",
        "category": "renewables",
        "description": "On-site solar photovoltaic electrical energy generation recorded by rooftop inverters.",
        "default_unit": "kWh",
        "supported_units": ["kWh", "MWh"],
        "unit_conversions": {"MWh": 1000.0},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },

    # 2. Water
    {
        "code": "WATER_CONSUMPTION",
        "name": "Fresh Water Consumption",
        "category": "water",
        "description": "Potable and treated freshwater consumption measured via utility meters or borewell pumps.",
        "default_unit": "m3",
        "supported_units": ["m3", "litres", "kL"],
        "unit_conversions": {"litres": 0.001, "kL": 1.0},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },

    # 3. General Solid Waste (Segregated at Source)
    {
        "code": "WASTE_PAPER",
        "name": "Paper & Cardboard Waste Generated",
        "category": "solid_waste",
        "description": "Clean dry waste paper, cardboard cartons, notebooks, and packaging materials.",
        "default_unit": "kg",
        "supported_units": ["kg", "tonnes"],
        "unit_conversions": {"tonnes": 1000.0},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },
    {
        "code": "WASTE_PLASTIC",
        "name": "Plastic Waste Generated",
        "category": "solid_waste",
        "description": "Rigid and flexible plastics, bottles, packaging film, and clean plastic containers.",
        "default_unit": "kg",
        "supported_units": ["kg", "tonnes"],
        "unit_conversions": {"tonnes": 1000.0},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },
    {
        "code": "WASTE_MIXED",
        "name": "Mixed / Unsegregated Solid Waste",
        "category": "solid_waste",
        "description": "Unsegregated non-hazardous municipal solid waste collected from common campus bins.",
        "default_unit": "kg",
        "supported_units": ["kg", "tonnes"],
        "unit_conversions": {"tonnes": 1000.0},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },
    {
        "code": "WASTE_OTHER",
        "name": "Other Non-Hazardous Solid Waste",
        "category": "solid_waste",
        "description": "Miscellaneous dry solid waste, sweeps, textiles, and inert materials.",
        "default_unit": "kg",
        "supported_units": ["kg", "tonnes"],
        "unit_conversions": {"tonnes": 1000.0},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },

    # 4. Food and Kitchen Waste (Strictly distinct from solid waste)
    {
        "code": "WASTE_FOOD",
        "name": "Cooked Food Waste Generated",
        "category": "food_waste",
        "description": "Post-consumer and plate food scrape waste originating at hostels, dining halls, and canteens.",
        "default_unit": "kg",
        "supported_units": ["kg", "tonnes"],
        "unit_conversions": {"tonnes": 1000.0},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },
    {
        "code": "WASTE_VEGETABLE",
        "name": "Vegetable & Raw Culinary Prep Waste",
        "category": "food_waste",
        "description": "Pre-consumer raw vegetable peels, fruit trimmings, and culinary kitchen preparation scraps.",
        "default_unit": "kg",
        "supported_units": ["kg", "tonnes"],
        "unit_conversions": {"tonnes": 1000.0},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },

    # 5. Fuels (Stationary & Kitchen)
    {
        "code": "FUEL_LPG",
        "name": "LPG Consumption",
        "category": "fuels",
        "description": "Liquefied petroleum gas used in institutional cooking steam kettles and stoves.",
        "default_unit": "kg",
        "supported_units": ["kg", "cylinders_19kg", "cylinders_14.2kg"],
        "unit_conversions": {"cylinders_19kg": 19.0, "cylinders_14.2kg": 14.2},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },
    {
        "code": "FUEL_DIESEL",
        "name": "Stationary Diesel Fuel Consumption",
        "category": "fuels",
        "description": "High-speed diesel consumed exclusively for dedicated equipment (e.g. steam boilers).",
        "default_unit": "litres",
        "supported_units": ["litres", "gallons"],
        "unit_conversions": {"gallons": 3.78541},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },
    {
        "code": "FUEL_PETROL",
        "name": "Equipment Petrol Consumption",
        "category": "fuels",
        "description": "Motor gasoline used for grounds maintenance and small utility engines.",
        "default_unit": "litres",
        "supported_units": ["litres", "gallons"],
        "unit_conversions": {"gallons": 3.78541},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },

    # 6. Transportation Fleet (Distinct from stationary fuel)
    {
        "code": "TRANS_DISTANCE",
        "name": "Fleet Vehicle Distance Travelled",
        "category": "transportation",
        "description": "Odometer distance logged by university buses, vans, and official campus shuttles.",
        "default_unit": "km",
        "supported_units": ["km", "miles"],
        "unit_conversions": {"miles": 1.60934},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },
    {
        "code": "TRANS_FUEL_CONSUMPTION",
        "name": "Fleet Vehicle Fuel Consumption",
        "category": "transportation",
        "description": "Fuel dispensed directly into university transit buses, maintenance trucks, and shuttles.",
        "default_unit": "litres",
        "supported_units": ["litres", "gallons"],
        "unit_conversions": {"gallons": 3.78541},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },

    # 7. Sewage Treatment (Separate plants, no biogas)
    {
        "code": "STP_WASTEWATER_TREATED",
        "name": "Wastewater Volume Treated",
        "category": "sewage_treatment",
        "description": "Influent wastewater volume treated through biological aeration and filtration.",
        "default_unit": "m3",
        "supported_units": ["m3", "litres", "kL"],
        "unit_conversions": {"litres": 0.001, "kL": 1.0},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },
    {
        "code": "STP_SLUDGE_GENERATED",
        "name": "Sewage Sludge Cake Generated",
        "category": "sewage_treatment",
        "description": "Dewatered sewage sludge cake produced from secondary clarifiers and filter presses.",
        "default_unit": "kg",
        "supported_units": ["kg", "tonnes"],
        "unit_conversions": {"tonnes": 1000.0},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },
    {
        "code": "STP_TREATMENT_CHEMICALS",
        "name": "Wastewater Treatment Chemicals Used",
        "category": "sewage_treatment",
        "description": "Coagulants, alum, sodium hypochlorite, and tertiary treatment dosing chemicals.",
        "default_unit": "kg",
        "supported_units": ["kg", "litres"],
        "unit_conversions": {"litres": 1.0},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },

    # 8. Backup Power Generator
    {
        "code": "GEN_DIESEL_CONSUMPTION",
        "name": "Generator Diesel Fuel Consumed",
        "category": "generator",
        "description": "High-capacity diesel generator fuel consumed during utility grid power outages.",
        "default_unit": "litres",
        "supported_units": ["litres", "gallons"],
        "unit_conversions": {"gallons": 3.78541},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },
    {
        "code": "GEN_ELECTRICITY_GENERATED",
        "name": "Generator Backup Electricity Output",
        "category": "generator",
        "description": "Gross alternating-current electrical energy generated by emergency diesel sets.",
        "default_unit": "kWh",
        "supported_units": ["kWh", "MWh"],
        "unit_conversions": {"MWh": 1000.0},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },
    {
        "code": "GEN_OPERATING_HOURS",
        "name": "Generator Engine Runtime Hours",
        "category": "generator",
        "description": "Total engine operating run-hours recorded on generator control telemetry.",
        "default_unit": "hours",
        "supported_units": ["hours", "minutes"],
        "unit_conversions": {"minutes": 1.0 / 60.0},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0, "max_daily_hours": 24.0},
    },

    # 9. Engineering Fabrication Workshop
    {
        "code": "FAB_METAL_CONSUMPTION",
        "name": "Steel & Aluminium Material Consumption",
        "category": "fabrication",
        "description": "Raw structural steel, sheets, angles, and aluminium stock utilized in fabrication projects.",
        "default_unit": "kg",
        "supported_units": ["kg", "tonnes"],
        "unit_conversions": {"tonnes": 1000.0},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },
    {
        "code": "FAB_METAL_SCRAP",
        "name": "Metal Scrap Waste Generated",
        "category": "fabrication",
        "description": "Ferrous and non-ferrous off-cuts, turnings, and swarf generated during machining.",
        "default_unit": "kg",
        "supported_units": ["kg", "tonnes"],
        "unit_conversions": {"tonnes": 1000.0},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },
    {
        "code": "FAB_OTHER_WASTE",
        "name": "Other Fabrication Industrial Waste",
        "category": "fabrication",
        "description": "Grinding dust, spent welding slag, and miscellaneous fabrication process refuse.",
        "default_unit": "kg",
        "supported_units": ["kg", "tonnes"],
        "unit_conversions": {"tonnes": 1000.0},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },

    # 10. Electronic Waste (Distinct generation vs recycling)
    {
        "code": "EWASTE_GENERATED",
        "name": "Electronic Waste (E-Waste) Generated",
        "category": "ewaste",
        "description": "Decommissioned computers, peripherals, monitors, lab circuits, and battery units.",
        "default_unit": "kg",
        "supported_units": ["kg", "tonnes"],
        "unit_conversions": {"tonnes": 1000.0},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },
    {
        "code": "EWASTE_RECYCLED",
        "name": "E-Waste Sent to Authorized Recycler",
        "category": "ewaste",
        "description": "E-waste handed over to state-authorized e-waste dismantlers/recyclers (transfer event).",
        "default_unit": "kg",
        "supported_units": ["kg", "tonnes"],
        "unit_conversions": {"tonnes": 1000.0},
        "is_enabled": True,
        "is_transfer_activity": True,
        "validation_rules": {"min_value": 0.0},
    },

    # 11. Central Waste Consolidation Yard (Transfers, not newly generated!)
    {
        "code": "CWC_WASTE_RECEIVED",
        "name": "Waste Received from Campus Blocks",
        "category": "solid_waste",
        "description": "Bulk consolidated waste received from academic blocks, hostels, and dining halls.",
        "default_unit": "kg",
        "supported_units": ["kg", "tonnes"],
        "unit_conversions": {"tonnes": 1000.0},
        "is_enabled": True,
        "is_transfer_activity": True,
        "validation_rules": {"min_value": 0.0},
    },
    {
        "code": "CWC_WASTE_DISPATCHED",
        "name": "Waste Dispatched to Off-Campus Facilities",
        "category": "solid_waste",
        "description": "Dry recyclables and residues dispatched to municipal landfill or licensed recovery vendors.",
        "default_unit": "kg",
        "supported_units": ["kg", "tonnes"],
        "unit_conversions": {"tonnes": 1000.0},
        "is_enabled": True,
        "is_transfer_activity": True,
        "validation_rules": {"min_value": 0.0},
    },

    # 12. Refrigerants (HVAC and Chiller leakages)
    {
        "code": "REFRIGERANT_LEAKAGE",
        "name": "HVAC Refrigerant Gas Top-Up / Leakage",
        "category": "refrigerants",
        "description": "Refrigerant gas replenished during maintenance of air conditioners and cold rooms (e.g. R410A, R134a).",
        "default_unit": "kg",
        "supported_units": ["kg", "lbs"],
        "unit_conversions": {"lbs": 0.453592},
        "is_enabled": True,
        "is_transfer_activity": False,
        "validation_rules": {"min_value": 0.0},
    },
]


def seed_phase3_catalogue(db: Session) -> Dict[str, Any]:
    """
    Idempotently seeds:
    1. Canonical Activity Definitions in PostgreSQL
    2. Block-Activity Assignments across the 27 Coimbatore Campus blocks
       respecting strict institutional segregation policies.
    """
    # 1. Seed Activity Definitions
    activities_created = 0
    activities_existing = 0
    activity_map: Dict[str, ActivityDefinition] = {}

    for act_def in CANONICAL_ACTIVITIES:
        code = act_def["code"]
        existing = db.query(ActivityDefinition).filter(ActivityDefinition.code == code).first()
        if not existing:
            act = ActivityDefinition(**act_def)
            db.add(act)
            db.flush()
            activity_map[code] = act
            activities_created += 1
        else:
            # Update attributes to keep canonical definitions updated
            for k, v in act_def.items():
                setattr(existing, k, v)
            activity_map[code] = existing
            activities_existing += 1

    db.commit()

    # 2. Retrieve Coimbatore Campus
    campus = db.query(Campus).filter(Campus.code == "CBE").first()
    if not campus:
        logger.warning("Coimbatore Campus (CBE) not found; run Phase 2 seed first.")
        return {
            "status": "partial",
            "activities_created": activities_created,
            "activities_existing": activities_existing,
            "total_activities": len(activity_map),
            "assignments_created": 0,
            "assignments_existing": 0,
            "message": "Campus CBE missing"
        }

    # 3. Retrieve all blocks in Coimbatore Campus
    blocks = db.query(CampusBlock).filter(CampusBlock.campus_id == campus.id).all()
    block_map: Dict[str, CampusBlock] = {b.name: b for b in blocks}

    assignments_created = 0
    assignments_existing = 0

    # Helper function to assign an activity code to a block
    def assign(block_name: str, act_code: str, custom_unit: str = None, notes: str = None):
        nonlocal assignments_created, assignments_existing
        blk = block_map.get(block_name)
        act = activity_map.get(act_code)
        if not blk or not act:
            return

        existing_assign = db.query(BlockActivityAssignment).filter(
            BlockActivityAssignment.block_id == blk.id,
            BlockActivityAssignment.activity_id == act.id
        ).first()

        if not existing_assign:
            assign_record = BlockActivityAssignment(
                block_id=blk.id,
                activity_id=act.id,
                is_enabled=True,
                custom_unit=custom_unit,
                notes=notes
            )
            db.add(assign_record)
            assignments_created += 1
        else:
            assignments_existing += 1

    # Assignment Sets:
    # A. Academic Blocks (6): Electricity, Water, Paper, Plastic, Mixed, Other waste, Solar, Refrigerant, E-waste.
    # NO generator diesel.
    academic_names = [
        "Academic Block 1", "Academic Block 2", "Academic Block 3",
        "Academic Block 4", "MBA", "CIR"
    ]
    academic_activities = [
        "ELEC_CONSUMPTION", "WATER_CONSUMPTION",
        "WASTE_PAPER", "WASTE_PLASTIC", "WASTE_MIXED", "WASTE_OTHER",
        "SOLAR_ELEC_GEN", "REFRIGERANT_LEAKAGE", "EWASTE_GENERATED"
    ]
    for b_name in academic_names:
        for a_code in academic_activities:
            assign(b_name, a_code)

    # B. Hostels (10): Electricity, Water, Food waste (at source), Paper, Plastic, Mixed, Other waste, Solar, Refrigerants, E-waste.
    # NO LPG or generator diesel by default.
    hostel_names = [
        "Gargi", "Mythri", "Adithi", "Savithri", "Kashyapa",
        "Vashita", "Agastya", "Bhrighu", "Yagnavalkya", "Nachiketas"
    ]
    hostel_activities = [
        "ELEC_CONSUMPTION", "WATER_CONSUMPTION",
        "WASTE_FOOD",  # Recorded at source
        "WASTE_PAPER", "WASTE_PLASTIC", "WASTE_MIXED", "WASTE_OTHER",
        "SOLAR_ELEC_GEN", "REFRIGERANT_LEAKAGE", "EWASTE_GENERATED"
    ]
    for b_name in hostel_names:
        for a_code in hostel_activities:
            assign(b_name, a_code)

    # C. Faculty Quarters (1): Electricity, Water, Food waste, Paper, Plastic, Mixed, Other waste, Solar, Refrigerants.
    fq_activities = [
        "ELEC_CONSUMPTION", "WATER_CONSUMPTION",
        "WASTE_FOOD", "WASTE_PAPER", "WASTE_PLASTIC", "WASTE_MIXED", "WASTE_OTHER",
        "SOLAR_ELEC_GEN", "REFRIGERANT_LEAKAGE"
    ]
    for a_code in fq_activities:
        assign("Faculty Quarters", a_code)

    # D. Central Kitchen (1): Electricity, LPG, Water, Food waste, Vegetable waste, Other waste, Diesel (kitchen-specific only), Refrigerants.
    ck_activities = [
        "ELEC_CONSUMPTION", "FUEL_LPG", "WATER_CONSUMPTION",
        "WASTE_FOOD", "WASTE_VEGETABLE", "WASTE_OTHER",
        "FUEL_DIESEL",  # Boiler use
        "REFRIGERANT_LEAKAGE"
    ]
    for a_code in ck_activities:
        assign("Central Kitchen", a_code)

    # E. Canteens (3): Electricity, LPG, Water, Food waste, Vegetable waste, Other waste, Refrigerants.
    # NO diesel!
    canteen_names = ["Sopanam Canteen", "Prasada Canteen", "Samudhra Canteen"]
    canteen_activities = [
        "ELEC_CONSUMPTION", "FUEL_LPG", "WATER_CONSUMPTION",
        "WASTE_FOOD", "WASTE_VEGETABLE", "WASTE_OTHER",
        "REFRIGERANT_LEAKAGE"
    ]
    for b_name in canteen_names:
        for a_code in canteen_activities:
            assign(b_name, a_code)

    # F. Transportation (1): Vehicle fuel consumption, Distance travelled, Depot electricity.
    # Distinct from kitchen operations.
    trans_activities = [
        "ELEC_CONSUMPTION",
        "TRANS_DISTANCE",
        "TRANS_FUEL_CONSUMPTION"
    ]
    for a_code in trans_activities:
        assign("Transportation", a_code)

    # G. Sewage Treatment Plant 1 & 2 (2): Electricity, Wastewater treated, Sludge generated, Chemicals.
    # Kept separate. NO diesel, NO biogas.
    stp_names = ["Sewage Treatment Plant 1", "Sewage Treatment Plant 2"]
    stp_activities = [
        "ELEC_CONSUMPTION",
        "STP_WASTEWATER_TREATED",
        "STP_SLUDGE_GENERATED",
        "STP_TREATMENT_CHEMICALS"
    ]
    for b_name in stp_names:
        for a_code in stp_activities:
            assign(b_name, a_code)

    # H. Generator (1): Diesel consumption, Electricity generated, Operating hours.
    gen_activities = [
        "GEN_DIESEL_CONSUMPTION",
        "GEN_ELECTRICITY_GENERATED",
        "GEN_OPERATING_HOURS"
    ]
    for a_code in gen_activities:
        assign("Generator", a_code)

    # I. Central Waste Collection (1): Waste received, Waste dispatched, E-waste sent for recycling, Electricity.
    # Food waste NOT registered as newly generated!
    cwc_activities = [
        "ELEC_CONSUMPTION",
        "CWC_WASTE_RECEIVED",
        "CWC_WASTE_DISPATCHED",
        "EWASTE_RECYCLED"
    ]
    for a_code in cwc_activities:
        assign("Central Waste Collection", a_code)

    # J. Fabrication (1): Electricity, Steel/Aluminium consumption, Metal scrap, Other waste, Refrigerants.
    # NO fuel!
    fab_activities = [
        "ELEC_CONSUMPTION",
        "FAB_METAL_CONSUMPTION",
        "FAB_METAL_SCRAP",
        "FAB_OTHER_WASTE",
        "REFRIGERANT_LEAKAGE"
    ]
    for a_code in fab_activities:
        assign("Fabrication", a_code)

    db.commit()

    total_assignments = db.query(BlockActivityAssignment).count()

    logger.info(
        f"Phase 3 seed complete: {len(activity_map)} activities, "
        f"{assignments_created} new assignments, {total_assignments} total active assignments."
    )

    return {
        "status": "success",
        "activities_created": activities_created,
        "activities_existing": activities_existing,
        "total_activities": len(activity_map),
        "assignments_created": assignments_created,
        "assignments_existing": assignments_existing,
        "total_assignments": total_assignments
    }


if __name__ == "__main__":
    from app.core.database import get_db
    db_gen = get_db()
    db_session = next(db_gen)
    try:
        result = seed_phase3_catalogue(db_session)
        print("Phase 3 seed result:", result)
    finally:
        db_session.close()
