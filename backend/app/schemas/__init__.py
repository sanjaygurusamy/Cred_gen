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
from app.schemas.activity import (
    ActivityDefinitionBase, ActivityDefinitionCreate, ActivityDefinitionUpdate,
    ActivityDefinitionResponse, BlockActivityAssignmentCreate,
    BlockActivityAssignmentResponse, BlockActivitiesSummaryResponse
)
from app.schemas.activity_record import (
    DailyRecordBase, DailyRecordCreate, DailyRecordUpdate,
    DailyRecordResponse, DailyRecordListResponse, DailyRecordHistorySummary
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
    "CATEGORY_DISPLAY_CONFIG",
    "ActivityDefinitionBase",
    "ActivityDefinitionCreate",
    "ActivityDefinitionUpdate",
    "ActivityDefinitionResponse",
    "BlockActivityAssignmentCreate",
    "BlockActivityAssignmentResponse",
    "BlockActivitiesSummaryResponse",
    "DailyRecordBase",
    "DailyRecordCreate",
    "DailyRecordUpdate",
    "DailyRecordResponse",
    "DailyRecordListResponse",
    "DailyRecordHistorySummary",
]
