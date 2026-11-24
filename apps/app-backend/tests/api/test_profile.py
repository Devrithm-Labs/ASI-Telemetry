"""Test user name and password update endpoints."""

def test_update_name_and_password(client):
    # 1. Sign up new test user
    email = "update_test_user@example.com"
    orig_pwd = "OriginalPassword123!"
    signup_payload = {
        "name": "Original Name",
        "email": email,
        "password": orig_pwd,
    }
    resp = client.post("/api/auth/signup", json=signup_payload)
    assert resp.status_code == 201
    auth_data = resp.json()
    token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Update name only
    resp = client.put(
        "/api/auth/profile",
        headers=headers,
        json={"name": "Updated Name"},
    )
    assert resp.status_code == 200
    user_data = resp.json()
    assert user_data["name"] == "Updated Name"
    assert user_data["email"] == email

    # Verify /api/auth/me returns the updated name
    me_resp = client.get("/api/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["name"] == "Updated Name"

    # 3. Update password with incorrect current password -> should fail (400)
    resp = client.put(
        "/api/auth/profile",
        headers=headers,
        json={
            "current_password": "WrongPassword!",
            "new_password": "NewSecretPassword456!",
        },
    )
    assert resp.status_code == 400
    assert "incorrect current password" in resp.json()["detail"].lower()

    # 4. Update password with correct current password -> should succeed (200)
    resp = client.put(
        "/api/auth/profile",
        headers=headers,
        json={
            "current_password": orig_pwd,
            "new_password": "NewSecretPassword456!",
        },
    )
    assert resp.status_code == 200

    # 5. Verify can login with new password
    login_resp = client.post(
        "/api/auth/login",
        json={"email": email, "password": "NewSecretPassword456!"},
    )
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()

    # Verify cannot login with old password
    old_login_resp = client.post(
        "/api/auth/login",
        json={"email": email, "password": orig_pwd},
    )
    assert old_login_resp.status_code == 401


def test_update_empty_payload_fails(client):
    # Sign up new user
    email = "empty_payload_user@example.com"
    resp = client.post(
        "/api/auth/signup",
        json={"name": "Test User", "email": email, "password": "Password123!"},
    )
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Send empty update payload
    resp = client.put("/api/auth/profile", headers=headers, json={})
    assert resp.status_code == 400
