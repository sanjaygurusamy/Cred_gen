import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Campus(Base):
    __tablename__ = "campuses"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)
    location = Column(String, nullable=True)
    total_area_sqm = Column(Float, nullable=True)
    student_count = Column(Integer, default=0)
    staff_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    campus_bodies = relationship("CampusBody", back_populates="campus", cascade="all, delete-orphan")
    elements = relationship("Element", back_populates="campus", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="campus", cascade="all, delete-orphan")
    scenarios = relationship("ReductionScenario", back_populates="campus", cascade="all, delete-orphan")


class CampusBody(Base):
    __tablename__ = "campus_bodies"

    id = Column(String, primary_key=True, default=generate_uuid)
    campus_id = Column(String, ForeignKey("campuses.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # academic, laboratory, residence_hostel, dining_cafeteria, facilities_fleet, sports, administration, workshop
    floor_area_sqm = Column(Float, nullable=True)
    occupant_capacity = Column(Integer, nullable=True)
    primary_contact = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    campus = relationship("Campus", back_populates="campus_bodies")
    elements = relationship("Element", back_populates="campus_body")
    recommendations = relationship("Recommendation", back_populates="campus_body")


class Element(Base):
    __tablename__ = "elements"

    id = Column(String, primary_key=True, default=generate_uuid)
    campus_id = Column(String, ForeignKey("campuses.id"), nullable=False)
    campus_body_id = Column(String, ForeignKey("campus_bodies.id"), nullable=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False) # electricity, transportation, kitchen_lpg, food_waste, water_wastewater, air_conditioning, fabrication_construction
    scope = Column(String, nullable=False) # Scope 1, Scope 2, Scope 3
    operational_status = Column(String, default="active") # active, inactive, maintenance, decommissioned
    baseline_value = Column(Float, nullable=True)
    baseline_unit = Column(String, nullable=True)
    is_archived = Column(Boolean, default=False)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    campus = relationship("Campus", back_populates="elements")
    campus_body = relationship("CampusBody", back_populates="elements")
    activity_records = relationship("ActivityRecord", back_populates="element", cascade="all, delete-orphan")
    calculations = relationship("EmissionCalculation", back_populates="element", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="element")
    scenarios = relationship("ReductionScenario", back_populates="element")


class EmissionFactor(Base):
    __tablename__ = "emission_factors"

    id = Column(String, primary_key=True, default=generate_uuid)
    category = Column(String, nullable=False) # electricity, fuel, transport, food, waste, water
    sub_type = Column(String, nullable=False) # e.g. lpg, grid_electricity, diesel, chicken, wastewater_aerobic
    factor_value = Column(Float, nullable=False) # numeric emission factor value
    factor_unit = Column(String, nullable=False) # e.g. kgCO2e/kg, kgCO2e/kWh, kgCO2e/liter, kgCO2e/m3
    source = Column(String, nullable=False) # DEFRA, EPA eGRID, IPCC, CEA India
    region = Column(String, default="National")
    year = Column(Integer, default=2024)
    uncertainty_percentage = Column(Float, default=5.0)
    data_quality = Column(String, default="high") # high, medium, low
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    calculations = relationship("EmissionCalculation", back_populates="emission_factor")


class ActivityRecord(Base):
    __tablename__ = "activity_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    campus_id = Column(String, ForeignKey("campuses.id"), nullable=False)
    element_id = Column(String, ForeignKey("elements.id"), nullable=False)
    reporting_period_start = Column(DateTime, nullable=False)
    reporting_period_end = Column(DateTime, nullable=False)
    activity_value = Column(Float, nullable=False)
    activity_unit = Column(String, nullable=False)
    value_type = Column(String, default="measured") # measured, supplied, estimated, predicted
    data_quality = Column(String, default="high") # high, medium, low
    cost_rate = Column(Float, nullable=True) # cost per unit activity if known
    cost_currency = Column(String, default="USD")
    notes = Column(Text, nullable=True)
    recorded_by = Column(String, default="facilities_admin")
    created_at = Column(DateTime, default=datetime.utcnow)

    element = relationship("Element", back_populates="activity_records")
    calculations = relationship("EmissionCalculation", back_populates="activity_record", cascade="all, delete-orphan")


class EmissionCalculation(Base):
    __tablename__ = "emission_calculations"

    id = Column(String, primary_key=True, default=generate_uuid)
    campus_id = Column(String, ForeignKey("campuses.id"), nullable=False)
    element_id = Column(String, ForeignKey("elements.id"), nullable=False)
    activity_record_id = Column(String, ForeignKey("activity_records.id"), nullable=False)
    emission_factor_id = Column(String, ForeignKey("emission_factors.id"), nullable=False)
    calculated_emissions_kg = Column(Float, nullable=False) # E = Activity * EF
    calculation_method = Column(String, default="deterministic_ghg_protocol")
    data_quality = Column(String, default="high")
    calculation_timestamp = Column(DateTime, default=datetime.utcnow)
    details_json = Column(JSON, default=dict)

    element = relationship("Element", back_populates="calculations")
    activity_record = relationship("ActivityRecord", back_populates="calculations")
    emission_factor = relationship("EmissionFactor", back_populates="calculations")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String, primary_key=True, default=generate_uuid)
    campus_id = Column(String, ForeignKey("campuses.id"), nullable=False)
    campus_body_id = Column(String, ForeignKey("campus_bodies.id"), nullable=True)
    element_id = Column(String, ForeignKey("elements.id"), nullable=True)
    
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=False) # energy_efficiency, fuel_switching, food_waste_reduction, etc.
    problem = Column(Text, nullable=False)
    proposed_action = Column(Text, nullable=False)
    reasoning = Column(Text, nullable=False)
    
    expected_environmental_benefit = Column(Text, nullable=True)
    potential_operational_benefit = Column(Text, nullable=True)
    required_additional_info = Column(JSON, default=list)
    implementation_prerequisites = Column(JSON, default=list)
    potential_risks_constraints = Column(JSON, default=list)
    
    confidence_score = Column(Float, default=0.85) # 0.0 to 1.0
    priority_score = Column(Float, default=70.0) # 0 to 100
    priority_level = Column(String, default="medium") # high, medium, low
    
    status = Column(String, default="pending_review") # pending_review, approved, rejected, implemented, requires_assessment
    rejection_reason = Column(Text, nullable=True)
    source = Column(String, default="rule_based") # rule_based, llm, hybrid
    
    evidence_references = Column(JSON, default=list)
    estimation_assumptions = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    campus = relationship("Campus", back_populates="recommendations")
    campus_body = relationship("CampusBody", back_populates="recommendations")
    element = relationship("Element", back_populates="recommendations")
    sdg_mappings = relationship("SDGMapping", back_populates="recommendation", cascade="all, delete-orphan")
    scenarios = relationship("ReductionScenario", back_populates="recommendation")
    evidence_records = relationship("RecommendationEvidence", back_populates="recommendation", cascade="all, delete-orphan")


class RecommendationEvidence(Base):
    __tablename__ = "recommendation_evidence"

    id = Column(String, primary_key=True, default=generate_uuid)
    recommendation_id = Column(String, ForeignKey("recommendations.id"), nullable=False)
    evidence_type = Column(String, nullable=False) # activity_data, emission_factor, benchmark_study, equipment_spec
    description = Column(Text, nullable=False)
    source_reference = Column(String, nullable=True)
    confidence_level = Column(String, default="medium") # high, medium, low
    created_at = Column(DateTime, default=datetime.utcnow)

    recommendation = relationship("Recommendation", back_populates="evidence_records")


class SDGMapping(Base):
    __tablename__ = "sdg_mappings"

    id = Column(String, primary_key=True, default=generate_uuid)
    recommendation_id = Column(String, ForeignKey("recommendations.id"), nullable=True)
    scenario_id = Column(String, ForeignKey("reduction_scenarios.id"), nullable=True)
    sdg_number = Column(Integer, nullable=False) # 6, 7, 9, 11, 12, 13
    sdg_title = Column(String, nullable=False)
    intervention = Column(String, nullable=False)
    explanation = Column(Text, nullable=False)
    measurable_indicator = Column(String, nullable=False)
    supporting_evidence = Column(Text, nullable=True)
    is_measured_outcome = Column(Boolean, default=False) # potential contribution vs measured outcome
    created_at = Column(DateTime, default=datetime.utcnow)

    recommendation = relationship("Recommendation", back_populates="sdg_mappings")
    scenario = relationship("ReductionScenario", back_populates="sdg_mappings")


class ReductionScenario(Base):
    __tablename__ = "reduction_scenarios"

    id = Column(String, primary_key=True, default=generate_uuid)
    campus_id = Column(String, ForeignKey("campuses.id"), nullable=False)
    element_id = Column(String, ForeignKey("elements.id"), nullable=False)
    recommendation_id = Column(String, ForeignKey("recommendations.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="proposed") # proposed, approved, rejected, implemented
    created_by = Column(String, default="sustainability_officer")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    campus = relationship("Campus", back_populates="scenarios")
    element = relationship("Element", back_populates="scenarios")
    recommendation = relationship("Recommendation", back_populates="scenarios")
    assumptions = relationship("ScenarioAssumption", back_populates="scenario", cascade="all, delete-orphan")
    results = relationship("ScenarioCalculationResult", back_populates="scenario", cascade="all, delete-orphan")
    sdg_mappings = relationship("SDGMapping", back_populates="scenario", cascade="all, delete-orphan")
    implementations = relationship("InterventionImplementation", back_populates="scenario")


class ScenarioAssumption(Base):
    __tablename__ = "scenario_assumptions"

    id = Column(String, primary_key=True, default=generate_uuid)
    scenario_id = Column(String, ForeignKey("reduction_scenarios.id"), nullable=False)
    assumption_key = Column(String, nullable=False) # e.g. reduction_percent, fuel_efficiency_gain
    assumption_value = Column(Float, nullable=False)
    unit = Column(String, nullable=True) # e.g. %, kg, kWh
    notes = Column(Text, nullable=True)
    is_user_modified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    scenario = relationship("ReductionScenario", back_populates="assumptions")


class ScenarioCalculationResult(Base):
    __tablename__ = "scenario_calculation_results"

    id = Column(String, primary_key=True, default=generate_uuid)
    scenario_id = Column(String, ForeignKey("reduction_scenarios.id"), nullable=False)
    
    baseline_activity = Column(Float, nullable=False)
    baseline_unit = Column(String, nullable=False)
    alternative_activity = Column(Float, nullable=False)
    alternative_unit = Column(String, nullable=False)
    
    baseline_ef_id = Column(String, ForeignKey("emission_factors.id"), nullable=True)
    alternative_ef_id = Column(String, ForeignKey("emission_factors.id"), nullable=True)
    
    baseline_emissions_kg = Column(Float, nullable=False)
    alternative_emissions_kg = Column(Float, nullable=False)
    potential_reduction_kg = Column(Float, nullable=False) # E_base - E_alt
    potential_reduction_percentage = Column(Float, nullable=False) # (Red / E_base) * 100
    annual_reduction_tco2e = Column(Float, nullable=True)
    
    financial_savings_currency = Column(String, default="USD")
    financial_savings_amount = Column(Float, nullable=True)
    
    calculation_method = Column(String, default="deterministic_ghg_protocol")
    data_quality = Column(String, default="high")
    double_counting_safeguard_verified = Column(Boolean, default=True)
    calculation_timestamp = Column(DateTime, default=datetime.utcnow)

    scenario = relationship("ReductionScenario", back_populates="results")
    baseline_ef = relationship("EmissionFactor", foreign_keys=[baseline_ef_id])
    alternative_ef = relationship("EmissionFactor", foreign_keys=[alternative_ef_id])


class InterventionImplementation(Base):
    __tablename__ = "intervention_implementations"

    id = Column(String, primary_key=True, default=generate_uuid)
    campus_id = Column(String, ForeignKey("campuses.id"), nullable=False)
    recommendation_id = Column(String, ForeignKey("recommendations.id"), nullable=True)
    scenario_id = Column(String, ForeignKey("reduction_scenarios.id"), nullable=True)
    element_id = Column(String, ForeignKey("elements.id"), nullable=False)
    
    title = Column(String, nullable=False)
    implementation_date = Column(DateTime, nullable=False)
    completion_date = Column(DateTime, nullable=True)
    status = Column(String, default="completed") # in_progress, completed, paused
    capital_cost = Column(Float, nullable=True)
    operational_cost_annual = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    implemented_by = Column(String, default="campus_facilities_team")
    created_at = Column(DateTime, default=datetime.utcnow)

    scenario = relationship("ReductionScenario", back_populates="implementations")
    measurements = relationship("PostImplementationMeasurement", back_populates="intervention", cascade="all, delete-orphan")


class PostImplementationMeasurement(Base):
    __tablename__ = "post_implementation_measurements"

    id = Column(String, primary_key=True, default=generate_uuid)
    intervention_id = Column(String, ForeignKey("intervention_implementations.id"), nullable=False)
    
    measurement_period_start = Column(DateTime, nullable=False)
    measurement_period_end = Column(DateTime, nullable=False)
    measured_activity = Column(Float, nullable=False)
    measured_unit = Column(String, nullable=False)
    measured_emissions_kg = Column(Float, nullable=False)
    
    baseline_emissions_kg = Column(Float, nullable=False)
    actual_reduction_kg = Column(Float, nullable=False) # baseline - measured
    actual_reduction_percentage = Column(Float, nullable=False)
    
    verified_by = Column(String, default="auditor")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    intervention = relationship("InterventionImplementation", back_populates="measurements")


class LLMRequestLog(Base):
    __tablename__ = "llm_request_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    campus_id = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    model_used = Column(String, nullable=False)
    input_hash = Column(String, nullable=True)
    tokens_input = Column(Integer, default=0)
    tokens_output = Column(Integer, default=0)
    duration_ms = Column(Integer, default=0)
    cache_hit = Column(Boolean, default=False)
    status = Column(String, default="success") # success, fallback, error
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
