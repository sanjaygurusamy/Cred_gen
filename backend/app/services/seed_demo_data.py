"""CampusCarbon AI — Multi-Day Demonstration Data Seeder.

Populates 14 consecutive days (2026-09-28 to 2026-10-11) of realistic campus telemetry
across all 27 campus blocks and key sustainability domains:
- Grid Electricity & On-site Rooftop Solar
- Food Waste & Organic Composting
- LPG Cooking Fuel
- Fleet Transportation Diesel & Distance
- Generator Diesel & Output
- Municipal / Fresh Water Consumption
- Segregated Paper & Plastic Solid Waste
- Sewage Treatment Volume
- Central Waste Transfer Logistics

Guarantees:
1. Strict idempotency: safe to execute multiple times without duplicating records.
2. Unambiguous labelling: all demonstration records are explicitly tagged with data_status="simulated",
   reading_identifier="simulated_demo_daily", and notes="[DEMO-DATA]".
3. Preserves existing real / official utility meter readings.
4. Executes deterministic carbon engine calculations to persist verified CarbonCalculationRecord rows.
5. Accurately showcases institutional safeguards (transfers, volume-only STP, distance-only fleet,
   gross generator electricity).
"""
import logging
import uuid
from datetime import date, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.block import CampusBlock
from app.models.activity import ActivityDefinition, BlockActivityAssignment
from app.models.activity_record import DailyActivityRecord
from app.models.carbon import CarbonCalculationRecord
from app.services.carbon_engine import calculate_emissions, standardize_unit

logger = logging.getLogger("campuscarbon.seed_demo")

# 14 consecutive days ending today (2026-10-11)
START_DATE = date(2026, 9, 28)
END_DATE = date(2026, 10, 11)

# Activities with verified emission factors that should be calculated by the engine
CALCULABLE_ACTIVITIES = {
    "ELEC_CONSUMPTION",
    "SOLAR_ELEC_GEN",
    "FUEL_LPG",
    "FUEL_DIESEL",
    "GEN_DIESEL_CONSUMPTION",
    "TRANS_FUEL_CONSUMPTION",
    "WASTE_FOOD",
    "WASTE_VEGETABLE",
    "WASTE_PAPER",
    "WASTE_PLASTIC",
}

# Deterministic variations across 14 days (index 0 to 13)
# Allows slight natural fluctuation while keeping calculations reproducible
DAY_FACTORS = [
    0.98, 1.02, 1.00, 0.97, 1.03, 0.99, 1.01,
    1.00, 0.98, 1.02, 0.97, 1.04, 0.99, 1.01
]


def seed_14_day_demo_data(db: Session) -> Dict[str, Any]:
    """Execute idempotent seeding of 14 days of realistic demonstration data."""
    logger.info("Starting 14-day multi-domain demo data seeding (%s to %s)...", START_DATE, END_DATE)

    # 1. Cache blocks and activity definitions
    blocks_by_code: Dict[str, CampusBlock] = {
        b.code: b for b in db.query(CampusBlock).filter(CampusBlock.is_active == True).all()
    }
    activities_by_code: Dict[str, ActivityDefinition] = {
        a.code: a for a in db.query(ActivityDefinition).all()
    }

    if not blocks_by_code or not activities_by_code:
        raise RuntimeError("Campus blocks or activity definitions missing. Run baseline migrations and seeders first.")

    days_count = (END_DATE - START_DATE).days + 1
    dates: List[date] = [START_DATE + timedelta(days=i) for i in range(days_count)]

    activity_records_created = 0
    activity_records_existing = 0
    calculations_created = 0
    calculations_existing = 0

    # Ensure required assignments exist for all blocks
    _ensure_block_assignments(db, blocks_by_code, activities_by_code)

    for day_idx, current_date in enumerate(dates):
        is_weekend = current_date.weekday() >= 5  # Saturday=5, Sunday=6
        var_factor = DAY_FACTORS[day_idx % len(DAY_FACTORS)]

        # ---------------------------------------------------------------------
        # A. Academic Blocks (AB1, AB2, AB3, AB4, CIR, MBA)
        # ---------------------------------------------------------------------
        academic_specs = [
            ("AB1", 650.0, 160.0, 12.0, 22.0, 8.0, 210.0),  # (code, weekday_elec, weekend_elec, water, paper, plastic, solar)
            ("AB2", 570.0, 140.0, 10.0, 18.0, 6.0, 0.0),
            ("AB3", 610.0, 150.0, 11.0, 20.0, 7.0, 195.0),
            ("AB4", 530.0, 130.0, 9.0, 16.0, 5.0, 0.0),
            ("CIR", 410.0, 110.0, 7.0, 14.0, 4.0, 0.0),
            ("MBA", 350.0, 95.0, 6.0, 12.0, 4.0, 0.0),
        ]

        for code, wkday_e, wkend_e, water, paper, plastic, solar in academic_specs:
            blk = blocks_by_code.get(code)
            if not blk:
                continue

            # Electricity
            elec_qty = round((wkend_e if is_weekend else wkday_e) * var_factor, 1)
            ar, calc = _create_or_get_activity_and_calc(
                db, blk, activities_by_code["ELEC_CONSUMPTION"], current_date, elec_qty, "kWh"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1
            if calc: calculations_created += 1
            else: calculations_existing += 1

            # Solar PV (AB1 & AB3)
            if solar > 0:
                solar_qty = round(solar * (0.95 if is_weekend else 1.0) * var_factor, 1)
                ar, calc = _create_or_get_activity_and_calc(
                    db, blk, activities_by_code["SOLAR_ELEC_GEN"], current_date, solar_qty, "kWh",
                    meter_boundary="solar_generation"
                )
                if ar: activity_records_created += 1
                else: activity_records_existing += 1
                if calc: calculations_created += 1
                else: calculations_existing += 1

            # Water
            water_qty = round((3.0 if is_weekend else water) * var_factor, 1)
            ar, _ = _create_or_get_activity_and_calc(
                db, blk, activities_by_code["WATER_CONSUMPTION"], current_date, water_qty, "m3"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1

            # Paper & Plastic Solid Waste
            paper_qty = round((3.0 if is_weekend else paper) * var_factor, 1)
            ar, calc = _create_or_get_activity_and_calc(
                db, blk, activities_by_code["WASTE_PAPER"], current_date, paper_qty, "kg"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1
            if calc: calculations_created += 1
            else: calculations_existing += 1

            plastic_qty = round((1.5 if is_weekend else plastic) * var_factor, 1)
            ar, calc = _create_or_get_activity_and_calc(
                db, blk, activities_by_code["WASTE_PLASTIC"], current_date, plastic_qty, "kg"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1
            if calc: calculations_created += 1
            else: calculations_existing += 1

        # ---------------------------------------------------------------------
        # B. Hostels (10 Residential Hostels)
        # ---------------------------------------------------------------------
        hostel_codes = [
            "HST-GARGI", "HST-VASHITA", "HST-ADITHI", "HST-AGASTYA", "HST-BHRIGHU",
            "HST-KASHYAPA", "HST-MYTHRI", "HST-NACHIKETAS", "HST-SAVITHRI", "HST-YAGNAVALKYA"
        ]

        for h_idx, h_code in enumerate(hostel_codes):
            blk = blocks_by_code.get(h_code)
            if not blk:
                continue

            base_elec = 420.0 + (h_idx * 15.0)
            elec_qty = round((base_elec * 1.1 if is_weekend else base_elec) * var_factor, 1)
            ar, calc = _create_or_get_activity_and_calc(
                db, blk, activities_by_code["ELEC_CONSUMPTION"], current_date, elec_qty, "kWh"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1
            if calc: calculations_created += 1
            else: calculations_existing += 1

            # Water
            water_qty = round((30.0 + (h_idx * 1.5)) * var_factor, 1)
            ar, _ = _create_or_get_activity_and_calc(
                db, blk, activities_by_code["WATER_CONSUMPTION"], current_date, water_qty, "m3"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1

            # Plastic & Paper
            plastic_qty = round((9.0 + (h_idx * 0.5)) * var_factor, 1)
            ar, calc = _create_or_get_activity_and_calc(
                db, blk, activities_by_code["WASTE_PLASTIC"], current_date, plastic_qty, "kg"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1
            if calc: calculations_created += 1
            else: calculations_existing += 1

            paper_qty = round((6.0 + (h_idx * 0.4)) * var_factor, 1)
            ar, calc = _create_or_get_activity_and_calc(
                db, blk, activities_by_code["WASTE_PAPER"], current_date, paper_qty, "kg"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1
            if calc: calculations_created += 1
            else: calculations_existing += 1

        # ---------------------------------------------------------------------
        # C. Kitchen and Canteens (CUL-CK, CUL-PRASADA, CUL-SAMUDHRA, CUL-SOPANAM)
        # ---------------------------------------------------------------------
        kitchen_specs = [
            ("CUL-CK", 310.0, 54.0, 150.0, 78.0, 22.0),       # (code, elec, lpg, food_waste, veg_waste, water)
            ("CUL-PRASADA", 185.0, 22.0, 42.0, 18.0, 8.0),
            ("CUL-SAMUDHRA", 195.0, 24.0, 45.0, 20.0, 9.0),
            ("CUL-SOPANAM", 170.0, 19.0, 38.0, 16.0, 7.5),
        ]

        for k_code, elec, lpg, food_w, veg_w, water in kitchen_specs:
            blk = blocks_by_code.get(k_code)
            if not blk:
                continue

            # Electricity
            elec_qty = round(elec * var_factor, 1)
            ar, calc = _create_or_get_activity_and_calc(
                db, blk, activities_by_code["ELEC_CONSUMPTION"], current_date, elec_qty, "kWh"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1
            if calc: calculations_created += 1
            else: calculations_existing += 1

            # LPG Fuel
            lpg_qty = round(lpg * var_factor, 1)
            ar, calc = _create_or_get_activity_and_calc(
                db, blk, activities_by_code["FUEL_LPG"], current_date, lpg_qty, "kg"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1
            if calc: calculations_created += 1
            else: calculations_existing += 1

            # Cooked Food Waste
            food_qty = round(food_w * var_factor, 1)
            ar, calc = _create_or_get_activity_and_calc(
                db, blk, activities_by_code["WASTE_FOOD"], current_date, food_qty, "kg"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1
            if calc: calculations_created += 1
            else: calculations_existing += 1

            # Vegetable Waste
            veg_qty = round(veg_w * var_factor, 1)
            ar, calc = _create_or_get_activity_and_calc(
                db, blk, activities_by_code["WASTE_VEGETABLE"], current_date, veg_qty, "kg"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1
            if calc: calculations_created += 1
            else: calculations_existing += 1

            # Water
            water_qty = round(water * var_factor, 1)
            ar, _ = _create_or_get_activity_and_calc(
                db, blk, activities_by_code["WATER_CONSUMPTION"], current_date, water_qty, "m3"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1

        # ---------------------------------------------------------------------
        # D. Campus Transportation Facility (OPS-TRANS)
        # ---------------------------------------------------------------------
        trans_blk = blocks_by_code.get("OPS-TRANS")
        if trans_blk:
            # Electricity for charging & depot
            ar, calc = _create_or_get_activity_and_calc(
                db, trans_blk, activities_by_code["ELEC_CONSUMPTION"], current_date, 52.0 * var_factor, "kWh"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1
            if calc: calculations_created += 1
            else: calculations_existing += 1

            # Fleet Diesel Fuel
            diesel_litres = round((28.0 if is_weekend else 64.0) * var_factor, 1)
            ar, calc = _create_or_get_activity_and_calc(
                db, trans_blk, activities_by_code["TRANS_FUEL_CONSUMPTION"], current_date, diesel_litres, "litres"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1
            if calc: calculations_created += 1
            else: calculations_existing += 1

            # Fleet Distance (safeguard demonstration: logged, but NOT calculated)
            dist_km = round((110.0 if is_weekend else 260.0) * var_factor, 1)
            ar, _ = _create_or_get_activity_and_calc(
                db, trans_blk, activities_by_code["TRANS_DISTANCE"], current_date, dist_km, "km"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1

        # ---------------------------------------------------------------------
        # E. Emergency Generators (UTL-GEN)
        # ---------------------------------------------------------------------
        gen_blk = blocks_by_code.get("UTL-GEN")
        if gen_blk:
            # Standby electricity
            ar, calc = _create_or_get_activity_and_calc(
                db, gen_blk, activities_by_code["ELEC_CONSUMPTION"], current_date, 18.0 * var_factor, "kWh"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1
            if calc: calculations_created += 1
            else: calculations_existing += 1

            # Two maintenance run days in 14 days (Oct 2 and Oct 8)
            if current_date in (date(2026, 10, 2), date(2026, 10, 8)):
                gen_diesel = 45.0 if current_date == date(2026, 10, 2) else 48.0
                ar, calc = _create_or_get_activity_and_calc(
                    db, gen_blk, activities_by_code["GEN_DIESEL_CONSUMPTION"], current_date, gen_diesel, "litres"
                )
                if ar: activity_records_created += 1
                else: activity_records_existing += 1
                if calc: calculations_created += 1
                else: calculations_existing += 1

                # Gross generator electricity output (safeguard demonstration: logged, not calculated)
                gen_kwh = 142.0 if current_date == date(2026, 10, 2) else 152.0
                ar, _ = _create_or_get_activity_and_calc(
                    db, gen_blk, activities_by_code["GEN_ELECTRICITY_GENERATED"], current_date, gen_kwh, "kWh"
                )
                if ar: activity_records_created += 1
                else: activity_records_existing += 1

        # ---------------------------------------------------------------------
        # F. Sewage Treatment Plants (UTL-STP1, UTL-STP2)
        # ---------------------------------------------------------------------
        for stp_code, aerator_kwh, treated_m3 in [("UTL-STP1", 165.0, 105.0), ("UTL-STP2", 145.0, 92.0)]:
            stp_blk = blocks_by_code.get(stp_code)
            if not stp_blk:
                continue

            # Electricity for continuous aeration
            ar, calc = _create_or_get_activity_and_calc(
                db, stp_blk, activities_by_code["ELEC_CONSUMPTION"], current_date, round(aerator_kwh * var_factor, 1), "kWh"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1
            if calc: calculations_created += 1
            else: calculations_existing += 1

            # Treated volume (safeguard demonstration: volume alone lacks BOD/COD lab telemetry, not calculated)
            ar, _ = _create_or_get_activity_and_calc(
                db, stp_blk, activities_by_code["STP_WASTEWATER_TREATED"], current_date, round(treated_m3 * var_factor, 1), "m3"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1

        # ---------------------------------------------------------------------
        # G. Central Waste Collection Yard (UTL-CWC)
        # ---------------------------------------------------------------------
        cwc_blk = blocks_by_code.get("UTL-CWC")
        if cwc_blk:
            # Yard lighting / bailer power
            ar, calc = _create_or_get_activity_and_calc(
                db, cwc_blk, activities_by_code["ELEC_CONSUMPTION"], current_date, 32.0 * var_factor, "kWh"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1
            if calc: calculations_created += 1
            else: calculations_existing += 1

            # Internal transfers (safeguard demonstration: transfer activities excluded from emissions)
            ar, _ = _create_or_get_activity_and_calc(
                db, cwc_blk, activities_by_code["CWC_WASTE_RECEIVED"], current_date, round(180.0 * var_factor, 1), "kg",
                is_transfer=True
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1

            ar, _ = _create_or_get_activity_and_calc(
                db, cwc_blk, activities_by_code["CWC_WASTE_DISPATCHED"], current_date, round(165.0 * var_factor, 1), "kg",
                is_transfer=True
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1

        # ---------------------------------------------------------------------
        # H. Faculty Quarters (RES-FQ) & Fabrication Facility (OPS-FAB)
        # ---------------------------------------------------------------------
        fq_blk = blocks_by_code.get("RES-FQ")
        if fq_blk:
            ar, calc = _create_or_get_activity_and_calc(
                db, fq_blk, activities_by_code["ELEC_CONSUMPTION"], current_date, round(210.0 * var_factor, 1), "kWh"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1
            if calc: calculations_created += 1
            else: calculations_existing += 1

            ar, _ = _create_or_get_activity_and_calc(
                db, fq_blk, activities_by_code["WATER_CONSUMPTION"], current_date, round(16.0 * var_factor, 1), "m3"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1

        fab_blk = blocks_by_code.get("OPS-FAB")
        if fab_blk:
            fab_elec = 45.0 if is_weekend else 140.0
            ar, calc = _create_or_get_activity_and_calc(
                db, fab_blk, activities_by_code["ELEC_CONSUMPTION"], current_date, round(fab_elec * var_factor, 1), "kWh"
            )
            if ar: activity_records_created += 1
            else: activity_records_existing += 1
            if calc: calculations_created += 1
            else: calculations_existing += 1

    db.commit()
    logger.info(
        "Multi-day demo seeding complete: %s activity records created (%s existing), %s calculations created (%s existing).",
        activity_records_created, activity_records_existing, calculations_created, calculations_existing
    )
    return {
        "status": "success",
        "date_range": f"{START_DATE} to {END_DATE}",
        "days_covered": days_count,
        "activity_records_created": activity_records_created,
        "activity_records_existing": activity_records_existing,
        "carbon_calculations_created": calculations_created,
        "carbon_calculations_existing": calculations_existing,
    }


def _create_or_get_activity_and_calc(
    db: Session,
    block: CampusBlock,
    activity_def: ActivityDefinition,
    reporting_date: date,
    quantity: float,
    unit: str,
    meter_boundary: Optional[str] = None,
    is_transfer: bool = False,
) -> tuple[Optional[DailyActivityRecord], Optional[CarbonCalculationRecord]]:
    """Helper to idempotently create a daily activity record and calculate emissions."""
    reading_identifier = "simulated_demo_daily"

    # Check if an official reading already exists for this block/activity/date
    # If official reading exists (e.g. for AB1 on 2026-10-11), do not overwrite or duplicate
    official_rec = db.query(DailyActivityRecord).filter(
        DailyActivityRecord.block_id == block.id,
        DailyActivityRecord.activity_id == activity_def.id,
        DailyActivityRecord.reporting_date == reporting_date,
        DailyActivityRecord.reading_identifier == "official_daily_total",
    ).first()

    if official_rec:
        # Check if calculated
        existing_calc = db.query(CarbonCalculationRecord).filter(
            CarbonCalculationRecord.block_id == block.id,
            CarbonCalculationRecord.activity_code == activity_def.code,
            CarbonCalculationRecord.reporting_date == reporting_date,
            CarbonCalculationRecord.is_superseded == False,
        ).first()
        return None, None if existing_calc else None

    # Check existing simulated record
    act_rec = db.query(DailyActivityRecord).filter(
        DailyActivityRecord.block_id == block.id,
        DailyActivityRecord.activity_id == activity_def.id,
        DailyActivityRecord.reporting_date == reporting_date,
        DailyActivityRecord.reading_identifier == reading_identifier,
    ).first()

    record_created = None
    if not act_rec:
        # Standardize unit
        std_qty, _, std_unit = standardize_unit(
            activity_code=activity_def.code,
            quantity=quantity,
            source_unit=unit,
            target_unit=activity_def.default_unit,
            db=db,
        )

        act_rec = DailyActivityRecord(
            id=str(uuid.uuid4()),
            organization_id=block.campus.organization_id if block.campus else "org-01",
            campus_id=block.campus_id,
            block_id=block.id,
            activity_id=activity_def.id,
            reporting_date=reporting_date,
            quantity=quantity,
            unit=unit,
            standardized_quantity=std_qty,
            standardized_unit=std_unit,
            data_status="simulated",
            measurement_method="simulated_benchmark",
            reading_identifier=reading_identifier,
            is_daily_total=True,
            source_reference="SIM-AMRITA-DEMO-2026",
            meter_boundary=meter_boundary,
            is_transfer=is_transfer,
            notes="[DEMO-DATA] Multi-day simulated demonstration record",
            version=1,
        )
        db.add(act_rec)
        db.flush()
        record_created = act_rec

    calc_created = None
    # Calculate emissions if activity is calculable and quantity > 0
    if activity_def.code in CALCULABLE_ACTIVITIES and quantity > 0 and not is_transfer:
        existing_calc = db.query(CarbonCalculationRecord).filter(
            CarbonCalculationRecord.block_id == block.id,
            CarbonCalculationRecord.activity_code == activity_def.code,
            CarbonCalculationRecord.reporting_date == reporting_date,
            CarbonCalculationRecord.is_superseded == False,
        ).first()

        if not existing_calc:
            try:
                calc_rec = calculate_emissions(
                    db=db,
                    block_id=block.id,
                    reporting_date=reporting_date,
                    activity_code=activity_def.code,
                    activity_record_id=act_rec.id,
                )
                calc_created = calc_rec
            except Exception as e:
                logger.warning(
                    "Calculation skipped for %s on %s at %s: %s",
                    activity_def.code, reporting_date, block.name, e
                )

    return record_created, calc_created


def _ensure_block_assignments(
    db: Session,
    blocks: Dict[str, CampusBlock],
    activities: Dict[str, ActivityDefinition]
):
    """Ensure all required block-activity assignments are enabled."""
    common_acts = ["ELEC_CONSUMPTION", "WATER_CONSUMPTION", "WASTE_PAPER", "WASTE_PLASTIC"]
    for blk in blocks.values():
        for act_code in common_acts:
            if act_code in activities:
                _create_assignment_if_missing(db, blk.id, activities[act_code].id)

    # Specific assignments
    specifics = [
        ("CUL-CK", ["FUEL_LPG", "WASTE_FOOD", "WASTE_VEGETABLE"]),
        ("CUL-PRASADA", ["FUEL_LPG", "WASTE_FOOD", "WASTE_VEGETABLE"]),
        ("CUL-SAMUDHRA", ["FUEL_LPG", "WASTE_FOOD", "WASTE_VEGETABLE"]),
        ("CUL-SOPANAM", ["FUEL_LPG", "WASTE_FOOD", "WASTE_VEGETABLE"]),
        ("AB1", ["SOLAR_ELEC_GEN"]),
        ("AB3", ["SOLAR_ELEC_GEN"]),
        ("OPS-TRANS", ["TRANS_FUEL_CONSUMPTION", "TRANS_DISTANCE"]),
        ("UTL-GEN", ["GEN_DIESEL_CONSUMPTION", "GEN_ELECTRICITY_GENERATED"]),
        ("UTL-STP1", ["STP_WASTEWATER_TREATED"]),
        ("UTL-STP2", ["STP_WASTEWATER_TREATED"]),
        ("UTL-CWC", ["CWC_WASTE_RECEIVED", "CWC_WASTE_DISPATCHED"]),
    ]
    for b_code, act_list in specifics:
        blk = blocks.get(b_code)
        if blk:
            for a_code in act_list:
                if a_code in activities:
                    _create_assignment_if_missing(db, blk.id, activities[a_code].id)

    db.flush()


def _create_assignment_if_missing(db: Session, block_id: str, activity_id: str):
    exists = db.query(BlockActivityAssignment).filter(
        BlockActivityAssignment.block_id == block_id,
        BlockActivityAssignment.activity_id == activity_id,
    ).first()
    if not exists:
        db.add(BlockActivityAssignment(
            id=str(uuid.uuid4()),
            block_id=block_id,
            activity_id=activity_id,
            is_enabled=True,
            notes="Configured benchmark activity assignment",
        ))
