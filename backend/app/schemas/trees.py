"""
Pydantic v2 schemas for Trees, Green Spaces, Plantation & Carbon Sequestration.
Organization: Amrita Vishwa Vidyapeetham | Coimbatore Campus (AVV-CBE)
"""

from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


# ---------------------------------------------------------------------------
# Green Space Schemas
# ---------------------------------------------------------------------------

class GreenSpaceBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Green space or garden name")
    code: str = Field(..., min_length=2, max_length=64, description="Unique zone code e.g. GS-HERBAL-01")
    plantation_type: str = Field("Avenue Plantation", description="Miyawaki Forest, Herbal Garden, Avenue Plantation, Botanical Garden, Lawn & Canopy")
    area_sqm: Optional[float] = Field(None, ge=0.0, description="Area in square meters")
    area_unit: str = Field("sqm", max_length=32)
    description: Optional[str] = None
    block_id: Optional[str] = None
    is_active: bool = True


class GreenSpaceCreate(GreenSpaceBase):
    campus_id: Optional[str] = None


class GreenSpaceUpdate(BaseModel):
    name: Optional[str] = None
    plantation_type: Optional[str] = None
    area_sqm: Optional[float] = None
    area_unit: Optional[str] = None
    description: Optional[str] = None
    block_id: Optional[str] = None
    is_active: Optional[bool] = None


class GreenSpaceResponse(GreenSpaceBase):
    id: str
    campus_id: str
    tree_count: int = 0
    annual_sequestration_kg: float = 0.0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Tree Inventory Schemas
# ---------------------------------------------------------------------------

class TreeInventoryBase(BaseModel):
    species_name: str = Field(..., min_length=2, max_length=255, description="Botanical name, e.g. Azadirachta indica")
    common_name: str = Field(..., min_length=2, max_length=255, description="Common name, e.g. Neem")
    tree_count: int = Field(..., gt=0, description="Number of trees in this stand/entry")
    planting_year: Optional[int] = Field(None, ge=1900, le=2100, description="Approx planting year if known")
    estimated_age_years: Optional[float] = Field(None, ge=0.0, description="Estimated tree age in years")
    health_status: str = Field("Healthy", description="Healthy, Fair, Diseased, Dead/Senescent")
    location_description: Optional[str] = None
    data_source: str = Field("Campus Tree Census", description="Source or audit methodology")
    verification_status: str = Field("Provisional", description="Verified Field Census, Provisional, Satellite Survey")
    sequestration_rate_kg_year: float = Field(22.0, ge=0.0, description="Allometric annual sequestration factor (kg CO2e/tree/year)")
    methodology_notes: Optional[str] = None
    notes: Optional[str] = None
    block_id: Optional[str] = None
    green_space_id: Optional[str] = None


class TreeInventoryCreate(TreeInventoryBase):
    campus_id: Optional[str] = None


class TreeInventoryUpdate(BaseModel):
    species_name: Optional[str] = None
    common_name: Optional[str] = None
    tree_count: Optional[int] = Field(None, gt=0)
    planting_year: Optional[int] = None
    estimated_age_years: Optional[float] = None
    health_status: Optional[str] = None
    location_description: Optional[str] = None
    data_source: Optional[str] = None
    verification_status: Optional[str] = None
    sequestration_rate_kg_year: Optional[float] = None
    methodology_notes: Optional[str] = None
    notes: Optional[str] = None
    block_id: Optional[str] = None
    green_space_id: Optional[str] = None


class TreeInventoryResponse(TreeInventoryBase):
    id: str
    campus_id: str
    annual_sequestration_kg: float
    annual_sequestration_t: float = 0.0
    block_name: Optional[str] = None
    green_space_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Plantation Record Schemas
# ---------------------------------------------------------------------------

class PlantationRecordBase(BaseModel):
    event_name: str = Field(..., min_length=2, max_length=255, description="Name of planting drive or milestone")
    plantation_date: date = Field(..., description="Date saplings were planted")
    species_planted: str = Field(..., min_length=2, max_length=255, description="Species planted")
    saplings_planted: int = Field(..., ge=1, description="Total number of saplings planted")
    saplings_surviving: int = Field(..., ge=0, description="Total currently surviving saplings")
    plantation_location: str = Field(..., min_length=2, max_length=255, description="Location on campus")
    maintenance_notes: Optional[str] = None
    block_id: Optional[str] = None
    green_space_id: Optional[str] = None


class PlantationRecordCreate(PlantationRecordBase):
    campus_id: Optional[str] = None


class PlantationRecordUpdate(BaseModel):
    event_name: Optional[str] = None
    plantation_date: Optional[date] = None
    species_planted: Optional[str] = None
    saplings_planted: Optional[int] = Field(None, ge=1)
    saplings_surviving: Optional[int] = Field(None, ge=0)
    plantation_location: Optional[str] = None
    maintenance_notes: Optional[str] = None
    block_id: Optional[str] = None
    green_space_id: Optional[str] = None


class PlantationRecordResponse(PlantationRecordBase):
    id: str
    campus_id: str
    survival_rate_percent: float
    block_name: Optional[str] = None
    green_space_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Sequestration Summary & Analytics
# ---------------------------------------------------------------------------

class SpeciesSequestrationBreakdown(BaseModel):
    common_name: str
    species_name: str
    tree_count: int
    annual_sequestration_kg: float
    annual_sequestration_t: float
    percentage_of_total: float


class GreenSpaceSummaryBreakdown(BaseModel):
    id: str
    name: str
    code: str
    plantation_type: str
    area_sqm: Optional[float] = None
    tree_count: int
    annual_sequestration_kg: float


class SequestrationSummary(BaseModel):
    total_trees: int
    total_species_count: int
    total_green_spaces: int
    total_green_space_area_sqm: float
    total_annual_sequestration_kg_co2e: float
    total_annual_sequestration_t_co2e: float
    total_saplings_planted: int
    total_saplings_surviving: int
    average_survival_rate_percent: float
    methodology: str = "IPCC 2006 AFOLU Vol 4 & Forest Survey of India Allometric Biomass Standard"
    methodology_assumptions: str = (
        "Tree sequestration uses allometric age and health multipliers: Healthy (1.0x), Fair (0.8x), "
        "Diseased (0.4x). Mature tropical canopy trees average 22.0 kg CO2e/tree/year; dense Miyawaki stands "
        "average 30.0 kg CO2e/tree/year. Sequestration is reported separately from gross emissions."
    )
    species_breakdown: List[SpeciesSequestrationBreakdown]
    green_space_breakdown: List[GreenSpaceSummaryBreakdown]
    data_quality_label: str = "Provisional Campus Inventory"
