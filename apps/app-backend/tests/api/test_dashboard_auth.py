"""Tests verifying that dashboard and trace endpoints reject unauthenticated access with 401."""

def test_unauthenticated_dashboard_access_fails(client):
    # GET /api/v1/dashboard without token must return 401
    resp = client.get("/api/v1/dashboard")
    assert resp.status_code == 401
    assert "Invalid or expired access token" in resp.json()["detail"]


def test_unauthenticated_traces_access_fails(client):
    # GET /api/v1/traces without token must return 401
    resp = client.get("/api/v1/traces")
    assert resp.status_code == 401


def test_unauthenticated_llm_traces_fails(client):
    # GET /api/v1/llm/traces without token must return 401
    resp = client.get("/api/v1/llm/traces")
    assert resp.status_code == 401


def test_unauthenticated_ingestion_fails(client):
    # POST /api/v1/metrics without API key or Bearer token must return 401
    resp = client.post(
        "/api/v1/metrics",
        json={"agent_name": "agent-test", "func_name": "run", "status": "success"},
    )
    assert resp.status_code == 401
    assert "Authentication required" in resp.json()["detail"]


def test_authenticated_dashboard_access_succeeds(client):
    # 1. Sign up user
    email = "dash_user@example.com"
    pwd = "DashPassword123!"
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"name": "Dash User", "email": email, "password": pwd},
    )
    assert signup_resp.status_code == 201
    token = signup_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Access dashboard with valid token -> 200 OK
    dash_resp = client.get("/api/v1/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert "summary" in dash_data
    assert "traces" in dash_data
