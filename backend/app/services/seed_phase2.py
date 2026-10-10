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
    },
    {
        "name": "Academic Block 2",
        "code": "AB2",
        "category": BlockCategory.ACADEMIC.value,
        "description": "Engineering departments, research labs, computing centres, and faculty chambers.",
        "floor_area_sqm": 22000.0,
        "occupant_capacity": 3800,
    },
    {
        "name": "Academic Block 3",
        "code": "AB3",
        "category": BlockCategory.ACADEMIC.value,
        "description": "Sciences, humanities, undergraduate laboratories, and lecture halls.",
        "floor_area_sqm": 16000.0,
        "occupant_capacity": 2500,
    },
    {
        "name": "Academic Block 4",
        "code": "AB4",
        "category": BlockCategory.ACADEMIC.value,
        "description": "Advanced research laboratories, seminar complexes, and interdisciplinary centres.",
        "floor_area_sqm": 14500.0,
        "occupant_capacity": 2000,
    },
    {
        "name": "MBA",
        "code": "MBA",
        "category": BlockCategory.ACADEMIC.value,
        "description": "Amrita School of Business executive amphitheaters, case study halls, and faculty wing.",
        "floor_area_sqm": 8500.0,
        "occupant_capacity": 900,
    },
    {
        "name": "CIR",
        "code": "CIR",
        "category": BlockCategory.ACADEMIC.value,
        "description": "Corporate and Industry Relations centre, career development, and campus placement complex.",
        "floor_area_sqm": 4200.0,
        "occupant_capacity": 600,
    },

    # 2. Hostels (10)
    {
        "name": "Gargi",
        "code": "HST-GARGI",
        "category": BlockCategory.HOSTEL.value,
        "description": "Senior women student residential hostel with solar water heating and study halls.",
        "floor_area_sqm": 12500.0,
        "occupant_capacity": 750,
    },
    {
        "name": "Mythri",
        "code": "HST-MYTHRI",
        "category": BlockCategory.HOSTEL.value,
        "description": "Women student residential hostel with attached reading rooms and recreation hall.",
        "floor_area_sqm": 11000.0,
        "occupant_capacity": 650,
    },
    {
        "name": "Adithi",
        "code": "HST-ADITHI",
        "category": BlockCategory.HOSTEL.value,
        "description": "Women student residential hostel with courtyard and natural ventilation.",
        "floor_area_sqm": 11500.0,
        "occupant_capacity": 680,
    },
    {
        "name": "Savithri",
        "code": "HST-SAVITHRI",
        "category": BlockCategory.HOSTEL.value,
        "description": "Postgraduate and research scholars women hostel facility.",
        "floor_area_sqm": 9800.0,
        "occupant_capacity": 550,
    },
    {
        "name": "Kashyapa",
        "code": "HST-KASHYAPA",
        "category": BlockCategory.HOSTEL.value,
        "description": "Men undergraduate student residential hostel with energy monitoring sub-meters.",
        "floor_area_sqm": 13500.0,
        "occupant_capacity": 850,
    },
    {
        "name": "Vashita",
        "code": "HST-VASHITA",
        "category": BlockCategory.HOSTEL.value,
        "description": "Men residential hostel complex with spacious dining connectivity.",
        "floor_area_sqm": 13000.0,
        "occupant_capacity": 800,
    },
    {
        "name": "Agastya",
        "code": "HST-AGASTYA",
        "category": BlockCategory.HOSTEL.value,
        "description": "Men residential hostel block equipped with rainwater harvesting conduits.",
        "floor_area_sqm": 12800.0,
        "occupant_capacity": 780,
    },
    {
        "name": "Bhrighu",
        "code": "HST-BHRIGHU",
        "category": BlockCategory.HOSTEL.value,
        "description": "Men student residential hostel with common recreation and reading wings.",
        "floor_area_sqm": 12000.0,
        "occupant_capacity": 720,
    },
    {
        "name": "Yagnavalkya",
        "code": "HST-YAGNAVALKYA",
        "category": BlockCategory.HOSTEL.value,
        "description": "Men senior and postgraduate residential hostel wing.",
        "floor_area_sqm": 10500.0,
        "occupant_capacity": 620,
    },
    {
        "name": "Nachiketas",
        "code": "HST-NACHIKETAS",
        "category": BlockCategory.HOSTEL.value,
        "description": "Men student residential hostel with multi-story accommodation blocks.",
        "floor_area_sqm": 11200.0,
        "occupant_capacity": 660,
    },

    # 3. Faculty Quarters (1)
    {
        "name": "Faculty Quarters",
        "code": "RES-FQ",
        "category": BlockCategory.FACULTY_QUARTERS.value,
        "description": "Residential apartment towers and bungalows for university professors, faculty, and resident staff.",
        "floor_area_sqm": 35000.0,
        "occupant_capacity": 1200,
    },

    # 4. Kitchens and Canteens (4)
    {
        "name": "Central Kitchen",
        "code": "CUL-CK",
        "category": BlockCategory.KITCHEN_CANTEEN.value,
        "description": "Centralized mass food preparation, steam boilers, cold storage, and distribution hub.",
        "floor_area_sqm": 4800.0,
        "occupant_capacity": 250,
    },
    {
        "name": "Sopanam Canteen",
        "code": "CUL-SOPANAM",
        "category": BlockCategory.KITCHEN_CANTEEN.value,
        "description": "Major dining hall complex serving south campus student community and faculty.",
        "floor_area_sqm": 3200.0,
        "occupant_capacity": 1100,
    },
    {
        "name": "Prasada Canteen",
        "code": "CUL-PRASADA",
        "category": BlockCategory.KITCHEN_CANTEEN.value,
        "description": "Campus dining cafeteria with indoor and open-air seating for students and staff.",
        "floor_area_sqm": 2800.0,
        "occupant_capacity": 900,
    },
    {
        "name": "Samudhra Canteen",
        "code": "CUL-SAMUDHRA",
        "category": BlockCategory.KITCHEN_CANTEEN.value,
        "description": "Food court and refreshment facility serving visitors, seminars, and north academic quadrant.",
        "floor_area_sqm": 2100.0,
        "occupant_capacity": 650,
    },

    # 5. Transportation (1)
    {
        "name": "Transportation",
        "code": "OPS-TRANS",
        "category": BlockCategory.TRANSPORTATION.value,
        "description": "University bus fleet depot, EV charging stations, vehicle maintenance bays, and dispatch depot.",
        "floor_area_sqm": 6500.0,
        "occupant_capacity": 120,
    },

    # 6. Sewage Treatment (2)
    {
        "name": "Sewage Treatment Plant 1",
        "code": "UTL-STP1",
        "category": BlockCategory.SEWAGE_TREATMENT.value,
        "description": "Primary wastewater recycling plant servicing academic zone and north residential sector.",
        "floor_area_sqm": 3500.0,
        "occupant_capacity": 25,
    },
    {
        "name": "Sewage Treatment Plant 2",
        "code": "UTL-STP2",
        "category": BlockCategory.SEWAGE_TREATMENT.value,
        "description": "Secondary wastewater treatment plant with tertiary filtration for campus landscape irrigation.",
        "floor_area_sqm": 3200.0,
        "occupant_capacity": 20,
    },

    # 7. Other Facilities (3)
    {
        "name": "Central Waste Collection",
        "code": "UTL-CWC",
        "category": BlockCategory.OTHER_FACILITY.value,
        "description": "Campus solid waste segregation center, dry recyclables compaction, and composting facility.",
        "floor_area_sqm": 2400.0,
        "occupant_capacity": 35,
    },
    {
        "name": "Fabrication",
        "code": "OPS-FAB",
        "category": BlockCategory.OTHER_FACILITY.value,
        "description": "Central engineering fabrication yard, metal works, carpentry, and electrical repair unit.",
        "floor_area_sqm": 4100.0,
        "occupant_capacity": 80,
    },
    {
        "name": "Generator",
        "code": "UTL-GEN",
        "category": BlockCategory.OTHER_FACILITY.value,
        "description": "High-capacity diesel generator house and HT electrical substation supplying backup campus power.",
        "floor_area_sqm": 1800.0,
        "occupant_capacity": 15,
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
                floor_area_sqm=spec["floor_area_sqm"],
                occupant_capacity=spec["occupant_capacity"],
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
            existing_block.floor_area_sqm = spec["floor_area_sqm"]
            existing_block.occupant_capacity = spec["occupant_capacity"]

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
