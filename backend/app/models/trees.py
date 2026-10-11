"""
Trees, Plantation & Green Spaces ORM Models
Organization: Amrita Vishwa Vidyapeetham | Coimbatore Campus (AVV-CBE)

Supports:
1. Green Spaces (parks, Miyawaki forests, herbal gardens, avenue zones).
2. Tree Inventory (species, count, age, health, verification, sequestration).
3. Plantation Records (planting drives, saplings planted vs surviving, maintenance).
"""

import uuid
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, Date, Float, Integer, ForeignKey
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class GreenSpace(Base):
    """
    Campus designated green space, botanical garden, Miyawaki forest, or park zone.
    """
    __tablename__ = "green_spaces"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    campus_id = Column(String(36), ForeignKey("campuses.id", ondelete="CASCADE"), nullable=False, index=True)
    block_id = Column(String(36), ForeignKey("campus_blocks.id", ondelete="SET NULL"), nullable=True, index=True)
    
    name = Column(String(255), nullable=False)
    code = Column(String(64), nullable=False, unique=True, index=True)
    plantation_type = Column(String(64), nullable=False, default="Avenue Plantation")  # Miyawaki Forest, Herbal Garden, Avenue Plantation, Botanical Garden, Lawn & Canopy
    area_sqm = Column(Float, nullable=True)
    area_unit = Column(String(32), nullable=False, default="sqm")
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    campus = relationship("Campus", backref="green_spaces")
    block = relationship("CampusBlock", backref="green_spaces")
    trees = relationship("TreeInventory", back_populates="green_space", cascade="all, delete-orphan")
    plantations = relationship("PlantationRecord", back_populates="green_space")

    def __repr__(self) -> str:
        return f"<GreenSpace(code='{self.code}', name='{self.name}', type='{self.plantation_type}')>"


class TreeInventory(Base):
    """
    Inventory of standing trees on campus with allometric age and sequestration tracking.
    """
    __tablename__ = "tree_inventories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    campus_id = Column(String(36), ForeignKey("campuses.id", ondelete="CASCADE"), nullable=False, index=True)
    block_id = Column(String(36), ForeignKey("campus_blocks.id", ondelete="SET NULL"), nullable=True, index=True)
    green_space_id = Column(String(36), ForeignKey("green_spaces.id", ondelete="SET NULL"), nullable=True, index=True)

    species_name = Column(String(255), nullable=False)   # Botanical / scientific name
    common_name = Column(String(255), nullable=False)    # Common name (e.g. Neem, Peepal, Teak)
    tree_count = Column(Integer, nullable=False, default=1)
    
    planting_year = Column(Integer, nullable=True)
    estimated_age_years = Column(Float, nullable=True)
    health_status = Column(String(64), nullable=False, default="Healthy")  # Healthy, Fair, Diseased, Dead/Senescent
    
    location_description = Column(String(255), nullable=True)
    data_source = Column(String(255), nullable=False, default="Campus Tree Census")
    verification_status = Column(String(64), nullable=False, default="Provisional")  # Verified Field Census, Provisional, Drone/Satellite Survey

    # Sequestration methodology & values
    sequestration_rate_kg_year = Column(Float, nullable=False, default=22.0)  # Default allometric mature tropical tree rate
    annual_sequestration_kg = Column(Float, nullable=False, default=0.0)      # tree_count * rate * health_multiplier
    methodology_notes = Column(Text, nullable=True)                           # e.g., "IPCC 2006 AFOLU Vol 4 & FSI allometric factors"
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    campus = relationship("Campus", backref="tree_inventories")
    block = relationship("CampusBlock", backref="tree_inventories")
    green_space = relationship("GreenSpace", back_populates="trees")

    def __repr__(self) -> str:
        return f"<TreeInventory(common='{self.common_name}', count={self.tree_count}, seq_kg={self.annual_sequestration_kg})>"


class PlantationRecord(Base):
    """
    Campus tree planting drive and survival monitoring record.
    """
    __tablename__ = "plantation_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    campus_id = Column(String(36), ForeignKey("campuses.id", ondelete="CASCADE"), nullable=False, index=True)
    block_id = Column(String(36), ForeignKey("campus_blocks.id", ondelete="SET NULL"), nullable=True, index=True)
    green_space_id = Column(String(36), ForeignKey("green_spaces.id", ondelete="SET NULL"), nullable=True, index=True)

    event_name = Column(String(255), nullable=False)
    plantation_date = Column(Date, nullable=False)
    species_planted = Column(String(255), nullable=False)
    
    saplings_planted = Column(Integer, nullable=False)
    saplings_surviving = Column(Integer, nullable=False)
    survival_rate_percent = Column(Float, nullable=False, default=100.0)
    
    plantation_location = Column(String(255), nullable=False)
    maintenance_notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    campus = relationship("Campus", backref="plantation_records")
    block = relationship("CampusBlock", backref="plantation_records")
    green_space = relationship("GreenSpace", back_populates="plantations")

    def __repr__(self) -> str:
        return f"<PlantationRecord(event='{self.event_name}', date={self.plantation_date}, surviving={self.saplings_surviving}/{self.saplings_planted})>"
