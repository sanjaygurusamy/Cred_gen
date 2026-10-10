from app.routes.campus import router as campus_router
from app.routes.recommendations import router as recommendations_router
from app.routes.scenarios import router as scenarios_router
from app.routes.interventions import router as interventions_router
from app.routes.calculator import calculator_router

__all__ = [
    "campus_router",
    "recommendations_router",
    "scenarios_router",
    "interventions_router",
    "calculator_router"
]

