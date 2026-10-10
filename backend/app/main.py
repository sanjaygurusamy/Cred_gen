import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_v1_router
from app.api.v1.endpoints import system

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("campuscarbon")

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="CampusCarbon AI: Institutional Decarbonization & Sustainability Intelligence Platform",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Root information endpoint
@app.get("/", tags=["Root"])
def root():
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "phase": "Phase 1: Application Foundation",
        "documentation": "/docs",
        "health": "/api/health",
        "ready": "/api/ready",
        "info": "/api/info"
    }

# Mount system endpoints directly at / for container health probes (/health, /ready, /info)
app.include_router(system.router)

# Mount system endpoints under /api (/api/health, /api/ready, /api/info)
app.include_router(system.router, prefix="/api")

# Mount versioned API routes under /api/v1 (/api/v1/health, /api/v1/ready, /api/v1/info)
app.include_router(api_v1_router, prefix="/api")
