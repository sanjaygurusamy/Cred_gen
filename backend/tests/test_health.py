from fastapi.testclient import TestClient

def test_root_health_check(client: TestClient):
    """Verifies that GET /health returns 200 OK."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "CampusCarbon AI" in data["app"]

def test_api_health_check(client: TestClient):
    """Verifies that GET /api/health returns 200 OK."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "CampusCarbon AI" in data["app"]

def test_api_v1_info(client: TestClient):
    """Verifies that GET /api/v1/info returns system info."""
    response = client.get("/api/v1/info")
    assert response.status_code == 200
    data = response.json()
    assert data["app_name"] == "CampusCarbon AI"
    assert "Phase 1" in data["current_phase"]
