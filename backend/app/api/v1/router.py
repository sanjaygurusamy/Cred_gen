from fastapi import APIRouter
from app.api.v1.endpoints import system

api_v1_router = APIRouter(prefix="/v1")

# Mount system endpoints under /v1 (e.g. /api/v1/health, /api/v1/ready, /api/v1/info)
api_v1_router.include_router(system.router)
