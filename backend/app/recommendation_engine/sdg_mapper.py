"""
Sustainable Development Goals (SDG) Mapping System for CampusCarbon AI.
Maps interventions to UN SDGs (6, 7, 9, 11, 12, 13), provides measurable indicators,
and strictly distinguishes between potential contributions and measured outcomes.
"""

from typing import Dict, Any, List

SDG_DEFINITIONS: Dict[int, Dict[str, str]] = {
    6: {
        "title": "Clean Water and Sanitation",
        "description": "Ensure availability and sustainable management of water and sanitation for all.",
        "default_indicator": "Target 6.4: Water-use efficiency (m³ saved / occupant-day) & leak reduction rate (%)"
    },
    7: {
        "title": "Affordable and Clean Energy",
        "description": "Ensure access to affordable, reliable, sustainable and modern energy for all.",
        "default_indicator": "Target 7.2 / 7.3: Renewable energy share (%) & energy efficiency improvement (kWh saved / m²)"
    },
    9: {
        "title": "Industry, Innovation and Infrastructure",
        "description": "Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation.",
        "default_indicator": "Target 9.4: Retrofit infrastructure to make them sustainable, with increased resource-use efficiency"
    },
    11: {
        "title": "Sustainable Cities and Communities",
        "description": "Make cities and human settlements inclusive, safe, resilient and sustainable.",
        "default_indicator": "Target 11.6: Reduce adverse per capita environmental impact of campus settlements and air quality"
    },
    12: {
        "title": "Responsible Consumption and Production",
        "description": "Ensure sustainable consumption and production patterns.",
        "default_indicator": "Target 12.3 / 12.5: Halve per capita food waste & substantially reduce waste generation through recycling"
    },
    13: {
        "title": "Climate Action",
        "description": "Take urgent action to combat climate change and its impacts.",
        "default_indicator": "Target 13.2: Integrate climate change measures into institutional policies, planning and emissions abatement"
    }
}

class SDGMapper:

    @staticmethod
    def map_sdgs_for_intervention(
        intervention_title: str,
        category: str,
        sdg_numbers: List[int],
        is_measured_outcome: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Creates structured SDG mapping entries for a given intervention.
        Ensures potential contributions are clearly distinguished from verified achievements.
        """
        mappings = []
        for num in sdg_numbers:
            if num not in SDG_DEFINITIONS:
                continue
            
            sdg_info = SDG_DEFINITIONS[num]
            
            # Formulate contextual explanation
            if is_measured_outcome:
                explanation = (
                    f"Measured Achievement: The implemented intervention '{intervention_title}' "
                    f"has recorded empirical performance data contributing to {sdg_info['title']}."
                )
            else:
                explanation = (
                    f"Potential Contribution: Implementing '{intervention_title}' is estimated to support "
                    f"{sdg_info['title']} by addressing operational inefficiencies in {category}."
                )

            mappings.append({
                "sdg_number": num,
                "sdg_title": sdg_info["title"],
                "intervention": intervention_title,
                "explanation": explanation,
                "measurable_indicator": sdg_info["default_indicator"],
                "supporting_evidence": f"Mapped under category '{category}' based on UN SDG Global Indicator Framework.",
                "is_measured_outcome": is_measured_outcome
            })

        return mappings
