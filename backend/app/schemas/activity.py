from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class ActivityDefinitionBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=64, description="Unique uppercase activity code e.g. ELEC_CONSUMPTION")
    name: str = Field(..., min_length=2, max_length=255, description="Full activity title")
    category: str = Field(..., min_length=2, max_length=64, description="Activity category (electricity, water, solid_waste, etc.)")
    description: Optional[str] = Field(None, max_length=2000)
    default_unit: str = Field(..., min_length=1, max_length=32, description="Canonical reporting unit")
    supported_units: List[str] = Field(default_factory=list, description="All accepted unit representations")
    unit_conversions: Dict[str, float] = Field(default_factory=dict, description="Multipliers to convert from supported unit to default unit")
    is_enabled: bool = Field(True, description="Whether this activity is enabled in catalogue")
    is_transfer_activity: bool = Field(False, description="True for waste/e-waste transfers to prevent counting as new generation")
    validation_rules: Dict[str, Any] = Field(default_factory=dict)


class ActivityDefinitionCreate(ActivityDefinitionBase):
    pass


class ActivityDefinitionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    category: Optional[str] = Field(None, min_length=2, max_length=64)
    description: Optional[str] = Field(None, max_length=2000)
    default_unit: Optional[str] = Field(None, min_length=1, max_length=32)
    supported_units: Optional[List[str]] = None
    unit_conversions: Optional[Dict[str, float]] = None
    is_enabled: Optional[bool] = None
    is_transfer_activity: Optional[bool] = None
    validation_rules: Optional[Dict[str, Any]] = None


class ActivityDefinitionResponse(ActivityDefinitionBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BlockActivityAssignmentBase(BaseModel):
    block_id: str
    activity_id: str
    is_enabled: bool = True
    custom_unit: Optional[str] = None
    notes: Optional[str] = None


class BlockActivityAssignmentCreate(BaseModel):
    activity_id: str
    is_enabled: bool = True
    custom_unit: Optional[str] = None
    notes: Optional[str] = None


class BlockActivityAssignmentResponse(BaseModel):
    id: str
    block_id: str
    activity_id: str
    is_enabled: bool
    custom_unit: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    activity: Optional[ActivityDefinitionResponse] = None

    model_config = ConfigDict(from_attributes=True)


class BlockActivitiesSummaryResponse(BaseModel):
    block_id: str
    block_name: str
    block_code: str
    total_assigned: int
    activities: List[BlockActivityAssignmentResponse]
