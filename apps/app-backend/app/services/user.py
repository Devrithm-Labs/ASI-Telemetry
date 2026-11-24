import logging
from typing import Optional

from fastapi import HTTPException, status

from app.core.security import hash_password, verify_password
from app.repositories.user import UserRepository, user_repo
from app.schemas.user import UpdateProfileRequest, UserResponse

logger = logging.getLogger("asi_telemetry.service.user")


class UserService:
    """Business logic for user accounts and profile management."""

    def __init__(self, repo: UserRepository = user_repo):
        self.repo = repo

    def get_user_by_id(self, user_id: str) -> Optional[UserResponse]:
        u = self.repo.get_by_id(user_id)
        if not u:
            return None
        created_at_str = (
            u.created_at.isoformat()
            if hasattr(u.created_at, "isoformat")
            else str(u.created_at)
        )
        return UserResponse(
            id=str(u.id),
            name=str(u.name),
            email=str(u.email),
            created_at=created_at_str,
        )

    def update_profile(
        self, user_id: str, payload: UpdateProfileRequest
    ) -> UserResponse:
        user = self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        name_to_update: Optional[str] = None
        password_hash_to_update: Optional[str] = None

        if payload.name is not None:
            clean_name = payload.name.strip()
            if len(clean_name) < 2:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Name must be at least 2 characters long",
                )
            name_to_update = clean_name

        if payload.new_password is not None:
            if not payload.current_password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is required to set a new password",
                )
            if not verify_password(payload.current_password, user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Incorrect current password",
                )
            if len(payload.new_password) < 8:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="New password must be at least 8 characters long",
                )
            password_hash_to_update = hash_password(payload.new_password)

        if name_to_update is None and password_hash_to_update is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No updates provided",
            )

        self.repo.update(
            user_id,
            name=name_to_update,
            password_hash=password_hash_to_update,
        )

        updated_user = self.repo.get_by_id(user_id)
        created_at_str = (
            updated_user.created_at.isoformat()
            if updated_user and hasattr(updated_user.created_at, "isoformat")
            else str(getattr(updated_user, "created_at", ""))
        )
        return UserResponse(
            id=str(getattr(updated_user, "id", user_id)),
            name=str(getattr(updated_user, "name", user.name)),
            email=str(getattr(updated_user, "email", user.email)),
            created_at=created_at_str,
        )


user_service = UserService()
