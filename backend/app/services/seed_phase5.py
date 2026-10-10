import logging
from datetime import date
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.carbon import EmissionFactor

logger = logging.getLogger("campuscarbon.seed_phase5")

CANONICAL_EMISSION_FACTORS: List[Dict[str, Any]] = [
    # -------------------------------------------------------------------------
    # 1. SCOPE 2: Grid Electricity & On-site Solar PV
    # -------------------------------------------------------------------------
    {
        "factor_code": "EF_IN_GRID_CEA_V19",
        "name": "CEA Indian National Grid Combined Margin CO2 Baseline",
        "category": "electricity",
        "applicable_activity_code": "ELEC_CONSUMPTION",
        "fuel_or_material": "grid_electricity",
        "scope": "scope_2",
        "factor_value": 0.716,  # kg CO2e / kWh (0.716 tCO2/MWh)
        "factor_unit": "kg CO2e/kWh",
        "target_activity_unit": "kWh",
        "geography": "India (National Grid)",
        "source_organization": "Central Electricity Authority (CEA), Ministry of Power, Govt. of India",
        "reference_document": "CO2 Baseline Database for the Indian Power Sector, User Guide Version 19.0 (Dec 2023)",
        "reference_url": "https://cea.nic.in/cdm-co2-baseline-database/",
        "publication_year": 2023,
        "applicable_reporting_year": 2024,
        "effective_start_date": date(2024, 1, 1),
        "effective_end_date": None,
        "version": 1,
        "calculation_methodology": (
            "Combined Margin (CM) grid emission factor weighted 50% Operating Margin (OM) "
            "and 50% Build Margin (BM) for the unified Indian National Electricity Grid. "
            "Excludes generation from renewable captive sources."
        ),
        "status": "verified",
        "is_active": True,
    },
    {
        "factor_code": "EF_SOLAR_PV_ONSITE",
        "name": "On-Site Rooftop Solar PV Direct Scope 2 Generation",
        "category": "renewables",
        "applicable_activity_code": "SOLAR_ELEC_GEN",
        "fuel_or_material": "solar_pv_electricity",
        "scope": "scope_2",
        "factor_value": 0.0,
        "factor_unit": "kg CO2e/kWh",
        "target_activity_unit": "kWh",
        "geography": "India / Global",
        "source_organization": "GHG Protocol / IPCC 2006 Guidelines",
        "reference_document": "GHG Protocol Scope 2 Guidance (Direct Generation Zero Scope 2 Attribution)",
        "reference_url": "https://ghgprotocol.org/scope_2_guidance",
        "publication_year": 2015,
        "applicable_reporting_year": 2024,
        "effective_start_date": date(2020, 1, 1),
        "effective_end_date": None,
        "version": 1,
        "calculation_methodology": (
            "Zero direct combustion emissions during active on-site photovoltaic solar electricity generation. "
            "Distinguishes clean solar generation from grid power imports."
        ),
        "status": "verified",
        "is_active": True,
    },

    # -------------------------------------------------------------------------
    # 2. SCOPE 1: Stationary Fuels (Boilers, Cooking LPG, Emergency Power)
    # -------------------------------------------------------------------------
    {
        "factor_code": "EF_DIESEL_STATIONARY_IPCC",
        "name": "High Speed Diesel (HSD) Stationary Combustion",
        "category": "fuels",
        "applicable_activity_code": "FUEL_DIESEL",
        "fuel_or_material": "diesel",
        "scope": "scope_1",
        "factor_value": 2.68,  # kg CO2e / litre
        "factor_unit": "kg CO2e/litre",
        "target_activity_unit": "litres",
        "geography": "India / IPCC 2006 Default",
        "source_organization": "IPCC 2006 Guidelines / India GHG Program",
        "reference_document": "2006 IPCC Guidelines for National Greenhouse Gas Inventories, Vol. 2 Energy, Table 1.4 & Table 2.2",
        "reference_url": "https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html",
        "publication_year": 2006,
        "applicable_reporting_year": 2024,
        "effective_start_date": date(2020, 1, 1),
        "effective_end_date": None,
        "version": 1,
        "calculation_methodology": (
            "Tier 1 stationary combustion using NCV 43.0 TJ/Gg, density 0.84 kg/L, and carbon emission "
            "factor 74.1 tCO2/TJ (including small N2O and CH4 contributions converted with AR5 GWPs)."
        ),
        "status": "verified",
        "is_active": True,
    },
    {
        "factor_code": "EF_PETROL_STATIONARY_IPCC",
        "name": "Motor Gasoline / Petrol Stationary Equipment Combustion",
        "category": "fuels",
        "applicable_activity_code": "FUEL_PETROL",
        "fuel_or_material": "petrol",
        "scope": "scope_1",
        "factor_value": 2.31,  # kg CO2e / litre
        "factor_unit": "kg CO2e/litre",
        "target_activity_unit": "litres",
        "geography": "India / IPCC 2006 Default",
        "source_organization": "IPCC 2006 Guidelines / India GHG Program",
        "reference_document": "2006 IPCC Guidelines for National Greenhouse Gas Inventories, Vol. 2 Energy, Table 1.4 & Table 2.2",
        "reference_url": "https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html",
        "publication_year": 2006,
        "applicable_reporting_year": 2024,
        "effective_start_date": date(2020, 1, 1),
        "effective_end_date": None,
        "version": 1,
        "calculation_methodology": (
            "Tier 1 stationary combustion using NCV 44.3 TJ/Gg, density 0.74 kg/L, and carbon emission "
            "factor 69.3 tCO2/TJ with 100% oxidation assumption."
        ),
        "status": "verified",
        "is_active": True,
    },
    {
        "factor_code": "EF_LPG_COOKING_IPCC",
        "name": "Commercial Liquefied Petroleum Gas (LPG) Combustion",
        "category": "fuels",
        "applicable_activity_code": "FUEL_LPG",
        "fuel_or_material": "lpg",
        "scope": "scope_1",
        "factor_value": 2.983,  # kg CO2e / kg
        "factor_unit": "kg CO2e/kg",
        "target_activity_unit": "kg",
        "geography": "India / IPCC 2006 Default",
        "source_organization": "IPCC 2006 Guidelines / Ministry of Petroleum & Natural Gas (MoPNG)",
        "reference_document": "2006 IPCC Guidelines for National Greenhouse Gas Inventories, Vol. 2 Energy, Table 2.4",
        "reference_url": "https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html",
        "publication_year": 2006,
        "applicable_reporting_year": 2024,
        "effective_start_date": date(2020, 1, 1),
        "effective_end_date": None,
        "version": 1,
        "calculation_methodology": (
            "Tier 1 default commercial cooking combustion based on NCV 47.3 TJ/Gg and carbon emission factor "
            "63.1 tCO2/TJ (2.983 kg CO2e per kg of LPG)."
        ),
        "status": "verified",
        "is_active": True,
    },
    {
        "factor_code": "EF_GEN_DIESEL_IPCC",
        "name": "Emergency Diesel Generator (DG Set) Fuel Combustion",
        "category": "generator",
        "applicable_activity_code": "GEN_DIESEL_CONSUMPTION",
        "fuel_or_material": "diesel",
        "scope": "scope_1",
        "factor_value": 2.68,  # kg CO2e / litre
        "factor_unit": "kg CO2e/litre",
        "target_activity_unit": "litres",
        "geography": "India / IPCC 2006 Default",
        "source_organization": "IPCC 2006 Guidelines / Central Pollution Control Board (CPCB)",
        "reference_document": "2006 IPCC Guidelines, Vol. 2 Energy, Stationary Combustion in Energy Industries",
        "reference_url": "https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html",
        "publication_year": 2006,
        "applicable_reporting_year": 2024,
        "effective_start_date": date(2020, 1, 1),
        "effective_end_date": None,
        "version": 1,
        "calculation_methodology": (
            "Direct fuel combustion emissions calculated strictly from diesel fuel volume consumed. "
            "Safeguard: Gross electricity output is not counted as a second direct fuel emission."
        ),
        "status": "verified",
        "is_active": True,
    },

    # -------------------------------------------------------------------------
    # 3. SCOPE 1: Transportation Fleet (Fuel-based direct mobile combustion)
    # -------------------------------------------------------------------------
    {
        "factor_code": "EF_TRANS_DIESEL_IPCC",
        "name": "Institutional Fleet Vehicle Diesel Combustion",
        "category": "transportation",
        "applicable_activity_code": "TRANS_FUEL_CONSUMPTION",
        "fuel_or_material": "diesel",
        "scope": "scope_1",
        "factor_value": 2.68,  # kg CO2e / litre
        "factor_unit": "kg CO2e/litre",
        "target_activity_unit": "litres",
        "geography": "India / IPCC 2006 Default",
        "source_organization": "IPCC 2006 Guidelines / India GHG Program",
        "reference_document": "2006 IPCC Guidelines, Vol. 2 Energy, Mobile Combustion Table 3.2.1",
        "reference_url": "https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html",
        "publication_year": 2006,
        "applicable_reporting_year": 2024,
        "effective_start_date": date(2020, 1, 1),
        "effective_end_date": None,
        "version": 1,
        "calculation_methodology": (
            "Direct mobile combustion from road transportation diesel fuel. "
            "Safeguard: Applied directly to fuel litres; distance-based estimates for the same vehicle "
            "and period are suppressed to prevent double-counting."
        ),
        "status": "verified",
        "is_active": True,
    },

    # -------------------------------------------------------------------------
    # 4. SCOPE 3: Solid Waste & Composting (Biological treatment & recycling)
    # -------------------------------------------------------------------------
    {
        "factor_code": "EF_FOOD_WASTE_COMPOST_IPCC",
        "name": "Organic Food Waste Biological Composting Treatment",
        "category": "food_waste",
        "applicable_activity_code": "WASTE_FOOD",
        "fuel_or_material": "organic_waste_compost",
        "scope": "scope_3",
        "factor_value": 0.102,  # kg CO2e / kg wet waste
        "factor_unit": "kg CO2e/kg",
        "target_activity_unit": "kg",
        "geography": "India / IPCC 2006 Default",
        "source_organization": "IPCC 2006 Guidelines for National Greenhouse Gas Inventories, Vol. 5 Waste",
        "reference_document": "2006 IPCC Guidelines, Vol. 5 Waste, Chapter 4 Biological Treatment of Solid Waste, Table 4.1",
        "reference_url": "https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol5.html",
        "publication_year": 2006,
        "applicable_reporting_year": 2024,
        "effective_start_date": date(2020, 1, 1),
        "effective_end_date": None,
        "version": 1,
        "calculation_methodology": (
            "Tier 1 aerobic composting process emissions: 4 g CH4/kg wet waste + 0.3 g N2O/kg wet waste "
            "converted to kg CO2e using IPCC AR5 100-year GWPs (CH4=28, N2O=265). Total: 0.102 kg CO2e/kg."
        ),
        "status": "verified",
        "is_active": True,
    },
    {
        "factor_code": "EF_VEG_WASTE_COMPOST_IPCC",
        "name": "Vegetable Prep Scraps Biological Composting Treatment",
        "category": "food_waste",
        "applicable_activity_code": "WASTE_VEGETABLE",
        "fuel_or_material": "vegetable_waste_compost",
        "scope": "scope_3",
        "factor_value": 0.102,
        "factor_unit": "kg CO2e/kg",
        "target_activity_unit": "kg",
        "geography": "India / IPCC 2006 Default",
        "source_organization": "IPCC 2006 Guidelines for National Greenhouse Gas Inventories, Vol. 5 Waste",
        "reference_document": "2006 IPCC Guidelines, Vol. 5 Waste, Chapter 4 Biological Treatment of Solid Waste, Table 4.1",
        "reference_url": "https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol5.html",
        "publication_year": 2006,
        "applicable_reporting_year": 2024,
        "effective_start_date": date(2020, 1, 1),
        "effective_end_date": None,
        "version": 1,
        "calculation_methodology": (
            "Tier 1 biological treatment factor for segregated pre-consumer raw culinary vegetable scraps."
        ),
        "status": "verified",
        "is_active": True,
    },
    {
        "factor_code": "EF_WASTE_PAPER_RECYCLED",
        "name": "Segregated Paper & Cardboard Recycling Processing",
        "category": "solid_waste",
        "applicable_activity_code": "WASTE_PAPER",
        "fuel_or_material": "paper_recycling",
        "scope": "scope_3",
        "factor_value": 0.021,  # kg CO2e / kg
        "factor_unit": "kg CO2e/kg",
        "target_activity_unit": "kg",
        "geography": "India / CPCB & DEFRA Reference",
        "source_organization": "Central Pollution Control Board (CPCB) / UK DEFRA",
        "reference_document": "CPCB Solid Waste Management Processing Parameters & DEFRA Material Recovery Factors",
        "reference_url": "https://cpcb.nic.in/",
        "publication_year": 2021,
        "applicable_reporting_year": 2024,
        "effective_start_date": date(2021, 1, 1),
        "effective_end_date": None,
        "version": 1,
        "calculation_methodology": (
            "Direct material handling, sorting, and compaction energy emissions for clean segregated paper/cardboard. "
            "Excludes avoided landfill methane credit."
        ),
        "status": "verified",
        "is_active": True,
    },
    {
        "factor_code": "EF_WASTE_PLASTIC_RECYCLED",
        "name": "Segregated Plastics Mechanical Recycling Processing",
        "category": "solid_waste",
        "applicable_activity_code": "WASTE_PLASTIC",
        "fuel_or_material": "plastic_recycling",
        "scope": "scope_3",
        "factor_value": 0.045,  # kg CO2e / kg
        "factor_unit": "kg CO2e/kg",
        "target_activity_unit": "kg",
        "geography": "India / CPCB Reference",
        "source_organization": "CPCB / Plastic Waste Management Rules 2016",
        "reference_document": "CPCB Technical Guidelines for Plastic Waste Recycling Units, Table 3",
        "reference_url": "https://cpcb.nic.in/",
        "publication_year": 2021,
        "applicable_reporting_year": 2024,
        "effective_start_date": date(2021, 1, 1),
        "effective_end_date": None,
        "version": 1,
        "calculation_methodology": (
            "Specific electrical energy for mechanical sorting, shredding, and washing of clean segregated plastics."
        ),
        "status": "verified",
        "is_active": True,
    },

    # -------------------------------------------------------------------------
    # 5. PROVISIONAL / METHODOLOGY-CONSTRAINED FACTORS (Safeguard Demonstration)
    # -------------------------------------------------------------------------
    {
        "factor_code": "EF_STP_WASTEWATER_IPCC_CH6",
        "name": "Sewage Treatment Plant IPCC Chapter 6 (Requires BOD/COD Lab Telemetry)",
        "category": "sewage_treatment",
        "applicable_activity_code": "STP_WASTEWATER_TREATED",
        "fuel_or_material": "wastewater_biological_treatment",
        "scope": "scope_3",
        "factor_value": 0.0,
        "factor_unit": "kg CO2e/m3",
        "target_activity_unit": "m3",
        "geography": "India / IPCC 2006 Default",
        "source_organization": "IPCC 2006 Guidelines, Vol. 5 Waste, Chapter 6 Wastewater Treatment",
        "reference_document": "IPCC 2006 Vol. 5 Chapter 6 Section 6.2 Domestic Wastewater Guidelines",
        "reference_url": "https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol5.html",
        "publication_year": 2006,
        "applicable_reporting_year": 2024,
        "effective_start_date": date(2020, 1, 1),
        "effective_end_date": None,
        "version": 1,
        "calculation_methodology": (
            "Methodology requires Influent Organics (BOD_in), Effluent Organics (BOD_out), "
            "Methane Correction Factor (MCF), Maximum Methane Producing Capacity (B_o), and Sludge Removal. "
            "Wastewater emissions cannot be calculated from hydraulic volume alone without BOD/COD lab tests. "
            "Status is PROVISIONAL to block unsupported calculations."
        ),
        "status": "provisional",
        "is_active": False,  # Inactive for unconstrained volume multiplication
    },
]


def seed_canonical_emission_factors(db: Session) -> Dict[str, int]:
    """
    Idempotently seeds authoritative greenhouse gas emission factors into PostgreSQL.
    Preserves existing factors and versions.
    """
    created_count = 0
    updated_count = 0
    skipped_count = 0

    for factor_data in CANONICAL_EMISSION_FACTORS:
        existing = (
            db.query(EmissionFactor)
            .filter(
                EmissionFactor.factor_code == factor_data["factor_code"],
                EmissionFactor.version == factor_data.get("version", 1),
            )
            .first()
        )

        if not existing:
            factor = EmissionFactor(**factor_data)
            db.add(factor)
            created_count += 1
            logger.info("Created canonical emission factor: %s (v%s)", factor_data["factor_code"], factor_data.get("version", 1))
        else:
            # Update non-destructive metadata
            existing.name = factor_data["name"]
            existing.source_organization = factor_data["source_organization"]
            existing.reference_document = factor_data["reference_document"]
            existing.reference_url = factor_data.get("reference_url")
            existing.calculation_methodology = factor_data.get("calculation_methodology")
            existing.status = factor_data.get("status", "verified")
            existing.is_active = factor_data.get("is_active", True)
            updated_count += 1
            skipped_count += 1

    db.commit()
    logger.info("Emission factor seed completed: %d created, %d updated", created_count, updated_count)
    return {
        "created_factors": created_count,
        "updated_factors": updated_count,
        "total_canonical": len(CANONICAL_EMISSION_FACTORS),
    }
