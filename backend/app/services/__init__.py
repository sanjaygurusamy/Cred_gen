"""Services package."""
from app.services.seed_phase2 import seed_phase2_inventory, COIMBATORE_27_BLOCKS
from app.services.seed_phase3 import seed_phase3_catalogue, CANONICAL_ACTIVITIES
from app.services.seed_phase4 import seed_phase4_baselines, CANONICAL_BLOCK_BASELINES
from app.services.seed_phase5 import seed_canonical_emission_factors, CANONICAL_EMISSION_FACTORS
from app.services.reporting_engine import ReportingEngine

__all__ = [
    "seed_phase2_inventory",
    "COIMBATORE_27_BLOCKS",
    "seed_phase3_catalogue",
    "CANONICAL_ACTIVITIES",
    "seed_phase4_baselines",
    "CANONICAL_BLOCK_BASELINES",
    "seed_canonical_emission_factors",
    "CANONICAL_EMISSION_FACTORS",
    "ReportingEngine",
]

