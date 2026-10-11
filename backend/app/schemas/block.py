from enum import Enum
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class BlockCategory(str, Enum):
    ACADEMIC = "academic"
    HOSTEL = "hostel"
    FACULTY_QUARTERS = "faculty_quarters"
    KITCHEN_CANTEEN = "kitchen_canteen"
    TRANSPORTATION = "transportation"
    SEWAGE_TREATMENT = "sewage_treatment"
    OTHER_FACILITY = "other_facility"


CATEGORY_DISPLAY_CONFIG: Dict[str, Dict[str, Any]] = {
    BlockCategory.ACADEMIC.value: {
        "label": "Academic",
        "description": "Lecture halls, academic departments, research complexes, administrative academic offices",
        "badge_color": "blue"
    },
    BlockCategory.HOSTEL.value: {
        "label": "Hostels",
        "description": "Student residential hostels and dormitories",
        "badge_color": "purple"
    },
    BlockCategory.FACULTY_QUARTERS.value: {
        "label": "Faculty Quarters",
        "description": "Residential accommodations for professors and residential faculty",
        "badge_color": "indigo"
    },
    BlockCategory.KITCHEN_CANTEEN.value: {
        "label": "Kitchens & Canteens",
        "description": "Dining facilities, student canteens, and central culinary preparation plants",
        "badge_color": "amber"
    },
    BlockCategory.TRANSPORTATION.value: {
        "label": "Transportation",
        "description": "Vehicle fleet hub, transit depot, parking, and campus transport facilities",
        "badge_color": "emerald"
    },
    BlockCategory.SEWAGE_TREATMENT.value: {
        "label": "Sewage Treatment",
        "description": "Wastewater treatment plants, effluent management, and recycling facilities",
        "badge_color": "cyan"
    },
    BlockCategory.OTHER_FACILITY.value: {
        "label": "Other Facilities",
        "description": "Waste consolidation yards, fabrication workshops, power generators and utilities",
        "badge_color": "slate"
    }
}


class BlockBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Full facility or block title")
    code: str = Field(..., min_length=2, max_length=64, description="Unique uppercase block identifier code")
    category: BlockCategory = Field(..., description="Operational category of the block")
    description: Optional[str] = Field(None, max_length=2000, description="Facility usage or equipment description")
    floor_area_sqm: Optional[float] = Field(None, ge=0, description="Total gross built-up floor area in square meters")
    area_unit: str = Field("sqm", description="Unit of measurement for floor area")
    occupant_capacity: Optional[int] = Field(None, ge=0, description="Design or operational occupant capacity")
    current_occupancy: Optional[int] = Field(None, ge=0, description="Actual recorded average occupancy")
    floors_count: Optional[int] = Field(None, ge=0, description="Number of building floors")
    classrooms_count: Optional[int] = Field(None, ge=0, description="Number of classrooms in facility")
    laboratories_count: Optional[int] = Field(None, ge=0, description="Number of teaching or research laboratories")
    operating_hours_per_day: Optional[float] = Field(None, ge=0, le=24, description="Standard operating hours per day")
    verification_status: str = Field("awaiting_verification", description="Data quality status: verified, user_provided, estimated, awaiting_verification, not_applicable")
    metadata_json: Optional[str] = Field(None, description="Additional operational attributes in JSON format")
    is_active: bool = Field(True, description="Whether the block is currently active in inventory")


class BlockCreate(BlockBase):
    campus_id: str = Field(..., description="Campus UUID owning this block")


class BlockUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    code: Optional[str] = Field(None, min_length=2, max_length=64)
    category: Optional[BlockCategory] = None
    description: Optional[str] = Field(None, max_length=2000)
    floor_area_sqm: Optional[float] = Field(None, ge=0)
    area_unit: Optional[str] = None
    occupant_capacity: Optional[int] = Field(None, ge=0)
    current_occupancy: Optional[int] = Field(None, ge=0)
    floors_count: Optional[int] = Field(None, ge=0)
    classrooms_count: Optional[int] = Field(None, ge=0)
    laboratories_count: Optional[int] = Field(None, ge=0)
    operating_hours_per_day: Optional[float] = Field(None, ge=0, le=24)
    verification_status: Optional[str] = None
    metadata_json: Optional[str] = None
    is_active: Optional[bool] = None


class BlockResponse(BlockBase):
    id: str
    campus_id: str
    category_label: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CategoryStat(BaseModel):
    category: str
    label: str
    count: int
    total_floor_area_sqm: float
    total_capacity: int


class BlockListResponse(BaseModel):
    total: int
    campus_id: Optional[str] = None
    items: List[BlockResponse]
    category_summary: List[CategoryStat]
