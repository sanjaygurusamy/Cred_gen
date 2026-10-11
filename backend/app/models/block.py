import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime, Float, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class CampusBlock(Base):
    """
    Physical facility, academic block, hostel, utility or operational unit within a campus.
    """
    __tablename__ = "campus_blocks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    campus_id = Column(String(36), ForeignKey("campuses.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(64), nullable=False)
    category = Column(String(64), nullable=False, index=True)
    description = Column(Text, nullable=True)
    floor_area_sqm = Column(Float, nullable=True)
    area_unit = Column(String(16), default="sqm", nullable=False)
    occupant_capacity = Column(Integer, nullable=True)
    current_occupancy = Column(Integer, nullable=True)
    floors_count = Column(Integer, nullable=True)
    classrooms_count = Column(Integer, nullable=True)
    laboratories_count = Column(Integer, nullable=True)
    operating_hours_per_day = Column(Float, nullable=True)
    verification_status = Column(String(32), default="awaiting_verification", nullable=False)
    metadata_json = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("campus_id", "name", name="uq_block_campus_name"),
        UniqueConstraint("campus_id", "code", name="uq_block_campus_code"),
    )

    # Relationships
    campus = relationship("Campus", back_populates="blocks")

    def __repr__(self) -> str:
        return f"<CampusBlock(code='{self.code}', name='{self.name}', category='{self.category}')>"
