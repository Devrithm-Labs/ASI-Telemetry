from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import HTMLResponse

from auth.dependencies import get_current_user
from auth.oauth_service import (
    create_agent_oauth_session,
    exchange_agent_oauth_session,
    handle_google_oauth_callback,
    logout_session,
    refresh_application_tokens,
)
from auth.schemas import (
    AuthResponse,
    LoginRequest,
    LogoutRequest,
    OAuthHandoffExchangeRequest,
    OAuthInitRequest,
    OAuthInitResponse,
    RefreshTokenRequest,
    SignupRequest,
    TokenResponse,
    UserResponse,
)
from auth.service import login, signup

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


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


# ---------------------------------------------------------------------------
# Google OAuth 2.0 & Agent Handoff Endpoints
# ---------------------------------------------------------------------------

@router.post("/oauth/agent-init", response_model=OAuthInitResponse)
def oauth_agent_init_endpoint(payload: OAuthInitRequest):
    """
    Starts Google OAuth flow for an agent conversation.
    Generates a secure PKCE code verifier, challenge, state, and browser authorization URL.
    """
    return create_agent_oauth_session(
        sender_address=payload.sender_address,
        redirect_uri=payload.redirect_uri,
    )


@router.get("/oauth/callback")
async def oauth_callback_endpoint(
    request: Request,
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
):
    """
    Handles Google OAuth callback.
    Validates state, exchanges code for Google tokens, verifies OpenID Connect identity,
    and creates application access & refresh tokens bound to the agent session.
    """
    result = await handle_google_oauth_callback(code=code or "", state=state or "", error=error)

    # Return friendly HTML for browser users
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ASI-Telemetry | Account Connected</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background-color: #09090b;
                color: #f4f4f5;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
            }}
            .card {{
                background: #18181b;
                border: 1px solid #27272a;
                border-radius: 1rem;
                padding: 2.5rem;
                max-width: 440px;
                text-align: center;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
            }}
            .badge {{
                display: inline-block;
                background: rgba(16, 185, 129, 0.1);
                color: #10b981;
                border: 1px solid rgba(16, 185, 129, 0.2);
                border-radius: 9999px;
                padding: 0.25rem 0.75rem;
                font-size: 0.8rem;
                font-weight: 600;
                margin-bottom: 1rem;
            }}
            h1 {{ font-size: 1.5rem; margin-bottom: 0.5rem; font-weight: 700; }}
            p {{ color: #a1a1aa; font-size: 0.95rem; line-height: 1.5; }}
            .code-box {{
                background: #09090b;
                border: 1px dashed #3f3f46;
                border-radius: 0.5rem;
                padding: 0.75rem;
                font-family: monospace;
                font-size: 1.1rem;
                color: #38bdf8;
                margin: 1.25rem 0;
                letter-spacing: 2px;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="badge">Google Sign-in Successful</div>
            <h1>Account Connected</h1>
            <p>Your ASI-Telemetry account has been authorized for <strong>{result['user']['email']}</strong>.</p>
            <p style="font-size: 0.85rem; margin-top: 1rem;">Confirmation Code (Optional):</p>
            <div class="code-box">{result['handoff_code']}</div>
            <p style="font-size: 0.85rem;">You may now close this tab and return to your ASI:One chat.</p>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=status.HTTP_200_OK)


@router.post("/oauth/agent-exchange", response_model=TokenResponse)
def oauth_agent_exchange_endpoint(payload: OAuthHandoffExchangeRequest):
    """
    Completes agent session handoff.
    Exchanges session_id or single-use handoff code for ASI-Telemetry access & refresh tokens.
    """
    return exchange_agent_oauth_session(
        session_id=payload.session_id,
        handoff_code=payload.handoff_code,
        sender_address=payload.sender_address,
    )


# ---------------------------------------------------------------------------
# Token Lifecycle & Session Management
# ---------------------------------------------------------------------------

@router.post("/refresh", response_model=TokenResponse)
def refresh_tokens_endpoint(payload: RefreshTokenRequest):
    """
    Refreshes the application access token (15-min lifetime) with Refresh Token Rotation.
    Detects reuse and revokes token families accordingly.
    """
    return refresh_application_tokens(refresh_token=payload.refresh_token)


@router.post("/logout")
def logout_endpoint(
    payload: Optional[LogoutRequest] = None,
    current_user: Optional[UserResponse] = Depends(get_current_user),
):
    """Revokes the active refresh token session or user sessions."""
    rf_token = payload.refresh_token if payload else None
    user_id = current_user.id if current_user else None
    return logout_session(refresh_token=rf_token, user_id=user_id)


# ---------------------------------------------------------------------------
# Sandbox / Local Testing Helper
# ---------------------------------------------------------------------------

@router.get("/oauth/mock")
async def oauth_mock_endpoint(session_id: str, state: str):
    """Sandbox endpoint for testing Google OAuth redirect when client credentials are in mock mode."""
    return await oauth_callback_endpoint(
        request=None,
        code=f"test_code_{session_id[:8]}",
        state=state,
    )
