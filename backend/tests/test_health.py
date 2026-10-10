def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "CampusCarbon AI" in data["app"]

def test_api_v1_info(client):
    response = client.get("/api/v1/info")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert "Phase 0" in data["phase"]
