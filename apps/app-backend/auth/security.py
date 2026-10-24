import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt
from pwdlib import PasswordHash

from config import settings

password_hasher = PasswordHash.recommended()
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password, password_hash)
    except Exception:
        return False


def hash_token(token: str) -> str:
    """Returns SHA-256 cryptographic hash of a token for secure database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(
    user_id: str | int,
    email: str,
    expires_minutes: Optional[int] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Creates a signed JWT application access token with 15-minute default lifetime."""
    now = datetime.now(timezone.utc)
    if expires_delta is not None:
        exp = now + expires_delta
    else:
        lifetime = expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
        exp = now + timedelta(minutes=lifetime)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "iss": settings.TOKEN_ISSUER,
        "aud": settings.TOKEN_AUDIENCE,
        "iat": now,
        "exp": exp,
        "jti": str(uuid.uuid4()),
        "type": "access",
    }
    return jwt.encode(payload, settings.AUTH_SECRET_KEY, algorithm=ALGORITHM)



def create_refresh_token() -> str:
    """Generates an opaque, high-entropy cryptographic refresh token."""
    random_part = secrets.token_urlsafe(48)
    return f"asi_rf_{random_part}"


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decodes and validates JWT signature, expiration, and claims.
    Tolerates omitted issuer/audience for backward compatibility.
    """
    # First attempt strict validation
    try:
        return jwt.decode(
            token,
            settings.AUTH_SECRET_KEY,
            algorithms=[ALGORITHM],
            issuer=settings.TOKEN_ISSUER,
            audience=settings.TOKEN_AUDIENCE,
        )
    except JWTError:
        try:
            # Fallback for legacy tokens without iss/aud claims
            return jwt.decode(
                token,
                settings.AUTH_SECRET_KEY,
                algorithms=[ALGORITHM],
                options={"verify_aud": False, "verify_iss": False},
            )
        except JWTError:
            return None
    except Exception:
        return None


def is_jwt_error(error: Exception) -> bool:
    return isinstance(error, JWTError)
