"""Compatibility shim for auth and API key schemas."""
from schemas.auth import (
    SignupRequest,
    LoginRequest,
    TokenResponse,
    AuthResponse,
    UserResponse,
    RefreshTokenRequest,
    LogoutRequest,
    OAuthInitRequest,
    OAuthInitResponse,
    OAuthHandoffExchangeRequest,
    UpdateProfileRequest,
)
from schemas.api_key import (
    CreateApiKeyRequest,
    ApiKeyResponse,
    ApiKeyCreatedResponse,
)

__all__ = [
    "SignupRequest",
    "LoginRequest",
    "TokenResponse",
    "AuthResponse",
    "UserResponse",
    "RefreshTokenRequest",
    "LogoutRequest",
    "OAuthInitRequest",
    "OAuthInitResponse",
    "OAuthHandoffExchangeRequest",
    "UpdateProfileRequest",
    "CreateApiKeyRequest",
    "ApiKeyResponse",
    "ApiKeyCreatedResponse",
]
