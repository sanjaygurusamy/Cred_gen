from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.block import BlockResponse


class CampusBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Full campus name")
    code: str = Field(..., min_length=2, max_length=64, description="Campus code e.g. CBE")
    location: Optional[str] = Field(None, max_length=255, description="City, region or full address")
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    total_area_sqm: Optional[float] = Field(None, ge=0, description="Total campus land area in square meters")
    is_active: bool = Field(True, description="Whether the campus is actively monitored")


class CampusCreate(CampusBase):
    organization_id: str = Field(..., description="Organization UUID owning this campus")


class CampusUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    code: Optional[str] = Field(None, min_length=2, max_length=64)
    location: Optional[str] = Field(None, max_length=255)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    total_area_sqm: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None


class CampusResponse(CampusBase):
    id: str
    organization_id: str
    block_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CampusDetailResponse(CampusResponse):
    blocks: List[BlockResponse] = []
