import sqlite3
from fastapi import HTTPException, status

from auth.database import get_connection
from auth.security import create_access_token, hash_password, verify_password
from auth.schemas import AuthResponse, LoginRequest, SignupRequest, UserResponse
from config import settings


def _user_response(row: sqlite3.Row) -> UserResponse:
    return UserResponse(
        id=row["id"],
        name=row["name"],
        email=row["email"],
        created_at=row["created_at"],
    )


def signup(payload: SignupRequest) -> AuthResponse:
    email = str(payload.email).strip().lower()
    password_hash = hash_password(payload.password)

    try:
        with get_connection() as connection:
            cursor = connection.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                (payload.name, email, password_hash),
            )
            connection.commit()
            row = connection.execute(
                "SELECT id, name, email, created_at FROM users WHERE id = ?",
                (cursor.lastrowid,),
            ).fetchone()
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    token = create_access_token(row["id"], row["email"])
    return AuthResponse(
        message="Account created successfully",
        access_token=token,
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=_user_response(row),
    )


def login(payload: LoginRequest) -> AuthResponse:
    email = str(payload.email).strip().lower()
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?",
            (email,),
        ).fetchone()

    # Keep the response generic so callers cannot distinguish unknown emails
    # from incorrect passwords.
    if row is None or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(row["id"], row["email"])
    return AuthResponse(
        message="Login successful",
        access_token=token,
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=_user_response(row),
    )


def find_user_by_id(user_id: int) -> UserResponse | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id, name, email, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    return _user_response(row) if row else None
