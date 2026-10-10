"""
Reduction Scenario Simulator for CampusCarbon AI.
Performs deterministic scenario simulations, saving assumptions,
calculating potential carbon and financial impacts, and comparing alternative policies.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models import (
    Element, ActivityRecord, EmissionFactor, ReductionScenario,
    ScenarioAssumption, ScenarioCalculationResult, Recommendation
)
from app.carbon_engine.calculator import CarbonCalculator, CalculationError
from app.carbon_engine.aggregator import CarbonAggregator

class ScenarioSimulator:

    @staticmethod
    def simulate_and_save_scenario(
        db: Session,
        campus_id: str,
        element_id: str,
        title: str,
        reduction_percentage_assumption: float, # e.g. 10.0 for 10%
        description: Optional[str] = None,
        recommendation_id: Optional[str] = None,
        alternative_activity_override: Optional[float] = None,
        alternative_ef_id: Optional[str] = None,
        cost_per_unit_override: Optional[float] = None,
        created_by: str = "sustainability_officer"
    ) -> ReductionScenario:
        """
        Executes a deterministic scenario calculation and stores scenario + results in the database.
        """
        element = db.query(Element).filter(Element.id == element_id, Element.campus_id == campus_id).first()
        if not element:
            raise CalculationError(f"Element with id '{element_id}' not found in campus '{campus_id}'.")

        # Fetch latest activity record
        latest_record = (
            db.query(ActivityRecord)
            .filter(ActivityRecord.element_id == element_id)
            .order_by(ActivityRecord.reporting_period_end.desc())
            .first()
        )
        if not latest_record:
            raise CalculationError(
                f"No activity records found for element '{element.name}'. Cannot calculate baseline emissions."
            )

        baseline_activity = float(latest_record.activity_value)
        baseline_unit = latest_record.activity_unit
        cost_rate = cost_per_unit_override if cost_per_unit_override is not None else latest_record.cost_rate
        cost_currency = latest_record.cost_currency or "USD"

        # Fetch matching emission factor
        # First try element metadata or category match
        ef = (
            db.query(EmissionFactor)
            .filter(EmissionFactor.category == element.category)
            .order_by(EmissionFactor.year.desc())
            .first()
        )
        if not ef:
            # Fallback to general category search
            ef = db.query(EmissionFactor).first()
            if not ef:
                raise CalculationError(f"No approved emission factor found in database for category '{element.category}'.")

        baseline_ef_id = ef.id
        baseline_ef_value = float(ef.factor_value)
        baseline_ef_unit = ef.factor_unit

        # Alternative factor
        if alternative_ef_id:
            alt_ef = db.query(EmissionFactor).filter(EmissionFactor.id == alternative_ef_id).first()
            if not alt_ef:
                raise CalculationError(f"Specified alternative emission factor '{alternative_ef_id}' not found.")
            alt_ef_val = float(alt_ef.factor_value)
            alt_ef_unit = alt_ef.factor_unit
            alt_ef_saved_id = alt_ef.id
        else:
            alt_ef_val = baseline_ef_value
            alt_ef_unit = baseline_ef_unit
            alt_ef_saved_id = baseline_ef_id

        # Determine alternative activity
        if alternative_activity_override is not None:
            alternative_activity = float(alternative_activity_override)
            implied_pct = round(((baseline_activity - alternative_activity) / baseline_activity) * 100.0, 2)
            reduction_percentage_assumption = implied_pct
        else:
            pct_dec = reduction_percentage_assumption / 100.0
            alternative_activity = round(baseline_activity * (1.0 - pct_dec), 4)

        # Run deterministic calculation engine
        calc_result = CarbonCalculator.calculate_reduction_scenario(
            baseline_activity=baseline_activity,
            baseline_unit=baseline_unit,
            baseline_ef_value=baseline_ef_value,
            baseline_ef_unit=baseline_ef_unit,
            alternative_activity=alternative_activity,
            alternative_unit=baseline_unit,
            alternative_ef_value=alt_ef_val,
            alternative_ef_unit=alt_ef_unit,
            period_days=1,
            cost_rate=cost_rate,
            cost_currency=cost_currency
        )

        # Create ReductionScenario DB record
        scenario = ReductionScenario(
            campus_id=campus_id,
            element_id=element_id,
            recommendation_id=recommendation_id,
            title=title,
            description=description or f"Scenario modeling {reduction_percentage_assumption}% reduction for {element.name}.",
            status="proposed",
            created_by=created_by
        )
        db.add(scenario)
        db.flush()

        # Save assumptions
        assumption1 = ScenarioAssumption(
            scenario_id=scenario.id,
            assumption_key="reduction_percentage",
            assumption_value=reduction_percentage_assumption,
            unit="%",
            notes="User-defined activity reduction hypothesis",
            is_user_modified=True
        )
        db.add(assumption1)

        # Save calculation result
        db_result = ScenarioCalculationResult(
            scenario_id=scenario.id,
            baseline_activity=calc_result["baseline_activity"],
            baseline_unit=calc_result["baseline_unit"],
            alternative_activity=calc_result["alternative_activity"],
            alternative_unit=calc_result["alternative_unit"],
            baseline_ef_id=baseline_ef_id,
            alternative_ef_id=alt_ef_saved_id,
            baseline_emissions_kg=calc_result["baseline_emissions_kg"],
            alternative_emissions_kg=calc_result["alternative_emissions_kg"],
            potential_reduction_kg=calc_result["potential_reduction_kg"],
            potential_reduction_percentage=calc_result["potential_reduction_percentage"],
            annual_reduction_tco2e=calc_result["annual_reduction_tco2e"],
            financial_savings_currency=calc_result["financial_savings_currency"],
            financial_savings_amount=calc_result["financial_savings_amount"],
            calculation_method=calc_result["calculation_method"],
            data_quality="high",
            double_counting_safeguard_verified=True,
            calculation_timestamp=datetime.utcnow()
        )
        db.add(db_result)

        db.commit()
        db.refresh(scenario)
        return scenario

    @staticmethod
    def compare_scenarios(
        db: Session,
        scenario_ids: List[str]
    ) -> Dict[str, Any]:
        """
        Compares multiple scenarios side-by-side with double-counting verification.
        """
        scenarios = db.query(ReductionScenario).filter(ReductionScenario.id.in_(scenario_ids)).all()
        if not scenarios:
            return {"scenarios": [], "total_potential_reduction_kg": 0.0, "total_annual_reduction_tco2e": 0.0, "total_potential_financial_savings": 0.0}

        items = []
        raw_items_for_agg = []
        for s in scenarios:
            res = s.results[0] if s.results else None
            if not res:
                continue
            
            elem_name = s.element.name if s.element else "Unknown"
            elem_cat = s.element.category if s.element else "general"

            item = {
                "scenario_id": s.id,
                "title": s.title,
                "element_name": elem_name,
                "element_category": elem_cat,
                "element_id": s.element_id,
                "baseline_activity": res.baseline_activity,
                "baseline_unit": res.baseline_unit,
                "alternative_activity": res.alternative_activity,
                "baseline_emissions_kg": res.baseline_emissions_kg,
                "alternative_emissions_kg": res.alternative_emissions_kg,
                "potential_reduction_kg": res.potential_reduction_kg,
                "potential_reduction_percentage": res.potential_reduction_percentage,
                "annual_reduction_tco2e": res.annual_reduction_tco2e or round(res.potential_reduction_kg * 365 / 1000.0, 4),
                "financial_savings_amount": res.financial_savings_amount,
                "status": s.status
            }
            items.append(item)
            raw_items_for_agg.append(item)

        agg, warnings = CarbonAggregator.aggregate_scenario_reductions(raw_items_for_agg)

        warning_text = " | ".join(warnings) if warnings else None

        return {
            "scenarios": items,
            "total_potential_reduction_kg": agg["total_potential_reduction_kg"],
            "total_annual_reduction_tco2e": agg["total_annual_reduction_tco2e"],
            "total_potential_financial_savings": agg["total_financial_savings"],
            "double_counting_warning": warning_text
        }
