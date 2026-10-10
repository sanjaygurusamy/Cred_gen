"""
Unit validation and normalization utilities for CampusCarbon AI.
Ensures strict unit compatibility before deterministic carbon calculations.
"""

# Normalized base units for each emission category
CATEGORY_BASE_UNITS = {
    "electricity": "kWh",
    "fuel": "liter",
    "lpg": "kg",
    "diesel": "liter",
    "petrol": "liter",
    "natural_gas": "m3",
    "food": "kg",
    "waste": "kg",
    "water": "m3",
    "transport": "passenger_km",
    "air_conditioning": "kWh",
    "fabrication": "kWh"
}

# Conversion multipliers to standard base unit
CONVERSIONS_TO_BASE = {
    # Energy
    ("kWh", "kWh"): 1.0,
    ("MWh", "kWh"): 1000.0,
    ("GJ", "kWh"): 277.778,
    
    # Mass
    ("kg", "kg"): 1.0,
    ("g", "kg"): 0.001,
    ("ton", "kg"): 1000.0,
    ("tonne", "kg"): 1000.0,
    ("lbs", "kg"): 0.453592,
    
    # Volume
    ("liter", "liter"): 1.0,
    ("l", "liter"): 1.0,
    ("ml", "liter"): 0.001,
    ("gallon", "liter"): 3.78541,
    ("m3", "m3"): 1.0,
    ("liter", "m3"): 0.001,
    
    # Distance
    ("km", "km"): 1.0,
    ("passenger_km", "passenger_km"): 1.0,
    ("miles", "km"): 1.60934,
}

def are_units_compatible(activity_unit: str, factor_unit: str) -> bool:
    """
    Checks if an activity unit matches the denominator of an emission factor unit.
    E.g. activity_unit='kg' and factor_unit='kgCO2e/kg' -> Compatible.
    E.g. activity_unit='kWh' and factor_unit='kgCO2e/kWh' -> Compatible.
    """
    if not activity_unit or not factor_unit:
        return False
    
    act_norm = activity_unit.strip().lower()
    fac_norm = factor_unit.strip().lower()
    
    # Factor units usually formatted as kgCO2e/<unit> or tCO2e/<unit>
    if "/" in fac_norm:
        denominator = fac_norm.split("/")[-1].strip()
    else:
        denominator = fac_norm
        
    # Direct match
    if act_norm == denominator:
        return True
    
    # Aliases
    aliases = {
        "kwh": ["kwh", "kilowatt_hour", "kilowatt_hours"],
        "mwh": ["mwh", "megawatt_hour"],
        "kg": ["kg", "kilogram", "kilograms", "kg_per_day"],
        "liter": ["liter", "liters", "l", "ltr"],
        "m3": ["m3", "cubic_meter", "cubic_meters"],
        "passenger_km": ["passenger_km", "pkm", "km"]
    }
    
    for _, alias_group in aliases.items():
        if act_norm in alias_group and denominator in alias_group:
            return True
            
    return False

def normalize_activity_value(value: float, from_unit: str, to_unit: str) -> float:
    """
    Converts activity value between compatible units.
    """
    if from_unit.lower() == to_unit.lower():
        return value
    
    key = (from_unit.strip().lower(), to_unit.strip().lower())
    for (src, dst), mult in CONVERSIONS_TO_BASE.items():
        if src.lower() == key[0] and dst.lower() == key[1]:
            return value * mult
            
    # If no conversion known, raise ValueError
    raise ValueError(f"Incompatible unit conversion requested: {from_unit} to {to_unit}")
