import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.schemas.api_key import ApiKeyCreatedResponse, ApiKeyResponse, CreateApiKeyRequest
from app.schemas.user import UserResponse
from app.services.api_key import create_api_key, list_api_keys, revoke_api_key

logger = logging.getLogger("asi_telemetry.api.api_keys")

router = APIRouter(prefix="/api-keys", tags=["API Keys"])


@router.get("", response_model=List[ApiKeyResponse])
def get_user_api_keys(current_user: UserResponse = Depends(get_current_user)):
    """List all API keys belonging to the authenticated user."""
    return list_api_keys(current_user.id)


@router.post("", response_model=ApiKeyCreatedResponse, status_code=status.HTTP_201_CREATED)
def generate_user_api_key(
    payload: Optional[CreateApiKeyRequest] = None,
    current_user: UserResponse = Depends(get_current_user),
):
    """Generate and return a new API key for the authenticated user."""
    return create_api_key(current_user.id, payload)


@router.delete("/{key_id}")
def delete_user_api_key(
    key_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    """Revoke an active API key."""
    success = revoke_api_key(key_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API Key not found or does not belong to you.",
        )
    return {"status": "success", "message": "API key revoked successfully."}
