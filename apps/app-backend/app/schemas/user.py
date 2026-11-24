from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserBase(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Name must contain at least 2 non-space characters")
        return value


class UserUpdate(BaseModel):
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


UpdateProfileRequest = UserUpdate


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: EmailStr
    created_at: Optional[str] = None


__all__ = [
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UpdateProfileRequest",
    "UserResponse",
]
