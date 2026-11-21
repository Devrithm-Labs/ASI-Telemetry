from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from api.dependencies import get_current_user
from schemas.api_key import ApiKeyResponse, CreateApiKeyRequest
from schemas.auth import UserResponse
from services.api_key_service import create_api_key, list_api_keys, revoke_api_key

router = APIRouter(prefix="/api/api-keys", tags=["API Keys"])


@router.post("", response_model=ApiKeyResponse, status_code=status.HTTP_201_CREATED)
def generate_key_endpoint(
    payload: Optional[CreateApiKeyRequest] = None,
    current_user: UserResponse = Depends(get_current_user),
):
    """Generates a new API key for the authenticated user and returns the full secret token."""
    return create_api_key(user_id=current_user.id, payload=payload)


@router.get("", response_model=List[ApiKeyResponse])
def get_user_keys_endpoint(
    current_user: UserResponse = Depends(get_current_user),
):
    """Lists all API keys created by the authenticated user with masked secrets."""
    return list_api_keys(user_id=current_user.id)


@router.delete("/{key_id}")
def revoke_key_endpoint(
    key_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    """Revokes an API key belonging to the authenticated user."""
    success = revoke_api_key(user_id=current_user.id, key_id=key_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found or already revoked",
        )
    return {"status": "success", "message": f"API key {key_id} successfully revoked"}
