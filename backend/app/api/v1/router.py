from fastapi import APIRouter

api_v1_router = APIRouter(prefix="/v1")

@api_v1_router.get("/info", tags=["System"])
def get_system_info():
    """Returns application metadata and status."""
    return {
        "status": "ready",
        "phase": "Phase 0: Clean project restart and architecture",
        "supported_phases": [
            "Phase 0: Clean project start and architecture",
            "Phase 1: Application foundation",
            "Phase 2: Campus, campus hierarchy and block inventory",
            "Phase 3: Activity definitions and daily activity records",
            "Phase 4: Electricity estimation, actual consumption and comparison",
            "Phase 5: Carbon calculations and emission-factor management",
            "Phase 6: Dashboard and reporting",
            "Phase 7: Evidence management and Digital MRV",
            "Phase 8: AI/ML features",
            "Phase 9: Hyperledger Fabric integration",
            "Phase 10: Testing, security and deployment"
        ]
    }
