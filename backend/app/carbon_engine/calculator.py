"""
Deterministic Carbon Calculation Engine for CampusCarbon AI.
Strictly follows GHG Protocol Corporate Standard calculations.
E = Activity * Emission_Factor
Reduction = E_baseline - E_alternative
Reduction_pct = (Reduction / E_baseline) * 100
"""

from datetime import datetime
from typing import Dict, Any, Optional
from app.carbon_engine.units import are_units_compatible

class CalculationError(Exception):
    """Raised when calculation inputs are invalid or missing."""
    pass

class CarbonCalculator:
    
    @staticmethod
    def calculate_single_emission(
        activity_value: float,
        activity_unit: str,
        emission_factor_value: float,
        emission_factor_unit: str,
        emission_factor_source: str = "Approved Registry"
    ) -> Dict[str, Any]:
        """
        Calculates emissions deterministically: E = A * EF.
        Verifies unit compatibility before calculation.
        """
        if activity_value is None or activity_value < 0:
            raise CalculationError("Activity value must be a non-negative number.")
        if emission_factor_value is None or emission_factor_value < 0:
            raise CalculationError("Emission factor value must be a non-negative number.")
        
        if not are_units_compatible(activity_unit, emission_factor_unit):
            raise CalculationError(
                f"Incompatible units: Activity unit '{activity_unit}' cannot be multiplied by factor unit '{emission_factor_unit}'."
            )
            
        calculated_kg = round(activity_value * emission_factor_value, 4)
        
        return {
            "activity_value": activity_value,
            "activity_unit": activity_unit,
            "emission_factor_value": emission_factor_value,
            "emission_factor_unit": emission_factor_unit,
            "emission_factor_source": emission_factor_source,
            "calculated_emissions_kg": calculated_kg,
            "calculated_emissions_tco2e": round(calculated_kg / 1000.0, 6),
            "calculation_method": "E = Activity * EF (GHG Protocol)",
            "timestamp": datetime.utcnow().isoformat()
        }

    @staticmethod
    def calculate_reduction_scenario(
        baseline_activity: float,
        baseline_unit: str,
        baseline_ef_value: float,
        baseline_ef_unit: str,
        alternative_activity: float,
        alternative_unit: str,
        alternative_ef_value: Optional[float] = None,
        alternative_ef_unit: Optional[str] = None,
        period_days: int = 1, # default 1 day (e.g. 80 kg LPG/day)
        cost_rate: Optional[float] = None,
        cost_currency: str = "USD"
    ) -> Dict[str, Any]:
        """
        Computes scenario reductions deterministically:
        E_baseline = A_baseline * EF_baseline
        E_alternative = A_alternative * EF_alternative
        Reduction = E_baseline - E_alternative
        Reduction % = (Reduction / E_baseline) * 100
        """
        # Baseline checks
        if baseline_activity is None or baseline_activity <= 0:
            raise CalculationError("Baseline activity must be strictly greater than 0.")
        if baseline_ef_value is None or baseline_ef_value <= 0:
            raise CalculationError("Baseline emission factor is required and must be > 0.")
        if not are_units_compatible(baseline_unit, baseline_ef_unit):
            raise CalculationError(
                f"Baseline units incompatible: '{baseline_unit}' and '{baseline_ef_unit}'."
            )

        # Alternative defaults to same EF if not changed
        if alternative_ef_value is None:
            alternative_ef_value = baseline_ef_value
        if alternative_ef_unit is None:
            alternative_ef_unit = baseline_ef_unit

        if alternative_activity is None or alternative_activity < 0:
            raise CalculationError("Alternative activity must be a non-negative number.")
        if not are_units_compatible(alternative_unit, alternative_ef_unit):
            raise CalculationError(
                f"Alternative units incompatible: '{alternative_unit}' and '{alternative_ef_unit}'."
            )

        # 1. Calculate Baseline Emissions
        e_baseline = baseline_activity * baseline_ef_value

        # 2. Calculate Alternative Emissions
        e_alternative = alternative_activity * alternative_ef_value

        # 3. Calculate Potential Reduction
        reduction_kg = round(e_baseline - e_alternative, 4)

        # 4. Calculate Percentage Reduction
        if e_baseline > 0:
            reduction_percentage = round((reduction_kg / e_baseline) * 100.0, 2)
        else:
            reduction_percentage = 0.0

        # 5. Annual projection (assuming 365 days / period_days)
        annual_multiplier = 365.0 / max(1, period_days)
        annual_reduction_kg = reduction_kg * annual_multiplier
        annual_reduction_tco2e = round(annual_reduction_kg / 1000.0, 4)

        # 6. Financial impact calculation if cost rate is provided
        financial_savings = None
        if cost_rate is not None and cost_rate > 0:
            activity_saved = max(0.0, baseline_activity - alternative_activity)
            financial_savings = round(activity_saved * cost_rate * annual_multiplier, 2)

        return {
            "baseline_activity": baseline_activity,
            "baseline_unit": baseline_unit,
            "alternative_activity": alternative_activity,
            "alternative_unit": alternative_unit,
            "baseline_emissions_kg": round(e_baseline, 4),
            "alternative_emissions_kg": round(e_alternative, 4),
            "potential_reduction_kg": reduction_kg,
            "potential_reduction_percentage": reduction_percentage,
            "annual_reduction_tco2e": annual_reduction_tco2e,
            "financial_savings_amount": financial_savings,
            "financial_savings_currency": cost_currency,
            "calculation_method": "deterministic_ghg_protocol",
            "calculation_timestamp": datetime.utcnow().isoformat(),
            "data_quality": "high",
            "disclaimer": "Scenario estimate based on stated assumptions. Not a measured historical outcome."
        }
