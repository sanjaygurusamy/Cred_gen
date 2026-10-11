import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_list_campus_sdgs():
    """Verify predefined SDG mapping catalog returns goals 6, 7, 11, 12, 13, 15."""
    resp = client.get("/api/v1/sustainability/sdgs")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 6

    goal_nums = {g["goal_number"] for g in data}
    assert {6, 7, 11, 12, 13, 15}.issubset(goal_nums)

    # Check SDG 7 details
    sdg7 = next(g for g in data if g["goal_number"] == 7)
    assert "Affordable & Clean Energy" in sdg7["title"]
    assert len(sdg7["indicators"]) >= 2
    assert any("7.2.1" in ind["indicator_code"] for ind in sdg7["indicators"])


def test_sustainability_summary_endpoint():
    """Verify comprehensive sustainability summary metrics."""
    resp = client.get("/api/v1/sustainability/summary")
    assert resp.status_code == 200
    data = resp.json()

    assert "campus_name" in data
    assert "gross_emissions_t_co2e" in data
    assert "biological_sequestration_t_co2e" in data
    assert "standing_trees_count" in data
    assert "data_quality_breakdown" in data
    assert "sdgs" in data
    assert "priority_recommendations" in data

    # Check data quality categorization
    dq = data["data_quality_breakdown"]
    assert "verified" in dq
    assert "awaiting_verification" in dq
    assert dq["verified"] + dq["awaiting_verification"] + dq.get("user_provided", 0) >= 27


def test_sustainability_recommendations_and_status_update():
    """Verify recommendations listing and status transitions."""
    resp = client.get("/api/v1/sustainability/recommendations")
    assert resp.status_code == 200
    recs = resp.json()
    assert len(recs) >= 5

    # Check a high-priority recommendation
    hvac_rec = next((r for r in recs if "HVAC" in r["title"] or "Solar" in r["title"]), recs[0])
    assert hvac_rec["potential_co2e_reduction_t_year"] > 0
    assert hvac_rec["calculation_rationale"] is not None

    # Update status
    patch_resp = client.patch(
        f"/api/v1/sustainability/recommendations/{hvac_rec['id']}/status",
        json={"status": "approved"}
    )
    assert patch_resp.status_code == 200
    updated = patch_resp.json()
    assert updated["status"] == "approved"


def test_institutional_evidence_registry():
    """Verify institutional assessment evidence for NIRF and NAAC accreditation."""
    resp = client.get("/api/v1/sustainability/evidence")
    assert resp.status_code == 200
    evidence = resp.json()
    assert len(evidence) >= 4

    refs = [e["reference_number"] for e in evidence]
    assert any("TANGEDCO" in r for r in refs)
    assert any("STP" in r for r in refs)
    assert any("TREE" in r for r in refs)

    for item in evidence:
        assert item["verification_status"] in {"verified", "user_provided", "awaiting_verification"}
        assert len(item["framework_tags"]) >= 1


def test_campus_blocks_extended_fields_and_update():
    """Verify campus blocks return extended operational details and support edits."""
    resp = client.get("/api/v1/blocks?search=AB1")
    assert resp.status_code == 200
    blocks = resp.json()["items"]
    assert len(blocks) >= 1
    ab1 = blocks[0]

    # Verify extended attributes
    assert ab1["area_unit"] == "sqm"
    assert "floors_count" in ab1
    assert "verification_status" in ab1
    assert ab1["verification_status"] in {"verified", "awaiting_verification", "user_provided"}

    # Update operational attributes via PUT
    update_resp = client.put(
        f"/api/v1/blocks/{ab1['id']}",
        json={
            "operating_hours_per_day": 13.5,
            "current_occupancy": 2900,
            "verification_status": "verified"
        }
    )
    assert update_resp.status_code == 200
    updated_block = update_resp.json()
    assert updated_block["operating_hours_per_day"] == 13.5
    assert updated_block["current_occupancy"] == 2900
    assert updated_block["verification_status"] == "verified"
