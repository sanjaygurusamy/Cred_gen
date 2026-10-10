import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.core.database import get_db, get_engine
from app.services.seed_phase2 import seed_phase2_inventory, COIMBATORE_27_BLOCKS
from app.models.block import CampusBlock
from app.models.campus import Campus
from app.schemas.block import BlockCategory

client = TestClient(app)


@pytest.fixture(scope="module")
def seeded_db():
    """Ensure database is seeded with Phase 2 canonical inventory."""
    engine = get_engine()
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        seed_result = seed_phase2_inventory(db)
        yield db, seed_result
    finally:
        db.close()


def test_seed_phase2_specification_count(seeded_db):
    """Verify that exactly 27 blocks are defined and seeded."""
    db, result = seeded_db
    assert result["blocks_specification_count"] == 27
    assert result["total_campus_blocks"] >= 27
    assert len(COIMBATORE_27_BLOCKS) == 27


def test_seed_category_breakdown(seeded_db):
    """Verify exact count per category in canonical specification."""
    db, result = seeded_db
    cat_counts = result["category_counts"]
    assert cat_counts[BlockCategory.ACADEMIC.value] == 6
    assert cat_counts[BlockCategory.HOSTEL.value] == 10
    assert cat_counts[BlockCategory.FACULTY_QUARTERS.value] == 1
    assert cat_counts[BlockCategory.KITCHEN_CANTEEN.value] == 4
    assert cat_counts[BlockCategory.TRANSPORTATION.value] == 1
    assert cat_counts[BlockCategory.SEWAGE_TREATMENT.value] == 2
    assert cat_counts[BlockCategory.OTHER_FACILITY.value] == 3


def test_seed_idempotence():
    """Verify that calling seed_phase2_inventory multiple times creates 0 duplicate blocks."""
    from app.core.database import get_engine
    from sqlalchemy.orm import sessionmaker
    engine = get_engine()
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        # Run first time
        res1 = seed_phase2_inventory(db)
        total_after_first = res1["total_campus_blocks"]

        # Run second time
        res2 = seed_phase2_inventory(db)
        assert res2["blocks_created"] == 0
        assert res2["blocks_existing"] == 27
        assert res2["total_campus_blocks"] == total_after_first
    finally:
        db.close()


def test_no_excluded_blocks_exist(seeded_db):
    """Verify explicitly that no excluded or legacy mock blocks exist in database."""
    db, _ = seeded_db
    excluded_names = [
        "Main Academic Block",
        "Hostel Block A",
        "Central Canteen",
        "Mechanical Workshop",
        "Sewage"
    ]
    for excluded in excluded_names:
        block = db.query(CampusBlock).filter(CampusBlock.name == excluded).first()
        assert block is None, f"Forbidden block '{excluded}' was found in database!"


def test_api_list_campuses():
    """Verify GET /api/v1/campuses returns Coimbatore Campus with 27 blocks."""
    response = client.get("/api/v1/campuses")
    assert response.status_code == 200
    campuses = response.json()
    assert len(campuses) >= 1
    cbe = next((c for c in campuses if c["code"] == "CBE"), None)
    assert cbe is not None
    assert cbe["name"] == "Coimbatore Campus"
    assert cbe["block_count"] >= 27


def test_api_list_blocks_total():
    """Verify GET /api/v1/blocks returns all 27 blocks for Coimbatore Campus."""
    response = client.get("/api/v1/blocks")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 27
    assert len(data["items"]) >= 27
    assert len(data["category_summary"]) == 7


def test_api_filter_blocks_by_category():
    """Verify category filtering on GET /api/v1/blocks?category=..."""
    # Academic (6)
    res_acad = client.get("/api/v1/blocks?category=academic")
    assert res_acad.status_code == 200
    acad_data = res_acad.json()
    assert acad_data["total"] == 6
    acad_names = {b["name"] for b in acad_data["items"]}
    expected_acad = {"Academic Block 1", "Academic Block 2", "Academic Block 3", "Academic Block 4", "MBA", "CIR"}
    assert acad_names == expected_acad

    # Hostels (10)
    res_hostel = client.get("/api/v1/blocks?category=hostel")
    assert res_hostel.status_code == 200
    hostel_data = res_hostel.json()
    assert hostel_data["total"] == 10
    hostel_names = {b["name"] for b in hostel_data["items"]}
    expected_hostels = {
        "Gargi", "Mythri", "Adithi", "Savithri", "Kashyapa",
        "Vashita", "Agastya", "Bhrighu", "Yagnavalkya", "Nachiketas"
    }
    assert hostel_names == expected_hostels

    # Faculty Quarters (1)
    res_fq = client.get("/api/v1/blocks?category=faculty_quarters")
    assert res_fq.status_code == 200
    assert res_fq.json()["total"] == 1
    assert res_fq.json()["items"][0]["name"] == "Faculty Quarters"

    # Kitchens and Canteens (4)
    res_cul = client.get("/api/v1/blocks?category=kitchen_canteen")
    assert res_cul.status_code == 200
    cul_names = {b["name"] for b in res_cul.json()["items"]}
    assert cul_names == {"Central Kitchen", "Sopanam Canteen", "Prasada Canteen", "Samudhra Canteen"}

    # Transportation (1)
    res_trans = client.get("/api/v1/blocks?category=transportation")
    assert res_trans.status_code == 200
    assert res_trans.json()["total"] == 1
    assert res_trans.json()["items"][0]["name"] == "Transportation"

    # Sewage Treatment (2)
    res_stp = client.get("/api/v1/blocks?category=sewage_treatment")
    assert res_stp.status_code == 200
    stp_names = {b["name"] for b in res_stp.json()["items"]}
    assert stp_names == {"Sewage Treatment Plant 1", "Sewage Treatment Plant 2"}

    # Other Facilities (3)
    res_oth = client.get("/api/v1/blocks?category=other_facility")
    assert res_oth.status_code == 200
    oth_names = {b["name"] for b in res_oth.json()["items"]}
    assert oth_names == {"Central Waste Collection", "Fabrication", "Generator"}


def test_api_search_blocks():
    """Verify text search by name and code."""
    res = client.get("/api/v1/blocks?search=Gargi")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 1
    assert items[0]["name"] == "Gargi"
    assert items[0]["code"] == "HST-GARGI"

    res_code = client.get("/api/v1/blocks?search=STP")
    assert res_code.status_code == 200
    assert len(res_code.json()["items"]) == 2


def test_api_block_crud_lifecycle():
    """Verify full CRUD lifecycle with constraint validation for a new block."""
    # 1. Fetch campus ID
    campuses_res = client.get("/api/v1/campuses")
    assert campuses_res.status_code == 200
    campus_id = campuses_res.json()[0]["id"]

    test_block_payload = {
        "campus_id": campus_id,
        "name": "Phase 2 Temp Test Pavillion",
        "code": "TST-PAV-01",
        "category": "academic",
        "description": "Temporary pavilion for testing CRUD lifecycle.",
        "floor_area_sqm": 1250.0,
        "occupant_capacity": 150,
        "is_active": True
    }

    # CREATE
    create_res = client.post("/api/v1/blocks", json=test_block_payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    block_id = created_data["id"]
    assert created_data["name"] == test_block_payload["name"]
    assert created_data["code"] == test_block_payload["code"]

    # DUPLICATE CREATION CONFLICT (409)
    dup_res = client.post("/api/v1/blocks", json=test_block_payload)
    assert dup_res.status_code == 409

    # READ BY ID
    get_res = client.get(f"/api/v1/blocks/{block_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == block_id

    # UPDATE
    update_payload = {
        "floor_area_sqm": 1500.0,
        "occupant_capacity": 200,
        "description": "Updated pavilion description."
    }
    update_res = client.put(f"/api/v1/blocks/{block_id}", json=update_payload)
    assert update_res.status_code == 200
    assert update_res.json()["floor_area_sqm"] == 1500.0
    assert update_res.json()["occupant_capacity"] == 200

    # DELETE
    del_res = client.delete(f"/api/v1/blocks/{block_id}")
    assert del_res.status_code == 200

    # CONFIRM 404 AFTER DELETION
    get_after_del = client.get(f"/api/v1/blocks/{block_id}")
    assert get_after_del.status_code == 404
