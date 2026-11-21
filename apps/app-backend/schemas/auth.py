from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class SignupRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Name must contain at least 2 non-space characters")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    current_password: Optional[str] = Field(default=None, min_length=1, max_length=128)
    new_password: Optional[str] = Field(default=None, min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Name must contain at least 2 non-space characters")
        return value


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: EmailStr
    created_at: Optional[str] = None


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
