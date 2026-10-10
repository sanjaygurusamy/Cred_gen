import uuid
from typing import List, Dict, Any
from sqlalchemy import Column, String, Text, Boolean, DateTime, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class ActivityDefinition(Base):
    """
    Reusable activity catalogue definition in the database.
    Defines measurable activity types (e.g. electricity, water, waste, fuels, transport)
    along with default and supported units, conversions, and validation constraints.
    """
    __tablename__ = "activity_definitions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(64), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(64), nullable=False, index=True)
    description = Column(Text, nullable=True)
    default_unit = Column(String(32), nullable=False)
    supported_units = Column(JSON, nullable=False, default=list)  # e.g. ["m3", "litres"]
    unit_conversions = Column(JSON, nullable=False, default=dict)  # e.g. {"litres": 0.001}
    is_enabled = Column(Boolean, default=True, nullable=False)
    is_transfer_activity = Column(Boolean, default=False, nullable=False)  # For waste transfer/recycling
    validation_rules = Column(JSON, nullable=False, default=dict)  # e.g. {"min_value": 0}
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    block_assignments = relationship("BlockActivityAssignment", back_populates="activity", cascade="all, delete-orphan")
    daily_records = relationship("DailyActivityRecord", back_populates="activity")

    def __repr__(self) -> str:
        return f"<ActivityDefinition(code='{self.code}', name='{self.name}', default_unit='{self.default_unit}')>"


class BlockActivityAssignment(Base):
    """
    Configures which activities from the catalogue are assigned to a specific campus block.
    Supports block-specific customizations without hardcoding in the frontend.
    """
    __tablename__ = "block_activities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    block_id = Column(String(36), ForeignKey("campus_blocks.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_id = Column(String(36), ForeignKey("activity_definitions.id", ondelete="CASCADE"), nullable=False, index=True)
    is_enabled = Column(Boolean, default=True, nullable=False)
    custom_unit = Column(String(32), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("block_id", "activity_id", name="uq_block_activity"),
    )

    # Relationships
    block = relationship("CampusBlock")
    activity = relationship("ActivityDefinition", back_populates="block_assignments")

    def __repr__(self) -> str:
        return f"<BlockActivityAssignment(block_id='{self.block_id}', activity_id='{self.activity_id}')>"
