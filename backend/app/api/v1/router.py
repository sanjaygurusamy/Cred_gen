from fastapi import APIRouter
from app.api.v1.endpoints import system, organizations, campuses, blocks

api_v1_router = APIRouter(prefix="/v1")

# Mount endpoints under /v1
api_v1_router.include_router(system.router)
api_v1_router.include_router(organizations.router)
api_v1_router.include_router(campuses.router)
api_v1_router.include_router(blocks.router)
