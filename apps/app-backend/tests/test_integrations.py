"""Tests for user GitHub repository and MCP integration linking."""

import pytest
from fastapi.testclient import TestClient

from main import app
from auth.database import initialize_auth_database
from auth.service import signup
from auth.schemas import SignupRequest

client = TestClient(app)


@pytest.fixture(autouse=True)
def init_db():
    initialize_auth_database()


def test_github_integration_lifecycle():
    # 1. Signup a test user
    email = "gh_user@example.com"
    pwd = "ValidPassword123!"
    auth_resp = signup(SignupRequest(email=email, password=pwd, name="GitHub Developer"))
    token = auth_resp.access_token

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Check initial status (should be not connected)
    res = client.get("/api/integrations/github", headers=headers)
    assert res.status_code == 200
    assert res.json()["connected"] is False

    # 3. Invalid repository format should be rejected
    res_bad = client.post(
        "/api/integrations/github",
        headers=headers,
        json={"access_token": "ghp_mocktoken123", "default_repository": "invalid_repo_name"},
    )
    assert res_bad.status_code == 400

    # 4. Link valid repository
    res_link = client.post(
        "/api/integrations/github",
        headers=headers,
        json={
            "access_token": "ghp_mocktoken123",
            "default_repository": "dev-user/my-agent-service",
            "github_username": "dev-user",
        },
    )
    assert res_link.status_code == 200
    data = res_link.json()
    assert data["connected"] is True
    assert data["default_repository"] == "dev-user/my-agent-service"
    assert data["github_username"] == "dev-user"

    # 5. Fetch linked info
    res_get = client.get("/api/integrations/github", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["connected"] is True
    assert res_get.json()["default_repository"] == "dev-user/my-agent-service"

    # 6. Delete integration
    res_del = client.delete("/api/integrations/github", headers=headers)
    assert res_del.status_code == 200
    assert res_del.json()["success"] is True

    # 7. Check status after deletion
    res_after = client.get("/api/integrations/github", headers=headers)
    assert res_after.status_code == 200
    assert res_after.json()["connected"] is False


def test_github_url_normalization():
    email = "norm_user@example.com"
    pwd = "ValidPassword123!"
    auth_resp = signup(SignupRequest(email=email, password=pwd, name="Norm Developer"))
    headers = {"Authorization": f"Bearer {auth_resp.access_token}"}

    # Pass full browser URL: https://github.com/ujjwalkat07/ASI-Telemetry
    res = client.post(
        "/api/integrations/github",
        headers=headers,
        json={
            "access_token": "ghp_mocktoken123",
            "default_repository": "https://github.com/ujjwalkat07/ASI-Telemetry",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["connected"] is True
    assert data["default_repository"] == "ujjwalkat07/ASI-Telemetry"
    assert data["github_username"] == "ujjwalkat07"

