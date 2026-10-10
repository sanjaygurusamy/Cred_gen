"""
Aggregation and Double-Counting Safeguards for CampusCarbon AI.
Aggregates emissions and scenario reductions across Scope 1, Scope 2, and Scope 3
while enforcing strict isolation to avoid double-counting.
"""

from typing import List, Dict, Any, Tuple

class CarbonAggregator:

    @staticmethod
    def aggregate_emissions_by_scope(
        calculations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Sums up calculated emissions categorized into Scope 1, Scope 2, and Scope 3.
        """
        scopes_breakdown = {
            "Scope 1": {"total_kg": 0.0, "sources": []},
            "Scope 2": {"total_kg": 0.0, "sources": []},
            "Scope 3": {"total_kg": 0.0, "sources": []},
        }
        total_kg = 0.0

        for calc in calculations:
            scope = calc.get("scope", "Scope 1")
            kg = float(calc.get("calculated_emissions_kg", 0.0))
            if scope not in scopes_breakdown:
                scopes_breakdown[scope] = {"total_kg": 0.0, "sources": []}
            
            scopes_breakdown[scope]["total_kg"] = round(scopes_breakdown[scope]["total_kg"] + kg, 4)
            scopes_breakdown[scope]["sources"].append(calc)
            total_kg += kg

        return {
            "total_emissions_kg": round(total_kg, 4),
            "total_emissions_tco2e": round(total_kg / 1000.0, 4),
            "scope_1_kg": scopes_breakdown["Scope 1"]["total_kg"],
            "scope_2_kg": scopes_breakdown["Scope 2"]["total_kg"],
            "scope_3_kg": scopes_breakdown["Scope 3"]["total_kg"],
            "breakdown": scopes_breakdown
        }

    @staticmethod
    def aggregate_scenario_reductions(
        scenario_results: List[Dict[str, Any]]
    ) -> Tuple[Dict[str, Any], List[str]]:
        """
        Aggregates multiple scenario results with double-counting verification.
        Returns (aggregated_metrics, warnings).
        If multiple scenarios target the same element_id, warns about potential overlap!
        """
        seen_elements: Dict[str, str] = {}
        warnings: List[str] = []
        unique_reduction_kg = 0.0
        unique_annual_tco2e = 0.0
        unique_financial_savings = 0.0

        for item in scenario_results:
            elem_id = item.get("element_id")
            title = item.get("title", "Scenario")
            red_kg = float(item.get("potential_reduction_kg", 0.0))
            ann_tco2e = float(item.get("annual_reduction_tco2e", 0.0))
            fin_savings = float(item.get("financial_savings_amount", 0.0) or 0.0)

            if elem_id and elem_id in seen_elements:
                warnings.append(
                    f"Double-counting risk detected: Scenario '{title}' targets the same element as '{seen_elements[elem_id]}'. "
                    "Reductions cannot be summed linearly without mutually exclusive verification."
                )
                # When overlapping, we take the maximum rather than summing linearly to prevent double counting
                prev_best = seen_elements.get(f"{elem_id}_best_red", 0.0)
                if red_kg > prev_best:
                    # Adjust aggregate by the difference
                    diff_kg = red_kg - prev_best
                    unique_reduction_kg += diff_kg
                    seen_elements[f"{elem_id}_best_red"] = red_kg
            else:
                if elem_id:
                    seen_elements[elem_id] = title
                    seen_elements[f"{elem_id}_best_red"] = red_kg
                unique_reduction_kg += red_kg
                unique_annual_tco2e += ann_tco2e
                unique_financial_savings += fin_savings

        return {
            "total_potential_reduction_kg": round(unique_reduction_kg, 4),
            "total_annual_reduction_tco2e": round(unique_annual_tco2e, 4),
            "total_financial_savings": round(unique_financial_savings, 2),
            "count": len(scenario_results)
        }, warnings
