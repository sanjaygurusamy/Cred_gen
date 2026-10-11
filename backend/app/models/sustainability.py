import uuid
from sqlalchemy import Column, String, Text, DateTime, Float, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class SustainabilityRecommendation(Base):
    """
    Actionable decarbonization and sustainability recommendation
    grounded in campus activity records, electricity baselines, and tree sequestration.
    """
    __tablename__ = "sustainability_recommendations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    campus_id = Column(String(36), ForeignKey("campuses.id", ondelete="CASCADE"), nullable=False, index=True)
    block_id = Column(String(36), ForeignKey("campus_blocks.id", ondelete="SET NULL"), nullable=True, index=True)
    
    title = Column(String(255), nullable=False)
    category = Column(String(64), nullable=False, index=True)  # electricity_efficiency, fuel_transport, food_waste, water_conservation, tree_canopy, data_collection
    priority = Column(String(16), default="medium", nullable=False)  # high, medium, low
    
    proposed_action = Column(Text, nullable=False)
    supporting_evidence = Column(Text, nullable=False)
    related_sdgs = Column(String(128), nullable=False, default="[]")  # JSON-encoded array, e.g. "[7, 13]"
    
    potential_co2e_reduction_t_year = Column(Float, nullable=True)
    calculation_rationale = Column(Text, nullable=True)
    assumptions = Column(Text, nullable=True)
    
    status = Column(String(32), default="proposed", nullable=False, index=True)  # proposed, approved, in_progress, completed, rejected
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    block = relationship("CampusBlock")

    def __repr__(self) -> str:
        return f"<SustainabilityRecommendation(title='{self.title}', category='{self.category}', status='{self.status}')>"


class InstitutionalEvidence(Base):
    """
    Verified institutional assessment evidence record mapping campus sustainability
    indicators to documentation (bills, logs, registers, reports) for NIRF, NAAC & SDGs.
    """
    __tablename__ = "institutional_evidence"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    campus_id = Column(String(36), ForeignKey("campuses.id", ondelete="CASCADE"), nullable=False, index=True)
    
    title = Column(String(255), nullable=False)
    category = Column(String(64), nullable=False, index=True)  # electricity_bill, waste_register, plantation_log, water_audit, policy_document, green_initiative
    reference_number = Column(String(64), nullable=False)
    reporting_period = Column(String(64), nullable=False)
    
    associated_sdgs = Column(String(128), nullable=False, default="[]")  # JSON-encoded array, e.g. "[6, 7]"
    framework_tags = Column(String(255), nullable=False, default="[]")   # JSON-encoded array, e.g. '["NIRF", "NAAC"]'
    verification_status = Column(String(32), default="verified", nullable=False)  # verified, user_provided, awaiting_verification
    
    document_url_or_ref = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<InstitutionalEvidence(ref='{self.reference_number}', title='{self.title}', status='{self.verification_status}')>"
