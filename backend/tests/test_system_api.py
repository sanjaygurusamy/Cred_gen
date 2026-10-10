from unittest.mock import patch
from fastapi.testclient import TestClient

def test_health_endpoint_success(client: TestClient):
    """Verifies that GET /api/health returns 200 and valid schema."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "CampusCarbon AI"
    assert data["version"] == "2.0.0"
    assert "timestamp" in data
    assert "environment" in data

def test_health_v1_alias(client: TestClient):
    """Verifies that /api/v1/health functions as an identical alias."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_readiness_endpoint_when_db_connected(client: TestClient):
    """Verifies that GET /api/ready returns 200 OK when database ping succeeds."""
    with patch("app.api.v1.endpoints.system.check_database_health") as mock_check:
        mock_check.return_value = (True, "postgresql", "Database connection operational.")
        response = client.get("/api/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert data["database"]["connected"] is True
        assert data["database"]["status"] == "connected"
        assert data["database"]["engine"] == "postgresql"
        assert data["phase"] == "Phase 1: Application Foundation"

def test_readiness_endpoint_when_db_unavailable(client: TestClient):
    """Verifies that GET /api/ready returns 503 Service Unavailable when database ping fails."""
    with patch("app.api.v1.endpoints.system.check_database_health") as mock_check:
        mock_check.return_value = (False, "postgresql", "Database service at 127.0.0.1:5432 is unreachable.")
        response = client.get("/api/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "not_ready"
        assert data["database"]["connected"] is False
        assert data["database"]["status"] == "unavailable"
        assert "unreachable" in data["database"]["message"]
        # Ensure no secrets or passwords leaked
        assert "password" not in data["database"]["message"].lower()

def test_system_info_endpoint(client: TestClient):
    """Verifies GET /api/info returns complete safe metadata."""
    response = client.get("/api/info")
    assert response.status_code == 200
    data = response.json()
    assert data["app_name"] == "CampusCarbon AI"
    assert data["current_phase"] == "Phase 1: Application Foundation"
    assert len(data["features_active"]) >= 4
    assert len(data["features_planned"]) >= 8

def test_root_endpoint(client: TestClient):
    """Verifies GET / returns application index with doc links."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["documentation"] == "/docs"
    assert data["health"] == "/api/health"
    assert data["ready"] == "/api/ready"
