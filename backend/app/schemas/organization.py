from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.campus import CampusResponse


class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Full institution title")
    code: str = Field(..., min_length=2, max_length=64, description="Institution acronym or short code")
    description: Optional[str] = Field(None, max_length=2000)
    website: Optional[str] = Field(None, max_length=255)
    is_active: bool = Field(True, description="Active status")


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    code: Optional[str] = Field(None, min_length=2, max_length=64)
    description: Optional[str] = Field(None, max_length=2000)
    website: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None


class OrganizationResponse(OrganizationBase):
    id: str
    campuses_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrganizationWithCampuses(OrganizationResponse):
    campuses: List[CampusResponse] = []
