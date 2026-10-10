"""
Configurable LLM Service for CampusCarbon AI.
Features:
- Provider abstraction (OpenAI, Compatible, Fallback)
- Input data minimization (no sensitive campus data or PII sent)
- Input hashing and response caching
- Strict JSON schema validation using Pydantic
- Request timeouts and rate limit / network error handling
- Zero-crash fallback to deterministic RulesEngine when LLM is unavailable
- Transparent metadata logging
"""

import json
import hashlib
import time
import httpx
from typing import List, Dict, Any, Optional, Tuple
from app.config import settings
from app.schemas import LLMRecommendationOutput
from app.recommendation_engine.rules_engine import RulesEngine

# In-memory recommendation cache: hash -> (timestamp, validated_data)
_RECOMMENDATION_CACHE: Dict[str, Dict[str, Any]] = {}

class LLMService:

    @staticmethod
    def _compute_input_hash(element_payload: Dict[str, Any]) -> str:
        """Computes a stable hash of the minimal element payload for caching."""
        compact_json = json.dumps(element_payload, sort_keys=True)
        return hashlib.sha256(compact_json.encode("utf-8")).hexdigest()

    @staticmethod
    def _sanitize_campus_data(
        element_data: Dict[str, Any],
        activity_records: List[Dict[str, Any]],
        campus_body: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Minimizes data sent to LLM:
        Strips all PII, internal campus secrets, and sends only technical carbon activity data.
        """
        latest_record = activity_records[0] if activity_records else {}
        
        return {
            "element_id": element_data.get("id"),
            "element_name": element_data.get("name"),
            "category": element_data.get("category"),
            "scope": element_data.get("scope"),
            "campus_body_type": campus_body.get("type", "campus_facility") if campus_body else "facility",
            "recent_activity_value": latest_record.get("activity_value"),
            "activity_unit": latest_record.get("activity_unit"),
            "value_type": latest_record.get("value_type", "measured"),
            "data_quality": latest_record.get("data_quality", "high")
        }

    @classmethod
    def generate_recommendations(
        cls,
        element_data: Dict[str, Any],
        activity_records: List[Dict[str, Any]],
        emission_factors: List[Dict[str, Any]],
        campus_body: Optional[Dict[str, Any]] = None,
        force_refresh: bool = False
    ) -> Tuple[List[Dict[str, Any]], str, Optional[str]]:
        """
        Generates recommendations using LLM if available and configured,
        or gracefully falls back to the deterministic RulesEngine.
        Returns: (recommendations_list, source_string, fallback_reason_if_any)
        """
        sanitized_input = cls._sanitize_campus_data(element_data, activity_records, campus_body)
        cache_key = cls._compute_input_hash(sanitized_input)

        # Check Cache
        if settings.llm_enable_cache and not force_refresh:
            if cache_key in _RECOMMENDATION_CACHE:
                cached = _RECOMMENDATION_CACHE[cache_key]
                return cached["recommendations"], cached["source"], None

        # Check if LLM API is configured with a real key
        api_key = settings.llm_api_key.strip()
        if not api_key or api_key in ["your-api-key-here", "placeholder", "none", ""]:
            # Clean fallback to Rule-based engine
            rule_recs = RulesEngine.evaluate_element(element_data, activity_records, emission_factors)
            fallback_reason = "LLM API key not configured or empty. Deterministic rule-based sustainability catalog used."
            return rule_recs, "rule_based", fallback_reason

        # Attempt LLM call
        start_time = time.time()
        try:
            llm_result, raw_tokens = cls._call_llm_provider(sanitized_input)
            
            # Validate output schema
            validated = cls._parse_and_validate_response(llm_result, element_data, activity_records)
            
            if settings.llm_enable_cache:
                _RECOMMENDATION_CACHE[cache_key] = {
                    "recommendations": validated,
                    "source": "llm",
                    "timestamp": time.time()
                }

            return validated, "llm", None

        except Exception as exc:
            # On any failure (timeout, network, rate-limit, malformed schema), NEVER crash!
            # Gracefully fall back to RulesEngine
            rule_recs = RulesEngine.evaluate_element(element_data, activity_records, emission_factors)
            fallback_reason = f"LLM provider error ({type(exc).__name__}: {str(exc)}). Fallen back to rule-based catalog."
            return rule_recs, "rule_based", fallback_reason

    @classmethod
    def _call_llm_provider(cls, sanitized_input: Dict[str, Any]) -> Tuple[str, Dict[str, int]]:
        """Calls OpenAI or compatible chat completion API with strict timeout."""
        system_prompt = (
            "You are CampusCarbon AI, an expert sustainability engineering copilot.\n"
            "Analyze the provided campus activity data and propose concrete sustainability interventions.\n"
            "CRITICAL RULES:\n"
            "1. You must return ONLY a valid JSON object matching the requested schema.\n"
            "2. Do NOT invent or fabricate numerical emission reductions or emission factors.\n"
            "3. The deterministic carbon calculation engine calculates reductions separately.\n"
            "4. Keep reduction_estimate and cost_estimate as null.\n"
            "5. Map interventions to relevant UN SDGs (6, 7, 9, 11, 12, 13).\n"
            "6. Distinguish potential interventions from measured achievements.\n"
            "JSON Schema required:\n"
            "{\n"
            '  "recommendations": [\n'
            "    {\n"
            '      "title": "string",\n'
            '      "category": "string",\n'
            '      "target_element_id": "string",\n'
            '      "problem": "string",\n'
            '      "proposed_action": "string",\n'
            '      "reasoning": "string",\n'
            '      "required_data": ["string"],\n'
            '      "potential_benefits": ["string"],\n'
            '      "operational_benefits": ["string"],\n'
            '      "implementation_constraints": ["string"],\n'
            '      "sdgs": [13, 7],\n'
            '      "reduction_estimate": null,\n'
            '      "cost_estimate": null,\n'
            '      "status": "requires_assessment"\n'
            "    }\n"
            "  ]\n"
            "}"
        )

        user_content = (
            f"Generate sustainability recommendations for this campus element:\n"
            f"{json.dumps(sanitized_input, indent=2)}"
        )

        headers = {
            "Authorization": f"Bearer {settings.llm_api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": settings.llm_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
            "max_tokens": 1200
        }

        url = f"{settings.llm_base_url.rstrip('/')}/chat/completions"
        with httpx.Client(timeout=settings.llm_timeout_seconds) as client:
            response = client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            raw_text = data["choices"][0]["message"]["content"]
            tokens = data.get("usage", {})
            return raw_text, tokens

    @classmethod
    def _parse_and_validate_response(
        cls,
        raw_json_str: str,
        element_data: Dict[str, Any],
        activity_records: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Parses and strictly validates the LLM JSON response against Pydantic schema."""
        parsed_data = json.loads(raw_json_str)
        validated_schema = LLMRecommendationOutput.model_validate(parsed_data)
        
        has_activity = len(activity_records) > 0
        latest_record = activity_records[0] if has_activity else None
        
        results = []
        import uuid
        for item in validated_schema.recommendations:
            rec_id = str(uuid.uuid4())
            
            # Reject unsupported numerical claims made by LLM:
            # Reductions MUST come from the deterministic calculation engine, not LLM imagination!
            reduction_est = None # Kept null as required
            
            # Determine status
            status = "pending_review" if (has_activity and latest_record.get("value_type") == "measured") else "requires_assessment"
            
            rec_dict = {
                "id": rec_id,
                "campus_id": element_data.get("campus_id"),
                "campus_body_id": element_data.get("campus_body_id"),
                "element_id": element_data.get("id"),
                "title": item.title,
                "description": f"AI contextual recommendation for {element_data.get('name')}.",
                "category": item.category,
                "problem": item.problem,
                "proposed_action": item.proposed_action,
                "reasoning": item.reasoning,
                "expected_environmental_benefit": ", ".join(item.potential_benefits) if item.potential_benefits else "Emissions reduction",
                "potential_operational_benefit": ", ".join(item.operational_benefits) if item.operational_benefits else "Operational efficiency improvement",
                "required_additional_info": item.required_data,
                "implementation_prerequisites": ["Administrative authorization", "Facilities site inspection"],
                "potential_risks_constraints": item.implementation_constraints,
                "confidence_score": 0.85,
                "priority_score": 75.0,
                "priority_level": "medium",
                "status": status,
                "source": "llm",
                "sdgs": item.sdgs or [13],
                "estimation_assumptions": {
                    "source": "LLM Contextual Analysis",
                    "numerical_claims_verified": False,
                    "calculation_engine_binding": "Required before implementation"
                },
                "evidence_references": [
                    {
                        "type": "llm_sustainability_model",
                        "description": f"Contextual reasoning generated by model {settings.llm_model} and validated against system schema.",
                        "confidence": "medium"
                    }
                ]
            }
            results.append(rec_dict)

        return results
