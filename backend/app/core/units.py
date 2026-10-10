from typing import Dict, Optional, Set

# Canonical conversion factors to each category's standard base unit
STANDARD_CONVERSIONS: Dict[str, Dict[str, float]] = {
    # Base: kWh
    "kWh": {
        "kWh": 1.0,
        "kwh": 1.0,
        "MWh": 1000.0,
        "mwh": 1000.0,
        "GWh": 1000000.0,
    },
    # Base: m3
    "m3": {
        "m3": 1.0,
        "cubic_meter": 1.0,
        "litres": 0.001,
        "liters": 0.001,
        "L": 0.001,
        "l": 0.001,
        "kL": 1.0,
        "kl": 1.0,
    },
    # Base: kg
    "kg": {
        "kg": 1.0,
        "kilograms": 1.0,
        "tonnes": 1000.0,
        "tonne": 1000.0,
        "metric_tons": 1000.0,
        "grams": 0.001,
        "g": 0.001,
        "quintal": 100.0,
        "lbs": 0.453592,
        # LPG cylinder shortcuts
        "cylinders_19kg": 19.0,
        "cylinder_19kg": 19.0,
        "cylinders_14.2kg": 14.2,
        "cylinder_14.2kg": 14.2,
    },
    # Base: litres
    "litres": {
        "litres": 1.0,
        "liters": 1.0,
        "L": 1.0,
        "l": 1.0,
        "gallons": 3.78541,
        "gallon": 3.78541,
        "kL": 1000.0,
        "m3": 1000.0,
    },
    # Base: km
    "km": {
        "km": 1.0,
        "kilometers": 1.0,
        "kilometres": 1.0,
        "miles": 1.60934,
        "mile": 1.60934,
    },
    # Base: hours
    "hours": {
        "hours": 1.0,
        "hrs": 1.0,
        "hr": 1.0,
        "h": 1.0,
        "minutes": 1.0 / 60.0,
        "mins": 1.0 / 60.0,
        "min": 1.0 / 60.0,
    },
}


def convert_quantity_to_standard(
    quantity: float,
    from_unit: str,
    target_standard_unit: str,
    activity_conversions: Optional[Dict[str, float]] = None
) -> float:
    """
    Converts a reported measurement quantity from an input unit to the target standard unit.
    
    1. If from_unit matches target_standard_unit, returns quantity as-is.
    2. Checks activity-specific custom conversions dictionary if provided.
    3. Falls back to global canonical conversions dictionary.
    
    Raises:
        ValueError: If quantity is negative or if unit conversion is undefined.
    """
    if quantity < 0:
        raise ValueError("Measurement quantity cannot be negative.")

    from_u = from_unit.strip()
    target_u = target_standard_unit.strip()

    if from_u == target_u:
        return float(quantity)

    # 1. Check activity-specific conversion table
    if activity_conversions and from_u in activity_conversions:
        multiplier = activity_conversions[from_u]
        return round(float(quantity) * multiplier, 6)

    # 2. Check standard conversions map
    if target_u in STANDARD_CONVERSIONS:
        target_map = STANDARD_CONVERSIONS[target_u]
        if from_u in target_map:
            multiplier = target_map[from_u]
            return round(float(quantity) * multiplier, 6)

    raise ValueError(
        f"Unsupported unit '{from_unit}' for standard unit '{target_standard_unit}'. "
        f"Supported conversions for {target_standard_unit}: "
        f"{list(activity_conversions.keys()) if activity_conversions else list(STANDARD_CONVERSIONS.get(target_standard_unit, {}).keys())}"
    )
