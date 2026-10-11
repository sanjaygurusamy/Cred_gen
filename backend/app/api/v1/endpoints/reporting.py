"""FastAPI endpoints for Phase 6 Campus Dashboard & Reporting."""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.reporting_engine import ReportingEngine
from app.schemas.reporting import (
    DashboardMetricsResponse,
    CategoryEmissionsResponse,
    BlockEmissionsResponse,
    TrendsResponse,
    BlockDetailAnalyticsResponse,
    DataQualityResponse,
)

router = APIRouter()


def _validate_dates(start_date: Optional[date], end_date: Optional[date]):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date range: start_date ({start_date}) cannot be after end_date ({end_date})"
        )


@router.get("/dashboard", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(
    start_date: Optional[date] = Query(None, description="Start date for reporting window"),
    end_date: Optional[date] = Query(None, description="End date for reporting window"),
    campus_id: Optional[str] = Query(None, description="Filter by campus UUID"),
    block_id: Optional[str] = Query(None, description="Filter by block UUID"),
    db: Session = Depends(get_db),
):
    """Retrieve executive campus-wide emissions, electricity, and measurement coverage metrics."""
    _validate_dates(start_date, end_date)
    return ReportingEngine.get_dashboard_metrics(
        db, start_date=start_date, end_date=end_date, campus_id=campus_id, block_id=block_id
    )


@router.get("/by-category", response_model=CategoryEmissionsResponse)
def get_emissions_by_category(
    start_date: Optional[date] = Query(None, description="Start date for reporting window"),
    end_date: Optional[date] = Query(None, description="End date for reporting window"),
    block_id: Optional[str] = Query(None, description="Optional block filter"),
    db: Session = Depends(get_db),
):
    """Retrieve emissions categorized by activity domain (electricity, fuel, waste, etc.)."""
    _validate_dates(start_date, end_date)
    return ReportingEngine.get_emissions_by_category(
        db, start_date=start_date, end_date=end_date, block_id=block_id
    )


@router.get("/by-block", response_model=BlockEmissionsResponse)
def get_emissions_by_block(
    start_date: Optional[date] = Query(None, description="Start date for reporting window"),
    end_date: Optional[date] = Query(None, description="End date for reporting window"),
    category: Optional[str] = Query(None, description="Optional activity category filter"),
    db: Session = Depends(get_db),
):
    """Retrieve emissions inventory and carbon intensity across all 27 campus blocks."""
    _validate_dates(start_date, end_date)
    return ReportingEngine.get_emissions_by_block(
        db, start_date=start_date, end_date=end_date, category=category
    )


@router.get("/trends", response_model=TrendsResponse)
def get_trends(
    start_date: Optional[date] = Query(None, description="Start date for reporting window"),
    end_date: Optional[date] = Query(None, description="End date for reporting window"),
    block_id: Optional[str] = Query(None, description="Optional block filter"),
    group_by: str = Query("day", pattern="^(day|month)$", description="Aggregation bucket: day or month"),
    db: Session = Depends(get_db),
):
    """Retrieve daily or monthly time-series emissions and energy consumption data."""
    _validate_dates(start_date, end_date)
    return ReportingEngine.get_trends(
        db, start_date=start_date, end_date=end_date, block_id=block_id, group_by=group_by
    )


@router.get("/block/{block_id}", response_model=BlockDetailAnalyticsResponse)
def get_block_detail_analytics(
    block_id: str,
    start_date: Optional[date] = Query(None, description="Start date for reporting window"),
    end_date: Optional[date] = Query(None, description="End date for reporting window"),
    db: Session = Depends(get_db),
):
    """Retrieve in-depth analytics, activity breakdown, and missing configured expectations for a single block."""
    _validate_dates(start_date, end_date)
    try:
        return ReportingEngine.get_block_detail_analytics(
            db, block_id=block_id, start_date=start_date, end_date=end_date
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/data-quality", response_model=DataQualityResponse)
def get_data_quality(
    start_date: Optional[date] = Query(None, description="Start date for reporting window"),
    end_date: Optional[date] = Query(None, description="End date for reporting window"),
    db: Session = Depends(get_db),
):
    """Inspect data completeness, uncalculated activity records, and institutional safeguard adherence."""
    _validate_dates(start_date, end_date)
    return ReportingEngine.get_data_quality(db, start_date=start_date, end_date=end_date)


@router.get("/export/csv")
def export_csv(
    start_date: Optional[date] = Query(None, description="Start date for reporting window"),
    end_date: Optional[date] = Query(None, description="End date for reporting window"),
    block_id: Optional[str] = Query(None, description="Optional block filter"),
    db: Session = Depends(get_db),
):
    """Generate and stream RFC 4180 CSV export of calculation audit records."""
    _validate_dates(start_date, end_date)
    csv_content = ReportingEngine.generate_csv_report(
        db, start_date=start_date, end_date=end_date, block_id=block_id
    )
    filename = f"campuscarbon_audit_{start_date or 'all'}_{end_date or 'all'}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )


@router.get("/export/pdf")
def export_pdf(
    start_date: Optional[date] = Query(None, description="Start date for reporting window"),
    end_date: Optional[date] = Query(None, description="End date for reporting window"),
    block_id: Optional[str] = Query(None, description="Optional block filter"),
    db: Session = Depends(get_db),
):
    """Generate and download structured executive PDF summary report."""
    _validate_dates(start_date, end_date)
    pdf_bytes = ReportingEngine.generate_pdf_report(
        db, start_date=start_date, end_date=end_date, block_id=block_id
    )
    filename = f"campuscarbon_executive_report_{start_date or 'all'}_{end_date or 'all'}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )
