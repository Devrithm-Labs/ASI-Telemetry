"""Tests for auth API routes (signup, login, me, and v1 aliases)."""

def test_signup_and_login_flow(client):
    email = "api_test_user@example.com"
    pwd = "SecurePassword123!"

    # Signup
    signup_resp = client.post(
        "/api/v1/auth/signup",
        json={"name": "API Test User", "email": email, "password": pwd},
    )
    assert signup_resp.status_code == 201
    signup_data = signup_resp.json()
    assert signup_data["status"] == "success"
    token = signup_data["access_token"]

    # Me
    me_resp = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == email

    # Login
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": pwd},
    )
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()
