import pytest
from datetime import date
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db, get_engine
from app.services.seed_phase2 import seed_phase2_inventory
from app.services.seed_phase3 import seed_phase3_catalogue, CANONICAL_ACTIVITIES
from app.models.activity import ActivityDefinition, BlockActivityAssignment
from app.models.activity_record import DailyActivityRecord
from app.models.block import CampusBlock

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_phase3_db():
    """Ensure Phase 2 blocks and Phase 3 catalogue and assignments are seeded."""
    engine = get_engine()
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        seed_phase2_inventory(db)
        seed_phase3_catalogue(db)
        yield db
    finally:
        db.close()


def test_catalogue_definitions_count(setup_db=None):
    """Verify that all canonical activities are seeded into the database catalogue."""
    response = client.get("/api/v1/activities")
    assert response.status_code == 200
    activities = response.json()
    assert len(activities) >= 28

    codes = {a["code"] for a in activities}
    assert "ELEC_CONSUMPTION" in codes
    assert "WATER_CONSUMPTION" in codes
    assert "WASTE_FOOD" in codes
    assert "WASTE_VEGETABLE" in codes
    assert "WASTE_PAPER" in codes
    assert "FUEL_LPG" in codes
    assert "FUEL_DIESEL" in codes
    assert "TRANS_DISTANCE" in codes
    assert "TRANS_FUEL_CONSUMPTION" in codes
    assert "STP_WASTEWATER_TREATED" in codes
    assert "STP_SLUDGE_GENERATED" in codes
    assert "GEN_DIESEL_CONSUMPTION" in codes
    assert "GEN_ELECTRICITY_GENERATED" in codes
    assert "FAB_METAL_CONSUMPTION" in codes
    assert "EWASTE_GENERATED" in codes
    assert "EWASTE_RECYCLED" in codes
    assert "CWC_WASTE_RECEIVED" in codes


def test_catalogue_idempotence():
    """Verify that running seed_phase3_catalogue repeatedly produces 0 duplicate records."""
    from sqlalchemy.orm import sessionmaker
    engine = get_engine()
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        res = seed_phase3_catalogue(db)
        assert res["activities_created"] == 0
        assert res["assignments_created"] == 0
        assert res["total_activities"] >= 28
    finally:
        db.close()


def test_block_activity_assignments_policy():
    """
    Verify institutional segregation policy across facility types:
    - Academic blocks: electricity, water, paper waste. NO generator diesel fuel.
    - Hostels: food waste at source, water, electricity. NO LPG, NO generator diesel.
    - Central Kitchen: LPG, food waste, vegetable waste, diesel (boiler).
    - Canteens (Sopanam): LPG, food waste, vegetable waste. NO diesel!
    - Sewage Treatment Plants: STP1 & STP2 separate, sludge, wastewater. NO diesel, NO biogas.
    - Fabrication: metal consumption, scrap. NO fuels.
    """
    from sqlalchemy.orm import sessionmaker
    engine = get_engine()
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        # 1. Academic Block 1
        ab1 = db.query(CampusBlock).filter(CampusBlock.name == "Academic Block 1").first()
        assert ab1 is not None
        ab1_res = client.get(f"/api/v1/blocks/{ab1.id}/activities")
        assert ab1_res.status_code == 200
        ab1_codes = {a["activity"]["code"] for a in ab1_res.json()["activities"]}
        assert "ELEC_CONSUMPTION" in ab1_codes
        assert "WATER_CONSUMPTION" in ab1_codes
        assert "WASTE_PAPER" in ab1_codes
        assert "GEN_DIESEL_CONSUMPTION" not in ab1_codes, "Academic blocks must NOT have generator diesel assigned!"
        assert "FUEL_LPG" not in ab1_codes

        # 2. Hostels (Gargi)
        gargi = db.query(CampusBlock).filter(CampusBlock.name == "Gargi").first()
        assert gargi is not None
        gargi_res = client.get(f"/api/v1/blocks/{gargi.id}/activities")
        gargi_codes = {a["activity"]["code"] for a in gargi_res.json()["activities"]}
        assert "WASTE_FOOD" in gargi_codes, "Hostels must record food waste at source!"
        assert "FUEL_LPG" not in gargi_codes, "Hostels must NOT have LPG assigned by default!"
        assert "GEN_DIESEL_CONSUMPTION" not in gargi_codes

        # 3. Central Kitchen
        ck = db.query(CampusBlock).filter(CampusBlock.name == "Central Kitchen").first()
        ck_res = client.get(f"/api/v1/blocks/{ck.id}/activities")
        ck_codes = {a["activity"]["code"] for a in ck_res.json()["activities"]}
        assert "FUEL_LPG" in ck_codes
        assert "WASTE_FOOD" in ck_codes
        assert "WASTE_VEGETABLE" in ck_codes
        assert "FUEL_DIESEL" in ck_codes

        # 4. Sopanam Canteen (No diesel!)
        sopanam = db.query(CampusBlock).filter(CampusBlock.name == "Sopanam Canteen").first()
        sop_res = client.get(f"/api/v1/blocks/{sopanam.id}/activities")
        sop_codes = {a["activity"]["code"] for a in sop_res.json()["activities"]}
        assert "FUEL_LPG" in sop_codes
        assert "WASTE_FOOD" in sop_codes
        assert "FUEL_DIESEL" not in sop_codes, "Canteens must NOT have diesel assigned!"

        # 5. Sewage Treatment Plants (Separate, no diesel, no biogas)
        stp1 = db.query(CampusBlock).filter(CampusBlock.name == "Sewage Treatment Plant 1").first()
        stp2 = db.query(CampusBlock).filter(CampusBlock.name == "Sewage Treatment Plant 2").first()
        assert stp1.id != stp2.id
        stp1_res = client.get(f"/api/v1/blocks/{stp1.id}/activities")
        stp1_codes = {a["activity"]["code"] for a in stp1_res.json()["activities"]}
        assert "STP_WASTEWATER_TREATED" in stp1_codes
        assert "STP_SLUDGE_GENERATED" in stp1_codes
        assert "GEN_DIESEL_CONSUMPTION" not in stp1_codes
        assert "FUEL_DIESEL" not in stp1_codes

        # 6. Fabrication (No fuel)
        fab = db.query(CampusBlock).filter(CampusBlock.name == "Fabrication").first()
        fab_res = client.get(f"/api/v1/blocks/{fab.id}/activities")
        fab_codes = {a["activity"]["code"] for a in fab_res.json()["activities"]}
        assert "FAB_METAL_CONSUMPTION" in fab_codes
        assert "FAB_METAL_SCRAP" in fab_codes
        assert "FUEL_DIESEL" not in fab_codes
        assert "FUEL_PETROL" not in fab_codes
    finally:
        db.close()


def test_create_daily_record_with_unit_conversion():
    """Verify that a daily record converts non-standard units to standardized units correctly."""
    from sqlalchemy.orm import sessionmaker
    engine = get_engine()
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        # Water in litres -> standardized to m3 (5000 litres = 5.0 m3)
        ab1 = db.query(CampusBlock).filter(CampusBlock.name == "Academic Block 1").first()
        water_act = db.query(ActivityDefinition).filter(ActivityDefinition.code == "WATER_CONSUMPTION").first()

        test_payload = {
            "block_id": ab1.id,
            "activity_id": water_act.id,
            "reporting_date": "2026-10-15",
            "quantity": 5000.0,
            "unit": "litres",
            "data_status": "measured",
            "measurement_method": "utility_meter",
            "reading_identifier": "official_daily_total",
            "is_daily_total": True,
            "notes": "Testing unit conversion from litres to m3"
        }

        res = client.post("/api/v1/activity-records", json=test_payload)
        assert res.status_code == 201
        data = res.json()
        rec_id = data["id"]
        assert data["quantity"] == 5000.0
        assert data["unit"] == "litres"
        assert data["standardized_quantity"] == 5.0
        assert data["standardized_unit"] == "m3"
        assert data["version"] == 1

        # Clean up
        client.delete(f"/api/v1/activity-records/{rec_id}")
    finally:
        db.close()


def test_reject_negative_quantity_and_unsupported_unit():
    """Verify that negative quantities and unsupported units are rejected."""
    from sqlalchemy.orm import sessionmaker
    engine = get_engine()
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        ab1 = db.query(CampusBlock).filter(CampusBlock.name == "Academic Block 1").first()
        elec_act = db.query(ActivityDefinition).filter(ActivityDefinition.code == "ELEC_CONSUMPTION").first()

        # Negative quantity
        neg_payload = {
            "block_id": ab1.id,
            "activity_id": elec_act.id,
            "reporting_date": "2026-10-16",
            "quantity": -250.0,
            "unit": "kWh",
            "data_status": "measured",
            "measurement_method": "utility_meter",
            "reading_identifier": "official_daily_total"
        }
        res_neg = client.post("/api/v1/activity-records", json=neg_payload)
        assert res_neg.status_code in [422, 400]

        # Unsupported unit (e.g. "bushels" for electricity)
        bad_unit_payload = {
            "block_id": ab1.id,
            "activity_id": elec_act.id,
            "reporting_date": "2026-10-16",
            "quantity": 250.0,
            "unit": "bushels",
            "data_status": "measured",
            "measurement_method": "utility_meter",
            "reading_identifier": "official_daily_total"
        }
        res_bad_unit = client.post("/api/v1/activity-records", json=bad_unit_payload)
        assert res_bad_unit.status_code == 422
    finally:
        db.close()


def test_duplicate_submission_prevention_and_sub_readings():
    """
    Verify duplicate policy:
    1. Duplicate official daily total on same (block, activity, date) is rejected (409 Conflict).
    2. Legitimate sub-readings with distinct reading_identifiers are accepted.
    """
    from sqlalchemy.orm import sessionmaker
    engine = get_engine()
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        gen = db.query(CampusBlock).filter(CampusBlock.name == "Generator").first()
        gen_fuel = db.query(ActivityDefinition).filter(ActivityDefinition.code == "GEN_DIESEL_CONSUMPTION").first()

        # Reading 1: Official Total
        official_payload = {
            "block_id": gen.id,
            "activity_id": gen_fuel.id,
            "reporting_date": "2026-10-20",
            "quantity": 180.0,
            "unit": "litres",
            "data_status": "measured",
            "measurement_method": "logbook",
            "reading_identifier": "official_daily_total",
            "is_daily_total": True
        }
        r1 = client.post("/api/v1/activity-records", json=official_payload)
        assert r1.status_code == 201
        rec1_id = r1.json()["id"]

        # Duplicate official reading -> must be rejected with 409 Conflict
        r1_dup = client.post("/api/v1/activity-records", json=official_payload)
        assert r1_dup.status_code == 409
        assert "already exists" in r1_dup.json()["detail"]

        # Legitimate sub-readings on same date (Run 1 and Run 2) -> must succeed!
        sub_run1 = {
            "block_id": gen.id,
            "activity_id": gen_fuel.id,
            "reporting_date": "2026-10-20",
            "quantity": 100.0,
            "unit": "litres",
            "data_status": "measured",
            "measurement_method": "logbook",
            "reading_identifier": "outage_run_morning",
            "is_daily_total": False
        }
        r_sub1 = client.post("/api/v1/activity-records", json=sub_run1)
        assert r_sub1.status_code == 201
        rec2_id = r_sub1.json()["id"]

        sub_run2 = {
            "block_id": gen.id,
            "activity_id": gen_fuel.id,
            "reporting_date": "2026-10-20",
            "quantity": 80.0,
            "unit": "litres",
            "data_status": "measured",
            "measurement_method": "logbook",
            "reading_identifier": "outage_run_evening",
            "is_daily_total": False
        }
        r_sub2 = client.post("/api/v1/activity-records", json=sub_run2)
        assert r_sub2.status_code == 201
        rec3_id = r_sub2.json()["id"]

        # Clean up test records
        client.delete(f"/api/v1/activity-records/{rec1_id}")
        client.delete(f"/api/v1/activity-records/{rec2_id}")
        client.delete(f"/api/v1/activity-records/{rec3_id}")
    finally:
        db.close()


def test_record_update_and_versioning():
    """Verify updating a record recomputes standardized quantity and increments version."""
    from sqlalchemy.orm import sessionmaker
    engine = get_engine()
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        fq = db.query(CampusBlock).filter(CampusBlock.name == "Faculty Quarters").first()
        lpg = db.query(ActivityDefinition).filter(ActivityDefinition.code == "FUEL_LPG").first()

        # Create record with 1 cylinder (19 kg)
        create_payload = {
            "block_id": fq.id,
            "activity_id": lpg.id,
            "reporting_date": "2026-10-22",
            "quantity": 1.0,
            "unit": "cylinders_19kg",
            "data_status": "measured",
            "measurement_method": "invoice",
            "reading_identifier": "official_daily_total"
        }
        res = client.post("/api/v1/activity-records", json=create_payload)
        assert res.status_code == 201
        rec = res.json()
        assert rec["standardized_quantity"] == 19.0
        assert rec["version"] == 1

        # Update to 2 cylinders
        update_payload = {
            "quantity": 2.0,
            "unit": "cylinders_19kg",
            "notes": "Audited delivery count correction"
        }
        up_res = client.put(f"/api/v1/activity-records/{rec['id']}", json=update_payload)
        assert up_res.status_code == 200
        up_data = up_res.json()
        assert up_data["quantity"] == 2.0
        assert up_data["standardized_quantity"] == 38.0
        assert up_data["version"] == 2
        assert up_data["notes"] == "Audited delivery count correction"

        # Clean up
        client.delete(f"/api/v1/activity-records/{rec['id']}")
    finally:
        db.close()


def test_ewaste_generation_vs_recycling_transfer():
    """Verify that E-waste generation is distinct from recycling and transfer is marked properly."""
    from sqlalchemy.orm import sessionmaker
    engine = get_engine()
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        cir = db.query(CampusBlock).filter(CampusBlock.name == "CIR").first()
        ewaste_gen = db.query(ActivityDefinition).filter(ActivityDefinition.code == "EWASTE_GENERATED").first()

        cwc = db.query(CampusBlock).filter(CampusBlock.name == "Central Waste Collection").first()
        ewaste_rec = db.query(ActivityDefinition).filter(ActivityDefinition.code == "EWASTE_RECYCLED").first()

        # 1. CIR generates 45 kg e-waste
        p_gen = {
            "block_id": cir.id,
            "activity_id": ewaste_gen.id,
            "reporting_date": "2026-10-25",
            "quantity": 45.0,
            "unit": "kg",
            "data_status": "measured",
            "measurement_method": "logbook",
            "reading_identifier": "official_daily_total"
        }
        res_g = client.post("/api/v1/activity-records", json=p_gen)
        assert res_g.status_code == 201
        assert res_g.json()["is_transfer"] is False

        # 2. Central Waste Collection dispatches 45 kg to authorized recycler
        p_rec = {
            "block_id": cwc.id,
            "activity_id": ewaste_rec.id,
            "reporting_date": "2026-10-26",
            "quantity": 45.0,
            "unit": "kg",
            "data_status": "measured",
            "measurement_method": "weighbridge",
            "reading_identifier": "official_daily_total",
            "destination_details": "GreenE-Waste Authorized Dismantlers, Coimbatore",
            "source_reference": "MANIFEST-EWASTE-2026-001"
        }
        res_r = client.post("/api/v1/activity-records", json=p_rec)
        assert res_r.status_code == 201
        assert res_r.json()["is_transfer"] is True
        assert res_r.json()["destination_details"] == "GreenE-Waste Authorized Dismantlers, Coimbatore"

        # Clean up
        client.delete(f"/api/v1/activity-records/{res_g.json()['id']}")
        client.delete(f"/api/v1/activity-records/{res_r.json()['id']}")
    finally:
        db.close()
