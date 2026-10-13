from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from auth.security import decode_access_token
from auth.service import find_user_by_id

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired access token. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise credentials_error

    try:
        payload = decode_access_token(credentials.credentials)
        if payload.get("type") != "access":
            raise credentials_error
        subject = payload.get("sub")
        if not subject or not str(subject).isdigit():
            raise credentials_error
        user = find_user_by_id(int(subject))
        if user is None:
            raise credentials_error
        return user
    except HTTPException:
        raise
    except Exception:
        raise credentials_error
