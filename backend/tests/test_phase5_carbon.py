import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import get_db
from app.models.carbon import EmissionFactor, CarbonCalculationRecord
from app.models.block import CampusBlock
from app.models.activity import ActivityDefinition
from app.models.activity_record import DailyActivityRecord
from app.models.baseline import DailyElectricityEstimate, ElectricityBaseline
from app.services.seed_phase5 import seed_canonical_emission_factors

client = TestClient(app)


@pytest.fixture
def db_session():
    """Provides a transactional database session for tests."""
    from app.core.database import get_session_factory
    SessionFactory = get_session_factory()
    session = SessionFactory()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def ensure_canonical_factors(db_session: Session):
    """Ensure canonical factors exist before each test."""
    seed_canonical_emission_factors(db_session)


def get_ab1_block_id(db: Session) -> str:
    """Helper to retrieve AB1 block ID."""
    block = db.query(CampusBlock).filter(CampusBlock.code == "AB1").first()
    assert block is not None, "AB1 block must exist from Phase 2 seed"
    return block.id


# ==============================================================================
# 1. Emission Factor Catalogue & Traceability Tests
# ==============================================================================

def test_seed_canonical_emission_factors_and_idempotence(db_session: Session):
    """Verify that all 12 canonical emission factors are seeded and idempotent."""
    res1 = seed_canonical_emission_factors(db_session)
    assert res1["total_canonical"] >= 12
    # Second run must create 0 new factors
    res2 = seed_canonical_emission_factors(db_session)
    assert res2["created_factors"] == 0


def test_list_emission_factors_api():
    """Verify emission factor catalogue listing, filtering, and citations."""
    resp = client.get("/api/v1/carbon/factors")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 12
    assert len(data["items"]) >= 12

    # Filter by Scope 2
    resp_s2 = client.get("/api/v1/carbon/factors?scope=scope_2")
    assert resp_s2.status_code == 200
    s2_data = resp_s2.json()
    codes = [item["factor_code"] for item in s2_data["items"]]
    assert "EF_IN_GRID_CEA_V19" in codes
    assert "EF_SOLAR_PV_ONSITE" in codes

    # Filter by Category: fuels
    resp_fuels = client.get("/api/v1/carbon/factors?category=fuels")
    assert resp_fuels.status_code == 200
    fuel_codes = [item["factor_code"] for item in resp_fuels.json()["items"]]
    assert "EF_DIESEL_STATIONARY_IPCC" in fuel_codes
    assert "EF_LPG_COOKING_IPCC" in fuel_codes


# ==============================================================================
# 2. Electricity Calculations & Phase 4 Integration Tests
# ==============================================================================

def test_deterministic_grid_electricity_calculation(db_session: Session):
    """
    Verify deterministic Scope 2 calculation for grid electricity:
    1000 kWh * 0.716 kg CO2e/kWh = 716.0 kg CO2e (0.716 tCO2e).
    """
    ab1_id = get_ab1_block_id(db_session)
    test_date = "2026-11-20"

    resp = client.post("/api/v1/carbon/calculate", json={
        "block_id": ab1_id,
        "reporting_date": test_date,
        "activity_code": "ELEC_CONSUMPTION",
        "custom_quantity": 1000.0,
        "custom_unit": "kWh",
    })
    assert resp.status_code == 201
    data = resp.json()

    assert data["scope"] == "scope_2"
    assert data["emission_factor_code"] == "EF_IN_GRID_CEA_V19"
    assert data["emission_factor_value"] == 0.716
    assert data["standardized_quantity"] == 1000.0
    assert data["standardized_unit"] == "kWh"
    assert data["emissions_kg_co2e"] == 716.0
    assert data["emissions_t_co2e"] == 0.716
    assert "CEA" in data["emission_factor_source"]


def test_mwh_to_kwh_unit_conversion(db_session: Session):
    """
    Verify unit conversion: 1.5 MWh = 1500 kWh * 0.716 = 1074.0 kg CO2e.
    """
    ab1_id = get_ab1_block_id(db_session)
    test_date = "2026-11-20"

    resp = client.post("/api/v1/carbon/calculate", json={
        "block_id": ab1_id,
        "reporting_date": test_date,
        "activity_code": "ELEC_CONSUMPTION",
        "custom_quantity": 1.5,
        "custom_unit": "MWh",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["reported_quantity"] == 1.5
    assert data["reported_unit"] == "MWh"
    assert data["standardized_quantity"] == 1500.0
    assert data["standardized_unit"] == "kWh"
    assert data["conversion_factor_applied"] == 1000.0
    assert data["emissions_kg_co2e"] == 1074.0


def test_solar_pv_zero_direct_scope2_emissions(db_session: Session):
    """
    Verify on-site rooftop solar generation has 0.0 kg CO2e direct Scope 2 emissions.
    Prevents counting clean solar power as grid import.
    """
    ab1_id = get_ab1_block_id(db_session)
    test_date = "2026-11-20"

    resp = client.post("/api/v1/carbon/calculate", json={
        "block_id": ab1_id,
        "reporting_date": test_date,
        "activity_code": "SOLAR_ELEC_GEN",
        "custom_quantity": 450.0,
        "custom_unit": "kWh",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["scope"] == "scope_2"
    assert data["emission_factor_code"] == "EF_SOLAR_PV_ONSITE"
    assert data["emission_factor_value"] == 0.0
    assert data["emissions_kg_co2e"] == 0.0
    assert data["emissions_t_co2e"] == 0.0


def test_actual_vs_estimated_electricity_selection_and_no_summing(db_session: Session):
    """
    Verify Phase 4 integration:
    - Measured electricity: 1250 kWh
    - Estimated electricity: 1008 kWh
    - 'measured' selects 1250 kWh -> 895.0 kg CO2e
    - 'estimated' selects 1008 kWh -> 721.728 kg CO2e
    - NEVER adds 1250 + 1008 together!
    """
    ab1_id = get_ab1_block_id(db_session)
    test_date_obj = date(2026, 11, 22)
    test_date = "2026-11-22"

    # Clean existing records for test isolation
    db_session.query(CarbonCalculationRecord).filter(
        CarbonCalculationRecord.block_id == ab1_id,
        CarbonCalculationRecord.reporting_date == test_date_obj
    ).delete()
    db_session.query(DailyActivityRecord).filter(
        DailyActivityRecord.block_id == ab1_id,
        DailyActivityRecord.reporting_date == test_date_obj
    ).delete()
    db_session.query(DailyElectricityEstimate).filter(
        DailyElectricityEstimate.block_id == ab1_id,
        DailyElectricityEstimate.reporting_date == test_date_obj
    ).delete()
    db_session.commit()

    # Ingest actual meter reading: 1250 kWh
    client.post("/api/v1/electricity/actual", json={
        "block_id": ab1_id,
        "reporting_date": test_date,
        "quantity_kwh": 1250.0,
        "meter_boundary": "grid_import",
        "measurement_method": "utility_meter",
        "replace_existing": True,
    })

    # Ingest daily estimate: 1008 kWh
    client.post("/api/v1/electricity/estimates", json={
        "block_id": ab1_id,
        "reporting_date": test_date,
        "operational_mode": "regular_day",
        "items": [
            {
                "facility_type": "standard_classroom",
                "facility_name": "Classroom",
                "quantity": 30,
                "average_power_kw": 1.2,
                "operating_hours": 8.0,
            },
            {
                "facility_type": "computer_lab",
                "facility_name": "Lab",
                "quantity": 4,
                "average_power_kw": 18.0,
                "operating_hours": 10.0,
            }
        ],
        "replace_existing": True,
    })

    # 1. Calculation with electricity_source = 'measured'
    resp_meas = client.post("/api/v1/carbon/calculate", json={
        "block_id": ab1_id,
        "reporting_date": test_date,
        "activity_code": "ELEC_CONSUMPTION",
        "electricity_source": "measured",
    })
    assert resp_meas.status_code == 201
    meas_data = resp_meas.json()
    assert meas_data["selected_reporting_source"] == "measured"
    assert meas_data["standardized_quantity"] == 1250.0
    assert meas_data["emissions_kg_co2e"] == round(1250.0 * 0.716, 4)  # 895.0

    # 2. Calculation with electricity_source = 'estimated'
    resp_est = client.post("/api/v1/carbon/calculate", json={
        "block_id": ab1_id,
        "reporting_date": test_date,
        "activity_code": "ELEC_CONSUMPTION",
        "electricity_source": "estimated",
    })
    assert resp_est.status_code == 201
    est_data = resp_est.json()
    assert est_data["selected_reporting_source"] == "estimated"
    assert est_data["standardized_quantity"] == 1008.0
    assert est_data["emissions_kg_co2e"] == round(1008.0 * 0.716, 4)  # 721.728
    assert est_data["baseline_version"] is not None

    # Verify that emissions were NOT summed together (895 + 721.728 = 1616.728 is NOT present)
    assert meas_data["emissions_kg_co2e"] != round((1250.0 + 1008.0) * 0.716, 4)


# ==============================================================================
# 3. Fuel Combustion Calculations (Scope 1)
# ==============================================================================

def test_diesel_combustion_calculation(db_session: Session):
    """
    Verify stationary diesel fuel calculation:
    100 litres * 2.68 kg CO2e/litre = 268.0 kg CO2e.
    """
    ab1_id = get_ab1_block_id(db_session)
    test_date = "2026-11-20"

    resp = client.post("/api/v1/carbon/calculate", json={
        "block_id": ab1_id,
        "reporting_date": test_date,
        "activity_code": "FUEL_DIESEL",
        "custom_quantity": 100.0,
        "custom_unit": "litres",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["scope"] == "scope_1"
    assert data["emission_factor_code"] == "EF_DIESEL_STATIONARY_IPCC"
    assert data["emission_factor_value"] == 2.68
    assert data["emissions_kg_co2e"] == 268.0
    assert data["emissions_t_co2e"] == 0.268


def test_diesel_gallons_conversion(db_session: Session):
    """
    Verify fuel unit conversion:
    10 gallons * 3.78541 = 37.8541 litres * 2.68 = 101.449 kg CO2e.
    """
    ab1_id = get_ab1_block_id(db_session)
    test_date = "2026-11-20"

    resp = client.post("/api/v1/carbon/calculate", json={
        "block_id": ab1_id,
        "reporting_date": test_date,
        "activity_code": "FUEL_DIESEL",
        "custom_quantity": 10.0,
        "custom_unit": "gallons",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["reported_quantity"] == 10.0
    assert data["reported_unit"] == "gallons"
    assert data["standardized_quantity"] == 37.8541
    assert data["conversion_factor_applied"] == 3.78541
    assert data["emissions_kg_co2e"] == round(37.8541 * 2.68, 4)


def test_lpg_cylinder_conversion_and_calculation(db_session: Session):
    """
    Verify LPG culinary combustion:
    2 x 19kg commercial cylinders = 38 kg * 2.983 kg CO2e/kg = 113.354 kg CO2e.
    """
    ab1_id = get_ab1_block_id(db_session)
    test_date = "2026-11-20"

    resp = client.post("/api/v1/carbon/calculate", json={
        "block_id": ab1_id,
        "reporting_date": test_date,
        "activity_code": "FUEL_LPG",
        "custom_quantity": 2.0,
        "custom_unit": "cylinders_19kg",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["scope"] == "scope_1"
    assert data["reported_quantity"] == 2.0
    assert data["standardized_quantity"] == 38.0
    assert data["standardized_unit"] == "kg"
    assert data["emission_factor_value"] == 2.983
    assert data["emissions_kg_co2e"] == round(38.0 * 2.983, 4)


# ==============================================================================
# 4. Waste & Composting Calculations (Scope 3)
# ==============================================================================

def test_food_waste_composting_calculation(db_session: Session):
    """
    Verify organic food waste aerobic composting:
    500 kg * 0.102 kg CO2e/kg = 51.0 kg CO2e.
    """
    ab1_id = get_ab1_block_id(db_session)
    test_date = "2026-11-20"

    resp = client.post("/api/v1/carbon/calculate", json={
        "block_id": ab1_id,
        "reporting_date": test_date,
        "activity_code": "WASTE_FOOD",
        "custom_quantity": 500.0,
        "custom_unit": "kg",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["scope"] == "scope_3"
    assert data["emission_factor_code"] == "EF_FOOD_WASTE_COMPOST_IPCC"
    assert data["emission_factor_value"] == 0.102
    assert data["emissions_kg_co2e"] == 51.0
    assert data["emissions_t_co2e"] == 0.051


def test_waste_paper_and_plastic_recycling_calculations(db_session: Session):
    """
    Verify segregated recyclables mechanical processing:
    - Paper: 100 kg * 0.021 = 2.1 kg CO2e
    - Plastic: 50 kg * 0.045 = 2.25 kg CO2e
    """
    ab1_id = get_ab1_block_id(db_session)
    test_date = "2026-11-20"

    # Paper
    resp_paper = client.post("/api/v1/carbon/calculate", json={
        "block_id": ab1_id,
        "reporting_date": test_date,
        "activity_code": "WASTE_PAPER",
        "custom_quantity": 100.0,
        "custom_unit": "kg",
    })
    assert resp_paper.status_code == 201
    assert resp_paper.json()["emissions_kg_co2e"] == 2.1

    # Plastic
    resp_plastic = client.post("/api/v1/carbon/calculate", json={
        "block_id": ab1_id,
        "reporting_date": test_date,
        "activity_code": "WASTE_PLASTIC",
        "custom_quantity": 50.0,
        "custom_unit": "kg",
    })
    assert resp_plastic.status_code == 201
    assert resp_plastic.json()["emissions_kg_co2e"] == 2.25


# ==============================================================================
# 5. Safeguards & Double-Counting Prevention Tests
# ==============================================================================

def test_transportation_safeguard_distance_prohibition(db_session: Session):
    """
    Verify that TRANS_DISTANCE cannot be calculated with fuel combustion factors.
    Prevents adding distance estimates on top of fuel consumption.
    """
    ab1_id = get_ab1_block_id(db_session)
    test_date = "2026-11-20"

    resp = client.post("/api/v1/carbon/calculate", json={
        "block_id": ab1_id,
        "reporting_date": test_date,
        "activity_code": "TRANS_DISTANCE",
        "custom_quantity": 150.0,
        "custom_unit": "km",
    })
    assert resp.status_code == 422
    err = resp.json()["detail"]
    assert "TRANS_DISTANCE_DIRECT_PROHIBITED" in str(err)


def test_generator_safeguard_gross_electricity_prohibition(db_session: Session):
    """
    Verify that GEN_ELECTRICITY_GENERATED cannot be multiplied by fuel factors.
    Direct emissions must be calculated from GEN_DIESEL_CONSUMPTION.
    """
    ab1_id = get_ab1_block_id(db_session)
    test_date = "2026-11-20"

    resp = client.post("/api/v1/carbon/calculate", json={
        "block_id": ab1_id,
        "reporting_date": test_date,
        "activity_code": "GEN_ELECTRICITY_GENERATED",
        "custom_quantity": 500.0,
        "custom_unit": "kWh",
    })
    assert resp.status_code == 422
    err = resp.json()["detail"]
    assert "GEN_ELECTRICITY_DIRECT_PROHIBITED" in str(err)


def test_waste_transfer_and_cwc_safeguards(db_session: Session):
    """
    Verify:
    1. Transfer activities (is_transfer_activity=True) cannot be counted as primary generation.
    2. Food waste cannot be registered at Central Waste Collection Yard (UTL-CWC).
    """
    ab1_id = get_ab1_block_id(db_session)
    test_date = "2026-11-20"

    # Transfer activity: EWASTE_RECYCLED
    resp_transfer = client.post("/api/v1/carbon/calculate", json={
        "block_id": ab1_id,
        "reporting_date": test_date,
        "activity_code": "EWASTE_RECYCLED",
        "custom_quantity": 100.0,
        "custom_unit": "kg",
    })
    assert resp_transfer.status_code == 422
    assert "TRANSFER_ACTIVITY_PROHIBITED" in str(resp_transfer.json()["detail"])

    # Food waste at Central Waste Collection yard
    cwc_block = db_session.query(CampusBlock).filter(CampusBlock.code == "UTL-CWC").first()
    assert cwc_block is not None
    resp_cwc = client.post("/api/v1/carbon/calculate", json={
        "block_id": cwc_block.id,
        "reporting_date": test_date,
        "activity_code": "WASTE_FOOD",
        "custom_quantity": 250.0,
        "custom_unit": "kg",
    })
    assert resp_cwc.status_code == 422
    assert "CWC_FOOD_WASTE_DUPLICATION" in str(resp_cwc.json()["detail"])


def test_stp_volume_alone_prohibition_and_plant_separation(db_session: Session):
    """
    Verify:
    1. Wastewater volume alone without BOD/COD lab telemetry is blocked.
    2. STP 1 and STP 2 are kept separate.
    """
    stp1 = db_session.query(CampusBlock).filter(CampusBlock.code == "UTL-STP1").first()
    stp2 = db_session.query(CampusBlock).filter(CampusBlock.code == "UTL-STP2").first()
    assert stp1 is not None and stp2 is not None
    assert stp1.id != stp2.id

    test_date = "2026-11-20"

    resp = client.post("/api/v1/carbon/calculate", json={
        "block_id": stp1.id,
        "reporting_date": test_date,
        "activity_code": "STP_WASTEWATER_TREATED",
        "custom_quantity": 200.0,
        "custom_unit": "m3",
    })
    assert resp.status_code == 422
    assert "STP_VOLUME_ALONE_INSUFFICIENT" in str(resp.json()["detail"])


# ==============================================================================
# 6. Historical Calculation Reproducibility & Recalculation Tests
# ==============================================================================

def test_calculation_reproducibility_and_safe_recalculation(db_session: Session):
    """
    Verify:
    1. Historical calculation preserves factor snapshot even if active factor value changes.
    2. Recalculation creates a new version, superseding the old without overwriting history.
    """
    ab1_id = get_ab1_block_id(db_session)
    test_date = "2026-11-25"

    # Step 1: Calculate with initial grid factor
    resp1 = client.post("/api/v1/carbon/calculate", json={
        "block_id": ab1_id,
        "reporting_date": test_date,
        "activity_code": "ELEC_CONSUMPTION",
        "custom_quantity": 1000.0,
        "custom_unit": "kWh",
    })
    assert resp1.status_code == 201
    calc_id = resp1.json()["id"]
    original_emissions = resp1.json()["emissions_kg_co2e"]
    assert original_emissions == 716.0

    # Step 2: Create a revised emission factor with unique factor_code
    import uuid
    rev_code = f"EF_GRID_REV_{uuid.uuid4().hex[:6]}"
    resp_factor = client.post("/api/v1/carbon/factors", json={
        "factor_code": rev_code,
        "name": "Provisional CEA Grid Factor 2025",
        "category": "electricity",
        "applicable_activity_code": "ELEC_CONSUMPTION",
        "fuel_or_material": "grid_electricity",
        "scope": "scope_2",
        "factor_value": 0.680,
        "factor_unit": "kg CO2e/kWh",
        "target_activity_unit": "kWh",
        "geography": "India (National Grid)",
        "source_organization": "CEA Provisional",
        "reference_document": "Provisional Draft 2025",
        "publication_year": 2025,
        "effective_start_date": "2025-01-01",
        "version": 1,
        "status": "provisional",
        "is_active": True,
    })
    assert resp_factor.status_code == 201
    new_factor_id = resp_factor.json()["id"]

    # Step 3: Verify the original calculation record is NOT mutated!
    resp_check = client.get(f"/api/v1/carbon/calculations/{calc_id}")
    assert resp_check.status_code == 200
    assert resp_check.json()["emissions_kg_co2e"] == 716.0
    assert resp_check.json()["emission_factor_value"] == 0.716
    assert resp_check.json()["is_superseded"] is False

    # Step 4: Explicit recalculation request
    resp_recalc = client.post(f"/api/v1/carbon/calculations/{calc_id}/recalculate", json={
        "new_factor_id": new_factor_id,
        "reason": "Updated to CEA 2025 provisional factor"
    })
    assert resp_recalc.status_code == 200
    recalc_data = resp_recalc.json()
    assert recalc_data["version"] == 2
    assert recalc_data["status"] == "recalculated"
    assert recalc_data["emissions_kg_co2e"] == 680.0
    assert recalc_data["emission_factor_value"] == 0.680

    # Step 5: Check that original record is now marked superseded
    resp_old_check = client.get(f"/api/v1/carbon/calculations/{calc_id}")
    assert resp_old_check.status_code == 200
    assert resp_old_check.json()["is_superseded"] is True
    assert resp_old_check.json()["status"] == "superseded"
    assert resp_old_check.json()["superseded_by_id"] == recalc_data["id"]


def test_incompatible_unit_rejection(db_session: Session):
    """
    Verify rejection when attempting to calculate with incompatible units
    (e.g. attempting to calculate electricity with m3).
    """
    ab1_id = get_ab1_block_id(db_session)
    test_date = "2026-11-20"

    resp = client.post("/api/v1/carbon/calculate", json={
        "block_id": ab1_id,
        "reporting_date": test_date,
        "activity_code": "ELEC_CONSUMPTION",
        "custom_quantity": 500.0,
        "custom_unit": "m3",
    })
    assert resp.status_code == 422
    assert "INCOMPATIBLE_UNIT" in str(resp.json()["detail"])
