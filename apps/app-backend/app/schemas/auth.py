from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserCreate, UserResponse, UpdateProfileRequest

SignupRequest = UserCreate


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class AuthResponse(BaseModel):
    status: str = "success"
    message: str
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: UserResponse


class OAuthInitRequest(BaseModel):
    sender_address: str
    redirect_uri: Optional[str] = None


class OAuthInitResponse(BaseModel):
    session_id: str
    state: str
    authorization_url: str
    connect_url: Optional[str] = None
    expires_in_seconds: int
    sender_address: str


class OAuthHandoffExchangeRequest(BaseModel):
    session_id: Optional[str] = None
    handoff_code: Optional[str] = None
    sender_address: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    refresh_token: Optional[str] = None
    user: Optional[UserResponse] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None


__all__ = [
    "SignupRequest",
    "LoginRequest",
    "UpdateProfileRequest",
    "UserResponse",
    "AuthResponse",
    "OAuthInitRequest",
    "OAuthInitResponse",
    "OAuthHandoffExchangeRequest",
    "TokenResponse",
    "RefreshTokenRequest",
    "LogoutRequest",
]
