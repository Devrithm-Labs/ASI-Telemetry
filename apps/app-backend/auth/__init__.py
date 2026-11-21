"""Compatibility shim for auth package."""
from auth.database import initialize_auth_database
from services.auth_service import signup, login, find_user_by_id
from api.dependencies import get_current_user
from schemas.auth import SignupRequest, LoginRequest, UserResponse, AuthResponse

__all__ = [
    "initialize_auth_database",
    "signup",
    "login",
    "find_user_by_id",
    "get_current_user",
    "SignupRequest",
    "LoginRequest",
    "UserResponse",
    "AuthResponse",
]
