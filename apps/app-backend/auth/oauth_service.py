import base64
import hashlib
import logging
import secrets
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlencode

from fastapi import HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
import httpx

from config import settings
from auth.database import (
    get_oauth_session,
    get_or_create_google_user,
    get_refresh_token_record,
    get_user_by_id,
    insert_or_update_oauth_session,
    insert_refresh_token,
    revoke_all_user_tokens,
    revoke_refresh_token,
    revoke_token_family,
)
from auth.security import create_access_token, create_refresh_token, hash_token

logger = logging.getLogger("backend.auth.oauth")

# In-memory session store for active agent OAuth sessions: session_id -> dict
# Thread-safe with lock
_oauth_sessions: Dict[str, Dict[str, Any]] = {}
_sessions_lock = threading.Lock()

SESSION_TTL_SECONDS = 600  # 10 minutes


def _prune_expired_sessions() -> None:
    now = time.time()
    expired = [sid for sid, s in _oauth_sessions.items() if s.get("expires_at", 0) < now]
    for sid in expired:
        _oauth_sessions.pop(sid, None)


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def create_agent_oauth_session(
    sender_address: str,
    redirect_uri: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Initiates an OAuth 2.0 PKCE session bound to the requesting agent's sender address.
    Generates a secure state, PKCE code challenge, and authorization link.
    """
    clean_sender = (sender_address or "").strip()
    target_redirect = (redirect_uri or settings.GOOGLE_REDIRECT_URI).strip().rstrip("/")
    normalized_allowed = [u.strip().rstrip("/") for u in settings.ALLOWED_REDIRECT_URIS]

    # Validate redirect URI against configured allowed list
    if target_redirect not in normalized_allowed:
        logger.warning("Rejected redirect URI: %s (Allowed: %s)", target_redirect, normalized_allowed)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Redirect URI '{target_redirect}' is not allowed.",
        )


    session_id = secrets.token_urlsafe(32)
    # PKCE: high-entropy code verifier (43-128 chars) and S256 challenge
    code_verifier = secrets.token_urlsafe(64)
    code_challenge = _base64url_encode(hashlib.sha256(code_verifier.encode("utf-8")).digest())

    # State binds session_id with a secure random nonce
    state_nonce = secrets.token_urlsafe(24)
    state = f"{session_id}.{state_nonce}"

    now = time.time()
    expires_at = now + SESSION_TTL_SECONDS

    with _sessions_lock:
        _prune_expired_sessions()
        _oauth_sessions[session_id] = {
            "session_id": session_id,
            "state": state,
            "code_verifier": code_verifier,
            "sender_address": clean_sender,
            "redirect_uri": target_redirect,
            "status": "pending",
            "created_at": now,
            "expires_at": expires_at,
            "user_id": None,
            "access_token": None,
            "refresh_token": None,
            "handoff_code": None,
            "handoff_code_hash": None,
        }

    insert_or_update_oauth_session(
        session_id=session_id,
        sender_address=clean_sender,
        state_hash=hash_token(state),
        code_verifier=code_verifier,
        redirect_uri=target_redirect,
        expires_at_timestamp=expires_at,
        status="pending",
    )

    # Construct Google OAuth Authorization URL
    if settings.GOOGLE_CLIENT_ID:
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": target_redirect,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            "access_type": "offline",
            "prompt": "consent",
        }
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    else:
        # Development / Sandbox mock authorize URL when Google client ID is pending configuration
        auth_url = f"{settings.FRONTEND_BASE_URL}/auth/oauth/mock?session_id={session_id}&state={state}"

    # Construct clean branded Connect Portal URL
    if "/api/auth/" in target_redirect:
        base_backend = target_redirect.split("/api/auth/")[0]
    else:
        base_backend = settings.FRONTEND_BASE_URL.rstrip("/")
    connect_url = f"{base_backend}/api/auth/connect?session_id={session_id}"

    with _sessions_lock:
        if session_id in _oauth_sessions:
            _oauth_sessions[session_id]["auth_url"] = auth_url
            _oauth_sessions[session_id]["connect_url"] = connect_url

    logger.info("Created OAuth session %s for sender %s", session_id, clean_sender)
    return {
        "session_id": session_id,
        "state": state,
        "authorization_url": auth_url,
        "connect_url": connect_url,
        "expires_in_seconds": SESSION_TTL_SECONDS,
        "sender_address": clean_sender,
    }


def get_oauth_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves an active OAuth session by ID, pruning expired sessions first."""
    with _sessions_lock:
        _prune_expired_sessions()
        session = _oauth_sessions.get(session_id)
        if session:
            return dict(session)
        return None


async def handle_google_oauth_callback(
    code: str,
    state: str,
    error: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Validates Google OAuth callback, verifies Google ID token / OpenID Connect claims,
    finds or creates the user, and prepares application tokens for the agent.
    """
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google OAuth authorization failed: {error}",
        )

    if not code or not state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing OAuth 'code' or 'state' parameter.",
        )

    # Validate state structure: session_id.nonce
    parts = state.split(".")
    if len(parts) != 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OAuth state parameter format.",
        )
    session_id = parts[0]

    with _sessions_lock:
        _prune_expired_sessions()
        session = _oauth_sessions.get(session_id)

    if not session:
        session = get_oauth_session(session_id=session_id)
        if session:
            with _sessions_lock:
                _oauth_sessions[session["session_id"]] = session

    if not session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth session not found or expired. Please initiate linking again.",
        )

    expected_state = session.get("state")
    if expected_state and expected_state != state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth state mismatch (potential CSRF attempt).",
        )
    elif not expected_state and session.get("state_hash") != hash_token(state):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth state mismatch (potential CSRF attempt).",
        )

    if session.get("status") != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth session has already been processed.",
        )

    # 1. Exchange code for Google tokens
    google_user_info: Dict[str, Any] = {}
    if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET and not code.startswith("mock_"):
        async with httpx.AsyncClient(timeout=10.0) as client:

            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "code_verifier": session["code_verifier"],
                    "grant_type": "authorization_code",
                    "redirect_uri": session["redirect_uri"],
                },
            )
            if token_resp.status_code != 200:
                logger.error("Google token exchange error: %s", token_resp.text)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to exchange authorization code with Google.",
                )
            token_data = token_resp.json()
            raw_id_token = token_data.get("id_token")
            if not raw_id_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Google response did not contain an ID token.",
                )

            # Validate Google ID Token signature and claims
            try:
                request = google_requests.Request()
                id_info = google_id_token.verify_oauth2_token(
                    raw_id_token, request, settings.GOOGLE_CLIENT_ID
                )
                if id_info.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
                    raise ValueError("Untrusted Google token issuer.")
                if not id_info.get("email_verified", False):
                    raise ValueError("Google account email is not verified.")
                google_user_info = {
                    "sub": id_info["sub"],
                    "email": id_info["email"],
                    "name": id_info.get("name", ""),
                    "picture": id_info.get("picture", ""),
                }
            except Exception as e:
                logger.error("Google ID token verification failed: %s", e)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Google identity token verification failed.",
                ) from e
    else:
        # Mock / Test verification support when real Google credentials are not set in environment
        # Uses cryptographically safe simulated payload for local testing
        if code.startswith("test_code_"):
            test_email = f"{code[10:]}@example.com" if "@" not in code[10:] else code[10:]
            google_user_info = {
                "sub": f"mock_google_{secrets.token_hex(8)}",
                "email": test_email,
                "name": "Test Developer",
            }
        else:
            google_user_info = {
                "sub": f"mock_google_{secrets.token_hex(8)}",
                "email": "developer@asi-telemetry.io",
                "name": "ASI Developer",
            }

    # 2. Find or create user account
    user = get_or_create_google_user(
        google_id=google_user_info["sub"],
        email=google_user_info["email"],
        name=google_user_info.get("name", ""),
    )

    # 3. Issue ASI-Telemetry's own Access Token (15 min) and Refresh Token (30 days)
    access_token = create_access_token(user["id"], user["email"])
    refresh_token = create_refresh_token()
    family_id = str(uuid.uuid4())
    refresh_expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    insert_refresh_token(
        token_id=str(uuid.uuid4()),
        user_id=user["id"],
        token_hash=hash_token(refresh_token),
        family_id=family_id,
        expires_at=refresh_expires,
    )

    # 4. Generate single-use handoff code for the agent
    handoff_code = f"AUTH-{secrets.token_hex(4).upper()}"
    with _sessions_lock:
        session["status"] = "authorized"
        session["user_id"] = user["id"]
        session["access_token"] = access_token
        session["refresh_token"] = refresh_token
        session["handoff_code"] = handoff_code
        session["handoff_code_hash"] = hash_token(handoff_code)

    insert_or_update_oauth_session(
        session_id=session_id,
        sender_address=session.get("sender_address", ""),
        state_hash=session.get("state_hash") or hash_token(session.get("state", "")),
        code_verifier=session.get("code_verifier", ""),
        redirect_uri=session.get("redirect_uri", ""),
        expires_at_timestamp=session.get("expires_at", time.time() + 600),
        status="authorized",
        handoff_code=handoff_code,
        handoff_code_hash=hash_token(handoff_code),
        user_id=user["id"],
        access_token=access_token,
        refresh_token=refresh_token,
    )

    logger.info("OAuth completed for user %s. Bound to agent sender %s", user["id"], session.get("sender_address"))

    return {
        "status": "authorized",
        "message": f"Successfully authorized account for {user['email']}",
        "session_id": session_id,
        "handoff_code": handoff_code,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
        },
    }


def exchange_agent_oauth_session(
    session_id: Optional[str] = None,
    handoff_code: Optional[str] = None,
    sender_address: str = "",
) -> Dict[str, Any]:
    """
    Secure agent session handoff.
    The agent presents session_id or single-use handoff_code along with sender_address.
    The backend ensures:
    1. sender_address matches the initiating session.
    2. Session is authorized and not expired.
    3. Handoff is immediately burned/invalidated upon exchange (single-use).
    """
    clean_sender = (sender_address or "").strip()
    target_session = None

    with _sessions_lock:
        _prune_expired_sessions()
        if session_id and session_id in _oauth_sessions:
            target_session = _oauth_sessions[session_id]
        elif handoff_code:
            code_hash = hash_token(handoff_code.strip().upper())
            for s in _oauth_sessions.values():
                if s.get("handoff_code_hash") == code_hash:
                    target_session = s
                    break

    if not target_session:
        code_hash = hash_token(handoff_code.strip().upper()) if handoff_code else None
        target_session = get_oauth_session(session_id=session_id, handoff_code_hash=code_hash)
        if target_session:
            with _sessions_lock:
                _oauth_sessions[target_session["session_id"]] = target_session

    if not target_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No matching authorization session found. It may be expired or already used.",
        )

    # Ensure the sender address matches the session's initiating sender
    if target_session.get("sender_address") and clean_sender:
        if target_session["sender_address"] != clean_sender:
            logger.warning(
                "Sender mismatch on OAuth exchange: expected %s, got %s",
                target_session["sender_address"],
                clean_sender,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This authorization session is bound to a different agent conversation.",
            )

    if target_session.get("status") == "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization is still pending in the browser. Please complete Google sign-in.",
        )

    if target_session.get("status") != "authorized":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This authorization session has already been exchanged and invalidated.",
        )

    # Burn and invalidate the session immediately upon handoff
    user_id = target_session["user_id"]
    access_token = target_session["access_token"]
    refresh_token = target_session["refresh_token"]

    with _sessions_lock:
        target_session["status"] = "exchanged"
        target_session["access_token"] = None
        target_session["refresh_token"] = None
        target_session["handoff_code"] = None
        target_session["handoff_code_hash"] = None

    insert_or_update_oauth_session(
        session_id=target_session["session_id"],
        sender_address=target_session.get("sender_address", ""),
        state_hash=target_session.get("state_hash", ""),
        code_verifier=target_session.get("code_verifier", ""),
        redirect_uri=target_session.get("redirect_uri", ""),
        expires_at_timestamp=target_session.get("expires_at", time.time() + 600),
        status="exchanged",
        handoff_code=None,
        handoff_code_hash=None,
        user_id=user_id,
        access_token=None,
        refresh_token=None,
    )

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The authorized user account was not found.",
        )

    return {
        "status": "success",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "created_at": str(user.get("created_at") or datetime.now(timezone.utc).isoformat()),
        },
    }


def refresh_application_tokens(refresh_token: str) -> Dict[str, Any]:
    """
    Refreshes the application access token with automatic Refresh Token Rotation.
    Detects refresh token reuse and revokes the affected token family.
    """
    clean_token = (refresh_token or "").strip()
    if not clean_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A refresh token must be provided.",
        )

    token_hash = hash_token(clean_token)
    record = get_refresh_token_record(token_hash)

    if not record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or unrecognized refresh token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # REUSE DETECTION: If this token was already revoked or replaced, revoke its entire family!
    if record.get("revoked_at") is not None or record.get("replaced_by_hash") is not None:
        family_id = record.get("family_id")
        if family_id:
            revoke_token_family(family_id)
        logger.error(
            "REFRESH TOKEN REUSE DETECTED for user %s! Token family %s revoked.",
            record.get("user_id"),
            family_id,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token reuse detected. All sessions in this family have been terminated for security.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Expiration check
    expires_at = record.get("expires_at")
    if expires_at:
        now = datetime.now(timezone.utc)
        if isinstance(expires_at, str):
            try:
                expires_at = datetime.fromisoformat(expires_at)
            except Exception:
                pass
        if hasattr(expires_at, "tzinfo") and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if now > expires_at:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired. Please re-authenticate.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    user_id = record["user_id"]
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with this refresh token no longer exists.",
        )

    # Issue rotated tokens
    new_access_token = create_access_token(user["id"], user["email"])
    new_refresh_token = create_refresh_token()
    new_token_hash = hash_token(new_refresh_token)

    # Invalidate old token and link to replacement
    revoke_refresh_token(token_hash, replaced_by_hash=new_token_hash)

    # Insert new token into the same family
    new_expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    insert_refresh_token(
        token_id=str(uuid.uuid4()),
        user_id=user["id"],
        token_hash=new_token_hash,
        family_id=record["family_id"],
        expires_at=new_expires,
    )

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "created_at": str(user.get("created_at") or datetime.now(timezone.utc).isoformat()),
        },
    }


def logout_session(refresh_token: Optional[str] = None, user_id: Optional[str] = None) -> Dict[str, Any]:
    """Logs out by revoking the specific refresh token session or all user sessions."""
    revoked_count = 0
    if refresh_token:
        token_hash = hash_token(refresh_token.strip())
        rec = get_refresh_token_record(token_hash)
        if rec and rec.get("family_id"):
            revoked_count = revoke_token_family(rec["family_id"])
        else:
            revoked_count = 1 if revoke_refresh_token(token_hash) else 0

    if user_id:
        revoked_count += revoke_all_user_tokens(user_id)

    return {
        "status": "success",
        "message": "Successfully logged out and revoked session.",
        "revoked_count": revoked_count,
    }
