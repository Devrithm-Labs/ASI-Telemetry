from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.schemas.user import UpdateProfileRequest, UserResponse
from app.services.user import user_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
def get_my_profile(current_user: UserResponse = Depends(get_current_user)):
    """Retrieve details of the currently authenticated user."""
    return current_user


@router.put("/profile", response_model=UserResponse)
def update_my_profile(
    payload: UpdateProfileRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    """Update name or password for the currently authenticated user."""
    return user_service.update_profile(current_user.id, payload)


@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    """Get public profile of a user by user_id."""
    user = user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user
