import uuid
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, Date, Float, Integer,
    ForeignKey, UniqueConstraint
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class DailyActivityRecord(Base):
    """
    Persistent daily activity measurement record.
    Stores raw reported quantities and units alongside standardized equivalents
    for uniform aggregation across the institution.
    """
    __tablename__ = "daily_activity_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    campus_id = Column(String(36), ForeignKey("campuses.id", ondelete="CASCADE"), nullable=False, index=True)
    block_id = Column(String(36), ForeignKey("campus_blocks.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_id = Column(String(36), ForeignKey("activity_definitions.id", ondelete="RESTRICT"), nullable=False, index=True)

    reporting_date = Column(Date, nullable=False, index=True)
    quantity = Column(Float, nullable=False)
    unit = Column(String(32), nullable=False)
    standardized_quantity = Column(Float, nullable=False)
    standardized_unit = Column(String(32), nullable=False)

    data_status = Column(String(32), nullable=False, default="measured")  # "measured" | "estimated"
    measurement_method = Column(String(64), nullable=False)  # "utility_meter", "sub_meter", "invoice", "logbook", "weighbridge"
    reading_identifier = Column(String(64), nullable=False, default="official_daily_total")
    is_daily_total = Column(Boolean, default=True, nullable=False)

    source_reference = Column(String(255), nullable=True)  # meter ID, invoice no, vehicle reg, manifest ID
    destination_details = Column(String(255), nullable=True)  # recycler details, sludge destination
    is_transfer = Column(Boolean, default=False, nullable=False)  # transfer / dispatch vs primary generation
    notes = Column(Text, nullable=True)
    version = Column(Integer, default=1, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("block_id", "activity_id", "reporting_date", "reading_identifier", name="uq_block_activity_date_reading"),
    )

    # Relationships
    organization = relationship("Organization")
    campus = relationship("Campus")
    block = relationship("CampusBlock")
    activity = relationship("ActivityDefinition", back_populates="daily_records")

    def __repr__(self) -> str:
        return f"<DailyActivityRecord(block='{self.block_id}', activity='{self.activity_id}', date='{self.reporting_date}', qty={self.quantity} {self.unit})>"
