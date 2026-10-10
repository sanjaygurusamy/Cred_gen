"""
Test Suite for Rule-Based Recommendation Library, Fallback Engine, and SDG Mappings.
Covers:
- Test 1: Recommendation generation with valid input
- Test 2: Missing activity data
- Test 3: Missing emission factors
- Test 6: Rule-based fallback
- Test 12: SDG mappings
"""

import pytest
from app.recommendation_engine.rules_engine import RulesEngine
from app.recommendation_engine.llm_service import LLMService
from app.recommendation_engine.sdg_mapper import SDGMapper, SDG_DEFINITIONS

def test_recommendation_generation_with_valid_input():
    """Requirement 1: Recommendation generation with valid input across categories."""
    element = {
        "id": "LPG_001",
        "name": "Central Kitchen Cooking Range",
        "category": "kitchen_lpg",
        "scope": "Scope 1",
        "campus_id": "green-tech-univ-01",
        "campus_body_id": "body-dining-01"
    }
    activity_records = [
        {
            "activity_value": 80.0,
            "activity_unit": "kg",
            "value_type": "measured",
            "data_quality": "high"
        }
    ]
    emission_factors = [
        {
            "factor_value": 2.983,
            "factor_unit": "kgCO2e/kg",
            "source": "DEFRA 2024"
        }
    ]
    
    recs = RulesEngine.evaluate_element(element, activity_records, emission_factors)
    assert len(recs) >= 2
    assert recs[0]["element_id"] == "LPG_001"
    assert recs[0]["status"] == "pending_review"
    assert recs[0]["source"] == "rule_based"
    assert "sdgs" in recs[0]
    assert len(recs[0]["required_additional_info"]) > 0

def test_missing_activity_data_requires_assessment():
    """Requirement 2: Missing activity data flags recommendation as requiring assessment."""
    element = {
        "id": "TRANS_NEW",
        "name": "Unmetered Campus Tractor",
        "category": "transportation",
        "scope": "Scope 1",
        "campus_id": "green-tech-univ-01"
    }
    # No activity records available
    activity_records = []
    emission_factors = [{"factor_value": 2.687, "factor_unit": "kgCO2e/liter"}]
    
    recs = RulesEngine.evaluate_element(element, activity_records, emission_factors)
    assert len(recs) > 0
    # Must be marked requires_assessment because activity data is missing!
    assert recs[0]["status"] == "requires_assessment"
    assert "additional measurement verification required" in recs[0]["reasoning"].lower()

def test_missing_emission_factors_handling():
    """Requirement 3: Missing emission factors handled gracefully without fabricating reductions."""
    element = {
        "id": "ELEC_001",
        "name": "Academic Complex",
        "category": "electricity",
        "scope": "Scope 2",
        "campus_id": "green-tech-univ-01"
    }
    activity_records = [{"activity_value": 4200.0, "activity_unit": "kWh", "value_type": "measured"}]
    # No emission factors
    emission_factors = []
    
    recs = RulesEngine.evaluate_element(element, activity_records, emission_factors)
    assert len(recs) > 0
    # Ensures it does not claim fabricated numerical emissions reduction
    assert recs[0]["estimation_assumptions"]["basis"] == "Curated GHG Protocol Best Practice Matrix"

def test_rule_based_fallback_when_llm_unconfigured():
    """Requirement 6: Rule-based fallback functions seamlessly when LLM is unconfigured."""
    element = {
        "id": "HVAC_001",
        "name": "Central Chillers",
        "category": "air_conditioning",
        "scope": "Scope 2",
        "campus_id": "green-tech-univ-01"
    }
    activity_records = [{"activity_value": 3800.0, "activity_unit": "kWh", "value_type": "measured"}]
    emission_factors = [{"factor_value": 0.716, "factor_unit": "kgCO2e/kWh"}]
    
    # LLM service without valid API key
    recs, source, fallback_reason = LLMService.generate_recommendations(
        element_data=element,
        activity_records=activity_records,
        emission_factors=emission_factors
    )
    assert source == "rule_based"
    assert fallback_reason is not None
    assert len(recs) > 0
    assert recs[0]["category"] == "operational_optimization"

def test_sdg_mapping_system():
    """Requirement 12: SDG mappings for SDGs 6, 7, 9, 11, 12, 13 with potential vs measured distinction."""
    mappings = SDGMapper.map_sdgs_for_intervention(
        intervention_title="Kitchen Pre-Mix Burner Optimization",
        category="kitchen_lpg",
        sdg_numbers=[7, 12, 13],
        is_measured_outcome=False
    )
    
    assert len(mappings) == 3
    sdg_nums = [m["sdg_number"] for m in mappings]
    assert 7 in sdg_nums
    assert 12 in sdg_nums
    assert 13 in sdg_nums
    
    # Potential contribution check
    assert mappings[0]["is_measured_outcome"] is False
    assert "Potential Contribution" in mappings[0]["explanation"]
    assert "Target" in mappings[0]["measurable_indicator"]
    
    # Measured outcome check
    measured_mappings = SDGMapper.map_sdgs_for_intervention(
        intervention_title="Kitchen Pre-Mix Burner Optimization",
        category="kitchen_lpg",
        sdg_numbers=[7, 12, 13],
        is_measured_outcome=True
    )
    assert measured_mappings[0]["is_measured_outcome"] is True
    assert "Measured Achievement" in measured_mappings[0]["explanation"]
