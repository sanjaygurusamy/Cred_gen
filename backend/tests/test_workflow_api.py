"""
Test Suite for End-to-End API Workflows, RBAC, Campus Isolation, and Post-Measurement Outcomes.
Covers:
- Test 10: Scenario comparisons
- Test 11: Recommendation approval and rejection
- Test 13: Role-based access control (RBAC)
- Test 14: Campus-level data isolation
- Test 15: Post-implementation comparison
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from app.main import app
from app.database import Base, engine, SessionLocal
from app.seed_data import seed_database
from app.models import Recommendation, Element, ActivityRecord, ReductionScenario, InterventionImplementation

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db)
    db.close()

def test_recommendation_generate_and_list():
    """Requirement 1 & API generate/list workflow."""
    headers = {
        "x-user-id": "sustainability_admin",
        "x-user-role": "admin",
        "x-campus-id": "green-tech-univ-01"
    }
    # Generate recommendations for Kitchen LPG element
    response = client.post(
        "/api/recommendations/generate",
        json={"campus_id": "green-tech-univ-01", "element_id": "LPG_001", "force_refresh": True},
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    rec_id = data[0]["id"]

    # List recommendations
    list_res = client.get("/api/recommendations?campus_id=green-tech-univ-01", headers=headers)
    assert list_res.status_code == 200
    items = list_res.json()
    assert any(i["id"] == rec_id for i in items)

def test_recommendation_approval_and_rejection():
    """Requirement 11: Recommendation approval and rejection with mandatory reason."""
    headers = {
        "x-user-id": "lead_officer",
        "x-user-role": "admin",
        "x-campus-id": "green-tech-univ-01"
    }
    # List to find an active recommendation
    list_res = client.get("/api/recommendations?campus_id=green-tech-univ-01", headers=headers)
    items = list_res.json()
    assert len(items) > 0
    rec_id = items[0]["id"]

    # 1. Approve
    app_res = client.post(f"/api/recommendations/{rec_id}/approve", headers=headers)
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "approved"
    assert app_res.json()["reviewed_by"] == "lead_officer"

    # 2. Reject requires reason
    fail_rej = client.post(f"/api/recommendations/{rec_id}/reject", json={"reason": ""}, headers=headers)
    assert fail_rej.status_code == 400

    # Reject with valid reason
    rej_res = client.post(
        f"/api/recommendations/{rec_id}/reject",
        json={"reason": "Budget deferred to next academic fiscal cycle."},
        headers=headers
    )
    assert rej_res.status_code == 200
    assert rej_res.json()["status"] == "rejected"
    assert "deferred" in rej_res.json()["rejection_reason"]

def test_role_based_access_control():
    """Requirement 13: Viewer cannot approve, reject, or generate recommendations."""
    viewer_headers = {
        "x-user-id": "student_viewer",
        "x-user-role": "viewer",
        "x-campus-id": "green-tech-univ-01"
    }
    
    # 1. Generate forbidden for viewer
    gen_res = client.post(
        "/api/recommendations/generate",
        json={"campus_id": "green-tech-univ-01", "element_id": "LPG_001"},
        headers=viewer_headers
    )
    assert gen_res.status_code == 403

    # 2. Approve forbidden for viewer
    app_res = client.post("/api/recommendations/any-id/approve", headers=viewer_headers)
    assert app_res.status_code == 403

    # 3. Create scenario forbidden for viewer
    scen_res = client.post(
        "/api/scenarios",
        json={
            "campus_id": "green-tech-univ-01",
            "element_id": "LPG_001",
            "title": "Test Scenario",
            "reduction_percentage_assumption": 10.0
        },
        headers=viewer_headers
    )
    assert scen_res.status_code == 403

def test_campus_level_data_isolation():
    """Requirement 14: Campus-level data isolation."""
    headers_campus_a = {"x-campus-id": "green-tech-univ-01", "x-user-role": "admin"}
    headers_campus_b = {"x-campus-id": "other-campus-99", "x-user-role": "admin"}

    res_a = client.get("/api/recommendations?campus_id=green-tech-univ-01", headers=headers_campus_a)
    assert res_a.status_code == 200
    assert len(res_a.json()) > 0

    # Other campus has zero records
    res_b = client.get("/api/recommendations?campus_id=other-campus-99", headers=headers_campus_b)
    assert res_b.status_code == 200
    assert len(res_b.json()) == 0

def test_scenario_creation_calculation_and_comparison():
    """Requirement 10: Scenario calculation and comparison."""
    admin_headers = {"x-campus-id": "green-tech-univ-01", "x-user-role": "admin", "x-user-id": "admin-1"}

    # 1. Create Scenario A (10% LPG reduction)
    scen_a = client.post(
        "/api/scenarios",
        json={
            "campus_id": "green-tech-univ-01",
            "element_id": "LPG_001",
            "title": "LPG 10% Burner Efficiency",
            "reduction_percentage_assumption": 10.0
        },
        headers=admin_headers
    ).json()
    assert scen_a["results"][0]["potential_reduction_percentage"] == 10.0
    assert scen_a["results"][0]["potential_reduction_kg"] == 23.864

    # 2. Create Scenario B (15% Electricity reduction)
    scen_b = client.post(
        "/api/scenarios",
        json={
            "campus_id": "green-tech-univ-01",
            "element_id": "ELEC_001",
            "title": "Academic LED Retrofit 15%",
            "reduction_percentage_assumption": 15.0
        },
        headers=admin_headers
    ).json()
    assert scen_b["results"][0]["potential_reduction_percentage"] == 15.0

    # 3. Compare Scenarios
    comp_res = client.post(
        "/api/scenarios/compare",
        json={"scenario_ids": [scen_a["id"], scen_b["id"]]},
        headers=admin_headers
    )
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert len(comp_data["scenarios"]) == 2
    assert comp_data["total_potential_reduction_kg"] > 0
    assert comp_data["total_annual_reduction_tco2e"] > 0

def test_post_implementation_comparison():
    """Requirement 15: Post-implementation measurement comparison against baseline and target."""
    admin_headers = {"x-campus-id": "green-tech-univ-01", "x-user-role": "admin", "x-user-id": "facility_chief"}

    # 1. Record implementation
    now = datetime.utcnow()
    imp_res = client.post(
        "/api/interventions/implementation",
        json={
            "campus_id": "green-tech-univ-01",
            "element_id": "LPG_001",
            "title": "High-Efficiency Pre-Mix Burner Installation",
            "implementation_date": (now - timedelta(days=30)).isoformat(),
            "capital_cost": 3500.0,
            "operational_cost_annual": 200.0,
            "notes": "Installed 8 new certified pre-mix burners."
        },
        headers=admin_headers
    )
    assert imp_res.status_code == 200
    imp_id = imp_res.json()["id"]

    # 2. Record empirical post measurement (measured 71 kg/day vs baseline 80 kg/day)
    meas_res = client.post(
        f"/api/interventions/{imp_id}/measurements",
        json={
            "measurement_period_start": (now - timedelta(days=7)).isoformat(),
            "measurement_period_end": now.isoformat(),
            "measured_activity": 71.0,
            "measured_unit": "kg",
            "notes": "Post-retrofit sub-meter verified reading."
        },
        headers=admin_headers
    )
    assert meas_res.status_code == 200
    meas_data = meas_res.json()
    # Baseline was 80 * 2.983 = 238.64 kgCO2e
    # Measured is 71 * 2.983 = 211.793 kgCO2e
    # Actual reduction = 26.847 kgCO2e (11.25%)
    assert meas_data["actual_reduction_kg"] == 26.847
    assert meas_data["actual_reduction_percentage"] == 11.25

    # 3. Compare Outcome
    outcome_res = client.get(f"/api/interventions/{imp_id}/compare-outcome", headers=admin_headers)
    assert outcome_res.status_code == 200
    outcome_data = outcome_res.json()
    assert outcome_data["actual_reduction_kg"] == 26.847
    assert outcome_data["measured_activity"] == 71.0
    assert outcome_data["baseline_activity"] == 80.0
    assert outcome_data["actual_reduction_percentage"] == 11.25
