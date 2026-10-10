"""
Main FastAPI application entrypoint for CampusCarbon AI.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.seed_data import seed_database
from app.routes import (
    campus_router, recommendations_router, scenarios_router, interventions_router, calculator_router
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist and seed default campus data
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield
    # Shutdown

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="CampusCarbon AI: Intelligent Campus Decarbonization & Deterministic Recommendation System",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow frontend Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(campus_router)
app.include_router(recommendations_router)
app.include_router(scenarios_router)
app.include_router(interventions_router)
app.include_router(calculator_router)


@app.get("/api/health", tags=["System"])
def health_check():
    """Health check endpoint and LLM provider status report."""
    is_llm_ready = bool(
        settings.llm_api_key and settings.llm_api_key not in ["your-api-key-here", "placeholder", "none", ""]
    )
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.version,
        "llm_provider": settings.llm_provider,
        "llm_model": settings.llm_model,
        "llm_configured": is_llm_ready,
        "engine_mode": "hybrid_llm_rules" if is_llm_ready else "rule_based_fallback",
        "calculation_engine": "deterministic_ghg_protocol",
        "database": "sqlite_ready"
    }

from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Mount frontend production build if available
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
else:
    @app.get("/", tags=["System"])
    def root():
        return {
            "message": "Welcome to CampusCarbon AI Recommendation API",
            "docs_url": "/docs",
            "health_check": "/api/health"
        }

