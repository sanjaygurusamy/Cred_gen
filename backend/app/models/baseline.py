import uuid
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, Date, Float, Integer,
    ForeignKey, UniqueConstraint, JSON
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class ElectricityBaseline(Base):
    """
    Electricity baseline model for a campus block.
    Encapsulates facility assumptions, power ratings, and operating hours
    effective across a defined timeframe. Versioned to preserve historical traceability.
    """
    __tablename__ = "electricity_baselines"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    campus_id = Column(String(36), ForeignKey("campuses.id", ondelete="CASCADE"), nullable=False, index=True)
    block_id = Column(String(36), ForeignKey("campus_blocks.id", ondelete="CASCADE"), nullable=False, index=True)

    version = Column(Integer, default=1, nullable=False)
    name = Column(String(128), default="Standard Baseline Profile", nullable=False)
    description = Column(Text, nullable=True)
    source_rationale = Column(Text, nullable=True)

    effective_start_date = Column(Date, nullable=False, index=True)
    effective_end_date = Column(Date, nullable=True)  # NULL indicates currently active baseline
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("block_id", "version", name="uq_block_baseline_version"),
    )

    # Relationships
    block = relationship("CampusBlock")
    items = relationship(
        "ElectricityBaselineItem",
        back_populates="baseline",
        cascade="all, delete-orphan",
        order_by="ElectricityBaselineItem.order_index"
    )
    estimates = relationship("DailyElectricityEstimate", back_populates="baseline")

    def __repr__(self) -> str:
        return f"<ElectricityBaseline(block_id='{self.block_id}', v={self.version}, active={self.is_active})>"


class ElectricityBaselineItem(Base):
    """
    Specific facility type item configured within an electricity baseline profile.
    E_item = quantity * average_power_kw * operating_hours
    """
    __tablename__ = "electricity_baseline_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    baseline_id = Column(String(36), ForeignKey("electricity_baselines.id", ondelete="CASCADE"), nullable=False, index=True)

    facility_type = Column(String(64), nullable=False)  # standard_classroom, ac_classroom, computer_lab_ac, hostel_room, etc.
    facility_name = Column(String(128), nullable=False)
    quantity = Column(Integer, nullable=False)
    average_power_kw = Column(Float, nullable=False)
    default_operating_hours = Column(Float, nullable=False)
    source_rationale = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    order_index = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    baseline = relationship("ElectricityBaseline", back_populates="items")

    def __repr__(self) -> str:
        return f"<ElectricityBaselineItem(name='{self.facility_name}', qty={self.quantity}, kw={self.average_power_kw})>"


class DailyElectricityEstimate(Base):
    """
    Deterministic daily electricity estimate record.
    Preserves input assumptions, baseline version, and exact calculation details
    for complete auditability.
    """
    __tablename__ = "daily_electricity_estimates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    campus_id = Column(String(36), ForeignKey("campuses.id", ondelete="CASCADE"), nullable=False, index=True)
    block_id = Column(String(36), ForeignKey("campus_blocks.id", ondelete="CASCADE"), nullable=False, index=True)

    baseline_id = Column(String(36), ForeignKey("electricity_baselines.id", ondelete="SET NULL"), nullable=True, index=True)
    baseline_version = Column(Integer, nullable=False)
    reporting_date = Column(Date, nullable=False, index=True)

    total_estimated_kwh = Column(Float, nullable=False)
    is_holiday = Column(Boolean, default=False, nullable=False)
    is_zero_consumption = Column(Boolean, default=False, nullable=False)
    operational_mode = Column(String(64), default="regular_day", nullable=False)  # regular_day, exam_day, weekend, vacation, holiday, maintenance
    notes = Column(Text, nullable=True)

    # Detailed snapshot of calculation line items
    calculation_details = Column(JSON, nullable=False)

    version = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("block_id", "reporting_date", name="uq_block_estimate_date"),
    )

    block = relationship("CampusBlock")
    baseline = relationship("ElectricityBaseline", back_populates="estimates")

    def __repr__(self) -> str:
        return f"<DailyElectricityEstimate(block='{self.block_id}', date='{self.reporting_date}', est_kwh={self.total_estimated_kwh})>"
