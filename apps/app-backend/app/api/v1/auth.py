import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import HTMLResponse

from app.api.deps import get_current_user
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    LogoutRequest,
    OAuthHandoffExchangeRequest,
    OAuthInitRequest,
    OAuthInitResponse,
    RefreshTokenRequest,
    SignupRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)
from app.services.auth import (
    create_agent_oauth_session,
    exchange_agent_oauth_session,
    get_oauth_session,
    handle_google_oauth_callback,
    login,
    logout_session,
    refresh_application_tokens,
    signup,
)
from app.services.user import user_service
from app.utils.templates import (
    render_callback_page,
    render_connect_page,
    render_error_page,
)

logger = logging.getLogger("asi_telemetry.api.auth")

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ---------------------------------------------------------------------------
# Traditional Email / Password Endpoints
# ---------------------------------------------------------------------------

@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup_endpoint(payload: SignupRequest):
    """Create a user account and return an access token."""
    return signup(payload)


@router.post("/login", response_model=AuthResponse)
def login_endpoint(payload: LoginRequest):
    """Verify credentials and return an access token."""
    return login(payload)


@router.get("/me", response_model=UserResponse)
def current_user_endpoint(current_user: UserResponse = Depends(get_current_user)):
    """Return the account associated with the supplied Bearer token."""
    return current_user


@router.put("/profile", response_model=UserResponse)
def update_profile_endpoint(
    payload: UpdateProfileRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    """Update current user profile (name or password)."""
    return user_service.update_profile(current_user.id, payload)


# ---------------------------------------------------------------------------
# Google OAuth 2.0 & Agent Handshake Endpoints
# ---------------------------------------------------------------------------

@router.post("/oauth/init", response_model=OAuthInitResponse)
def oauth_init_endpoint(payload: OAuthInitRequest):
    """Initiate an agent OAuth session with PKCE challenge."""
    return create_agent_oauth_session(
        sender_address=payload.sender_address,
        redirect_uri=payload.redirect_uri,
    )


@router.post("/oauth/exchange", response_model=TokenResponse)
def oauth_exchange_endpoint(payload: OAuthHandoffExchangeRequest):
    """Exchange single-use handoff code for JWT access token."""
    return exchange_agent_oauth_session(payload)


@router.get("/oauth/callback")
async def oauth_callback_endpoint(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
):
    """Google OAuth callback redirect endpoint."""
    if error:
        logger.warning(f"Google OAuth error returned: {error}")
        html_content = render_error_page(
            title="Authorization Failed",
            error_message=f"Google returned an authentication error: {error}",
        )
        return HTMLResponse(content=html_content, status_code=400)

    if not code or not state:
        html_content = render_error_page(
            title="Missing Parameters",
            error_message="Missing required OAuth parameters (code or state).",
        )
        return HTMLResponse(content=html_content, status_code=400)

    try:
        result = await handle_google_oauth_callback(code=code, state=state)
        html_content = render_callback_page(
            handoff_code=result["handoff_code"],
            user_email=result["user"]["email"],
            sender_address=result["sender_address"],
        )
        return HTMLResponse(content=html_content)
    except HTTPException as e:
        html_content = render_error_page(
            title="Authentication Failed",
            error_message=str(e.detail),
        )
        return HTMLResponse(content=html_content, status_code=e.status_code)
    except Exception as e:
        logger.exception("Unexpected error during Google OAuth callback")
        html_content = render_error_page(
            title="Internal Error",
            error_message=f"An unexpected error occurred: {str(e)}",
        )
        return HTMLResponse(content=html_content, status_code=500)


@router.get("/connect", response_class=HTMLResponse)
def connect_portal(
    session_id: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
):
    """Interactive landing page for agent authentication."""
    if not session_id:
        return HTMLResponse(
            content=render_error_page(
                title="Invalid Connection Link",
                error_message="Missing required session_id parameter.",
            ),
            status_code=400,
        )

    session = get_oauth_session(session_id)
    if not session:
        return HTMLResponse(
            content=render_error_page(
                title="Session Expired or Not Found",
                error_message="The connection session was not found or has expired. Please initiate a new connection from your agent.",
            ),
            status_code=404,
        )

    if session.get("expires_at", 0) < time.time():
        return HTMLResponse(
            content=render_error_page(
                title="Session Expired",
                error_message="This session has timed out. Return to your agent CLI or chat and request a new connection link.",
            ),
            status_code=400,
        )

    google_init = create_agent_oauth_session(
        sender_address=session["sender_address"],
        redirect_uri=session["redirect_uri"],
    )

    auth_url = (
        google_init.get("authorization_url")
        if isinstance(google_init, dict)
        else google_init.authorization_url
    )

    return HTMLResponse(
        content=render_connect_page(
            session_id=session_id,
            sender_address=session["sender_address"],
            google_auth_url=auth_url,
        )
    )


# ---------------------------------------------------------------------------
# Token Refresh & Logout
# ---------------------------------------------------------------------------

@router.post("/token/refresh", response_model=TokenResponse)
def refresh_token_endpoint(payload: RefreshTokenRequest):
    """Exchange a valid refresh token for a fresh access token."""
    return refresh_application_tokens(payload)


@router.post("/logout")
def logout_endpoint(
    payload: Optional[LogoutRequest] = None,
    current_user: Optional[UserResponse] = Depends(get_current_user),
):
    """Revoke tokens and end the session."""
    user_id = current_user.id if current_user else None
    rf_token = payload.refresh_token if payload else None
    return logout_session(user_id=user_id, refresh_token=rf_token)
