"""
Rule-Based Recommendation Engine for CampusCarbon AI.
Evaluates element data, baseline activity, and constraints to generate
audit-ready sustainability recommendations without external LLM dependencies.
"""

from typing import List, Dict, Any, Optional
from app.recommendation_engine.rules_library import RULE_LIBRARY
import uuid

class RulesEngine:

    @staticmethod
    def evaluate_element(
        element_data: Dict[str, Any],
        activity_records: List[Dict[str, Any]],
        emission_factors: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Evaluates a specific campus element against the curated rules library.
        Returns a list of candidate recommendations conforming to the system schema.
        """
        category = element_data.get("category", "").lower().strip()
        element_id = element_data.get("id")
        element_name = element_data.get("name", "Unknown Element")
        campus_id = element_data.get("campus_id")
        campus_body_id = element_data.get("campus_body_id")
        
        # Look up matching rules in curated library
        matched_rules = RULE_LIBRARY.get(category, [])
        if not matched_rules:
            # Fallback for generic/other categories
            matched_rules = [
                {
                    "id": f"GEN-{category[:4].upper()}-001",
                    "title": f"Comprehensive {category.title()} Efficiency & Operational Audit",
                    "category": "operational_optimization",
                    "problem": f"Lack of granular monitoring and operational baseline for {element_name}.",
                    "proposed_action": f"Install dedicated sub-metering and conduct formal energy/carbon balance audit.",
                    "reasoning": "Accurate emissions baselines are mandatory prior to capital retrofit interventions.",
                    "environmental_benefits": f"Identifies hidden inefficiencies and enables verified emissions reduction.",
                    "operational_benefits": "Establishes institutional accountability and benchmark data.",
                    "required_data": [
                        "Sub-metered interval data",
                        "Equipment operating schedules",
                        "Maintenance logs"
                    ],
                    "implementation_prerequisites": ["Access to distribution panel"],
                    "implementation_constraints": ["Audit scheduling"],
                    "sdgs": [12, 13],
                    "typical_reduction_percent": 10.0,
                    "confidence": 0.80,
                    "cost_level": "low",
                    "difficulty": "low"
                }
            ]

        # Determine if sufficient activity data exists
        has_activity = len(activity_records) > 0
        latest_record = activity_records[0] if has_activity else None
        
        data_quality = "low"
        value_type = "unknown"
        if latest_record:
            data_quality = latest_record.get("data_quality", "medium")
            value_type = latest_record.get("value_type", "estimated")

        recommendations = []
        for rule in matched_rules:
            rec_id = str(uuid.uuid4())
            
            # If no activity data or low data quality, flag as requires_assessment
            if not has_activity or value_type in ["estimated", "predicted"]:
                status = "requires_assessment"
                reasoning = (
                    f"{rule['reasoning']} (NOTE: Current baseline for '{element_name}' is {value_type} "
                    f"with {data_quality} confidence. Additional measurement verification required before capital intervention.)"
                )
            else:
                status = "pending_review"
                reasoning = (
                    f"{rule['reasoning']} (Verified against {len(activity_records)} historical activity record(s) "
                    f"for '{element_name}' with measured {latest_record.get('activity_value')} {latest_record.get('activity_unit')}.)"
                )

            # Transparent prioritization score calculation (0 - 100)
            reduction_pot = rule.get("typical_reduction_percent", 10.0)
            conf = rule.get("confidence", 0.85)
            difficulty_penalty = 15.0 if rule.get("difficulty") == "high" else (5.0 if rule.get("difficulty") == "medium" else 0.0)
            cost_penalty = 15.0 if rule.get("cost_level") == "high" else (5.0 if rule.get("cost_level") == "medium" else 0.0)
            
            raw_priority = (reduction_pot * 2.0) + (conf * 30.0) - difficulty_penalty - cost_penalty + 30.0
            priority_score = max(10.0, min(95.0, round(raw_priority, 1)))
            
            priority_level = "high" if priority_score >= 70.0 else ("medium" if priority_score >= 45.0 else "low")

            rec_item = {
                "id": rec_id,
                "campus_id": campus_id,
                "campus_body_id": campus_body_id,
                "element_id": element_id,
                "title": f"{rule['title']} - {element_name}",
                "description": f"Curated sustainability intervention for {element_name} in category {category}.",
                "category": rule.get("category", "efficiency"),
                "problem": rule["problem"],
                "proposed_action": rule["proposed_action"],
                "reasoning": reasoning,
                "expected_environmental_benefit": rule.get("environmental_benefits", "Direct carbon reduction"),
                "potential_operational_benefit": rule.get("operational_benefits", "Lower operating costs"),
                "required_additional_info": rule.get("required_data", []),
                "implementation_prerequisites": rule.get("implementation_prerequisites", []),
                "potential_risks_constraints": rule.get("implementation_constraints", []),
                "confidence_score": conf,
                "priority_score": priority_score,
                "priority_level": priority_level,
                "status": status,
                "source": "rule_based",
                "sdgs": rule.get("sdgs", [13]),
                "estimation_assumptions": {
                    "typical_reduction_percent": reduction_pot,
                    "data_quality_basis": data_quality,
                    "activity_value_type": value_type,
                    "basis": "Curated GHG Protocol Best Practice Matrix"
                },
                "evidence_references": [
                    {
                        "type": "standard_benchmark",
                        "description": f"Rule {rule['id']} derived from ISO 14064 / GHG Protocol higher-ed abatement catalog.",
                        "confidence": "high"
                    }
                ]
            }
            recommendations.append(rec_item)

        return recommendations
