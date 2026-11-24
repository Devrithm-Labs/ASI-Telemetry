from typing import Any, Dict, Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, OAuth2PasswordBearer, APIKeyHeader

from app.core.security import decode_access_token
from app.db.session import get_db
from app.schemas.user import UserResponse
from app.services.api_key import resolve_api_key
from app.services.auth import find_user_by_id

bearer_scheme = HTTPBearer(auto_error=False)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> UserResponse:
    """Dependency that authenticates either a Bearer JWT or Bearer API key."""
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired access token. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise credentials_error

    token = credentials.credentials.strip()

    # If an API key is passed as the Bearer token (asi_live_...)
    if token.startswith("asi_"):
        user_id = resolve_api_key(token)
        if not user_id:
            raise credentials_error
        user = find_user_by_id(user_id)
        if not user:
            raise credentials_error
        return user

    try:
        payload = decode_access_token(token)
        if not payload or payload.get("type") != "access":
            raise credentials_error
        subject = payload.get("sub")
        if not subject or not str(subject).strip():
            raise credentials_error
        user = find_user_by_id(str(subject))
        if user is None:
            raise credentials_error
        return user
    except HTTPException:
        raise
    except Exception:
        raise credentials_error


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[UserResponse]:
    """Dependency that returns current user if authenticated, or None if anonymous."""
    if credentials is None:
        return None
    try:
        return get_current_user(credentials)
    except HTTPException:
        return None


def resolve_request_user_id(
    request: Request, body_dict: Optional[Dict[str, Any]] = None
) -> Optional[str]:
    """
    Extracts and cryptographically validates the user_id associated with a request:
    1. 'x-api-key' or 'asi-api-key' headers (hashed lookup against database)
    2. 'Authorization: Bearer <jwt_or_api_key>' (cryptographic signature or hashed lookup)
    3. Query parameter ?api_key=... (hashed lookup against database)
    4. Payload body field 'api_key' (hashed lookup against database)

    SECURITY NOTICE: Raw 'user_id' fields in query parameters or payload bodies are
    strictly ignored to prevent Insecure Direct Object Reference (IDOR) / authentication bypass.
    """
    # 1. Check API Key Headers
    api_key = request.headers.get("x-api-key") or request.headers.get("asi-api-key")
    if api_key and api_key.strip():
        uid = resolve_api_key(api_key.strip())
        if uid:
            return uid

    # 2. Check Authorization Bearer Header
    auth_hdr = request.headers.get("Authorization", "")
    if auth_hdr.lower().startswith("bearer "):
        token_str = auth_hdr[7:].strip()
        if token_str.startswith("asi_"):
            uid = resolve_api_key(token_str)
            if uid:
                return uid
        else:
            payload = decode_access_token(token_str)
            if payload and payload.get("sub"):
                return str(payload["sub"])

    # 3. Check Query Parameter api_key (validated against hashed DB keys)
    qp_key = request.query_params.get("api_key")
    if qp_key and qp_key.strip():
        uid = resolve_api_key(qp_key.strip())
        if uid:
            return uid

    # 4. Check Payload Body api_key (validated against hashed DB keys)
    if body_dict and isinstance(body_dict, dict):
        body_key = body_dict.get("api_key")
        if body_key and str(body_key).strip():
            uid = resolve_api_key(str(body_key).strip())
            if uid:
                return uid

    return None
