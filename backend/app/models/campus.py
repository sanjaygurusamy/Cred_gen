import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime, Float, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Campus(Base):
    """Specific physical university campus location."""
    __tablename__ = "campuses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(64), nullable=False)
    location = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    total_area_sqm = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_campus_org_name"),
        UniqueConstraint("organization_id", "code", name="uq_campus_org_code"),
    )

    # Relationships
    organization = relationship("Organization", back_populates="campuses")
    blocks = relationship("CampusBlock", back_populates="campus", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Campus(code='{self.code}', name='{self.name}')>"
