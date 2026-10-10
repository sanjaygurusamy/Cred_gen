import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="session")
def client():
    """Provides a TestClient instance for API integration testing."""
    with TestClient(app) as test_client:
        yield test_client
