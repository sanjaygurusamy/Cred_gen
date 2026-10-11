from fastapi import APIRouter
from app.api.v1.endpoints import (
    system, organizations, campuses, blocks,
    activities, block_activities, activity_records, electricity, carbon, reporting
)

api_v1_router = APIRouter(prefix="/v1")

# Mount endpoints under /v1
api_v1_router.include_router(system.router)
api_v1_router.include_router(organizations.router)
api_v1_router.include_router(campuses.router)
api_v1_router.include_router(blocks.router)
api_v1_router.include_router(activities.router)
api_v1_router.include_router(block_activities.router)
api_v1_router.include_router(activity_records.router)
api_v1_router.include_router(electricity.router, prefix="/electricity", tags=["Electricity & Baselines"])
api_v1_router.include_router(carbon.router)
api_v1_router.include_router(reporting.router, prefix="/reporting", tags=["Campus Dashboard & Reporting"])

