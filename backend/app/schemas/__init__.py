"""Pydantic schemas package."""
from app.schemas.system import HealthResponse, ReadinessResponse, SystemInfoResponse
from app.schemas.organization import (
    OrganizationBase, OrganizationCreate, OrganizationUpdate,
    OrganizationResponse, OrganizationWithCampuses
)
from app.schemas.campus import (
    CampusBase, CampusCreate, CampusUpdate,
    CampusResponse, CampusDetailResponse
)
from app.schemas.block import (
    BlockCategory, BlockBase, BlockCreate, BlockUpdate,
    BlockResponse, BlockListResponse, CategoryStat,
    CATEGORY_DISPLAY_CONFIG
)

__all__ = [
    "HealthResponse",
    "ReadinessResponse",
    "SystemInfoResponse",
    "OrganizationBase",
    "OrganizationCreate",
    "OrganizationUpdate",
    "OrganizationResponse",
    "OrganizationWithCampuses",
    "CampusBase",
    "CampusCreate",
    "CampusUpdate",
    "CampusResponse",
    "CampusDetailResponse",
    "BlockCategory",
    "BlockBase",
    "BlockCreate",
    "BlockUpdate",
    "BlockResponse",
    "BlockListResponse",
    "CategoryStat",
    "CATEGORY_DISPLAY_CONFIG"
]
