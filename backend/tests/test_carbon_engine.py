"""
Test Suite for Deterministic Carbon Calculation Engine.
Covers:
- Test 7: Emission reduction calculations
- Test 8: Unit compatibility
- Test 9: Percentage reduction calculations
- Test 16: Prevention of double-counting
- Test 17: Historical scenario reproducibility
"""

import pytest
from app.carbon_engine.calculator import CarbonCalculator, CalculationError
from app.carbon_engine.units import are_units_compatible, normalize_activity_value
from app.carbon_engine.aggregator import CarbonAggregator

def test_unit_compatibility():
    """Requirement 8: Unit compatibility."""
    assert are_units_compatible("kg", "kgCO2e/kg") is True
    assert are_units_compatible("kWh", "kgCO2e/kWh") is True
    assert are_units_compatible("liter", "kgCO2e/liter") is True
    assert are_units_compatible("m3", "kgCO2e/m3") is True
    
    # Incompatible units must fail
    assert are_units_compatible("kWh", "kgCO2e/kg") is False
    assert are_units_compatible("liter", "kgCO2e/kWh") is False
    assert are_units_compatible("kg", "kgCO2e/m3") is False

def test_single_emission_calculation():
    """Requirement 7: E = Activity * EF."""
    # E.g. Kitchen consuming 80 kg LPG at 2.983 kgCO2e/kg
    res = CarbonCalculator.calculate_single_emission(
        activity_value=80.0,
        activity_unit="kg",
        emission_factor_value=2.983,
        emission_factor_unit="kgCO2e/kg"
    )
    expected_kg = round(80.0 * 2.983, 4)
    assert res["calculated_emissions_kg"] == expected_kg
    assert res["calculated_emissions_tco2e"] == round(expected_kg / 1000.0, 6)

def test_single_emission_incompatible_unit_raises():
    """Requirement 8: Incompatible unit raises CalculationError."""
    with pytest.raises(CalculationError) as exc:
        CarbonCalculator.calculate_single_emission(
            activity_value=80.0,
            activity_unit="liters",
            emission_factor_value=2.983,
            emission_factor_unit="kgCO2e/kg"
        )
    assert "Incompatible units" in str(exc.value)

def test_reduction_scenario_calculations():
    """
    Requirement 7 & 9 & 10 (Section 10 example):
    Baseline 80 kg/day LPG, 10% reduction intervention:
    Alternative consumption = 72 kg/day
    Potential savings = 8 kg/day
    Direct emissions reduction = 8 * 2.983 = 23.864 kgCO2e
    Reduction percentage = (23.864 / (80 * 2.983)) * 100 = 10.0%
    """
    res = CarbonCalculator.calculate_reduction_scenario(
        baseline_activity=80.0,
        baseline_unit="kg",
        baseline_ef_value=2.983,
        baseline_ef_unit="kgCO2e/kg",
        alternative_activity=72.0,
        alternative_unit="kg",
        alternative_ef_value=2.983,
        alternative_ef_unit="kgCO2e/kg",
        period_days=1,
        cost_rate=1.45,
        cost_currency="USD"
    )
    
    assert res["baseline_activity"] == 80.0
    assert res["alternative_activity"] == 72.0
    assert res["baseline_emissions_kg"] == round(80.0 * 2.983, 4) # 238.64
    assert res["alternative_emissions_kg"] == round(72.0 * 2.983, 4) # 214.776
    assert res["potential_reduction_kg"] == round(8.0 * 2.983, 4) # 23.864
    assert res["potential_reduction_percentage"] == 10.0
    # Financial savings: 8 kg/day * $1.45/kg * 365 days = $4234.00
    assert res["financial_savings_amount"] == round(8.0 * 1.45 * 365, 2)

def test_historical_scenario_reproducibility():
    """Requirement 17: Historical scenario reproducibility."""
    # Running calculation multiple times must produce identical deterministic outputs
    runs = [
        CarbonCalculator.calculate_reduction_scenario(
            baseline_activity=4200.0,
            baseline_unit="kWh",
            baseline_ef_value=0.716,
            baseline_ef_unit="kgCO2e/kWh",
            alternative_activity=3570.0, # 15% reduction
            alternative_unit="kWh"
        )
        for _ in range(5)
    ]
    for r in runs[1:]:
        assert r["potential_reduction_kg"] == runs[0]["potential_reduction_kg"]
        assert r["potential_reduction_percentage"] == runs[0]["potential_reduction_percentage"]
        assert r["baseline_emissions_kg"] == runs[0]["baseline_emissions_kg"]

def test_prevention_of_double_counting():
    """Requirement 16: Prevention of double-counting."""
    # Scenario A and Scenario B both target the same element (LPG_001)
    results = [
        {
            "element_id": "LPG_001",
            "title": "Burner Efficiency Improvement",
            "potential_reduction_kg": 23.864,
            "annual_reduction_tco2e": 8.71,
            "financial_savings_amount": 4234.0
        },
        {
            "element_id": "LPG_001",
            "title": "Alternative Pre-Mix Burner Retrofit",
            "potential_reduction_kg": 35.796,
            "annual_reduction_tco2e": 13.06,
            "financial_savings_amount": 6351.0
        },
        {
            "element_id": "ELEC_001",
            "title": "LED Lighting Retrofit",
            "potential_reduction_kg": 450.0,
            "annual_reduction_tco2e": 164.25,
            "financial_savings_amount": 22000.0
        }
    ]
    
    agg, warnings = CarbonAggregator.aggregate_scenario_reductions(results)
    
    # Must generate a double-counting warning!
    assert len(warnings) > 0
    assert "Double-counting risk detected" in warnings[0]
    
    # Must not naively sum both overlapping scenarios (23.864 + 35.796 = 59.66)
    # It must take maximum for the overlapping element (35.796) + distinct element (450.0) = 485.796
    assert agg["total_potential_reduction_kg"] == round(35.796 + 450.0, 4)
