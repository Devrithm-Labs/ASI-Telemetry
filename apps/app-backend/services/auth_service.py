import logging
import secrets
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import HTTPException, status
from sqlalchemy import func

from core.database import db_connection
from core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from models.user import RefreshTokenModel, UserModel
from schemas.auth import AuthResponse, LoginRequest, SignupRequest, UpdateProfileRequest, UserResponse
from services.api_key_service import create_api_key

logger = logging.getLogger("backend.services.auth")

_db_lock = threading.Lock()
_memory_users: Dict[str, Dict[str, Any]] = {}
_memory_refresh_tokens: Dict[str, Dict[str, Any]] = {}
_tokens_lock = _db_lock


def email_exists(email: str) -> bool:
    clean_email = email.strip().lower()
    if db_connection.is_connected and db_connection.SessionFactory:
        try:
            with db_connection.session_scope() as session:
                if session:
                    count = session.query(UserModel).filter(
                        func.lower(UserModel.email) == clean_email
                    ).count()
                    return count > 0
        except Exception as e:
            logger.warning(f"PostgreSQL query error in email_exists: {e}")

    with _db_lock:
        return any(u.get("email", "").lower() == clean_email for u in _memory_users.values())


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    clean_email = email.strip().lower()
    if db_connection.is_connected and db_connection.SessionFactory:
        try:
            with db_connection.session_scope() as session:
                if session:
                    u = session.query(UserModel).filter(
                        func.lower(UserModel.email) == clean_email
                    ).first()
                    if u:
                        created_at = (
                            u.created_at.isoformat()
                            if hasattr(u.created_at, "isoformat")
                            else str(u.created_at)
                        )
                        return {
                            "id": str(u.id),
                            "name": str(u.name),
                            "email": str(u.email),
                            "password_hash": str(u.password_hash),
                            "created_at": created_at,
                            "google_id": u.google_id,
                        }
        except Exception as e:
            logger.warning(f"PostgreSQL query error in get_user_by_email: {e}")

    with _db_lock:
        for u in _memory_users.values():
            if u.get("email", "").lower() == clean_email:
                return dict(u)
    return None


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    clean_id = str(user_id)
    if db_connection.is_connected and db_connection.SessionFactory:
        try:
            with db_connection.session_scope() as session:
                if session:
                    u = session.query(UserModel).filter(UserModel.id == clean_id).first()
                    if u:
                        created_at = (
                            u.created_at.isoformat()
                            if hasattr(u.created_at, "isoformat")
                            else str(u.created_at)
                        )
                        return {
                            "id": str(u.id),
                            "name": str(u.name),
                            "email": str(u.email),
                            "password_hash": str(u.password_hash),
                            "created_at": created_at,
                            "google_id": u.google_id,
                        }
        except Exception as e:
            logger.warning(f"PostgreSQL query error in get_user_by_id: {e}")

    with _db_lock:
        if clean_id in _memory_users:
            return dict(_memory_users[clean_id])
    return None


def insert_user(
    user_id: str,
    name: str,
    email: str,
    password_hash: str,
    created_at: Optional[datetime] = None,
) -> None:
    clean_id = str(user_id)
    clean_email = email.strip().lower()
    dt = created_at if isinstance(created_at, datetime) else datetime.now(timezone.utc)

    with _db_lock:
        _memory_users[clean_id] = {
            "id": clean_id,
            "name": name,
            "email": clean_email,
            "password_hash": password_hash,
            "created_at": dt.isoformat(),
            "google_id": None,
        }

    if db_connection.is_connected and db_connection.SessionFactory:
        try:
            with db_connection.session_scope() as session:
                if session:
                    user = UserModel(
                        id=clean_id,
                        name=name,
                        email=clean_email,
                        password_hash=password_hash,
                        created_at=dt,
                    )
                    session.merge(user)
        except Exception as e:
            logger.warning(f"PostgreSQL insert error in insert_user: {e}")


def update_user(
    user_id: str,
    name: Optional[str] = None,
    password_hash: Optional[str] = None,
) -> bool:
    clean_id = str(user_id)
    updated = False

    with _db_lock:
        if clean_id in _memory_users:
            if name is not None:
                _memory_users[clean_id]["name"] = name
            if password_hash is not None:
                _memory_users[clean_id]["password_hash"] = password_hash
            updated = True

    if db_connection.is_connected and db_connection.SessionFactory:
        try:
            with db_connection.session_scope() as session:
                if session:
                    u = session.query(UserModel).filter(UserModel.id == clean_id).first()
                    if u:
                        if name is not None:
                            u.name = name
                        if password_hash is not None:
                            u.password_hash = password_hash
                        updated = True
        except Exception as e:
            logger.warning(f"PostgreSQL update error in update_user: {e}")

    return updated


def insert_refresh_token(
    token_id: str,
    user_id: str,
    token_hash: str,
    family_id: str,
    expires_at: datetime,
) -> None:
    now = datetime.now(timezone.utc)
    record = {
        "id": str(token_id),
        "user_id": str(user_id),
        "token_hash": str(token_hash),
        "family_id": str(family_id),
        "created_at": now,
        "expires_at": expires_at,
        "revoked_at": None,
        "replaced_by_hash": None,
    }

    with _tokens_lock:
        _memory_refresh_tokens[str(token_hash)] = dict(record)

    if db_connection.is_connected and db_connection.SessionFactory:
        try:
            with db_connection.session_scope() as session:
                if session:
                    tok = RefreshTokenModel(
                        id=str(token_id),
                        user_id=str(user_id),
                        token_hash=str(token_hash),
                        family_id=str(family_id),
                        created_at=now,
                        expires_at=expires_at,
                        revoked_at=None,
                        replaced_by_hash=None,
                    )
                    session.add(tok)
        except Exception as e:
            logger.warning(f"PostgreSQL insert error in insert_refresh_token: {e}")


def get_refresh_token_record(token_hash: str) -> Optional[Dict[str, Any]]:
    clean_hash = str(token_hash).strip()
    if db_connection.is_connected and db_connection.SessionFactory:
        try:
            with db_connection.session_scope() as session:
                if session:
                    tok = session.query(RefreshTokenModel).filter(
                        RefreshTokenModel.token_hash == clean_hash
                    ).first()
                    if tok:
                        rec = {
                            "id": str(tok.id),
                            "user_id": str(tok.user_id),
                            "token_hash": str(tok.token_hash),
                            "family_id": str(tok.family_id),
                            "created_at": tok.created_at,
                            "expires_at": tok.expires_at,
                            "revoked_at": tok.revoked_at,
                            "replaced_by_hash": str(tok.replaced_by_hash) if tok.replaced_by_hash else None,
                        }
                        with _tokens_lock:
                            _memory_refresh_tokens[clean_hash] = rec
                        return rec
        except Exception as e:
            logger.warning(f"PostgreSQL query error in get_refresh_token_record: {e}")

    with _tokens_lock:
        if clean_hash in _memory_refresh_tokens:
            return dict(_memory_refresh_tokens[clean_hash])

    return None


def revoke_refresh_token(token_hash: str, replaced_by_hash: Optional[str] = None) -> bool:
    clean_hash = str(token_hash).strip()
    now = datetime.now(timezone.utc)
    found = False

    with _tokens_lock:
        if clean_hash in _memory_refresh_tokens:
            _memory_refresh_tokens[clean_hash]["revoked_at"] = now
            if replaced_by_hash:
                _memory_refresh_tokens[clean_hash]["replaced_by_hash"] = str(replaced_by_hash)
            found = True

    if db_connection.is_connected and db_connection.SessionFactory:
        try:
            with db_connection.session_scope() as session:
                if session:
                    tok = session.query(RefreshTokenModel).filter(
                        RefreshTokenModel.token_hash == clean_hash
                    ).first()
                    if tok:
                        tok.revoked_at = now
                        if replaced_by_hash:
                            tok.replaced_by_hash = str(replaced_by_hash)
                        found = True
        except Exception as e:
            logger.warning(f"PostgreSQL revoke_refresh_token error: {e}")

    return found


def revoke_token_family(family_id: str) -> int:
    clean_fam = str(family_id).strip()
    now = datetime.now(timezone.utc)
    count = 0

    with _tokens_lock:
        for rec in _memory_refresh_tokens.values():
            if rec.get("family_id") == clean_fam and not rec.get("revoked_at"):
                rec["revoked_at"] = now
                count += 1

    if db_connection.is_connected and db_connection.SessionFactory:
        try:
            with db_connection.session_scope() as session:
                if session:
                    updated = session.query(RefreshTokenModel).filter(
                        RefreshTokenModel.family_id == clean_fam,
                        RefreshTokenModel.revoked_at.is_(None),
                    ).update({"revoked_at": now}, synchronize_session=False)
                    count = max(count, updated)
        except Exception as e:
            logger.warning(f"PostgreSQL revoke_token_family error: {e}")

    return count


def revoke_all_user_tokens(user_id: str) -> int:
    clean_uid = str(user_id).strip()
    now = datetime.now(timezone.utc)
    count = 0

    with _tokens_lock:
        for rec in _memory_refresh_tokens.values():
            if str(rec.get("user_id")) == clean_uid and not rec.get("revoked_at"):
                rec["revoked_at"] = now
                count += 1

    if db_connection.is_connected and db_connection.SessionFactory:
        try:
            with db_connection.session_scope() as session:
                if session:
                    updated = session.query(RefreshTokenModel).filter(
                        RefreshTokenModel.user_id == clean_uid,
                        RefreshTokenModel.revoked_at.is_(None),
                    ).update({"revoked_at": now}, synchronize_session=False)
                    count = max(count, updated)
        except Exception as e:
            logger.warning(f"PostgreSQL revoke_all_user_tokens error: {e}")

    return count


def get_or_create_google_user(google_id: str, email: str, name: str) -> Dict[str, Any]:
    clean_email = email.strip().lower()
    existing_user = get_user_by_email(clean_email)
    now = datetime.now(timezone.utc)

    if existing_user:
        existing_user["google_id"] = google_id
        with _db_lock:
            if clean_email in _memory_users:
                _memory_users[clean_email]["google_id"] = google_id
            if existing_user.get("id") and existing_user["id"] in _memory_users:
                _memory_users[existing_user["id"]]["google_id"] = google_id

        if db_connection.is_connected and db_connection.SessionFactory:
            try:
                with db_connection.session_scope() as session:
                    if session:
                        u = session.query(UserModel).filter(
                            func.lower(UserModel.email) == clean_email
                        ).first()
                        if u:
                            u.google_id = google_id
            except Exception as e:
                logger.warning(f"Error updating google_id in PostgreSQL: {e}")

        return existing_user

    new_id = str(uuid.uuid4())
    random_pw = secrets.token_hex(32)
    pw_hash = hash_password(random_pw)

    insert_user(
        user_id=new_id,
        name=name or clean_email.split("@")[0],
        email=clean_email,
        password_hash=pw_hash,
        created_at=now,
    )

    created = {
        "id": new_id,
        "name": name or clean_email.split("@")[0],
        "email": clean_email,
        "password_hash": pw_hash,
        "created_at": now.isoformat(),
        "google_id": google_id,
    }

    with _db_lock:
        _memory_users[new_id] = created

    if db_connection.is_connected and db_connection.SessionFactory:
        try:
            with db_connection.session_scope() as session:
                if session:
                    u = session.query(UserModel).filter(UserModel.id == new_id).first()
                    if u:
                        u.google_id = google_id
        except Exception:
            pass

    return created


def _user_response(data: dict) -> UserResponse:
    return UserResponse(
        id=str(data["id"]),
        name=str(data["name"]),
        email=str(data["email"]),
        created_at=str(data.get("created_at") or ""),
    )


def signup(payload: SignupRequest) -> AuthResponse:
    email = str(payload.email).strip().lower()

    if email_exists(email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user_id = str(uuid.uuid4())
    password_hash = hash_password(payload.password)
    now = datetime.now(timezone.utc)

    insert_user(
        user_id=user_id,
        name=payload.name,
        email=email,
        password_hash=password_hash,
        created_at=now,
    )

    try:
        create_api_key(user_id=user_id)
    except Exception:
        pass

    user_data = {
        "id": user_id,
        "name": payload.name,
        "email": email,
        "created_at": now.isoformat(),
    }

    from core.config import settings
    token = create_access_token(user_id=user_id, email=email)
    return AuthResponse(
        status="success",
        message="Account created successfully",
        access_token=token,
        token_type="bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=_user_response(user_data),
    )


def login(payload: LoginRequest) -> AuthResponse:
    email = str(payload.email).strip().lower()
    user = get_user_by_email(email)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    from core.config import settings
    token = create_access_token(user_id=user["id"], email=user["email"])
    return AuthResponse(
        status="success",
        message="Login successful",
        access_token=token,
        token_type="bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=_user_response(user),
    )


def find_user_by_id(user_id: str) -> Optional[UserResponse]:
    data = get_user_by_id(user_id)
    if not data:
        return None
    return _user_response(data)


def update_profile(user_id: str, payload: UpdateProfileRequest) -> UserResponse:
    user = get_user_by_id(str(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found",
        )

    clean_name = payload.name.strip() if payload.name else None
    new_pw_hash = None

    if payload.new_password:
        if not payload.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required to set a new password",
            )
        stored_hash = user.get("password_hash")
        if not stored_hash or not verify_password(payload.current_password, stored_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect",
            )
        new_pw_hash = hash_password(payload.new_password)

    if not clean_name and not new_pw_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No changes provided. Please provide a new name or new password.",
        )

    update_user(user_id=str(user["id"]), name=clean_name, password_hash=new_pw_hash)

    # Return refreshed user record
    updated = get_user_by_id(str(user["id"]))
    if not updated:
        user_copy = dict(user)
        if clean_name:
            user_copy["name"] = clean_name
        return _user_response(user_copy)
    return _user_response(updated)
