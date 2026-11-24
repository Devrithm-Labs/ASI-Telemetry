import base64
import hashlib
import logging
import secrets
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple, Union
from urllib.parse import urlencode

from fastapi import HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
import httpx

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.user import OAuthSessionModel, RefreshTokenModel, UserModel
from app.repositories.user import UserRepository, user_repo
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    OAuthHandoffExchangeRequest,
    RefreshTokenRequest,
    SignupRequest,
    TokenResponse,
    UserResponse,
)
from app.services.api_key import create_api_key

logger = logging.getLogger("asi_telemetry.service.auth")

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


def _generate_code_verifier() -> str:
    return secrets.token_urlsafe(64)


def _generate_code_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("utf-8")).digest()
    return _base64url_encode(digest)


class AuthService:
    """Service handling user authentication, password verification, tokens, and OAuth."""

    def __init__(self, repo: UserRepository = user_repo):
        self.repo = repo

    def signup(self, payload: SignupRequest) -> AuthResponse:
        clean_email = payload.email.strip().lower()
        if self.repo.get_by_email(clean_email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists.",
            )

        user_id = str(uuid.uuid4())
        pwd_hash = hash_password(payload.password)
        now = datetime.now(timezone.utc)

        user = UserModel(
            id=user_id,
            name=payload.name.strip(),
            email=clean_email,
            password_hash=pwd_hash,
            created_at=now,
        )
        self.repo.create(user)

        try:
            create_api_key(user_id)
        except Exception as e:
            logger.warning(f"Could not provision default API key for user {user_id}: {e}")

        access_token = create_access_token(user_id=user_id, email=clean_email)
        return AuthResponse(
            status="success",
            message="Account created successfully.",
            access_token=access_token,
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            user=UserResponse(
                id=user_id,
                name=user.name,
                email=user.email,
                created_at=now.isoformat(),
            ),
        )

    def login(self, payload: LoginRequest) -> AuthResponse:
        clean_email = payload.email.strip().lower()
        user = self.repo.get_by_email(clean_email)
        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token = create_access_token(user_id=user.id, email=user.email)
        created_at_str = (
            user.created_at.isoformat()
            if hasattr(user.created_at, "isoformat")
            else str(user.created_at)
        )
        return AuthResponse(
            status="success",
            message="Login successful.",
            access_token=access_token,
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            user=UserResponse(
                id=str(user.id),
                name=str(user.name),
                email=str(user.email),
                created_at=created_at_str,
            ),
        )

    def find_user_by_id(self, user_id: str) -> Optional[UserResponse]:
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

    def get_or_create_google_user(
        self, google_id: str, email: str, name: str
    ) -> Dict[str, Any]:
        clean_email = email.strip().lower()
        user = self.repo.get_by_google_id(google_id)
        if user:
            return {
                "id": str(user.id),
                "name": str(user.name),
                "email": str(user.email),
                "google_id": user.google_id,
            }

        user = self.repo.get_by_email(clean_email)
        if user:
            self.repo.update(user.id, google_id=google_id)
            user.google_id = google_id
            return {
                "id": str(user.id),
                "name": str(user.name),
                "email": str(user.email),
                "google_id": user.google_id,
            }

        user_id = str(uuid.uuid4())
        dummy_hash = hash_password(secrets.token_urlsafe(32))
        now = datetime.now(timezone.utc)
        new_user = UserModel(
            id=user_id,
            name=name.strip() or "Google User",
            email=clean_email,
            password_hash=dummy_hash,
            created_at=now,
            google_id=google_id,
        )
        self.repo.create(new_user)
        try:
            create_api_key(user_id)
        except Exception:
            pass
        return {
            "id": user_id,
            "name": new_user.name,
            "email": clean_email,
            "google_id": google_id,
        }

    # -------------------------------------------------------------------------
    # OAuth Session Initiation & PKCE
    # -------------------------------------------------------------------------
    def create_agent_oauth_session(
        self, sender_address: str, redirect_uri: Optional[str] = None
    ) -> Dict[str, Any]:
        if not sender_address or not sender_address.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sender address is required.",
            )

        clean_sender = sender_address.strip()
        target_redirect = (redirect_uri or settings.GOOGLE_REDIRECT_URI).strip().rstrip("/")
        normalized_allowed = [u.strip().rstrip("/") for u in settings.ALLOWED_REDIRECT_URIS]

        if target_redirect not in normalized_allowed:
            logger.warning(f"Rejected redirect URI: {target_redirect}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Redirect URI '{target_redirect}' is not allowed.",
            )

        session_id = secrets.token_urlsafe(32)
        code_verifier = _generate_code_verifier()
        code_challenge = _generate_code_challenge(code_verifier)
        state_nonce = secrets.token_urlsafe(24)
        state = f"{session_id}.{state_nonce}"

        now = time.time()
        expires_at = now + SESSION_TTL_SECONDS
        now_dt = datetime.now(timezone.utc)

        session_model = OAuthSessionModel(
            session_id=session_id,
            sender_address=clean_sender,
            state_hash=hash_token(state),
            code_verifier=code_verifier,
            redirect_uri=target_redirect,
            created_at=now_dt,
            expires_at=expires_at,
            status="pending",
        )
        self.repo.save_oauth_session(session_model)

        with _sessions_lock:
            _prune_expired_sessions()
            _oauth_sessions[session_id] = {
                "session_id": session_id,
                "state": state,
                "state_hash": hash_token(state),
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
            auth_url = f"{settings.FRONTEND_BASE_URL}/auth/oauth/mock?session_id={session_id}&state={state}"

        if "/api/auth/" in target_redirect:
            base_backend = target_redirect.split("/api/auth/")[0]
        else:
            base_backend = settings.FRONTEND_BASE_URL.rstrip("/")
        connect_url = f"{base_backend}/api/auth/connect?session_id={session_id}"

        with _sessions_lock:
            if session_id in _oauth_sessions:
                _oauth_sessions[session_id]["authorization_url"] = auth_url
                _oauth_sessions[session_id]["connect_url"] = connect_url

        return {
            "session_id": session_id,
            "state": state,
            "authorization_url": auth_url,
            "connect_url": connect_url,
            "expires_in_seconds": SESSION_TTL_SECONDS,
            "sender_address": clean_sender,
        }

    async def handle_google_oauth_callback(
        self,
        code: str,
        state: str,
        error: Optional[str] = None,
    ) -> Dict[str, Any]:
        if error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Google OAuth authorization failed: {error}",
            )
        if not code or not state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing authorization code or state.",
            )

        session_id = state.split(".")[0] if "." in state else state.split(":")[0]
        state_hash = hash_token(state)

        session = None
        with _sessions_lock:
            _prune_expired_sessions()
            if session_id in _oauth_sessions:
                session = _oauth_sessions[session_id]
            else:
                for s in _oauth_sessions.values():
                    if secrets.compare_digest(s.get("state") or "", state):
                        session = s
                        break

        if not session:
            db_s = self.repo.get_oauth_session_by_state(state_hash) or self.repo.get_oauth_session_by_id(session_id)
            if db_s:
                session = {
                    "session_id": db_s.session_id,
                    "sender_address": db_s.sender_address,
                    "state_hash": db_s.state_hash,
                    "code_verifier": db_s.code_verifier,
                    "redirect_uri": db_s.redirect_uri,
                    "expires_at": db_s.expires_at,
                    "status": db_s.status,
                    "handoff_code": db_s.handoff_code,
                    "handoff_code_hash": db_s.handoff_code_hash,
                    "user_id": db_s.user_id,
                    "access_token": db_s.access_token,
                    "refresh_token": db_s.refresh_token,
                }
                with _sessions_lock:
                    _oauth_sessions[session["session_id"]] = session

        if not session:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OAuth state parameter.",
            )

        if session.get("status") != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This authorization session has already been used or completed.",
            )

        if session.get("expires_at", 0) < time.time():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Authorization session has expired. Please initiate connection again.",
            )

        # Mock vs Real Google Token Exchange
        if code.startswith("mock_") or not settings.GOOGLE_CLIENT_ID:
            google_user_info = {
                "sub": f"mock_google_{session['sender_address'][-8:]}",
                "email": f"agent_{session['sender_address'][-8:]}@fetch.ai",
                "name": f"Agent {session['sender_address'][-8:]}",
            }
        else:
            token_url = "https://oauth2.googleapis.com/token"
            data = {
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": session["redirect_uri"],
                "grant_type": "authorization_code",
                "code_verifier": session["code_verifier"],
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                token_resp = await client.post(token_url, data=data)
            if token_resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Google token exchange failed: {token_resp.text}",
                )
            token_json = token_resp.json()
            id_info = google_id_token.verify_oauth2_token(
                token_json["id_token"],
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
            google_user_info = {
                "sub": id_info["sub"],
                "email": id_info["email"],
                "name": id_info.get("name", ""),
            }

        user = self.get_or_create_google_user(
            google_id=google_user_info["sub"],
            email=google_user_info["email"],
            name=google_user_info.get("name", ""),
        )

        access_token = create_access_token(user["id"], user["email"])
        refresh_token = create_refresh_token()
        family_id = str(uuid.uuid4())
        refresh_expires = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

        rf_model = RefreshTokenModel(
            id=str(uuid.uuid4()),
            user_id=user["id"],
            token_hash=hash_token(refresh_token),
            family_id=family_id,
            created_at=datetime.now(timezone.utc),
            expires_at=refresh_expires,
        )
        self.repo.save_refresh_token(rf_model)

        handoff_code = f"AUTH-{secrets.token_hex(4).upper()}"
        sid = session["session_id"]
        with _sessions_lock:
            if sid in _oauth_sessions:
                _oauth_sessions[sid].update(
                    {
                        "status": "authorized",
                        "user_id": user["id"],
                        "access_token": access_token,
                        "refresh_token": refresh_token,
                        "handoff_code": handoff_code,
                        "handoff_code_hash": hash_token(handoff_code),
                    }
                )

        db_model = OAuthSessionModel(
            session_id=sid,
            sender_address=session.get("sender_address", ""),
            state_hash=session.get("state_hash", ""),
            code_verifier=session.get("code_verifier", ""),
            redirect_uri=session.get("redirect_uri", ""),
            expires_at=session.get("expires_at", time.time() + 600),
            status="authorized",
            handoff_code=handoff_code,
            handoff_code_hash=hash_token(handoff_code),
            user_id=user["id"],
            access_token=access_token,
            refresh_token=refresh_token,
            created_at=datetime.now(timezone.utc),
        )
        self.repo.save_oauth_session(db_model)

        return {
            "status": "authorized",
            "message": f"Successfully authorized account for {user['email']}",
            "session_id": sid,
            "handoff_code": handoff_code,
            "sender_address": session.get("sender_address"),
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
            },
        }

    def exchange_agent_oauth_session(
        self,
        payload: Optional[OAuthHandoffExchangeRequest] = None,
        session_id: Optional[str] = None,
        handoff_code: Optional[str] = None,
        sender_address: Optional[str] = None,
    ) -> Dict[str, Any]:
        sid = session_id or (payload.session_id if payload else None)
        hcode = handoff_code or (payload.handoff_code if payload else None)
        sender = sender_address or (payload.sender_address if payload else "")
        clean_sender = (sender or "").strip()

        target_session = None

        with _sessions_lock:
            _prune_expired_sessions()
            if sid and sid in _oauth_sessions:
                target_session = _oauth_sessions[sid]
            elif hcode:
                code_hash = hash_token(hcode.strip().upper())
                for s in _oauth_sessions.values():
                    if s.get("handoff_code_hash") == code_hash:
                        target_session = s
                        break

        if not target_session:
            code_hash = hash_token(hcode.strip().upper()) if hcode else None
            db_s = None
            if sid:
                db_s = self.repo.get_oauth_session_by_id(sid)
            elif code_hash:
                db_s = self.repo.get_oauth_session_by_handoff(code_hash)
            if db_s:
                target_session = {
                    "session_id": db_s.session_id,
                    "sender_address": db_s.sender_address,
                    "state_hash": db_s.state_hash,
                    "status": db_s.status,
                    "handoff_code": db_s.handoff_code,
                    "handoff_code_hash": db_s.handoff_code_hash,
                    "user_id": db_s.user_id,
                    "access_token": db_s.access_token,
                    "refresh_token": db_s.refresh_token,
                    "expires_at": db_s.expires_at,
                }
                with _sessions_lock:
                    _oauth_sessions[target_session["session_id"]] = target_session

        if not target_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No matching authorization session found. It may be expired or already used.",
            )

        if target_session.get("sender_address") and clean_sender:
            if target_session["sender_address"] != clean_sender:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This authorization session is bound to a different agent conversation.",
                )

        if not hcode:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Single-use handoff code is required to complete authorization.",
            )

        provided_code_hash = hash_token(hcode.strip().upper())
        session_code_hash = target_session.get("handoff_code_hash")
        if not session_code_hash or not secrets.compare_digest(
            session_code_hash, provided_code_hash
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid authorization handoff code.",
            )

        if target_session.get("status") == "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Authorization is still pending in the browser.",
            )

        if target_session.get("status") != "authorized":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This authorization session has already been exchanged and invalidated.",
            )

        user_id = target_session["user_id"]
        access_token = target_session["access_token"]
        refresh_token = target_session["refresh_token"]

        with _sessions_lock:
            target_session["status"] = "exchanged"
            target_session["access_token"] = None
            target_session["refresh_token"] = None
            target_session["handoff_code"] = None
            target_session["handoff_code_hash"] = None

        db_update = self.repo.get_oauth_session_by_id(target_session["session_id"])
        if db_update:
            db_update.status = "exchanged"
            db_update.handoff_code = None
            db_update.handoff_code_hash = None
            self.repo.save_oauth_session(db_update)

        user = self.repo.get_by_id(user_id)
        created_at_str = (
            user.created_at.isoformat()
            if user and hasattr(user.created_at, "isoformat")
            else str(getattr(user, "created_at", ""))
        )

        return {
            "status": "success",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "expires_in_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            "user": {
                "id": str(user_id),
                "name": getattr(user, "name", "User"),
                "email": getattr(user, "email", ""),
                "created_at": created_at_str,
            },
        }

    def refresh_application_tokens(
        self,
        payload_or_token: Union[RefreshTokenRequest, str],
    ) -> Dict[str, Any]:
        if isinstance(payload_or_token, RefreshTokenRequest):
            clean_token = payload_or_token.refresh_token.strip()
        else:
            clean_token = (payload_or_token or "").strip()

        if not clean_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A refresh token must be provided.",
            )

        token_hash = hash_token(clean_token)
        record = self.repo.get_refresh_token(token_hash)

        if not record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or unrecognized refresh token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if record.revoked_at is not None or record.replaced_by_hash is not None:
            if record.family_id:
                self.repo.revoke_token_family(record.family_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token reuse detected. All sessions in this family have been terminated for security.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if record.expires_at < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired. Please re-authenticate.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = record.user_id
        user = self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User associated with this refresh token no longer exists.",
            )

        new_access_token = create_access_token(user.id, user.email)
        new_refresh_token = create_refresh_token()
        new_token_hash = hash_token(new_refresh_token)

        self.repo.revoke_refresh_token(token_hash, replaced_by=new_token_hash)

        new_expires = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        new_rf_model = RefreshTokenModel(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=new_token_hash,
            family_id=record.family_id,
            created_at=datetime.now(timezone.utc),
            expires_at=new_expires,
        )
        self.repo.save_refresh_token(new_rf_model)

        created_at_str = (
            user.created_at.isoformat()
            if hasattr(user.created_at, "isoformat")
            else str(user.created_at)
        )

        return {
            "status": "success",
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "expires_in_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            "user": {
                "id": str(user.id),
                "name": str(user.name),
                "email": str(user.email),
                "created_at": created_at_str,
            },
        }

    def logout_session(
        self,
        refresh_token: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        # Handle positional arg polymorphism
        if refresh_token and not refresh_token.startswith("asi_rf_") and user_id is None:
            user_id = refresh_token
            refresh_token = None

        clean_token = (refresh_token or "").strip()
        if clean_token:
            r_hash = hash_token(clean_token)
            record = self.repo.get_refresh_token(r_hash)
            if record:
                self.repo.revoke_token_family(record.family_id)
            else:
                self.repo.revoke_refresh_token(r_hash)

        if user_id:
            self.repo.revoke_all_user_tokens(user_id)

        return {"status": "success", "message": "Successfully logged out and revoked session tokens."}


auth_service = AuthService()

signup = auth_service.signup
login = auth_service.login
find_user_by_id = auth_service.find_user_by_id
create_agent_oauth_session = auth_service.create_agent_oauth_session
handle_google_oauth_callback = auth_service.handle_google_oauth_callback
exchange_agent_oauth_session = auth_service.exchange_agent_oauth_session
refresh_application_tokens = auth_service.refresh_application_tokens
logout_session = auth_service.logout_session
get_or_create_google_user = auth_service.get_or_create_google_user


def get_oauth_session(
    session_id: Optional[str] = None,
    state_hash: Optional[str] = None,
    handoff_code_hash: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    with _sessions_lock:
        if session_id and session_id in _oauth_sessions:
            return dict(_oauth_sessions[session_id])
    if session_id:
        db_s = user_repo.get_oauth_session_by_id(session_id)
        if db_s:
            return {
                "session_id": db_s.session_id,
                "sender_address": db_s.sender_address,
                "state_hash": db_s.state_hash,
                "status": db_s.status,
                "handoff_code": db_s.handoff_code,
                "handoff_code_hash": db_s.handoff_code_hash,
                "user_id": db_s.user_id,
                "access_token": db_s.access_token,
                "refresh_token": db_s.refresh_token,
                "expires_at": db_s.expires_at,
            }
    return None
