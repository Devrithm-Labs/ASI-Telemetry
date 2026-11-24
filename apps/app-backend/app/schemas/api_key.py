from typing import List, Optional
from pydantic import BaseModel, Field


class CreateApiKeyRequest(BaseModel):
    name: Optional[str] = "Default Key"
    environment: str = Field(default="production")
    permissions: List[str] = Field(default_factory=lambda: ["telemetry:write", "telemetry:read"])
    expires_at: Optional[str] = "90 days"
    rate_limit: Optional[str] = "25,000 req/min"


class ApiKeyResponse(BaseModel):
    id: str
    user_id: str
    name: str
    key_prefix: str
    full_key: Optional[str] = None
    environment: str
    permissions: List[str] = Field(default_factory=list)
    rate_limit: str = "25,000 req/min"
    status: str = "active"
    created_at: str
    last_used_at: Optional[str] = None
    expires_at: Optional[str] = None


ApiKeyCreatedResponse = ApiKeyResponse

__all__ = [
    "CreateApiKeyRequest",
    "ApiKeyResponse",
    "ApiKeyCreatedResponse",
]
