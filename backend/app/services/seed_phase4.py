"""
Phase 4 Baseline Profiles Seeding Service.
Seeds initial baseline profiles for all 27 canonical campus blocks of Coimbatore Campus (AVV-CBE).
Ensures 100% idempotence - preserves existing user-configured baselines without modification.
"""
import logging
from datetime import date
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.organization import Organization
from app.models.campus import Campus
from app.models.block import CampusBlock
from app.models.baseline import ElectricityBaseline, ElectricityBaselineItem

logger = logging.getLogger(__name__)

EFFECTIVE_DATE = date(2026, 1, 1)

# Canonical profile configurations for all 27 Coimbatore Campus blocks
CANONICAL_BLOCK_BASELINES: Dict[str, Dict[str, Any]] = {
    # -------------------------------------------------------------------------
    # 1. Academic Blocks (6)
    # -------------------------------------------------------------------------
    "AB1": {
        "name": "Academic Block 1 Baseline Profile",
        "description": "Standard departmental baseline for classrooms, lecture halls, and computational labs.",
        "source_rationale": "Amrita Estate Office audited floor plans; 18 standard classrooms, 6 AC lecture halls, 3 computer labs.",
        "items": [
            {
                "facility_type": "standard_classroom",
                "facility_name": "Standard Classroom (Non-AC)",
                "quantity": 18,
                "average_power_kw": 1.2,
                "default_operating_hours": 8.0,
                "source_rationale": "Lighting, 4 ceiling fans, projector, student laptop load; 8-hr daily academic timetable."
            },
            {
                "facility_type": "ac_classroom",
                "facility_name": "AC Smart Lecture Hall",
                "quantity": 6,
                "average_power_kw": 4.5,
                "default_operating_hours": 7.0,
                "source_rationale": "Dual 2-ton split AC units, interactive board, sound system, active during lecture sessions."
            },
            {
                "facility_type": "computer_lab_ac",
                "facility_name": "Computer Lab with AC",
                "quantity": 3,
                "average_power_kw": 12.0,
                "default_operating_hours": 8.0,
                "source_rationale": "60 workstations (approx. 150W each = 9kW) plus dual 3-ton precision AC units (3kW net load)."
            }
        ]
    },
    "AB2": {
        "name": "Academic Block 2 Baseline Profile",
        "description": "Classrooms and advanced computing laboratories.",
        "source_rationale": "Estate Office inventory for AB2; 16 standard classrooms, 8 AC lecture halls, 4 computing labs.",
        "items": [
            {
                "facility_type": "standard_classroom",
                "facility_name": "Standard Classroom (Non-AC)",
                "quantity": 16,
                "average_power_kw": 1.2,
                "default_operating_hours": 8.0,
                "source_rationale": "Standard 60-seat classrooms with 8-hr academic schedule."
            },
            {
                "facility_type": "ac_classroom",
                "facility_name": "AC Smart Lecture Hall",
                "quantity": 8,
                "average_power_kw": 4.5,
                "default_operating_hours": 7.0,
                "source_rationale": "Smart lecture halls with dedicated dual climate control."
            },
            {
                "facility_type": "computer_lab_ac",
                "facility_name": "Computer Lab with AC",
                "quantity": 4,
                "average_power_kw": 12.0,
                "default_operating_hours": 8.0,
                "source_rationale": "Four 60-seater computer labs with continuous AC during class hours."
            }
        ]
    },
    "AB3": {
        "name": "Academic Block 3 Baseline Profile",
        "description": "Engineering departments and research labs.",
        "source_rationale": "Academic schedule; 20 classrooms, 4 AC seminar halls, 2 computer labs.",
        "items": [
            {
                "facility_type": "standard_classroom",
                "facility_name": "Standard Classroom (Non-AC)",
                "quantity": 20,
                "average_power_kw": 1.2,
                "default_operating_hours": 8.0,
                "source_rationale": "General engineering instruction rooms."
            },
            {
                "facility_type": "ac_classroom",
                "facility_name": "AC Seminar Hall",
                "quantity": 4,
                "average_power_kw": 5.0,
                "default_operating_hours": 6.0,
                "source_rationale": "Higher capacity seminar halls with multi-split air conditioning."
            },
            {
                "facility_type": "computer_lab_ac",
                "facility_name": "Research Computing Lab with AC",
                "quantity": 2,
                "average_power_kw": 14.0,
                "default_operating_hours": 10.0,
                "source_rationale": "Extended research hours with specialized workstation clusters."
            }
        ]
    },
    "AB4": {
        "name": "Academic Block 4 Baseline Profile",
        "description": "Undergraduate teaching block.",
        "source_rationale": "Estate Office data: 22 standard classrooms, 4 AC lecture halls, 2 computer labs.",
        "items": [
            {
                "facility_type": "standard_classroom",
                "facility_name": "Standard Classroom (Non-AC)",
                "quantity": 22,
                "average_power_kw": 1.2,
                "default_operating_hours": 8.0,
                "source_rationale": "Standard teaching rooms."
            },
            {
                "facility_type": "ac_classroom",
                "facility_name": "AC Lecture Hall",
                "quantity": 4,
                "average_power_kw": 4.5,
                "default_operating_hours": 7.0,
                "source_rationale": "Climate controlled lecture rooms."
            },
            {
                "facility_type": "computer_lab_ac",
                "facility_name": "Computer Lab with AC",
                "quantity": 2,
                "average_power_kw": 12.0,
                "default_operating_hours": 8.0,
                "source_rationale": "Core computing labs."
            }
        ]
    },
    "MBA": {
        "name": "MBA Department Baseline Profile",
        "description": "Management school building with case-study syndicate rooms and seminar halls.",
        "source_rationale": "School of Business facilities: tiered AC classrooms and executive labs.",
        "items": [
            {
                "facility_type": "ac_classroom",
                "facility_name": "Executive AC Classroom",
                "quantity": 10,
                "average_power_kw": 5.5,
                "default_operating_hours": 8.0,
                "source_rationale": "Tiered case-study rooms with centralized AC and multimedia consoles."
            },
            {
                "facility_type": "computer_lab_ac",
                "facility_name": "Financial Analytics Lab",
                "quantity": 2,
                "average_power_kw": 10.0,
                "default_operating_hours": 7.0,
                "source_rationale": "Analytics lab with Bloomberg/workstation terminals and climate control."
            }
        ]
    },
    "CIR": {
        "name": "CIR Building Baseline Profile",
        "description": "Corporate & Industry Relations training and interview suites.",
        "source_rationale": "CIR building schedule: interview cabins, seminar halls, training labs.",
        "items": [
            {
                "facility_type": "ac_classroom",
                "facility_name": "Interview & Assessment Cabin (AC)",
                "quantity": 16,
                "average_power_kw": 1.8,
                "default_operating_hours": 6.0,
                "source_rationale": "Individual interview rooms with split AC during placement season."
            },
            {
                "facility_type": "ac_classroom",
                "facility_name": "Large Training Auditorium (AC)",
                "quantity": 2,
                "average_power_kw": 12.0,
                "default_operating_hours": 5.0,
                "source_rationale": "Main placement orientation auditoriums."
            }
        ]
    },

    # -------------------------------------------------------------------------
    # 2. Hostels (10)
    # -------------------------------------------------------------------------
    "HST-GARGI": {
        "name": "Gargi Hostel Baseline Profile",
        "description": "Student residence facility with study rooms and common dining.",
        "source_rationale": "Hostel warden registry: 130 student rooms, 8 AC guest/warden rooms, 1 dining hall.",
        "items": [
            {
                "facility_type": "hostel_room",
                "facility_name": "Standard Student Room (Non-AC)",
                "quantity": 130,
                "average_power_kw": 0.35,
                "default_operating_hours": 14.0,
                "source_rationale": "Dual ceiling fans, 2 tube lights, laptop chargers, active evenings and nights."
            },
            {
                "facility_type": "hostel_room_ac",
                "facility_name": "AC Hostel Room",
                "quantity": 8,
                "average_power_kw": 2.2,
                "default_operating_hours": 10.0,
                "source_rationale": "Climate controlled warden and guest residential rooms."
            },
            {
                "facility_type": "hostel_dining",
                "facility_name": "Hostel Dining & Common Hall",
                "quantity": 1,
                "average_power_kw": 6.5,
                "default_operating_hours": 6.0,
                "source_rationale": "Dining illumination, high-speed fans, hot water dispensers, active around meal hours."
            }
        ]
    },
    "HST-MYTHRI": {
        "name": "Mythri Hostel Baseline Profile",
        "description": "Student residence facility.",
        "source_rationale": "Hostel warden records: 120 standard rooms, 6 AC rooms, 1 dining hall.",
        "items": [
            {
                "facility_type": "hostel_room",
                "facility_name": "Standard Student Room (Non-AC)",
                "quantity": 120,
                "average_power_kw": 0.35,
                "default_operating_hours": 14.0,
                "source_rationale": "Evening and overnight student living load."
            },
            {
                "facility_type": "hostel_room_ac",
                "facility_name": "AC Hostel Room",
                "quantity": 6,
                "average_power_kw": 2.2,
                "default_operating_hours": 10.0,
                "source_rationale": "Warden and special resident rooms."
            },
            {
                "facility_type": "hostel_dining",
                "facility_name": "Hostel Dining & Common Hall",
                "quantity": 1,
                "average_power_kw": 6.0,
                "default_operating_hours": 6.0,
                "source_rationale": "Mess and common recreation hall."
            }
        ]
    },
    "HST-ADITHI": {
        "name": "Adithi Hostel Baseline Profile",
        "description": "Women student hostel accommodation.",
        "source_rationale": "Hostel block inventory: 125 rooms, 1 dining hall.",
        "items": [
            {
                "facility_type": "hostel_room",
                "facility_name": "Standard Student Room (Non-AC)",
                "quantity": 125,
                "average_power_kw": 0.35,
                "default_operating_hours": 14.0,
                "source_rationale": "Student room domestic load."
            },
            {
                "facility_type": "hostel_dining",
                "facility_name": "Hostel Dining & Common Hall",
                "quantity": 1,
                "average_power_kw": 6.0,
                "default_operating_hours": 6.0,
                "source_rationale": "Common recreation and dining."
            }
        ]
    },
    "HST-SAVITHRI": {
        "name": "Savithri Hostel Baseline Profile",
        "description": "Research scholars and PG hostel.",
        "source_rationale": "PG residence specs: 100 single/double rooms, 10 AC rooms.",
        "items": [
            {
                "facility_type": "hostel_room",
                "facility_name": "Standard Scholar Room",
                "quantity": 100,
                "average_power_kw": 0.4,
                "default_operating_hours": 15.0,
                "source_rationale": "Extended study hours and research laptop usage."
            },
            {
                "facility_type": "hostel_room_ac",
                "facility_name": "AC Scholar Room",
                "quantity": 10,
                "average_power_kw": 2.2,
                "default_operating_hours": 10.0,
                "source_rationale": "AC research accommodation."
            }
        ]
    },
    "HST-KASHYAPA": {
        "name": "Kashyapa Hostel Baseline Profile",
        "description": "Undergraduate men student residential hostel.",
        "source_rationale": "Hostel records: 140 student rooms, 1 mess hall.",
        "items": [
            {
                "facility_type": "hostel_room",
                "facility_name": "Standard Student Room (Non-AC)",
                "quantity": 140,
                "average_power_kw": 0.35,
                "default_operating_hours": 14.0,
                "source_rationale": "Ceiling fans, lighting, laptops."
            },
            {
                "facility_type": "hostel_dining",
                "facility_name": "Hostel Dining & Common Hall",
                "quantity": 1,
                "average_power_kw": 6.5,
                "default_operating_hours": 6.0,
                "source_rationale": "Dining illumination and food warmers."
            }
        ]
    },
    "HST-VASHITA": {
        "name": "Vashita Hostel Baseline Profile",
        "description": "Men residential hostel block.",
        "source_rationale": "Hostel inventory: 135 student rooms, 1 dining hall.",
        "items": [
            {
                "facility_type": "hostel_room",
                "facility_name": "Standard Student Room (Non-AC)",
                "quantity": 135,
                "average_power_kw": 0.35,
                "default_operating_hours": 14.0,
                "source_rationale": "Student accommodation electrical load."
            },
            {
                "facility_type": "hostel_dining",
                "facility_name": "Hostel Dining & Common Hall",
                "quantity": 1,
                "average_power_kw": 6.0,
                "default_operating_hours": 6.0,
                "source_rationale": "Common hall and dining."
            }
        ]
    },
    "HST-AGASTYA": {
        "name": "Agastya Hostel Baseline Profile",
        "description": "Men student residence.",
        "source_rationale": "Hostel inventory: 130 student rooms, 1 dining hall.",
        "items": [
            {
                "facility_type": "hostel_room",
                "facility_name": "Standard Student Room (Non-AC)",
                "quantity": 130,
                "average_power_kw": 0.35,
                "default_operating_hours": 14.0,
                "source_rationale": "Standard student room load."
            },
            {
                "facility_type": "hostel_dining",
                "facility_name": "Hostel Dining & Common Hall",
                "quantity": 1,
                "average_power_kw": 6.0,
                "default_operating_hours": 6.0,
                "source_rationale": "Dining mess load."
            }
        ]
    },
    "HST-BHRIGHU": {
        "name": "Bhrighu Hostel Baseline Profile",
        "description": "Men student hostel.",
        "source_rationale": "Hostel inventory: 120 rooms, 1 common hall.",
        "items": [
            {
                "facility_type": "hostel_room",
                "facility_name": "Standard Student Room (Non-AC)",
                "quantity": 120,
                "average_power_kw": 0.35,
                "default_operating_hours": 14.0,
                "source_rationale": "Standard room load."
            },
            {
                "facility_type": "hostel_dining",
                "facility_name": "Hostel Dining & Common Hall",
                "quantity": 1,
                "average_power_kw": 5.5,
                "default_operating_hours": 6.0,
                "source_rationale": "Common recreation and dining."
            }
        ]
    },
    "HST-YAGNAVALKYA": {
        "name": "Yagnavalkya Hostel Baseline Profile",
        "description": "Senior student residence block.",
        "source_rationale": "Hostel inventory: 110 rooms, 1 dining hall.",
        "items": [
            {
                "facility_type": "hostel_room",
                "facility_name": "Standard Student Room (Non-AC)",
                "quantity": 110,
                "average_power_kw": 0.35,
                "default_operating_hours": 14.0,
                "source_rationale": "Senior resident living load."
            },
            {
                "facility_type": "hostel_dining",
                "facility_name": "Hostel Dining & Common Hall",
                "quantity": 1,
                "average_power_kw": 5.5,
                "default_operating_hours": 6.0,
                "source_rationale": "Dining and study hall."
            }
        ]
    },
    "HST-NACHIKETAS": {
        "name": "Nachiketas Hostel Baseline Profile",
        "description": "Men undergraduate hostel.",
        "source_rationale": "Hostel inventory: 115 rooms, 1 dining hall.",
        "items": [
            {
                "facility_type": "hostel_room",
                "facility_name": "Standard Student Room (Non-AC)",
                "quantity": 115,
                "average_power_kw": 0.35,
                "default_operating_hours": 14.0,
                "source_rationale": "Student room power usage."
            },
            {
                "facility_type": "hostel_dining",
                "facility_name": "Hostel Dining & Common Hall",
                "quantity": 1,
                "average_power_kw": 5.5,
                "default_operating_hours": 6.0,
                "source_rationale": "Common room and dining."
            }
        ]
    },

    # -------------------------------------------------------------------------
    # 3. Faculty Quarters (1)
    # -------------------------------------------------------------------------
    "RES-FQ": {
        "name": "Faculty Quarters Baseline Profile",
        "description": "Residential family apartment blocks for faculty and administrative staff.",
        "source_rationale": "Campus housing register: 36 standard apartments, 18 AC apartments.",
        "items": [
            {
                "facility_type": "faculty_residence",
                "facility_name": "Standard Residential Flat (Non-AC)",
                "quantity": 36,
                "average_power_kw": 1.6,
                "default_operating_hours": 16.0,
                "source_rationale": "Household refrigerator, washing machine, LED lights, kitchen appliances."
            },
            {
                "facility_type": "faculty_residence_ac",
                "facility_name": "AC Residential Flat",
                "quantity": 18,
                "average_power_kw": 3.8,
                "default_operating_hours": 12.0,
                "source_rationale": "Residential flat with master bedroom inverter AC in addition to domestic load."
            }
        ]
    },

    # -------------------------------------------------------------------------
    # 4. Kitchens and Canteens (4)
    # -------------------------------------------------------------------------
    "CUL-CK": {
        "name": "Central Kitchen Baseline Profile",
        "description": "Heavy commercial catering and refrigeration facility.",
        "source_rationale": "Commercial food service inventory: walk-in chillers, dough mixers, exhaust hoods.",
        "items": [
            {
                "facility_type": "kitchen_equipment",
                "facility_name": "Commercial Cold Storage & Exhaust System",
                "quantity": 1,
                "average_power_kw": 24.0,
                "default_operating_hours": 14.0,
                "source_rationale": "Walk-in refrigeration compressors (12kW) plus heavy centrifugal exhaust hoods (12kW)."
            },
            {
                "facility_type": "kitchen_prep",
                "facility_name": "Food Preparation & Kitchen Machinery",
                "quantity": 1,
                "average_power_kw": 8.5,
                "default_operating_hours": 8.0,
                "source_rationale": "Industrial dough kneaders, vegetable cutters, grinders, and dishwashers."
            }
        ]
    },
    "CUL-SOPANAM": {
        "name": "Sopanam Canteen Baseline Profile",
        "description": "Campus dining hall catering facility.",
        "source_rationale": "Canteen equipment list: commercial refrigeration, food warmers, dining hall fans.",
        "items": [
            {
                "facility_type": "canteen_kitchen",
                "facility_name": "Kitchen Exhaust & Commercial Freezers",
                "quantity": 1,
                "average_power_kw": 14.0,
                "default_operating_hours": 12.0,
                "source_rationale": "Exhaust motors, chest freezers, dough kneaders."
            },
            {
                "facility_type": "canteen_dining",
                "facility_name": "Dining Hall Lighting & High-Speed Fans",
                "quantity": 1,
                "average_power_kw": 5.0,
                "default_operating_hours": 10.0,
                "source_rationale": "High-volume air circulation fans and illumination."
            }
        ]
    },
    "CUL-PRASADA": {
        "name": "Prasada Canteen Baseline Profile",
        "description": "Mid-campus dining facility.",
        "source_rationale": "Kitchen equipment and dining hall schedule.",
        "items": [
            {
                "facility_type": "canteen_kitchen",
                "facility_name": "Kitchen Freezers & Prep Equipment",
                "quantity": 1,
                "average_power_kw": 12.0,
                "default_operating_hours": 12.0,
                "source_rationale": "Commercial food warmers, freezers, and beverage chillers."
            },
            {
                "facility_type": "canteen_dining",
                "facility_name": "Dining Hall Illumination & Fans",
                "quantity": 1,
                "average_power_kw": 4.5,
                "default_operating_hours": 10.0,
                "source_rationale": "Seating area lighting and fans."
            }
        ]
    },
    "CUL-SAMUDHRA": {
        "name": "Samudhra Canteen Baseline Profile",
        "description": "North campus food court and cafeteria.",
        "source_rationale": "Cafeteria appliances and display refrigeration.",
        "items": [
            {
                "facility_type": "canteen_kitchen",
                "facility_name": "Beverage Coolers & Snack Warmers",
                "quantity": 1,
                "average_power_kw": 9.5,
                "default_operating_hours": 11.0,
                "source_rationale": "Commercial display chillers and snack ovens."
            },
            {
                "facility_type": "canteen_dining",
                "facility_name": "Cafeteria Seating Area",
                "quantity": 1,
                "average_power_kw": 3.5,
                "default_operating_hours": 9.0,
                "source_rationale": "Lighting and ventilation fans."
            }
        ]
    },

    # -------------------------------------------------------------------------
    # 5. Transportation (1)
    # -------------------------------------------------------------------------
    "OPS-TRANS": {
        "name": "Transportation Depot Baseline Profile",
        "description": "Fleet maintenance workshop and campus EV charging point.",
        "source_rationale": "Fleet depot log: Level-2 EV chargers, pneumatic compressors, shop lighting.",
        "items": [
            {
                "facility_type": "ev_chargers",
                "facility_name": "Campus EV Shuttle Charging Hub",
                "quantity": 2,
                "average_power_kw": 7.4,
                "default_operating_hours": 8.0,
                "source_rationale": "Dual 7.4 kW Level-2 AC chargers for electric campus utility vehicles."
            },
            {
                "facility_type": "workshop_machinery",
                "facility_name": "Maintenance Bay & Air Compressor",
                "quantity": 1,
                "average_power_kw": 4.5,
                "default_operating_hours": 6.0,
                "source_rationale": "Pneumatic tire service compressor, hydraulic lift, high-bay lighting."
            }
        ]
    },

    # -------------------------------------------------------------------------
    # 6. Sewage Treatment Plants (2)
    # -------------------------------------------------------------------------
    "UTL-STP1": {
        "name": "Sewage Treatment Plant 1 Baseline Profile",
        "description": "Biological wastewater treatment plant 1 mechanical systems.",
        "source_rationale": "Sanitary engineering logs: 2 aeration blowers, dosing pumps, clarifier drive.",
        "items": [
            {
                "facility_type": "stp_machinery",
                "facility_name": "Aeration Blowers & Clarifier Motors",
                "quantity": 2,
                "average_power_kw": 12.5,
                "default_operating_hours": 18.0,
                "source_rationale": "Continuous biological aeration cycle for activated sludge process."
            },
            {
                "facility_type": "stp_pumps",
                "facility_name": "Effluent Transfer & Dosing Pumps",
                "quantity": 1,
                "average_power_kw": 5.0,
                "default_operating_hours": 8.0,
                "source_rationale": "Treated water transfer pumps for campus landscape irrigation."
            }
        ]
    },
    "UTL-STP2": {
        "name": "Sewage Treatment Plant 2 Baseline Profile",
        "description": "Biological wastewater treatment plant 2 mechanical systems.",
        "source_rationale": "Sanitary engineering logs: STP 2 aeration and filtration motors.",
        "items": [
            {
                "facility_type": "stp_machinery",
                "facility_name": "Aeration Blowers & Filter Motors",
                "quantity": 2,
                "average_power_kw": 12.5,
                "default_operating_hours": 18.0,
                "source_rationale": "Continuous aeration blowers for biological basin 2."
            },
            {
                "facility_type": "stp_pumps",
                "facility_name": "Filter Feed & Backwash Pumps",
                "quantity": 1,
                "average_power_kw": 5.0,
                "default_operating_hours": 8.0,
                "source_rationale": "Sand filter feed and automated backwash cycling."
            }
        ]
    },

    # -------------------------------------------------------------------------
    # 7. Other Facilities (3)
    # -------------------------------------------------------------------------
    "UTL-CWC": {
        "name": "Central Waste Collection Baseline Profile",
        "description": "Waste segregation yard, hydraulic baler, and shredder.",
        "source_rationale": "Solid waste facility specs: hydraulic cardboard baler, mechanical shredder.",
        "items": [
            {
                "facility_type": "waste_machinery",
                "facility_name": "Hydraulic Baler & Waste Shredder",
                "quantity": 1,
                "average_power_kw": 7.5,
                "default_operating_hours": 4.0,
                "source_rationale": "Cardboard and plastic baling press operation."
            },
            {
                "facility_type": "sorting_lighting",
                "facility_name": "Segregation Yard & Weighbridge",
                "quantity": 1,
                "average_power_kw": 2.0,
                "default_operating_hours": 8.0,
                "source_rationale": "Digital weighbridge indicator and outdoor high-mast LED floodlights."
            }
        ]
    },
    "OPS-FAB": {
        "name": "Fabrication Yard Baseline Profile",
        "description": "Central engineering fabrication yard, welding shop, and carpentry.",
        "source_rationale": "Workshop machinery load: arc welding sets, metal lathe, bandsaw.",
        "items": [
            {
                "facility_type": "welding_machines",
                "facility_name": "Electric Arc & MIG Welding Machines",
                "quantity": 2,
                "average_power_kw": 6.5,
                "default_operating_hours": 4.0,
                "source_rationale": "Welding operations for campus maintenance."
            },
            {
                "facility_type": "machining_tools",
                "facility_name": "Lathe, Cutting & Carpentry Tools",
                "quantity": 2,
                "average_power_kw": 3.5,
                "default_operating_hours": 5.0,
                "source_rationale": "Heavy duty machine tools in repair section."
            }
        ]
    },
    "UTL-GEN": {
        "name": "Generator & Substation Baseline Profile",
        "description": "HT substation auxiliary power, battery chargers, and control room.",
        "source_rationale": "Electrical substation auxiliary consumption: battery charger, control AC.",
        "items": [
            {
                "facility_type": "substation_aux",
                "facility_name": "Substation Battery Tripping Charger & Panel Auxiliaries",
                "quantity": 1,
                "average_power_kw": 3.0,
                "default_operating_hours": 24.0,
                "source_rationale": "110V DC station battery charger and protection relay auxiliary power."
            },
            {
                "facility_type": "control_room_ac",
                "facility_name": "SCADA & Control Room Climate Control",
                "quantity": 1,
                "average_power_kw": 2.5,
                "default_operating_hours": 24.0,
                "source_rationale": "Continuous air conditioning for microprocessor relay panels."
            }
        ]
    }
}


def seed_phase4_baselines(db: Session) -> Dict[str, int]:
    """
    Idempotently seeds initial baseline profiles for all 27 campus blocks.
    Skips blocks that already have an existing baseline profile.
    """
    blocks = db.execute(select(CampusBlock)).scalars().all()
    block_map = {b.code: b for b in blocks}

    created_baselines = 0
    created_items = 0
    skipped_blocks = 0

    for code, config in CANONICAL_BLOCK_BASELINES.items():
        block = block_map.get(code)
        if not block:
            continue

        # Check if baseline already exists for this block
        existing = db.execute(
            select(ElectricityBaseline).where(ElectricityBaseline.block_id == block.id)
        ).first()

        if existing:
            skipped_blocks += 1
            continue

        # Create baseline version 1
        baseline = ElectricityBaseline(
            organization_id=block.campus.organization_id if block.campus else "org-amrita",
            campus_id=block.campus_id,
            block_id=block.id,
            version=1,
            name=config["name"],
            description=config.get("description"),
            source_rationale=config.get("source_rationale"),
            effective_start_date=EFFECTIVE_DATE,
            effective_end_date=None,
            is_active=True
        )
        db.add(baseline)
        db.flush()
        created_baselines += 1

        for idx, item_data in enumerate(config["items"]):
            item = ElectricityBaselineItem(
                baseline_id=baseline.id,
                facility_type=item_data["facility_type"],
                facility_name=item_data["facility_name"],
                quantity=item_data["quantity"],
                average_power_kw=item_data["average_power_kw"],
                default_operating_hours=item_data["default_operating_hours"],
                source_rationale=item_data.get("source_rationale"),
                is_active=True,
                order_index=idx
            )
            db.add(item)
            created_items += 1

    db.commit()

    logger.info(
        f"Phase 4 baseline seeding complete: {created_baselines} baselines created, "
        f"{created_items} items created, {skipped_blocks} blocks already configured."
    )

    return {
        "created_baselines": created_baselines,
        "created_items": created_items,
        "skipped_blocks": skipped_blocks
    }
