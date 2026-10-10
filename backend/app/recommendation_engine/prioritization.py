"""
Transparent Multi-Criteria Recommendation Prioritization Engine for CampusCarbon AI.
Implements a deterministic multi-factor scoring formula:
Score = W_red * S_red + W_conf * S_conf + W_feas * S_feas + W_fin * S_fin - Penalty_risk
"""

from typing import Dict, Any, List

class PrioritizationEngine:

    # Weight factors totaling 1.0 (100%)
    WEIGHTS = {
        "emission_reduction": 0.35,     # 35%
        "data_confidence": 0.25,        # 25%
        "operational_feasibility": 0.20, # 20%
        "financial_payback": 0.20       # 20%
    }

    @classmethod
    def score_recommendation(
        cls,
        rec_data: Dict[str, Any],
        has_measured_baseline: bool = True,
        cost_rate: float = None
    ) -> Dict[str, Any]:
        """
        Calculates a transparent prioritization score between 0 and 100
        along with an explanation of each score component.
        """
        # 1. Emission reduction sub-score (0 to 100)
        assumptions = rec_data.get("estimation_assumptions", {})
        typical_red = float(assumptions.get("typical_reduction_percent", 10.0))
        # Cap at 40% reduction mapping to 100 points
        s_red = min(100.0, (typical_red / 40.0) * 100.0)

        # 2. Data confidence sub-score (0 to 100)
        conf_raw = float(rec_data.get("confidence_score", 0.85))
        if not has_measured_baseline:
            # Substantial penalty if no measured baseline exists
            s_conf = conf_raw * 50.0
        else:
            s_conf = conf_raw * 100.0

        # 3. Operational feasibility & difficulty sub-score (0 to 100)
        constraints = rec_data.get("potential_risks_constraints", [])
        constraint_count = len(constraints)
        if constraint_count == 0:
            s_feas = 90.0
        elif constraint_count <= 2:
            s_feas = 75.0
        else:
            s_feas = 50.0

        # Check for safety / high regulatory flags
        has_safety_constraint = any("safety" in str(c).lower() or "hazardous" in str(c).lower() for c in constraints)
        if has_safety_constraint:
            s_feas = max(20.0, s_feas - 25.0)

        # 4. Financial & cost sub-score (0 to 100)
        if cost_rate and cost_rate > 0:
            s_fin = 85.0
        else:
            # Baseline neutral score when cost is not known
            s_fin = 60.0

        # Final weighted score
        final_score = (
            cls.WEIGHTS["emission_reduction"] * s_red +
            cls.WEIGHTS["data_confidence"] * s_conf +
            cls.WEIGHTS["operational_feasibility"] * s_feas +
            cls.WEIGHTS["financial_payback"] * s_fin
        )
        final_score = round(max(0.0, min(100.0, final_score)), 1)

        level = "high" if final_score >= 70.0 else ("medium" if final_score >= 45.0 else "low")

        criteria_explanation = (
            f"Prioritization Score: {final_score}/100 ({level.upper()}). "
            f"Components: [Emissions Reduction Potential: {round(s_red, 1)}/100 (35% wt)] + "
            f"[Data Confidence: {round(s_conf, 1)}/100 (25% wt)] + "
            f"[Operational Feasibility: {round(s_feas, 1)}/100 (20% wt)] + "
            f"[Financial Viability: {round(s_fin, 1)}/100 (20% wt)]."
        )
        if has_safety_constraint:
            criteria_explanation += " (Includes safety/regulatory precaution weighting)."

        return {
            "score": final_score,
            "level": level,
            "components": {
                "emission_reduction_subscore": s_red,
                "confidence_subscore": s_conf,
                "feasibility_subscore": s_feas,
                "financial_subscore": s_fin
            },
            "explanation": criteria_explanation
        }
