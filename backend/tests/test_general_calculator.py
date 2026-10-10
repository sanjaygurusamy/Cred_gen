"""
Tests for Component 1: General Carbon Footprint Calculator & SDG Recommendations.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_general_calculator_empty():
    response = client.post("/api/calculator/general", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["total_emissions_kg"] == 0.0
    assert data["total_emissions_tco2e"] == 0.0
    assert data["scope_breakdown"]["scope_1_kg"] == 0.0
    assert data["scope_breakdown"]["scope_2_kg"] == 0.0
    assert data["scope_breakdown"]["scope_3_kg"] == 0.0
    assert len(data["itemized_breakdown"]) == 0

def test_general_calculator_multi_activity_and_sdg_mapping():
    payload = {
        "grid_electricity_kwh": 1000.0,
        "solar_offset_kwh": 100.0,
        "lpg_kg": 50.0,
        "diesel_liters": 20.0,
        "bus_km": 100.0,
        "car_km": 50.0,
        "two_wheeler_km": 200.0,
        "ev_km": 40.0,
        "water_m3": 80.0,
        "food_waste_kg": 60.0,
        "food_waste_pathway": "landfill",
        "paper_waste_kg": 25.0,
        "paper_waste_pathway": "recycled",
        "plastic_waste_kg": 15.0,
        "plastic_waste_pathway": "recycled",
        "dry_waste_kg": 30.0
    }
    response = client.post("/api/calculator/general", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    # Check emissions totals
    assert data["total_emissions_kg"] > 0
    assert data["total_emissions_tco2e"] == round(data["total_emissions_kg"] / 1000.0, 5)
    
    # Check Scope classification
    assert data["scope_breakdown"]["scope_1_kg"] > 0 # LPG, diesel, bus
    assert data["scope_breakdown"]["scope_2_kg"] > 0 # Net grid electricity, EV
    assert data["scope_breakdown"]["scope_3_kg"] > 0 # Water, car, 2-wheeler, waste
    
    # Check itemized breakdown
    categories = {item["category"] for item in data["itemized_breakdown"]}
    assert "Electricity" in categories
    assert "Thermal & Fuels" in categories
    assert "Transportation" in categories
    assert "Water & Wastewater" in categories
    assert "Waste Generation" in categories
    
    # Check SDG Recommendations
    assert len(data["sdg_recommendations"]) > 0
    sdg_numbers = set()
    for rec in data["sdg_recommendations"]:
        assert rec["potential_reduction_kg"] > 0
        assert rec["title"] != ""
        for s in rec["sdgs"]:
            sdg_numbers.add(s["sdg_number"])
            
    # Must include core SDGs (7, 12, 13, etc.)
    assert 7 in sdg_numbers or 12 in sdg_numbers or 13 in sdg_numbers

def test_general_calculator_circular_synergy():
    # Kitchen with both high LPG and high food waste
    payload = {
        "lpg_kg": 80.0,
        "food_waste_kg": 120.0,
        "food_waste_pathway": "landfill"
    }
    response = client.post("/api/calculator/general", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    # Must propose biogas circular economy recommendation
    biogas_recs = [r for r in data["sdg_recommendations"] if "Biogas" in r["title"]]
    assert len(biogas_recs) == 1
    rec = biogas_recs[0]
    assert rec["primary_sdg"] == 12
    assert rec["potential_reduction_kg"] > 0
