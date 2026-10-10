from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_v1_router

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="CampusCarbon AI: Institutional Decarbonization & Sustainability Intelligence Platform",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to configured domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint for container probes and uptime monitors."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "documentation": "/docs",
        "api_v1": "/api/v1/info"
    }

# Mount API v1 router
app.include_router(api_v1_router, prefix="/api")
