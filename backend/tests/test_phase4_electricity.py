import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker
from sqlalchemy import delete, select

from app.main import app
from app.core.database import get_engine
from app.services.seed_phase2 import seed_phase2_inventory
from app.services.seed_phase3 import seed_phase3_catalogue
from app.services.seed_phase4 import seed_phase4_baselines
from app.models.block import CampusBlock
from app.models.baseline import ElectricityBaseline, DailyElectricityEstimate
from app.models.activity_record import DailyActivityRecord

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_phase4_db():
    """Ensure database has blocks, catalogue, and baseline seeds initialized."""
    engine = get_engine()
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        seed_phase2_inventory(db)
        seed_phase3_catalogue(db)
        seed_phase4_baselines(db)
        yield db
    finally:
        db.close()


def test_seed_phase4_baselines_and_idempotence():
    """Verify that Phase 4 seeding creates baselines and is 100% idempotent."""
    response = client.post("/api/v1/electricity/baselines/seed")
    assert response.status_code == 200
    data = response.json()
    # On repeat, 0 new baselines created, all 27 blocks already configured
    assert data["created_baselines"] == 0
    assert data["skipped_blocks"] >= 27


def test_list_baselines_and_get_for_block():
    """Verify retrieving baselines and getting active baseline for Academic Block 1."""
    # 1. Get AB1 block
    resp = client.get("/api/v1/blocks?search=AB1")
    assert resp.status_code == 200
    blocks = resp.json()["items"]
    assert len(blocks) >= 1
    ab1 = blocks[0]

    # 2. Get active baseline for AB1
    resp_b = client.get(f"/api/v1/electricity/baselines/block/{ab1['id']}")
    assert resp_b.status_code == 200
    baseline = resp_b.json()
    assert baseline["block_id"] == ab1["id"]
    assert baseline["version"] >= 1
    assert baseline["is_active"] is True
    assert len(baseline["items"]) == 3  # Standard classroom, AC classroom, Computer lab
    assert baseline["total_default_daily_kwh"] > 0.0

    types = {item["facility_type"] for item in baseline["items"]}
    assert "standard_classroom" in types
    assert "ac_classroom" in types
    assert "computer_lab_ac" in types


def test_baseline_validation_constraints():
    """Verify explicit validation: rejection of non-existent blocks, zero/negative quantities, power, or hours > 24."""
    # 1. Non-existent block
    resp = client.post("/api/v1/electricity/baselines", json={
        "block_id": "non-existent-block-id",
        "name": "Invalid Baseline",
        "effective_start_date": "2026-01-01",
        "items": [
            {
                "facility_type": "standard_classroom",
                "facility_name": "Test Room",
                "quantity": 1,
                "average_power_kw": 1.0,
                "default_operating_hours": 8.0
            }
        ]
    })
    assert resp.status_code == 404

    # 2. Quantity < 1
    resp_qty = client.post("/api/v1/electricity/baselines", json={
        "block_id": "valid-id",
        "name": "Invalid",
        "effective_start_date": "2026-01-01",
        "items": [
            {
                "facility_type": "standard_classroom",
                "facility_name": "Test Room",
                "quantity": 0,
                "average_power_kw": 1.0,
                "default_operating_hours": 8.0
            }
        ]
    })
    assert resp_qty.status_code == 422

    # 3. Operating hours > 24
    resp_hrs = client.post("/api/v1/electricity/baselines", json={
        "block_id": "valid-id",
        "name": "Invalid",
        "effective_start_date": "2026-01-01",
        "items": [
            {
                "facility_type": "standard_classroom",
                "facility_name": "Test Room",
                "quantity": 5,
                "average_power_kw": 1.0,
                "default_operating_hours": 25.0
            }
        ]
    })
    assert resp_hrs.status_code == 422


def test_baseline_versioning_and_historical_preservation():
    """Verify revising a baseline creates a new version, closes old, and preserves historical baseline data."""
    # Get Gargi Hostel
    resp = client.get("/api/v1/blocks?search=HST-GARGI")
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) >= 1
    gargi = items[0]

    # Reset any previous test versions so test starts cleanly from v1
    engine = get_engine()
    SessionLocal = sessionmaker(bind=engine)
    with SessionLocal() as db:
        db.execute(
            delete(ElectricityBaseline).where(
                ElectricityBaseline.block_id == gargi["id"],
                ElectricityBaseline.version > 1
            )
        )
        v1 = db.execute(
            select(ElectricityBaseline).where(
                ElectricityBaseline.block_id == gargi["id"],
                ElectricityBaseline.version == 1
            )
        ).scalars().first()
        if v1:
            v1.is_active = True
            v1.effective_end_date = None
        db.commit()

    # Get active baseline (v1)
    b_curr = client.get(f"/api/v1/electricity/baselines/block/{gargi['id']}").json()
    assert b_curr["version"] == 1

    # Revise baseline to v2 with adjusted power rating
    rev_payload = {
        "name": "Gargi Hostel Revised Efficiency Baseline v2",
        "description": "Upgraded LED fixtures and BLDC ceiling fans",
        "source_rationale": "Energy conservation retrofit audit Q1 2026",
        "effective_start_date": "2026-07-01",
        "items": [
            {
                "facility_type": "hostel_room",
                "facility_name": "Standard Student Room (BLDC Retrofit)",
                "quantity": 130,
                "average_power_kw": 0.22,  # Reduced from 0.35
                "default_operating_hours": 14.0,
                "source_rationale": "BLDC fans reduce power from 75W to 28W per fan"
            },
            {
                "facility_type": "hostel_dining",
                "facility_name": "Hostel Dining & Common Hall",
                "quantity": 1,
                "average_power_kw": 5.5,
                "default_operating_hours": 6.0,
                "source_rationale": "LED retrofit in mess hall"
            }
        ]
    }
    resp_rev = client.post(f"/api/v1/electricity/baselines/{b_curr['id']}/revise", json=rev_payload)
    assert resp_rev.status_code == 200
    b_new = resp_rev.json()
    assert b_new["version"] == 2
    assert b_new["is_active"] is True
    assert b_new["total_default_daily_kwh"] < b_curr["total_default_daily_kwh"]

    # Verify all versions endpoint returns all versions
    resp_vers = client.get(f"/api/v1/electricity/baselines/block/{gargi['id']}/versions")
    assert resp_vers.status_code == 200
    versions = resp_vers.json()
    assert len(versions) >= 2
    assert versions[0]["version"] == 2

    # Verify historical previous version remains intact and inactive
    hist_old = client.get(f"/api/v1/electricity/baselines/{b_curr['id']}").json()
    assert hist_old["version"] == 1
    assert hist_old["is_active"] is False


def test_deterministic_daily_electricity_calculation_and_preview():
    """
    Verify calculation formula:
    E_daily = SUM(quantity * average_power_kW * operating_hours)
    """
    resp = client.get("/api/v1/blocks?search=AB2")
    ab2 = resp.json()["items"][0]

    calc_payload = {
        "block_id": ab2["id"],
        "reporting_date": "2026-10-15",
        "custom_items": [
            {
                "facility_type": "standard_classroom",
                "facility_name": "Classroom",
                "quantity": 10,
                "average_power_kw": 1.5,
                "operating_hours": 6.0
            },
            {
                "facility_type": "computer_lab_ac",
                "facility_name": "Lab",
                "quantity": 2,
                "average_power_kw": 10.0,
                "operating_hours": 5.0
            }
        ]
    }
    # Expected: (10 * 1.5 * 6.0 = 90.0) + (2 * 10.0 * 5.0 = 100.0) = 190.0 kWh
    resp_calc = client.post("/api/v1/electricity/estimates/calculate", json=calc_payload)
    assert resp_calc.status_code == 200
    preview = resp_calc.json()
    assert preview["total_estimated_kwh"] == 190.0
    assert len(preview["items"]) == 2
    assert preview["items"][0]["estimated_kwh"] == 90.0
    assert preview["items"][1]["estimated_kwh"] == 100.0


def test_holiday_and_zero_consumption_handling():
    """Verify that holiday or genuine zero-consumption days return 0.0 kWh and are flagged."""
    resp = client.get("/api/v1/blocks?search=AB1")
    ab1 = resp.json()["items"][0]

    calc_payload = {
        "block_id": ab1["id"],
        "reporting_date": "2026-10-02",  # Gandhi Jayanti holiday
        "operational_mode": "holiday",
        "is_holiday": True,
        "is_zero_consumption": True
    }
    resp_calc = client.post("/api/v1/electricity/estimates/calculate", json=calc_payload)
    assert resp_calc.status_code == 200
    preview = resp_calc.json()
    assert preview["total_estimated_kwh"] == 0.0
    assert preview["is_holiday"] is True
    assert preview["is_zero_consumption"] is True


def test_save_daily_estimate_and_prevent_duplicate_without_replace():
    """Verify saving a daily estimate, duplicate prevention, and explicit recalculation."""
    resp = client.get("/api/v1/blocks?search=AB4")
    ab4 = resp.json()["items"][0]
    test_date = date(2026, 11, 15)

    # Clean up test date if present from previous run
    engine = get_engine()
    SessionLocal = sessionmaker(bind=engine)
    with SessionLocal() as db:
        db.execute(
            delete(DailyElectricityEstimate).where(
                DailyElectricityEstimate.block_id == ab4["id"],
                DailyElectricityEstimate.reporting_date == test_date
            )
        )
        db.commit()

    save_payload = {
        "block_id": ab4["id"],
        "reporting_date": str(test_date),
        "operational_mode": "regular_day",
        "notes": "Regular academic day instructions",
        "items": [
            {
                "facility_type": "standard_classroom",
                "facility_name": "Standard Classroom",
                "quantity": 22,
                "average_power_kw": 1.2,
                "operating_hours": 8.0
            }
        ],
        "replace_existing": False
    }
    # Expected: 22 * 1.2 * 8.0 = 211.2 kWh
    resp_save = client.post("/api/v1/electricity/estimates", json=save_payload)
    assert resp_save.status_code == 201
    est = resp_save.json()
    assert est["total_estimated_kwh"] == 211.2
    assert est["version"] == 1

    # Attempt duplicate without replace_existing -> 409 Conflict
    resp_dup = client.post("/api/v1/electricity/estimates", json=save_payload)
    assert resp_dup.status_code == 409

    # Recalculate with replace_existing=True and revised hours
    recalc_payload = dict(save_payload)
    recalc_payload["replace_existing"] = True
    recalc_payload["items"][0]["operating_hours"] = 6.0  # 22 * 1.2 * 6.0 = 158.4 kWh
    resp_recalc = client.post("/api/v1/electricity/estimates", json=recalc_payload)
    assert resp_recalc.status_code in (200, 201)
    est_updated = resp_recalc.json()
    assert est_updated["total_estimated_kwh"] == 158.4
    assert est_updated["version"] == 2


def test_record_actual_electricity_with_meter_boundaries():
    """Verify recording actual electricity reading with meter boundary and start/end numbers."""
    resp = client.get("/api/v1/blocks?search=AB4")
    ab4 = resp.json()["items"][0]
    test_date = date(2026, 11, 15)

    # Clean up test date records
    engine = get_engine()
    SessionLocal = sessionmaker(bind=engine)
    with SessionLocal() as db:
        db.execute(
            delete(DailyActivityRecord).where(
                DailyActivityRecord.block_id == ab4["id"],
                DailyActivityRecord.reporting_date == test_date
            )
        )
        db.commit()

    # 1. Grid import reading
    grid_payload = {
        "block_id": ab4["id"],
        "reporting_date": str(test_date),
        "quantity_kwh": 165.0,
        "meter_boundary": "grid_import",
        "measurement_method": "utility_meter",
        "source_reference": "EM-AB4-MAIN-01",
        "meter_start_reading": 14000.0,
        "meter_end_reading": 14165.0,
        "reading_identifier": "official_daily_total",
        "notes": "Main utility digital incomer"
    }
    resp_act = client.post("/api/v1/electricity/actual", json=grid_payload)
    assert resp_act.status_code == 201
    act = resp_act.json()
    assert act["quantity_kwh"] == 165.0
    assert act["meter_boundary"] == "grid_import"
    assert act["meter_start_reading"] == 14000.0
    assert act["meter_end_reading"] == 14165.0

    # 2. Solar generation reading (distinguishable boundary on same block & day)
    solar_payload = {
        "block_id": ab4["id"],
        "reporting_date": str(test_date),
        "quantity_kwh": 52.0,
        "meter_boundary": "solar_generation",
        "measurement_method": "sub_meter",
        "source_reference": "PV-INV-AB4-01",
        "reading_identifier": "rooftop_solar_inverter",
        "notes": "Rooftop solar string inverter generation"
    }
    resp_sol = client.post("/api/v1/electricity/actual", json=solar_payload)
    assert resp_sol.status_code == 201
    sol = resp_sol.json()
    assert sol["quantity_kwh"] == 52.0
    assert sol["meter_boundary"] == "solar_generation"


def test_estimated_vs_actual_comparison_and_zero_division():
    """
    Verify estimated vs actual comparison:
    - Absolute difference: Actual - Estimated
    - Percentage difference: (Actual - Estimated) / Estimated * 100
    - Missing actual data is not treated as zero
    - Zero estimate does not trigger division by zero
    - Solar generation is reported distinctly and not subtracted automatically
    """
    resp = client.get("/api/v1/blocks?search=AB4")
    ab4 = resp.json()["items"][0]

    # Clean up test date window: 2026-11-15 to 2026-11-17
    engine = get_engine()
    SessionLocal = sessionmaker(bind=engine)
    with SessionLocal() as db:
        db.execute(
            delete(DailyElectricityEstimate).where(
                DailyElectricityEstimate.block_id == ab4["id"],
                DailyElectricityEstimate.reporting_date.in_([
                    date(2026, 11, 15), date(2026, 11, 16), date(2026, 11, 17)
                ])
            )
        )
        db.execute(
            delete(DailyActivityRecord).where(
                DailyActivityRecord.block_id == ab4["id"],
                DailyActivityRecord.reporting_date.in_([
                    date(2026, 11, 15), date(2026, 11, 16), date(2026, 11, 17)
                ])
            )
        )
        db.commit()

    # Day 1 (2026-11-15): Estimate = 158.4, Actual = 165.0, Solar = 52.0
    client.post("/api/v1/electricity/estimates", json={
        "block_id": ab4["id"],
        "reporting_date": "2026-11-15",
        "items": [
            {
                "facility_type": "standard_classroom",
                "facility_name": "Standard Classroom",
                "quantity": 22,
                "average_power_kw": 1.2,
                "operating_hours": 6.0
            }
        ]
    })
    client.post("/api/v1/electricity/actual", json={
        "block_id": ab4["id"],
        "reporting_date": "2026-11-15",
        "quantity_kwh": 165.0,
        "meter_boundary": "grid_import"
    })
    client.post("/api/v1/electricity/actual", json={
        "block_id": ab4["id"],
        "reporting_date": "2026-11-15",
        "quantity_kwh": 52.0,
        "meter_boundary": "solar_generation",
        "reading_identifier": "rooftop_solar_inverter"
    })

    # Day 3 (2026-11-17): Zero estimate (holiday), no actual
    client.post("/api/v1/electricity/estimates", json={
        "block_id": ab4["id"],
        "reporting_date": "2026-11-17",
        "is_holiday": True,
        "is_zero_consumption": True,
        "items": []
    })

    # Query comparison
    resp_comp = client.get(f"/api/v1/electricity/comparison?block_id={ab4['id']}&start_date=2026-11-15&end_date=2026-11-17")
    assert resp_comp.status_code == 200
    data = resp_comp.json()
    assert data["total_days"] == 3
    assert data["matched_days"] == 1
    assert data["estimated_only_days"] == 1
    assert data["missing_days"] == 1

    # Day 1: Matched
    rec_day1 = data["records"][0]
    assert rec_day1["reporting_date"] == "2026-11-15"
    assert rec_day1["has_estimate"] is True
    assert rec_day1["has_actual"] is True
    assert rec_day1["estimated_kwh"] == 158.4
    assert rec_day1["actual_kwh"] == 165.0
    # Difference = 165.0 - 158.4 = 6.6
    assert rec_day1["difference_kwh"] == 6.6
    # % diff = (165.0 - 158.4) / 158.4 * 100 = 4.17%
    assert rec_day1["percentage_difference"] == 4.17
    assert rec_day1["recommended_reporting_value"] == 165.0
    assert rec_day1["recommended_reporting_source"] == "measured"
    assert rec_day1["status"] == "matched"
    assert rec_day1["solar_generation_kwh"] == 52.0

    # Day 2 (2026-11-16): Missing both estimate and actual -> missing_both
    rec_day2 = data["records"][1]
    assert rec_day2["reporting_date"] == "2026-11-16"
    assert rec_day2["has_estimate"] is False
    assert rec_day2["has_actual"] is False
    assert rec_day2["actual_kwh"] is None
    assert rec_day2["estimated_kwh"] is None
    assert rec_day2["difference_kwh"] is None
    assert rec_day2["status"] == "missing_both"

    # Day 3 (2026-11-17): Zero estimate -> No division by zero!
    rec_day3 = data["records"][2]
    assert rec_day3["reporting_date"] == "2026-11-17"
    assert rec_day3["has_estimate"] is True
    assert rec_day3["has_actual"] is False
    assert rec_day3["estimated_kwh"] == 0.0
    assert rec_day3["actual_kwh"] is None
    assert rec_day3["percentage_difference"] is None
    assert rec_day3["status"] == "estimated_only"
