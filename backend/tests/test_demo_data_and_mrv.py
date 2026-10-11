"""CampusCarbon AI — Multi-Day Demonstration Data & Digital MRV Test Suite.

Validates:
1. Multi-day demonstration seeding across 14 consecutive days.
2. Complete institutional reporting metrics derived from database records.
3. Category breakdowns across Scopes 1, 2, and 3.
4. Time-series daily trends reflecting academic weekday/weekend operational rhythms.
5. Institutional safeguards adherence (distance, generator kWh, volume-only STP, waste transfers).
6. Consistent, audit-grade PDF and CSV disclosure report generation.
"""
from datetime import date
import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.core.database import get_session_factory
from app.services.seed_demo_data import seed_14_day_demo_data, START_DATE, END_DATE
from app.services.reporting_engine import ReportingEngine
from app.services.sustainability_service import SustainabilityService
from app.main import app


@pytest.fixture(scope="module")
def db_session():
    factory = get_session_factory()
    db = factory()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module")
def api_client():
    return TestClient(app)


def test_seed_demo_data_idempotency(db_session: Session):
    """Verify that re-running the 14-day seeder produces zero duplicate records."""
    res = seed_14_day_demo_data(db_session)
    assert res["status"] == "success"
    assert res["days_covered"] == 14
    # On repeat runs, existing records are detected and preserved without duplication
    assert res["activity_records_created"] == 0
    assert res["activity_records_existing"] > 1000
    assert res["carbon_calculations_created"] == 0
    assert res["carbon_calculations_existing"] > 800


def test_14_day_dashboard_metrics(db_session: Session):
    """Verify campus-wide summary metrics for the full 14-day demonstration window."""
    metrics = ReportingEngine.get_dashboard_metrics(
        db_session, start_date=START_DATE, end_date=END_DATE
    )
    assert metrics.has_data is True
    assert metrics.active_blocks_count == 27
    assert metrics.reporting_blocks_count == 27
    assert metrics.reporting_coverage_pct == 100.0

    # Greenhouse gas accounting assertions
    assert metrics.total_emissions_t_co2e > 50.0
    assert metrics.scope_1_t > 0.0
    assert metrics.scope_2_t > 0.0
    assert metrics.scope_3_t > 0.0

    # Gross emissions reconciliation: Total = Scope 1 + Scope 2 + Scope 3
    reconciled_kg = metrics.scope_1_kg + metrics.scope_2_kg + metrics.scope_3_kg
    assert abs(reconciled_kg - metrics.total_emissions_kg_co2e) < 0.01

    # Electricity telemetry verification
    assert metrics.total_electricity_kwh > 50000.0


def test_emissions_by_category_breakdown(db_session: Session):
    """Verify category distribution and percentage sums for the 14-day window."""
    cat_response = ReportingEngine.get_emissions_by_category(
        db_session, start_date=START_DATE, end_date=END_DATE
    )
    assert len(cat_response.items) >= 5

    # Check key operational categories are present
    categories = {c.category for c in cat_response.items}
    assert "electricity" in categories
    assert "fuels" in categories
    assert "food_waste" in categories
    assert "transportation" in categories

    # Percentage sum should equal 100%
    total_pct = sum(c.percentage_of_total for c in cat_response.items)
    assert round(total_pct, 1) == 100.0


def test_daily_trends_and_weekday_weekend_dynamics(db_session: Session):
    """Verify that daily trends show 14 data points and reflect operational rhythms."""
    trends = ReportingEngine.get_trends(
        db_session, start_date=START_DATE, end_date=END_DATE, group_by="day"
    )
    assert trends.group_by == "day"
    assert trends.sufficient_data_for_trend is True
    assert len(trends.data_points) == 14

    # Academic weekdays (e.g. Sept 28 - Oct 2) should have higher electricity than weekends (Oct 3 - 4)
    weekday_point = next(p for p in trends.data_points if p.date == date(2026, 9, 29))
    weekend_point = next(p for p in trends.data_points if p.date == date(2026, 10, 3))
    assert weekday_point.electricity_kwh > weekend_point.electricity_kwh
    assert weekday_point.total_emissions_t_co2e > weekend_point.total_emissions_t_co2e


def test_institutional_safeguards_in_data_quality(db_session: Session):
    """Verify that institutional safeguards are 100% compliant in data quality audit."""
    dq = ReportingEngine.get_data_quality(
        db_session, start_date=START_DATE, end_date=END_DATE
    )
    assert dq.total_campus_blocks == 27
    assert dq.blocks_with_data_count == 27
    assert dq.measured_records_count > 800

    # Safeguards verification
    checks = dq.safeguard_checks
    assert checks["no_distance_fuel_emissions"] is True
    assert checks["no_generator_gross_electricity_emissions"] is True
    assert checks["no_transfer_double_counting"] is True
    assert checks["no_stp_volume_alone_emissions"] is True
    assert checks["actual_vs_estimated_electricity_isolated"] is True

    # Uncalculated records should contain legitimate safeguarded telemetry
    assert dq.uncalculated_activity_records_count > 0


def test_pdf_and_csv_export_consistency(db_session: Session):
    """Verify that PDF and CSV exports generate valid audit documents for the 14-day window."""
    pdf_bytes = ReportingEngine.generate_pdf_report(
        db_session, start_date=START_DATE, end_date=END_DATE
    )
    assert len(pdf_bytes) > 5000
    assert pdf_bytes.startswith(b"%PDF")

    csv_text = ReportingEngine.generate_csv_report(
        db_session, start_date=START_DATE, end_date=END_DATE
    )
    assert len(csv_text) > 10000
    assert "Calculation ID,Reporting Date,Block Code,Block Name" in csv_text
    assert "ELEC_CONSUMPTION" in csv_text


def test_api_endpoints_integration(api_client: TestClient):
    """Test FastAPI endpoint responses for reporting, sustainability, and evidence."""
    # Dashboard API
    res = api_client.get(f"/api/v1/reporting/dashboard?start_date={START_DATE}&end_date={END_DATE}")
    assert res.status_code == 200
    data = res.json()
    assert data["has_data"] is True
    assert data["reporting_blocks_count"] == 27

    # SDGs API
    res_sdg = api_client.get("/api/v1/sustainability/sdgs")
    assert res_sdg.status_code == 200
    sdgs = res_sdg.json()
    assert len(sdgs) >= 6

    # Evidence API
    res_ev = api_client.get("/api/v1/sustainability/evidence")
    assert res_ev.status_code == 200
    evidence = res_ev.json()
    assert len(evidence) >= 5

    # Recommendations API
    res_rec = api_client.get("/api/v1/sustainability/recommendations")
    assert res_rec.status_code == 200
    recs = res_rec.json()
    assert len(recs) >= 7
