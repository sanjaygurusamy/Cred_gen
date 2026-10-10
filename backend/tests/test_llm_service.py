"""
Test Suite for LLM Service, Schema Validation, Timeouts, and Provider Failures.
Covers:
- Test 4: Malformed LLM responses & schema validation
- Test 5: LLM API timeouts and error recovery
- Numerical claim safeguards (LLM cannot invent unsupported emission reductions)
"""

import pytest
import json
from unittest.mock import patch
from app.config import settings
from app.recommendation_engine.llm_service import LLMService

def test_malformed_llm_response_fallback():
    """Requirement 4: Malformed LLM response falls back to rule-based engine without crash."""
    element = {
        "id": "ELEC_001",
        "name": "Academic Building",
        "category": "electricity",
        "scope": "Scope 2",
        "campus_id": "green-tech-univ-01"
    }
    activity = [{"activity_value": 4200.0, "activity_unit": "kWh", "value_type": "measured"}]
    efs = [{"factor_value": 0.716, "factor_unit": "kgCO2e/kWh"}]

    with patch.object(settings, "llm_api_key", "sk-test-mock-key"):
        with patch.object(LLMService, "_call_llm_provider", return_value=("NOT A VALID JSON STRING", {"total_tokens": 10})):
            recs, source, fallback_reason = LLMService.generate_recommendations(
                element_data=element,
                activity_records=activity,
                emission_factors=efs,
                force_refresh=True
            )
            # Must fall back to rule_based gracefully
            assert source == "rule_based"
            assert len(recs) > 0
            assert "LLM provider error" in fallback_reason or "fallback" in fallback_reason.lower()

def test_llm_api_timeout_fallback():
    """Requirement 5: LLM API timeout triggers fallback to rule-based catalog."""
    element = {
        "id": "TRANS_001",
        "name": "Diesel Shuttles",
        "category": "transportation",
        "scope": "Scope 1",
        "campus_id": "green-tech-univ-01"
    }
    activity = [{"activity_value": 180.0, "activity_unit": "liter", "value_type": "measured"}]
    efs = [{"factor_value": 2.687, "factor_unit": "kgCO2e/liter"}]

    import httpx
    with patch.object(settings, "llm_api_key", "sk-test-mock-key"):
        with patch.object(LLMService, "_call_llm_provider", side_effect=httpx.TimeoutException("Request timed out")):
            recs, source, fallback_reason = LLMService.generate_recommendations(
                element_data=element,
                activity_records=activity,
                emission_factors=efs,
                force_refresh=True
            )
            assert source == "rule_based"
            assert len(recs) > 0
            assert "TimeoutException" in fallback_reason

def test_valid_structured_llm_response_parsing():
    """Requirement 4: Valid structured LLM response is schema-validated and numerical claims are guarded."""
    element = {
        "id": "LPG_001",
        "name": "Kitchen",
        "category": "kitchen_lpg",
        "scope": "Scope 1",
        "campus_id": "green-tech-univ-01"
    }
    activity = [{"activity_value": 80.0, "activity_unit": "kg", "value_type": "measured"}]
    efs = [{"factor_value": 2.983, "factor_unit": "kgCO2e/kg"}]

    valid_llm_json = json.dumps({
        "recommendations": [
            {
                "title": "Upgrade Commercial Burners with Flame Sensors",
                "category": "equipment_efficiency",
                "target_element_id": "LPG_001",
                "problem": "Manual burner valves causing excess gas discharge.",
                "proposed_action": "Install electronic flame modulating valves.",
                "reasoning": "Modulating valves maintain stoichiometric gas flow.",
                "required_data": ["Gas line pressure", "Burner orifice diameter"],
                "potential_benefits": ["Lower gas consumption", "Reduced emissions"],
                "operational_benefits": ["Enhanced kitchen fire safety"],
                "implementation_constraints": ["Gas technician availability"],
                "sdgs": [7, 12, 13],
                "reduction_estimate": None,
                "cost_estimate": None,
                "status": "requires_assessment"
            }
        ]
    })

    with patch.object(settings, "llm_api_key", "sk-test-mock-key"):
        with patch.object(LLMService, "_call_llm_provider", return_value=(valid_llm_json, {"total_tokens": 150})):
            recs, source, fallback_reason = LLMService.generate_recommendations(
                element_data=element,
                activity_records=activity,
                emission_factors=efs,
                force_refresh=True
            )
            assert source == "llm"
            assert len(recs) == 1
            assert recs[0]["title"] == "Upgrade Commercial Burners with Flame Sensors"
            assert 7 in recs[0]["sdgs"]
            # Must not fabricate numerical reductions; reduction calculations remain with the calculation engine
            assert recs[0]["estimation_assumptions"]["numerical_claims_verified"] is False
