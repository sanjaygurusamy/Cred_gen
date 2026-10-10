from datetime import datetime, timezone
from fastapi import APIRouter, Response, status
from app.core.config import settings
from app.core.database import check_database_health
from app.schemas.system import (
    HealthResponse,
    ReadinessResponse,
    DatabaseStatus,
    SystemInfoResponse
)

router = APIRouter(tags=["System Status & Health"])

@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Application Health Probe",
    description="Liveness probe indicating that the FastAPI process is alive and receiving traffic."
)
def get_health() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc).isoformat(),
        app=settings.app_name,
        version=settings.app_version,
        environment=settings.environment
    )

@router.get(
    "/ready",
    response_model=ReadinessResponse,
    summary="Application Readiness Probe",
    description=(
        "Readiness probe verifying operational dependencies. Performs an authentic database "
        "connectivity check without exposing sensitive connection credentials."
    ),
    responses={
        200: {
            "description": "All system dependencies are healthy and ready to accept traffic.",
            "model": ReadinessResponse
        },
        503: {
            "description": "One or more critical dependencies (e.g. database) are unavailable.",
            "model": ReadinessResponse
        }
    }
)
def get_readiness(response: Response) -> ReadinessResponse:
    is_connected, engine_type, db_message = check_database_health()
    now_ts = datetime.now(timezone.utc).isoformat()
    
    db_status = DatabaseStatus(
        connected=is_connected,
        status="connected" if is_connected else "unavailable",
        engine=engine_type,
        message=db_message
    )

    if not is_connected:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return ReadinessResponse(
            status="not_ready",
            timestamp=now_ts,
            database=db_status,
            phase="Phase 1: Application Foundation"
        )

    response.status_code = status.HTTP_200_OK
    return ReadinessResponse(
        status="ready",
        timestamp=now_ts,
        database=db_status,
        phase="Phase 1: Application Foundation"
    )

@router.get(
    "/info",
    response_model=SystemInfoResponse,
    status_code=status.HTTP_200_OK,
    summary="System Information & Metadata",
    description="Safe application metadata and feature matrix for Phase 1 without leaking secrets."
)
def get_info() -> SystemInfoResponse:
    raw_engine = "postgresql"
    try:
        raw_engine = settings.database_url.split("://")[0].split("+")[0]
    except Exception:
        pass

    return SystemInfoResponse(
        app_name=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
        current_phase="Phase 1: Application Foundation",
        architecture="Modular Monolith (FastAPI + React TypeScript + PostgreSQL)",
        database_engine=raw_engine,
        features_active=[
            "System Health Probes",
            "Authenticated Readiness Verification",
            "Typed REST Contracts",
            "Centralized Error Handling",
            "Responsive Sidebar Navigation",
            "Phase 1 Foundation Dashboard"
        ],
        features_planned=[
            "Phase 2: Campus Hierarchy & Block Inventory",
            "Phase 3: Activity Definitions & Daily Records",
            "Phase 4: Electricity Estimation & Comparison",
            "Phase 5: Deterministic Carbon Calculation Engine",
            "Phase 6: Multi-Campus Dashboard & SDG Analytics",
            "Phase 7: Evidence Management & Digital MRV",
            "Phase 8: AI/ML Recommendations & Simulator",
            "Phase 9: Hyperledger Fabric Ledger Integration",
            "Phase 10: Security Hardening & Container Deployment"
        ]
    )
