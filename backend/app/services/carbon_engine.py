import logging
import uuid
from datetime import date
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.carbon import EmissionFactor, CarbonCalculationRecord
from app.models.activity import ActivityDefinition
from app.models.activity_record import DailyActivityRecord
from app.models.baseline import DailyElectricityEstimate, ElectricityBaseline
from app.models.block import CampusBlock

logger = logging.getLogger("campuscarbon.carbon_engine")


class CalculationValidationError(Exception):
    """Custom exception raised when calculation input violates methodology or double-counting safeguards."""
    def __init__(self, message: str, warning_code: str = "VALIDATION_FAILED"):
        super().__init__(message)
        self.message = message
        self.warning_code = warning_code


# ------------------------------------------------------------------------------
# Unit Standardization Matrix
# ------------------------------------------------------------------------------
KNOWN_UNIT_CONVERSIONS: Dict[str, Dict[str, float]] = {
    # Target: kWh
    "kWh": {
        "kWh": 1.0,
        "MWh": 1000.0,
    },
    # Target: litres
    "litres": {
        "litres": 1.0,
        "gallons": 3.78541,
        "m3": 1000.0,
        "kL": 1000.0,
    },
    # Target: kg
    "kg": {
        "kg": 1.0,
        "tonnes": 1000.0,
        "cylinders_19kg": 19.0,
        "cylinders_14.2kg": 14.2,
    },
    # Target: m3
    "m3": {
        "m3": 1.0,
        "kL": 1.0,
        "litres": 0.001,
    },
}


def standardize_unit(
    activity_code: str,
    quantity: float,
    source_unit: str,
    target_unit: str,
    db: Optional[Session] = None
) -> Tuple[float, float, str]:
    """
    Validates and standardizes quantity to the emission factor's target unit.
    Returns: (standardized_quantity, conversion_factor, conversion_steps_description)
    """
    if source_unit.lower() == target_unit.lower():
        return (quantity, 1.0, f"1.0 {source_unit} = 1.0 {target_unit}")

    # Check built-in conversions matrix
    if target_unit in KNOWN_UNIT_CONVERSIONS:
        conversions = KNOWN_UNIT_CONVERSIONS[target_unit]
        for unit_key, factor in conversions.items():
            if unit_key.lower() == source_unit.lower():
                std_qty = quantity * factor
                steps = f"{quantity} {source_unit} × {factor} = {std_qty} {target_unit}"
                return (std_qty, factor, steps)

    # Check DB activity definition unit_conversions if session provided
    if db:
        act_def = db.query(ActivityDefinition).filter(ActivityDefinition.code == activity_code).first()
        if act_def and act_def.unit_conversions:
            conversions = act_def.unit_conversions
            if source_unit in conversions:
                factor = float(conversions[source_unit])
                std_qty = quantity * factor
                steps = f"{quantity} {source_unit} × {factor} = {std_qty} {target_unit}"
                return (std_qty, factor, steps)

    raise CalculationValidationError(
        f"Incompatible unit '{source_unit}' for activity '{activity_code}'. "
        f"Emission factor requires '{target_unit}' or a verified conversion.",
        warning_code="INCOMPATIBLE_UNIT"
    )


# ------------------------------------------------------------------------------
# Factor Resolution Engine
# ------------------------------------------------------------------------------
def resolve_emission_factor(
    db: Session,
    activity_code: str,
    reporting_date: date,
    factor_id: Optional[str] = None
) -> EmissionFactor:
    """
    Resolves active emission factor for activity code and reporting date.
    Respects factor effective date ranges and historical versions.
    """
    if factor_id:
        factor = db.query(EmissionFactor).filter(EmissionFactor.id == factor_id).first()
        if not factor:
            raise CalculationValidationError(f"Emission factor ID '{factor_id}' not found.", "FACTOR_NOT_FOUND")
        return factor

    # Map activity code to canonical factor query
    factors = (
        db.query(EmissionFactor)
        .filter(
            EmissionFactor.applicable_activity_code == activity_code,
            EmissionFactor.is_active == True,
            EmissionFactor.effective_start_date <= reporting_date,
        )
        .order_by(desc(EmissionFactor.version))
        .all()
    )

    # Filter by effective end date if present
    valid_factor = None
    for f in factors:
        if f.effective_end_date is None or f.effective_end_date >= reporting_date:
            valid_factor = f
            break

    if not valid_factor:
        raise CalculationValidationError(
            f"No verified emission factor available for activity '{activity_code}' on {reporting_date}. "
            "Unsupported activity or missing factor.",
            warning_code="NO_APPLICABLE_FACTOR"
        )

    if valid_factor.status == "provisional" and not valid_factor.is_active:
        raise CalculationValidationError(
            f"Emission factor '{valid_factor.factor_code}' is provisional and lacks complete methodology parameters. "
            f"Methodology requirement: {valid_factor.calculation_methodology}",
            warning_code="FACTOR_PROVISIONAL_INACTIVE"
        )

    return valid_factor


# ------------------------------------------------------------------------------
# Core Calculation Service
# ------------------------------------------------------------------------------
def calculate_emissions(
    db: Session,
    block_id: str,
    reporting_date: date,
    activity_code: str,
    activity_record_id: Optional[str] = None,
    electricity_source: str = "auto",  # "measured" | "estimated" | "auto"
    custom_quantity: Optional[float] = None,
    custom_unit: Optional[str] = None,
    factor_id: Optional[str] = None,
    notes: Optional[str] = None,
    recalculating_record_id: Optional[str] = None,
) -> CarbonCalculationRecord:
    """
    Deterministic calculation engine executing greenhouse gas emission calculations
    with strict institutional safeguards, unit standardization, and audit preservation.
    """
    # 1. Fetch Block & validate existence
    block = db.query(CampusBlock).filter(CampusBlock.id == block_id).first()
    if not block:
        raise CalculationValidationError(f"Campus block ID '{block_id}' not found.", "BLOCK_NOT_FOUND")

    warnings: List[str] = []

    # -------------------------------------------------------------------------
    # 2. Activity Safeguards: Transportation, Generators, Waste Transfers, STP
    # -------------------------------------------------------------------------
    if activity_code == "TRANS_DISTANCE":
        raise CalculationValidationError(
            "Fleet vehicle distance travelled (km) cannot be multiplied by fuel combustion factors. "
            "Use fuel-based TRANS_FUEL_CONSUMPTION for primary Scope 1 calculations to prevent double-counting.",
            warning_code="TRANS_DISTANCE_DIRECT_PROHIBITED"
        )

    if activity_code == "GEN_ELECTRICITY_GENERATED":
        raise CalculationValidationError(
            "Generator gross electricity output (kWh) cannot be multiplied by fuel combustion factors. "
            "Direct Scope 1 emissions must be calculated from GEN_DIESEL_CONSUMPTION (diesel litres consumed) "
            "to avoid double-counting fuel combustion.",
            warning_code="GEN_ELECTRICITY_DIRECT_PROHIBITED"
        )

    if activity_code == "STP_WASTEWATER_TREATED":
        raise CalculationValidationError(
            "Wastewater hydraulic volume (m3) alone is insufficient for IPCC Chapter 6 biological treatment calculation. "
            "Methodology requires influent and effluent biochemical oxygen demand (BOD5/COD) lab telemetry, "
            "Methane Correction Factor (MCF), and sludge removal parameters. Calculations from volume alone are blocked.",
            warning_code="STP_VOLUME_ALONE_INSUFFICIENT"
        )

    # Waste transfers safeguard
    act_def = db.query(ActivityDefinition).filter(ActivityDefinition.code == activity_code).first()
    if act_def and act_def.is_transfer_activity:
        raise CalculationValidationError(
            f"Activity '{activity_code}' represents a waste transfer/dispatch event, not new waste generation. "
            "Counting transfer events as newly generated waste is prohibited (double-counting prevention).",
            warning_code="TRANSFER_ACTIVITY_PROHIBITED"
        )

    if block.code == "UTL-CWC" and activity_code in ["WASTE_FOOD", "WASTE_VEGETABLE"]:
        raise CalculationValidationError(
            "Hostel and dining hall food waste must be accounted at source blocks. "
            "Registering food waste at Central Waste Collection Yard creates duplicate emissions.",
            warning_code="CWC_FOOD_WASTE_DUPLICATION"
        )

    # -------------------------------------------------------------------------
    # 3. Resolve Activity Data & Electricity Integration (Phase 4)
    # -------------------------------------------------------------------------
    reported_qty: float = 0.0
    reported_unit: str = ""
    activity_data_type: str = "actual_activity"
    selected_reporting_source: str = "measured"
    selection_reason: str = "Direct measured activity record."
    resolved_act_record_id: Optional[str] = activity_record_id
    resolved_est_record_id: Optional[str] = None
    baseline_id: Optional[str] = None
    baseline_version: Optional[int] = None

    if custom_quantity is not None:
        # Ad-hoc calculation mode
        reported_qty = float(custom_quantity)
        reported_unit = custom_unit or (act_def.default_unit if act_def else "units")
        activity_data_type = "ad_hoc_input"
        selection_reason = f"Ad-hoc input quantity entered ({reported_qty} {reported_unit})."

    elif activity_code == "ELEC_CONSUMPTION":
        # Phase 4 Electricity Integration
        # Check actual utility meter reading
        actual_rec = None
        if activity_record_id:
            actual_rec = db.query(DailyActivityRecord).filter(DailyActivityRecord.id == activity_record_id).first()
        if not actual_rec:
            actual_rec = (
                db.query(DailyActivityRecord)
                .filter(
                    DailyActivityRecord.block_id == block_id,
                    DailyActivityRecord.activity_id == act_def.id if act_def else None,
                    DailyActivityRecord.reporting_date == reporting_date,
                    DailyActivityRecord.reading_identifier == "official_daily_total",
                )
                .first()
            )
        if not actual_rec:
            actual_rec = (
                db.query(DailyActivityRecord)
                .filter(
                    DailyActivityRecord.block_id == block_id,
                    DailyActivityRecord.activity_id == act_def.id if act_def else None,
                    DailyActivityRecord.reporting_date == reporting_date,
                )
                .order_by(desc(DailyActivityRecord.version))
                .first()
            )

        # Check estimated electricity record
        est_rec = (
            db.query(DailyElectricityEstimate)
            .filter(
                DailyElectricityEstimate.block_id == block_id,
                DailyElectricityEstimate.reporting_date == reporting_date,
            )
            .first()
        )

        if electricity_source == "measured":
            if not actual_rec:
                raise CalculationValidationError(
                    f"No measured utility meter reading found for {block.name} on {reporting_date}. "
                    "Select estimated electricity or record actual meter reading first.",
                    warning_code="NO_MEASURED_ELECTRICITY"
                )
            reported_qty = actual_rec.quantity
            reported_unit = actual_rec.unit
            activity_data_type = "actual_electricity"
            selected_reporting_source = actual_rec.data_status or "measured"
            selection_reason = (
                f"Official utility meter reading selected as primary measured value "
                f"({actual_rec.meter_boundary or 'grid_import'})."
            )
            resolved_act_record_id = actual_rec.id

        elif electricity_source == "estimated":
            if not est_rec:
                raise CalculationValidationError(
                    f"No electricity estimate found for {block.name} on {reporting_date}. "
                    "Run deterministic estimation for this date first.",
                    warning_code="NO_ESTIMATED_ELECTRICITY"
                )
            reported_qty = est_rec.total_estimated_kwh
            reported_unit = "kWh"
            activity_data_type = "estimated_electricity"
            selected_reporting_source = "estimated"
            selection_reason = (
                f"Deterministic electricity estimate applied: Baseline profile v{est_rec.baseline_version} "
                f"under '{est_rec.operational_mode}' operational mode."
            )
            resolved_est_record_id = est_rec.id
            baseline_id = est_rec.baseline_id
            baseline_version = est_rec.baseline_version

        else:  # "auto": prefers measured if available, else falls back to estimate
            if actual_rec:
                reported_qty = actual_rec.quantity
                reported_unit = actual_rec.unit
                activity_data_type = "actual_electricity"
                selected_reporting_source = actual_rec.data_status or "measured"
                selection_reason = (
                    f"Official utility meter reading selected (preferred measured value). "
                    f"Boundary: {actual_rec.meter_boundary or 'grid_import'}."
                )
                resolved_act_record_id = actual_rec.id
                if est_rec:
                    warnings.append(
                        f"Deterministic estimate of {est_rec.total_estimated_kwh:.1f} kWh exists for this date, "
                        "but was NOT added to measured consumption (double-counting prevention)."
                    )
            elif est_rec:
                reported_qty = est_rec.total_estimated_kwh
                reported_unit = "kWh"
                activity_data_type = "estimated_electricity"
                selected_reporting_source = "estimated"
                selection_reason = (
                    f"Utility meter reading unavailable for {reporting_date}. "
                    f"Estimated value from Baseline v{est_rec.baseline_version} applied."
                )
                resolved_est_record_id = est_rec.id
                baseline_id = est_rec.baseline_id
                baseline_version = est_rec.baseline_version
                warnings.append("Calculated using estimated baseline telemetry due to absence of fiscal utility meter reading.")
            else:
                raise CalculationValidationError(
                    f"Neither measured meter reading nor daily estimate found for {block.name} on {reporting_date}.",
                    warning_code="NO_ELECTRICITY_DATA"
                )

    else:
        # Standard activity record lookup
        if activity_record_id:
            act_rec = db.query(DailyActivityRecord).filter(DailyActivityRecord.id == activity_record_id).first()
        else:
            act_rec = (
                db.query(DailyActivityRecord)
                .filter(
                    DailyActivityRecord.block_id == block_id,
                    DailyActivityRecord.activity_id == act_def.id if act_def else None,
                    DailyActivityRecord.reporting_date == reporting_date,
                )
                .order_by(desc(DailyActivityRecord.version))
                .first()
            )

        if not act_rec:
            raise CalculationValidationError(
                f"No daily activity record found for '{activity_code}' at {block.name} on {reporting_date}.",
                warning_code="NO_ACTIVITY_RECORD"
            )

        reported_qty = act_rec.quantity
        reported_unit = act_rec.unit
        activity_data_type = "actual_activity"
        selected_reporting_source = act_rec.data_status
        selection_reason = f"Recorded via {act_rec.measurement_method} ({act_rec.reading_identifier})."
        resolved_act_record_id = act_rec.id

    # -------------------------------------------------------------------------
    # 4. Resolve Emission Factor
    # -------------------------------------------------------------------------
    ef = resolve_emission_factor(db, activity_code, reporting_date, factor_id)

    # -------------------------------------------------------------------------
    # 5. Unit Conversion & Standardization
    # -------------------------------------------------------------------------
    std_qty, conv_factor, conv_steps = standardize_unit(
        activity_code=activity_code,
        quantity=reported_qty,
        source_unit=reported_unit,
        target_unit=ef.target_activity_unit,
        db=db,
    )

    # -------------------------------------------------------------------------
    # 6. Deterministic Mathematical Calculation
    # -------------------------------------------------------------------------
    # Formula: Emissions (kg CO2e) = Standardized Quantity * Emission Factor Value
    emissions_kg = round(std_qty * ef.factor_value, 4)
    emissions_t = round(emissions_kg / 1000.0, 6)
    formula_desc = f"{std_qty} {ef.target_activity_unit} × {ef.factor_value} {ef.factor_unit} = {emissions_kg} kg CO2e"

    # -------------------------------------------------------------------------
    # 7. Recalculation & Superseding Lifecycle
    # -------------------------------------------------------------------------
    version_num = 1
    if recalculating_record_id:
        old_record = db.query(CarbonCalculationRecord).filter(CarbonCalculationRecord.id == recalculating_record_id).first()
        if old_record:
            version_num = old_record.version + 1
            old_record.is_superseded = True
            old_record.status = "superseded"
            logger.info("Superseding calculation record %s with v%s", recalculating_record_id, version_num)

    # -------------------------------------------------------------------------
    # 8. Persist Calculation Record
    # -------------------------------------------------------------------------
    calc_record = CarbonCalculationRecord(
        id=str(uuid.uuid4()),
        organization_id=block.campus.organization_id if block.campus else "org-01",
        campus_id=block.campus_id,
        block_id=block.id,
        reporting_date=reporting_date,
        reporting_period_end=None,
        activity_record_id=resolved_act_record_id,
        electricity_estimate_id=resolved_est_record_id,
        activity_code=activity_code,
        activity_category=ef.category,
        scope=ef.scope,
        activity_data_type=activity_data_type,
        reported_quantity=reported_qty,
        reported_unit=reported_unit,
        standardized_quantity=std_qty,
        standardized_unit=ef.target_activity_unit,
        conversion_factor_applied=conv_factor,
        conversion_steps=conv_steps,
        emission_factor_id=ef.id,
        emission_factor_code=ef.factor_code,
        emission_factor_version=ef.version,
        emission_factor_value=ef.factor_value,
        emission_factor_unit=ef.factor_unit,
        emission_factor_source=f"{ef.source_organization} ({ef.reference_document})",
        formula=formula_desc,
        emissions_kg_co2e=emissions_kg,
        emissions_t_co2e=emissions_t,
        selected_reporting_source=selected_reporting_source,
        selection_reason=selection_reason,
        baseline_id=baseline_id,
        baseline_version=baseline_version,
        is_superseded=False,
        status="recalculated" if recalculating_record_id else "calculated",
        version=version_num,
        methodology_notes=ef.calculation_methodology,
        validation_warnings=warnings,
    )

    if recalculating_record_id and old_record:
        old_record.superseded_by_id = calc_record.id

    db.add(calc_record)
    db.commit()
    db.refresh(calc_record)

    logger.info(
        "Successfully calculated emissions for %s on %s: %s kg CO2e (v%s)",
        activity_code, reporting_date, emissions_kg, version_num
    )
    return calc_record
