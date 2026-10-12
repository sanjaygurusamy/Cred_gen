import os
import tempfile
import pytest
from fastapi.testclient import TestClient

# Ensure all SQLAlchemy models are registered on Base.metadata
import app.models
from app.core.config import settings
from app.core.database import Base, get_engine, check_database_health
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Ensure database is reachable; gracefully fallback to a temporary SQLite database if PostgreSQL container is offline."""
    is_connected, _, _ = check_database_health()
    temp_db_path = None
    if not is_connected and "sqlite" not in settings.database_url:
        temp_db_path = os.path.join(tempfile.gettempdir(), "campuscarbon_pytest.db")
        settings.database_url = f"sqlite:///{temp_db_path}"
        import app.core.database as db_mod
        db_mod._engine = None
        db_mod._session_factory = None

    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    yield
    if temp_db_path and os.path.exists(temp_db_path):
        try:
            os.remove(temp_db_path)
        except OSError:
            pass


@pytest.fixture(scope="session")
def client():
    """Provides a TestClient instance for API integration testing."""
    with TestClient(app) as test_client:
        yield test_client
