"""
Targeted tests for Trees, Plantation & Carbon Sequestration Engine.
Organization: Amrita Vishwa Vidyapeetham | Coimbatore Campus (AVV-CBE)
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.tree_service import calculate_tree_sequestration, HEALTH_MULTIPLIERS

client = TestClient(app)


def test_calculate_tree_sequestration_formula():
    """Verifies that tree sequestration strictly applies allometric age and health multipliers."""
    # Mature tree: 10 trees, 22.0 kg/yr, Healthy (1.0x) -> 220.0 kg
    kg, method = calculate_tree_sequestration(10, 22.0, "Healthy", 15.0)
    assert kg == 220.0
    assert "220.0 kg CO2e/yr" in method

    # Diseased tree (0.4x multiplier): 10 trees, 22.0 kg/yr -> 88.0 kg
    kg_diseased, _ = calculate_tree_sequestration(10, 22.0, "Diseased", 15.0)
    assert kg_diseased == 88.0

    # Young sapling (<4 years capped at 5.0 kg/yr): 10 trees -> 50.0 kg
    kg_young, _ = calculate_tree_sequestration(10, 22.0, "Healthy", 2.0)
    assert kg_young == 50.0

    # Dead tree (0.0x multiplier): -> 0.0 kg
    kg_dead, _ = calculate_tree_sequestration(10, 22.0, "Dead/Senescent", 20.0)
    assert kg_dead == 0.0


def test_get_trees_summary_endpoint():
    """Verifies the sequestration summary returns comprehensive campus metrics."""
    resp = client.get("/api/v1/trees/summary")
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_trees"] >= 1000
    assert data["total_green_spaces"] >= 5
    assert data["total_green_space_area_sqm"] > 0
    assert data["total_annual_sequestration_kg_co2e"] > 0
    assert data["total_annual_sequestration_t_co2e"] == round(data["total_annual_sequestration_kg_co2e"] / 1000.0, 4)
    assert data["average_survival_rate_percent"] > 90.0
    assert len(data["species_breakdown"]) > 0
    assert len(data["green_space_breakdown"]) > 0
    assert "IPCC 2006 AFOLU" in data["methodology"]


def test_tree_inventory_crud():
    """Tests creating, reading, updating and deleting tree inventory items."""
    # 1. Create a tree inventory stand
    new_tree = {
        "species_name": "Pongamia pinnata",
        "common_name": "Indian Beech / Pongamia",
        "tree_count": 15,
        "planting_year": 2018,
        "estimated_age_years": 6.0,
        "health_status": "Healthy",
        "location_description": "North Gate Avenue Walkway",
        "data_source": "Estate Office 2024 Audit",
        "verification_status": "Verified Field Census",
        "sequestration_rate_kg_year": 18.5
    }
    create_resp = client.post("/api/v1/trees/inventory", json=new_tree)
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["common_name"] == "Indian Beech / Pongamia"
    assert created["tree_count"] == 15
    # Age 6 is between 4 and 10, so rate is min(18.5, 14.0) = 14.0 * 15 = 210.0
    assert created["annual_sequestration_kg"] == 210.0
    tree_id = created["id"]

    # 2. Update health to Diseased
    update_resp = client.put(f"/api/v1/trees/inventory/{tree_id}", json={"health_status": "Diseased"})
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["health_status"] == "Diseased"
    assert updated["annual_sequestration_kg"] == 84.0  # 210 * 0.4 = 84.0

    # 3. Delete the tree inventory
    del_resp = client.delete(f"/api/v1/trees/inventory/{tree_id}")
    assert del_resp.status_code == 204


def test_plantation_records_validation():
    """Verifies that plantation records validate that surviving saplings cannot exceed planted saplings."""
    invalid_record = {
        "event_name": "Invalid Drive",
        "plantation_date": "2024-06-01",
        "species_planted": "Neem",
        "saplings_planted": 50,
        "saplings_surviving": 60,  # Invalid: > 50
        "plantation_location": "Hostel Zone"
    }
    resp = client.post("/api/v1/trees/plantations", json=invalid_record)
    assert resp.status_code == 400
    assert "Surviving saplings cannot exceed" in resp.json()["detail"]

    # Valid record
    valid_record = {
        "event_name": "Eco Club Drive 2024",
        "plantation_date": "2024-06-01",
        "species_planted": "Neem",
        "saplings_planted": 50,
        "saplings_surviving": 48,
        "plantation_location": "Academic Block 1 East Lawn",
        "maintenance_notes": "Drip irrigated daily"
    }
    valid_resp = client.post("/api/v1/trees/plantations", json=valid_record)
    assert valid_resp.status_code == 201
    data = valid_resp.json()
    assert data["survival_rate_percent"] == 96.0


def test_green_spaces_endpoints():
    """Verifies green spaces listing and creation."""
    spaces_resp = client.get("/api/v1/trees/green-spaces")
    assert spaces_resp.status_code == 200
    spaces = spaces_resp.json()
    assert len(spaces) >= 5
    codes = [s["code"] for s in spaces]
    assert "GS-MIYAWAKI-01" in codes
    assert "GS-HERBAL-01" in codes
