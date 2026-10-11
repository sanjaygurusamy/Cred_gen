import json
import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.organization import Organization
from app.models.campus import Campus
from app.models.block import CampusBlock
from app.schemas.block import BlockCategory

logger = logging.getLogger("campuscarbon.seed")

# Canonical 27 Blocks Specification for Amrita Vishwa Vidyapeetham, Coimbatore Campus
COIMBATORE_27_BLOCKS: List[Dict[str, Any]] = [
    # 1. Academic Blocks (6)
    {
        "name": "Academic Block 1",
        "code": "AB1",
        "category": BlockCategory.ACADEMIC.value,
        "description": "Primary academic hall housing engineering lecture auditoriums and administrative offices.",
        "floor_area_sqm": 18500.0,
        "occupant_capacity": 3200,
        "current_occupancy": 2850,
        "floors_count": 4,
        "classrooms_count": 38,
        "laboratories_count": 14,
        "operating_hours_per_day": 12.0,
        "verification_status": "verified",
        "area_unit": "sqm",
        "metadata_json": {"hvac_system": "VRF + Natural Ventilation", "primary_use": "Engineering Auditoriums & Dean's Office"}
    },
    {
        "name": "Academic Block 2",
        "code": "AB2",
        "category": BlockCategory.ACADEMIC.value,
        "description": "Engineering departments, research labs, computing centres, and faculty chambers.",
        "floor_area_sqm": 22000.0,
        "occupant_capacity": 3800,
        "current_occupancy": 3400,
        "floors_count": 5,
        "classrooms_count": 46,
        "laboratories_count": 24,
        "operating_hours_per_day": 14.0,
        "verification_status": "verified",
        "area_unit": "sqm",
        "metadata_json": {"data_center": True, "clean_rooms": 2}
    },
    {
        "name": "Academic Block 3",
        "code": "AB3",
        "category": BlockCategory.ACADEMIC.value,
        "description": "Sciences, humanities, undergraduate laboratories, and lecture halls.",
        "floor_area_sqm": 16000.0,
        "occupant_capacity": 2500,
        "current_occupancy": 2150,
        "floors_count": 4,
        "classrooms_count": 32,
        "laboratories_count": 18,
        "operating_hours_per_day": 10.0,
        "verification_status": "verified",
        "area_unit": "sqm",
        "metadata_json": {"specialized_labs": ["Physics", "Chemistry", "Biotech"]}
    },
    {
        "name": "Academic Block 4",
        "code": "AB4",
        "category": BlockCategory.ACADEMIC.value,
        "description": "Advanced research laboratories, seminar complexes, and interdisciplinary centres.",
        "floor_area_sqm": 14500.0,
        "occupant_capacity": 2000,
        "current_occupancy": 1650,
        "floors_count": 4,
        "classrooms_count": 24,
        "laboratories_count": 20,
        "operating_hours_per_day": 12.0,
        "verification_status": "awaiting_verification",
        "area_unit": "sqm",
        "metadata_json": {"interdisciplinary_centres": ["Cyber Security", "Robotics"]}
    },
    {
        "name": "MBA",
        "code": "MBA",
        "category": BlockCategory.ACADEMIC.value,
        "description": "Amrita School of Business executive amphitheaters, case study halls, and faculty wing.",
        "floor_area_sqm": 8500.0,
        "occupant_capacity": 900,
        "current_occupancy": 780,
        "floors_count": 3,
        "classrooms_count": 14,
        "laboratories_count": 4,
        "operating_hours_per_day": 10.0,
        "verification_status": "verified",
        "area_unit": "sqm",
        "metadata_json": {"executive_amphitheaters": 4, "trading_lab": True}
    },
    {
        "name": "CIR",
        "code": "CIR",
        "category": BlockCategory.ACADEMIC.value,
        "description": "Corporate and Industry Relations centre, career development, and campus placement complex.",
        "floor_area_sqm": 4200.0,
        "occupant_capacity": 600,
        "current_occupancy": 450,
        "floors_count": 2,
        "classrooms_count": 8,
        "laboratories_count": 4,
        "operating_hours_per_day": 9.0,
        "verification_status": "verified",
        "area_unit": "sqm",
        "metadata_json": {"interview_cubicles": 24, "auditorium_seats": 300}
    },

    # 2. Hostels (10)
    {
        "name": "Gargi",
        "code": "HST-GARGI",
        "category": BlockCategory.HOSTEL.value,
        "description": "Senior women student residential hostel with solar water heating and study halls.",
        "floor_area_sqm": 12500.0,
        "occupant_capacity": 750,
        "current_occupancy": 725,
        "floors_count": 5,
        "operating_hours_per_day": 24.0,
        "verification_status": "verified",
        "area_unit": "sqm",
        "metadata_json": {"solar_water_heater_lpd": 15000, "rooms": 250}
    },
    {
        "name": "Mythri",
        "code": "HST-MYTHRI",
        "category": BlockCategory.HOSTEL.value,
        "description": "Women student residential hostel with attached reading rooms and recreation hall.",
        "floor_area_sqm": 11000.0,
        "occupant_capacity": 650,
        "current_occupancy": 615,
        "floors_count": 4,
        "operating_hours_per_day": 24.0,
        "verification_status": "awaiting_verification",
        "area_unit": "sqm",
        "metadata_json": {"rooms": 220}
    },
    {
        "name": "Adithi",
        "code": "HST-ADITHI",
        "category": BlockCategory.HOSTEL.value,
        "description": "Women student residential hostel with courtyard and natural ventilation.",
        "floor_area_sqm": 11500.0,
        "occupant_capacity": 680,
        "current_occupancy": 640,
        "floors_count": 4,
        "operating_hours_per_day": 24.0,
        "verification_status": "awaiting_verification",
        "area_unit": "sqm"
    },
    {
        "name": "Savithri",
        "code": "HST-SAVITHRI",
        "category": BlockCategory.HOSTEL.value,
        "description": "Postgraduate and research scholars women hostel facility.",
        "floor_area_sqm": 9800.0,
        "occupant_capacity": 550,
        "current_occupancy": 510,
        "floors_count": 4,
        "operating_hours_per_day": 24.0,
        "verification_status": "verified",
        "area_unit": "sqm"
    },
    {
        "name": "Kashyapa",
        "code": "HST-KASHYAPA",
        "category": BlockCategory.HOSTEL.value,
        "description": "Men undergraduate student residential hostel with energy monitoring sub-meters.",
        "floor_area_sqm": 13500.0,
        "occupant_capacity": 850,
        "current_occupancy": 830,
        "floors_count": 5,
        "operating_hours_per_day": 24.0,
        "verification_status": "verified",
        "area_unit": "sqm",
        "metadata_json": {"digital_submetered": True}
    },
    {
        "name": "Vashita",
        "code": "HST-VASHITA",
        "category": BlockCategory.HOSTEL.value,
        "description": "Men residential hostel complex with spacious dining connectivity.",
        "floor_area_sqm": 13000.0,
        "occupant_capacity": 800,
        "current_occupancy": 780,
        "floors_count": 5,
        "operating_hours_per_day": 24.0,
        "verification_status": "verified",
        "area_unit": "sqm"
    },
    {
        "name": "Agastya",
        "code": "HST-AGASTYA",
        "category": BlockCategory.HOSTEL.value,
        "description": "Men residential hostel block equipped with rainwater harvesting conduits.",
        "floor_area_sqm": 12800.0,
        "occupant_capacity": 780,
        "current_occupancy": 750,
        "floors_count": 5,
        "operating_hours_per_day": 24.0,
        "verification_status": "verified",
        "area_unit": "sqm",
        "metadata_json": {"rainwater_catchment": True}
    },
    {
        "name": "Bhrighu",
        "code": "HST-BHRIGHU",
        "category": BlockCategory.HOSTEL.value,
        "description": "Men student residential hostel with common recreation and reading wings.",
        "floor_area_sqm": 12000.0,
        "occupant_capacity": 720,
        "current_occupancy": 690,
        "floors_count": 4,
        "operating_hours_per_day": 24.0,
        "verification_status": "awaiting_verification",
        "area_unit": "sqm"
    },
    {
        "name": "Yagnavalkya",
        "code": "HST-YAGNAVALKYA",
        "category": BlockCategory.HOSTEL.value,
        "description": "Men senior and postgraduate residential hostel wing.",
        "floor_area_sqm": 10500.0,
        "occupant_capacity": 620,
        "current_occupancy": 590,
        "floors_count": 4,
        "operating_hours_per_day": 24.0,
        "verification_status": "awaiting_verification",
        "area_unit": "sqm"
    },
    {
        "name": "Nachiketas",
        "code": "HST-NACHIKETAS",
        "category": BlockCategory.HOSTEL.value,
        "description": "Men student residential hostel with multi-story accommodation blocks.",
        "floor_area_sqm": 11200.0,
        "occupant_capacity": 660,
        "current_occupancy": 630,
        "floors_count": 4,
        "operating_hours_per_day": 24.0,
        "verification_status": "awaiting_verification",
        "area_unit": "sqm"
    },

    # 3. Faculty Quarters (1)
    {
        "name": "Faculty Quarters",
        "code": "RES-FQ",
        "category": BlockCategory.FACULTY_QUARTERS.value,
        "description": "Residential apartment towers and bungalows for university professors, faculty, and resident staff.",
        "floor_area_sqm": 35000.0,
        "occupant_capacity": 1200,
        "current_occupancy": 1080,
        "floors_count": 4,
        "operating_hours_per_day": 24.0,
        "verification_status": "user_provided",
        "area_unit": "sqm",
        "metadata_json": {"units_count": 280, "substation_id": "SS-RES"}
    },

    # 4. Kitchens and Canteens (4)
    {
        "name": "Central Kitchen",
        "code": "CUL-CK",
        "category": BlockCategory.KITCHEN_CANTEEN.value,
        "description": "Centralized mass food preparation, steam boilers, cold storage, and distribution hub.",
        "floor_area_sqm": 4800.0,
        "occupant_capacity": 250,
        "current_occupancy": 180,
        "floors_count": 2,
        "operating_hours_per_day": 16.0,
        "verification_status": "verified",
        "area_unit": "sqm",
        "metadata_json": {"primary_fuel": "Commercial LPG + Steam Boilers", "waste_treatment": "On-site Anaerobic Digestion"}
    },
    {
        "name": "Sopanam Canteen",
        "code": "CUL-SOPANAM",
        "category": BlockCategory.KITCHEN_CANTEEN.value,
        "description": "Major dining hall complex serving south campus student community and faculty.",
        "floor_area_sqm": 3200.0,
        "occupant_capacity": 1100,
        "current_occupancy": 950,
        "floors_count": 2,
        "operating_hours_per_day": 16.0,
        "verification_status": "verified",
        "area_unit": "sqm",
        "metadata_json": {"dining_capacity": 800, "organic_waste_sorting": True}
    },
    {
        "name": "Prasada Canteen",
        "code": "CUL-PRASADA",
        "category": BlockCategory.KITCHEN_CANTEEN.value,
        "description": "Campus dining cafeteria with indoor and open-air seating for students and staff.",
        "floor_area_sqm": 2800.0,
        "occupant_capacity": 900,
        "current_occupancy": 780,
        "floors_count": 2,
        "operating_hours_per_day": 15.0,
        "verification_status": "verified",
        "area_unit": "sqm"
    },
    {
        "name": "Samudhra Canteen",
        "code": "CUL-SAMUDHRA",
        "category": BlockCategory.KITCHEN_CANTEEN.value,
        "description": "Food court and refreshment facility serving visitors, seminars, and north academic quadrant.",
        "floor_area_sqm": 2100.0,
        "occupant_capacity": 650,
        "current_occupancy": 480,
        "floors_count": 1,
        "operating_hours_per_day": 14.0,
        "verification_status": "awaiting_verification",
        "area_unit": "sqm"
    },

    # 5. Transportation (1)
    {
        "name": "Transportation",
        "code": "OPS-TRANS",
        "category": BlockCategory.TRANSPORTATION.value,
        "description": "University bus fleet depot, EV charging stations, vehicle maintenance bays, and dispatch depot.",
        "floor_area_sqm": 6500.0,
        "occupant_capacity": 120,
        "current_occupancy": 65,
        "floors_count": 1,
        "operating_hours_per_day": 16.0,
        "verification_status": "verified",
        "area_unit": "sqm",
        "metadata_json": {"bus_fleet": 35, "ev_passenger_shuttles": 4, "service_vans": 8, "ev_chargers": 6}
    },

    # 6. Sewage Treatment (2)
    {
        "name": "Sewage Treatment Plant 1",
        "code": "UTL-STP1",
        "category": BlockCategory.SEWAGE_TREATMENT.value,
        "description": "Primary wastewater recycling plant servicing academic zone and north residential sector.",
        "floor_area_sqm": 3500.0,
        "occupant_capacity": 25,
        "current_occupancy": 12,
        "floors_count": 1,
        "operating_hours_per_day": 24.0,
        "verification_status": "verified",
        "area_unit": "sqm",
        "metadata_json": {"treatment_capacity_kld": 1500, "technology": "MBBR / Extended Aeration", "effluent_reuse": "100% Horticulture"}
    },
    {
        "name": "Sewage Treatment Plant 2",
        "code": "UTL-STP2",
        "category": BlockCategory.SEWAGE_TREATMENT.value,
        "description": "Secondary wastewater treatment plant with tertiary filtration for campus landscape irrigation.",
        "floor_area_sqm": 3200.0,
        "occupant_capacity": 20,
        "current_occupancy": 10,
        "floors_count": 1,
        "operating_hours_per_day": 24.0,
        "verification_status": "verified",
        "area_unit": "sqm",
        "metadata_json": {"treatment_capacity_kld": 1200, "technology": "Tertiary Sand & Carbon Filtration"}
    },

    # 7. Other Facilities (3)
    {
        "name": "Central Waste Collection",
        "code": "UTL-CWC",
        "category": BlockCategory.OTHER_FACILITY.value,
        "description": "Campus solid waste segregation center, dry recyclables compaction, and composting facility.",
        "floor_area_sqm": 2400.0,
        "occupant_capacity": 35,
        "current_occupancy": 22,
        "floors_count": 1,
        "operating_hours_per_day": 10.0,
        "verification_status": "verified",
        "area_unit": "sqm",
        "metadata_json": {"segregation_bays": 5, "compost_pits": 8, "shredder_units": 2}
    },
    {
        "name": "Fabrication",
        "code": "OPS-FAB",
        "category": BlockCategory.OTHER_FACILITY.value,
        "description": "Central engineering fabrication yard, metal works, carpentry, and electrical repair unit.",
        "floor_area_sqm": 4100.0,
        "occupant_capacity": 80,
        "current_occupancy": 45,
        "floors_count": 1,
        "operating_hours_per_day": 8.0,
        "verification_status": "awaiting_verification",
        "area_unit": "sqm"
    },
    {
        "name": "Generator",
        "code": "UTL-GEN",
        "category": BlockCategory.OTHER_FACILITY.value,
        "description": "High-capacity diesel generator house and HT electrical substation supplying backup campus power.",
        "floor_area_sqm": 1800.0,
        "occupant_capacity": 15,
        "current_occupancy": 6,
        "floors_count": 1,
        "operating_hours_per_day": 4.0,
        "verification_status": "verified",
        "area_unit": "sqm",
        "metadata_json": {"dg_sets": ["2x 1000 kVA", "1x 500 kVA"], "automatic_transfer_switch": True}
    },
]


def seed_phase2_inventory(db: Session) -> Dict[str, Any]:
    """
    Idempotently seeds Organization, Campus, and exactly the 27 required blocks
    for Amrita Vishwa Vidyapeetham, Coimbatore Campus.
    
    Safe to execute multiple times without creating duplicates.
    """
    # 1. Organization: Amrita Vishwa Vidyapeetham
    org_name = "Amrita Vishwa Vidyapeetham"
    org_code = "AVV"
    org = db.query(Organization).filter(Organization.code == org_code).first()
    if not org:
        org = Organization(
            name=org_name,
            code=org_code,
            description="Multi-campus, multidisciplinary research university accredited with A++ grade by NAAC.",
            website="https://www.amrita.edu",
            is_active=True
        )
        db.add(org)
        db.flush()
        logger.info(f"Created organization: {org.name} ({org.code})")
    else:
        logger.info(f"Existing organization found: {org.name} ({org.code})")

    # 2. Campus: Coimbatore Campus
    campus_name = "Coimbatore Campus"
    campus_code = "CBE"
    campus = db.query(Campus).filter(
        Campus.organization_id == org.id,
        Campus.code == campus_code
    ).first()
    if not campus:
        campus = Campus(
            organization_id=org.id,
            name=campus_name,
            code=campus_code,
            location="Ettimadai, Coimbatore, Tamil Nadu 641112",
            latitude=10.9003,
            longitude=76.9015,
            total_area_sqm=1821085.0,  # ~450 acres
            is_active=True
        )
        db.add(campus)
        db.flush()
        logger.info(f"Created campus: {campus.name} ({campus.code})")
    else:
        logger.info(f"Existing campus found: {campus.name} ({campus.code})")

    # 3. Seed the 27 blocks idempotently
    created_count = 0
    existing_count = 0
    category_counts: Dict[str, int] = {}

    for spec in COIMBATORE_27_BLOCKS:
        category = spec["category"]
        category_counts[category] = category_counts.get(category, 0) + 1

        existing_block = db.query(CampusBlock).filter(
            CampusBlock.campus_id == campus.id,
            CampusBlock.name == spec["name"]
        ).first()

        if not existing_block:
            new_block = CampusBlock(
                campus_id=campus.id,
                name=spec["name"],
                code=spec["code"],
                category=spec["category"],
                description=spec["description"],
                floor_area_sqm=spec.get("floor_area_sqm"),
                area_unit=spec.get("area_unit", "sqm"),
                occupant_capacity=spec.get("occupant_capacity"),
                current_occupancy=spec.get("current_occupancy"),
                floors_count=spec.get("floors_count"),
                classrooms_count=spec.get("classrooms_count"),
                laboratories_count=spec.get("laboratories_count"),
                operating_hours_per_day=spec.get("operating_hours_per_day"),
                verification_status=spec.get("verification_status", "awaiting_verification"),
                metadata_json=json.dumps(spec["metadata_json"]) if "metadata_json" in spec else None,
                is_active=True
            )
            db.add(new_block)
            created_count += 1
        else:
            existing_count += 1
            # Update fields to match specification if needed
            existing_block.code = spec["code"]
            existing_block.category = spec["category"]
            existing_block.description = spec["description"]
            existing_block.floor_area_sqm = spec.get("floor_area_sqm")
            existing_block.area_unit = spec.get("area_unit", "sqm")
            existing_block.occupant_capacity = spec.get("occupant_capacity")
            if "current_occupancy" in spec:
                existing_block.current_occupancy = spec.get("current_occupancy")
            if "floors_count" in spec:
                existing_block.floors_count = spec.get("floors_count")
            if "classrooms_count" in spec:
                existing_block.classrooms_count = spec.get("classrooms_count")
            if "laboratories_count" in spec:
                existing_block.laboratories_count = spec.get("laboratories_count")
            if "operating_hours_per_day" in spec:
                existing_block.operating_hours_per_day = spec.get("operating_hours_per_day")
            if "verification_status" in spec:
                existing_block.verification_status = spec.get("verification_status")
            if "metadata_json" in spec:
                existing_block.metadata_json = json.dumps(spec["metadata_json"]) if isinstance(spec["metadata_json"], (dict, list)) else spec["metadata_json"]

    db.commit()

    total_blocks = db.query(CampusBlock).filter(CampusBlock.campus_id == campus.id).count()

    logger.info(
        f"Seeding completed: {created_count} created, {existing_count} existing. Total in campus: {total_blocks}"
    )

    return {
        "status": "success",
        "organization": {
            "id": org.id,
            "name": org.name,
            "code": org.code
        },
        "campus": {
            "id": campus.id,
            "name": campus.name,
            "code": campus.code,
            "location": campus.location
        },
        "blocks_specification_count": len(COIMBATORE_27_BLOCKS),
        "blocks_created": created_count,
        "blocks_existing": existing_count,
        "total_campus_blocks": total_blocks,
        "category_counts": category_counts
    }


if __name__ == "__main__":
    from app.core.database import get_db
    db_gen = get_db()
    db_session = next(db_gen)
    try:
        result = seed_phase2_inventory(db_session)
        print("Seed result:", result)
    finally:
        db_session.close()
