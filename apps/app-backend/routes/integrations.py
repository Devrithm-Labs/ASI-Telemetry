"""User integrations management for ASI-Telemetry (GitHub MCP & repository linking)."""

import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from auth.dependencies import get_current_user
from auth.database import (
    delete_user_github_integration,
    get_user_github_integration,
    save_user_github_integration,
)
from auth.schemas import UserResponse

router = APIRouter(prefix="/api/integrations", tags=["Integrations"])

_REPO_PATTERN = re.compile(r"^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$")


class GitHubLinkRequest(BaseModel):
    access_token: str = Field(..., min_length=1, description="GitHub Personal Access Token or OAuth token")
    default_repository: str = Field(..., description="Target repository formatted as 'owner/repo'")
    github_username: Optional[str] = Field(default="", description="Optional GitHub username")


class GitHubIntegrationResponse(BaseModel):
    connected: bool
    github_username: Optional[str] = None
    default_repository: Optional[str] = None
    updated_at: Optional[str] = None


@router.post("/github", response_model=GitHubIntegrationResponse)
def link_github_endpoint(
    payload: GitHubLinkRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    """Links or updates the authenticated user's GitHub repository and access token."""
    repo = payload.default_repository.strip()
    if not _REPO_PATTERN.match(repo):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid repository format. Must be formatted as 'owner/repo'.",
        )

    rec = save_user_github_integration(
        user_id=current_user.id,
        access_token=payload.access_token,
        default_repository=repo,
        github_username=payload.github_username or "",
    )

    return GitHubIntegrationResponse(
        connected=True,
        github_username=rec.get("github_username"),
        default_repository=rec.get("default_repository"),
        updated_at=rec.get("updated_at"),
    )


@router.get("/github", response_model=GitHubIntegrationResponse)
def get_github_endpoint(
    current_user: UserResponse = Depends(get_current_user),
):
    """Retrieves the authenticated user's GitHub integration status."""
    rec = get_user_github_integration(current_user.id)
    if not rec:
        return GitHubIntegrationResponse(connected=False)

    return GitHubIntegrationResponse(
        connected=True,
        github_username=rec.get("github_username"),
        default_repository=rec.get("default_repository"),
        updated_at=rec.get("updated_at"),
    )


@router.delete("/github")
def delete_github_endpoint(
    current_user: UserResponse = Depends(get_current_user),
):
    """Removes the authenticated user's GitHub integration."""
    removed = delete_user_github_integration(current_user.id)
    return {"success": True, "removed": removed}
