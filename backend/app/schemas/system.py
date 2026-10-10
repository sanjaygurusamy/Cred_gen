from typing import Optional, List
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str = Field(..., description="API health status", examples=["healthy"])
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
    app: str = Field(..., description="Application name", examples=["CampusCarbon AI"])
    version: str = Field(..., description="Application version", examples=["2.0.0"])
    environment: str = Field(..., description="Runtime environment", examples=["development"])

class DatabaseStatus(BaseModel):
    connected: bool = Field(..., description="Whether database connection succeeded")
    status: str = Field(..., description="Status summary ('connected' or 'unavailable')")
    engine: str = Field(..., description="Database engine type", examples=["postgresql"])
    message: Optional[str] = Field(None, description="Diagnostic detail or failure reason")

class ReadinessResponse(BaseModel):
    status: str = Field(..., description="'ready' when all dependencies are healthy, else 'not_ready'")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
    database: DatabaseStatus
    phase: str = Field(..., description="Current development phase", examples=["Phase 1: Application Foundation"])

class SystemInfoResponse(BaseModel):
    app_name: str
    version: str
    environment: str
    current_phase: str
    architecture: str
    database_engine: str
    features_active: List[str]
    features_planned: List[str]
