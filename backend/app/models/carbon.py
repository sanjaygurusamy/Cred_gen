import uuid
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, Date, Float, Integer,
    ForeignKey, UniqueConstraint, JSON
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class EmissionFactor(Base):
    """
    Database-backed greenhouse gas emission factor definition.
    Anchored in authoritative Indian and IPCC guidelines with traceable citations,
    applicability scopes, versioning, and validity dates.
    """
    __tablename__ = "emission_factors"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    factor_code = Column(String(64), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(64), nullable=False, index=True)  # electricity, fuels, transportation, solid_waste, food_waste, sewage_treatment, renewables
    applicable_activity_code = Column(String(64), nullable=True, index=True)  # ELEC_CONSUMPTION, FUEL_DIESEL, etc.
    fuel_or_material = Column(String(64), nullable=True)  # diesel, petrol, lpg, grid_electricity, food_waste_compost
    scope = Column(String(16), nullable=False, index=True)  # scope_1, scope_2, scope_3

    factor_value = Column(Float, nullable=False)  # in kg CO2e per target_activity_unit
    factor_unit = Column(String(32), nullable=False)  # kg CO2e/kWh, kg CO2e/litre, kg CO2e/kg
    target_activity_unit = Column(String(32), nullable=False)  # kWh, litres, kg

    geography = Column(String(128), nullable=False)  # India (National Grid), India / IPCC 2006 Default
    source_organization = Column(String(255), nullable=False)  # Central Electricity Authority (CEA), IPCC, etc.
    reference_document = Column(String(255), nullable=False)  # CEA User Guide v19.0, IPCC 2006 Vol 2 Table 2.2
    reference_url = Column(Text, nullable=True)
    publication_year = Column(Integer, nullable=False)
    applicable_reporting_year = Column(Integer, nullable=True)

    effective_start_date = Column(Date, nullable=False)
    effective_end_date = Column(Date, nullable=True)  # NULL implies open-ended / currently effective
    version = Column(Integer, default=1, nullable=False)
    calculation_methodology = Column(Text, nullable=True)
    status = Column(String(32), default="verified", nullable=False)  # verified, provisional, retired
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("factor_code", "version", name="uq_factor_code_version"),
    )

    calculations = relationship("CarbonCalculationRecord", back_populates="emission_factor")

    def __repr__(self) -> str:
        return f"<EmissionFactor(code='{self.factor_code}', v={self.version}, val={self.factor_value} {self.factor_unit})>"


class CarbonCalculationRecord(Base):
    """
    Persistent, immutable greenhouse gas calculation snapshot.
    Stores the exact input quantity, standardization conversion, emission factor snapshot,
    formula, and resulting kg CO2e / t CO2e for complete institutional auditability.
    """
    __tablename__ = "carbon_calculation_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    campus_id = Column(String(36), ForeignKey("campuses.id", ondelete="CASCADE"), nullable=False, index=True)
    block_id = Column(String(36), ForeignKey("campus_blocks.id", ondelete="CASCADE"), nullable=False, index=True)

    reporting_date = Column(Date, nullable=False, index=True)
    reporting_period_end = Column(Date, nullable=True)

    # Activity lineage linkages
    activity_record_id = Column(String(36), ForeignKey("daily_activity_records.id", ondelete="SET NULL"), nullable=True, index=True)
    electricity_estimate_id = Column(String(36), ForeignKey("daily_electricity_estimates.id", ondelete="SET NULL"), nullable=True, index=True)

    activity_code = Column(String(64), nullable=False, index=True)
    activity_category = Column(String(64), nullable=False)
    scope = Column(String(16), nullable=False, index=True)  # scope_1, scope_2, scope_3
    activity_data_type = Column(String(32), nullable=False)  # actual_activity, actual_electricity, estimated_electricity

    # Quantities and explicit unit conversions
    reported_quantity = Column(Float, nullable=False)
    reported_unit = Column(String(32), nullable=False)
    standardized_quantity = Column(Float, nullable=False)
    standardized_unit = Column(String(32), nullable=False)
    conversion_factor_applied = Column(Float, default=1.0, nullable=False)
    conversion_steps = Column(Text, nullable=True)

    # Immutable snapshot of emission factor used at time of calculation
    emission_factor_id = Column(String(36), ForeignKey("emission_factors.id", ondelete="SET NULL"), nullable=True, index=True)
    emission_factor_code = Column(String(64), nullable=False)
    emission_factor_version = Column(Integer, nullable=False)
    emission_factor_value = Column(Float, nullable=False)
    emission_factor_unit = Column(String(32), nullable=False)
    emission_factor_source = Column(String(255), nullable=False)

    # Deterministic result
    formula = Column(String(255), nullable=False)  # e.g. "emissions = standardized_quantity * emission_factor_value"
    emissions_kg_co2e = Column(Float, nullable=False)
    emissions_t_co2e = Column(Float, nullable=False)  # emissions_kg_co2e / 1000.0

    # Reporting metadata & Phase 4 electricity integration
    selected_reporting_source = Column(String(32), default="measured", nullable=False)  # measured | estimated
    selection_reason = Column(Text, nullable=True)
    baseline_id = Column(String(36), nullable=True)
    baseline_version = Column(Integer, nullable=True)

    # Lifecycle, versioning and audit preservation
    is_superseded = Column(Boolean, default=False, nullable=False)
    superseded_by_id = Column(String(36), nullable=True)
    status = Column(String(32), default="calculated", nullable=False)  # calculated, recalculated, superseded, provisional
    version = Column(Integer, default=1, nullable=False)
    methodology_notes = Column(Text, nullable=True)
    validation_warnings = Column(JSON, default=list, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization")
    campus = relationship("Campus")
    block = relationship("CampusBlock")
    emission_factor = relationship("EmissionFactor", back_populates="calculations")
    activity_record = relationship("DailyActivityRecord")
    electricity_estimate = relationship("DailyElectricityEstimate")

    def __repr__(self) -> str:
        return f"<CarbonCalculationRecord(block='{self.block_id}', date='{self.reporting_date}', kg={self.emissions_kg_co2e})>"
