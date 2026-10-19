import uuid
from datetime import datetime, timezone
from fastapi import HTTPException, status

from auth.database import email_exists, get_user_by_email, get_user_by_id, insert_user
from auth.security import create_access_token, hash_password, verify_password
from auth.schemas import AuthResponse, LoginRequest, SignupRequest, UserResponse
from config import settings


def _user_response(data: dict) -> UserResponse:
    return UserResponse(
        id=str(data["id"]),
        name=str(data["name"]),
        email=str(data["email"]),
        created_at=str(data["created_at"]),
    )


def signup(payload: SignupRequest) -> AuthResponse:
    email = str(payload.email).strip().lower()

    if email_exists(email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user_id = str(uuid.uuid4())
    password_hash = hash_password(payload.password)
    now = datetime.now(timezone.utc)

    insert_user(
        user_id=user_id,
        name=payload.name,
        email=email,
        password_hash=password_hash,
        created_at=now,
    )

    # Automatically provision initial default production API key for SDK usage
    try:
        from auth.api_keys import create_api_key
        create_api_key(user_id=user_id)
    except Exception:
        pass

    user_data = {
        "id": user_id,
        "name": payload.name,
        "email": email,
        "created_at": now.isoformat(),
    }

    token = create_access_token(user_id, email)
    return AuthResponse(
        message="Account created successfully",
        access_token=token,
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=_user_response(user_data),
    )


def login(payload: LoginRequest) -> AuthResponse:
    email = str(payload.email).strip().lower()
    user = get_user_by_email(email)

    # Keep the response generic so callers cannot distinguish unknown emails
    # from incorrect passwords.
    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user["id"], user["email"])
    return AuthResponse(
        message="Login successful",
        access_token=token,
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=_user_response(user),
    )


def find_user_by_id(user_id: str) -> UserResponse | None:
    user = get_user_by_id(str(user_id))
    return _user_response(user) if user else None
