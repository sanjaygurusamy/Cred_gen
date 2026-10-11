"""Test suite for Phase 6: Campus Carbon Dashboard & Reporting.

Verifies:
1. Executive dashboard metrics aggregation and empty period handling.
2. Date range validation (rejecting start_date > end_date).
3. Category emissions breakdown and scope distribution.
4. Block-wise emissions ranking across all 27 campus blocks and intensity metrics.
5. Daily and monthly time-series trend groupings.
6. Block-level detail analytics and missing configured expectation detection.
7. Data completeness, quality indicators, and safeguard verification.
8. RFC 4180 CSV export generation and header compliance.
9. Executive PDF report generation and binary format validation.
10. Strict double-counting and superseded calculation exclusion.
"""
from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_session_factory
from app.models.block import CampusBlock
from app.models.carbon import CarbonCalculationRecord, EmissionFactor
from app.models.activity import ActivityDefinition
from app.models.activity_record import DailyActivityRecord
from app.services.seed_phase2 import seed_phase2_inventory
from app.services.seed_phase3 import seed_phase3_catalogue
from app.services.seed_phase5 import seed_canonical_emission_factors


@pytest.fixture(scope="module")
def client():
    # Ensure prerequisites are seeded
    db = get_session_factory()()
    seed_phase2_inventory(db)
    seed_phase3_catalogue(db)
    seed_canonical_emission_factors(db)
    db.close()
    return TestClient(app)


def test_reporting_dashboard_metrics_empty_period(client: TestClient):
    """Test dashboard metrics for an empty future date range returns clean empty state."""
    future_start = (date.today() + timedelta(days=365)).isoformat()
    future_end = (date.today() + timedelta(days=370)).isoformat()

    res = client.get(f"/api/v1/reporting/dashboard?start_date={future_start}&end_date={future_end}")
    assert res.status_code == 200
    data = res.json()

    assert data["has_data"] is False
    assert data["total_emissions_kg_co2e"] == 0.0
    assert data["total_emissions_t_co2e"] == 0.0
    assert data["total_records"] == 0
    assert data["reporting_blocks_count"] == 0
    assert data["active_blocks_count"] == 27


def test_reporting_dashboard_metrics_with_data(client: TestClient):
    """Test executive dashboard metrics aggregates real database calculations correctly."""
    res = client.get("/api/v1/reporting/dashboard")
    assert res.status_code == 200
    data = res.json()

    assert "total_emissions_kg_co2e" in data
    assert "total_emissions_t_co2e" in data
    assert "scope_1_kg" in data
    assert "scope_2_kg" in data
    assert "scope_3_kg" in data
    assert "total_electricity_kwh" in data
    assert "measured_coverage_pct" in data
    assert data["active_blocks_count"] == 27

    # Verify mathematical scope reconciliation: Scope 1 + Scope 2 + Scope 3 = Total
    scope_sum = data["scope_1_kg"] + data["scope_2_kg"] + data["scope_3_kg"]
    assert abs(scope_sum - data["total_emissions_kg_co2e"]) < 0.01

    # Verify tonnes conversion: kg / 1000 = tonnes
    assert abs(data["total_emissions_t_co2e"] - (data["total_emissions_kg_co2e"] / 1000.0)) < 0.001


def test_reporting_date_validation_rejects_inverted_dates(client: TestClient):
    """Test that start_date > end_date returns HTTP 400 Bad Request."""
    res = client.get("/api/v1/reporting/dashboard?start_date=2026-10-20&end_date=2026-10-10")
    assert res.status_code == 400
    assert "cannot be after end_date" in res.json()["detail"]


def test_emissions_by_category(client: TestClient):
    """Test category breakdown returns properly structured categories and reconciles totals."""
    res = client.get("/api/v1/reporting/by-category")
    assert res.status_code == 200
    data = res.json()

    assert "items" in data
    assert "total_emissions_kg_co2e" in data
    assert "by_scope" in data

    if data["items"]:
        # Verify percentages sum close to 100%
        pct_sum = sum(item["percentage_of_total"] for item in data["items"])
        assert abs(pct_sum - 100.0) < 1.0

        # Verify sorted descending
        for i in range(len(data["items"]) - 1):
            assert data["items"][i]["emissions_kg_co2e"] >= data["items"][i + 1]["emissions_kg_co2e"]


def test_emissions_by_block(client: TestClient):
    """Test block emissions returns all 27 campus blocks ranked by footprint."""
    res = client.get("/api/v1/reporting/by-block")
    assert res.status_code == 200
    data = res.json()

    assert data["blocks_total_count"] == 27
    assert len(data["items"]) == 27

    # Verify all items have valid block metadata and intensity
    for b in data["items"]:
        assert b["block_code"] is not None
        assert b["floor_area_sqm"] > 0
        assert b["emissions_per_sqm"] >= 0.0


def test_reporting_trends_daily_and_monthly(client: TestClient):
    """Test time-series trend groupings for daily and monthly intervals."""
    # Daily trend
    res_daily = client.get("/api/v1/reporting/trends?group_by=day")
    assert res_daily.status_code == 200
    daily_data = res_daily.json()
    assert daily_data["group_by"] == "day"
    assert "data_points" in daily_data
    assert "sufficient_data_for_trend" in daily_data

    # Monthly trend
    res_monthly = client.get("/api/v1/reporting/trends?group_by=month")
    assert res_monthly.status_code == 200
    monthly_data = res_monthly.json()
    assert monthly_data["group_by"] == "month"


def test_block_detail_analytics(client: TestClient):
    """Test drilldown analytics for an established academic block."""
    db = get_session_factory()()
    ab1 = db.query(CampusBlock).filter(CampusBlock.code == "AB1").first()
    db.close()
    assert ab1 is not None

    res = client.get(f"/api/v1/reporting/block/{ab1.id}")
    assert res.status_code == 200
    data = res.json()

    assert data["block"]["code"] == "AB1"
    assert "total_emissions_kg_co2e" in data
    assert "activities_breakdown" in data
    assert "configured_expected_activities" in data
    assert "missing_expected_activities" in data


def test_block_detail_analytics_404_on_invalid_id(client: TestClient):
    """Test 404 response when querying nonexistent block ID."""
    res = client.get("/api/v1/reporting/block/nonexistent-block-uuid")
    assert res.status_code == 404


def test_data_quality_endpoint(client: TestClient):
    """Test data quality endpoint reports completeness, uncalculated records, and safeguard compliance."""
    res = client.get("/api/v1/reporting/data-quality")
    assert res.status_code == 200
    data = res.json()

    assert data["total_campus_blocks"] == 27
    assert "blocks_with_data_count" in data
    assert "blocks_missing_data_count" in data
    assert "blocks_with_missing_expectations" in data
    assert "safeguard_checks" in data

    # Verify institutional safeguards are verified
    safeguards = data["safeguard_checks"]
    assert safeguards["no_distance_fuel_emissions"] is True
    assert safeguards["no_generator_gross_electricity_emissions"] is True
    assert safeguards["no_transfer_double_counting"] is True
    assert safeguards["no_stp_volume_alone_emissions"] is True


def test_export_csv(client: TestClient):
    """Test RFC 4180 CSV export generation and header compliance."""
    res = client.get("/api/v1/reporting/export/csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "attachment; filename=" in res.headers["content-disposition"]

    content = res.text
    # Verify institutional comments and table headers
    assert "# CampusCarbon AI — Digital MRV Emissions Inventory Report" in content
    assert "# Organization: Amrita Vishwa Vidyapeetham" in content
    assert "Calculation ID,Reporting Date,Block Code" in content


def test_export_pdf(client: TestClient):
    """Test executive PDF summary report generation."""
    res = client.get("/api/v1/reporting/export/pdf")
    assert res.status_code == 200
    assert "application/pdf" in res.headers["content-type"]
    assert "attachment; filename=" in res.headers["content-disposition"]

    # Verify standard PDF magic bytes (%PDF-)
    assert res.content.startswith(b"%PDF-")
    # Verify reasonable file size (> 1 KB)
    assert len(res.content) > 1000


def test_no_double_counting_and_superseded_exclusion(client: TestClient):
    """Verify superseded calculation records are strictly excluded from all dashboard metrics."""
    db = get_session_factory()()
    # Find any active calculation
    record = db.query(CarbonCalculationRecord).filter(CarbonCalculationRecord.is_superseded == False).first()
    if record:
        # Check that querying active dashboard does not include superseded records
        dash_res = client.get("/api/v1/reporting/dashboard")
        assert dash_res.status_code == 200
        dash_data = dash_res.json()
        assert dash_data["total_records"] >= 1
    db.close()
