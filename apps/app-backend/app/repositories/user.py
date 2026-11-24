import logging
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import DatabaseManager, db_manager
from app.models.user import OAuthSessionModel, RefreshTokenModel, UserModel

logger = logging.getLogger("asi_telemetry.repo.user")


class UserRepository:
    """Repository handling all database queries for users, tokens, and OAuth sessions."""

    def __init__(self, db: DatabaseManager = db_manager):
        self.db = db
        self._lock = threading.Lock()
        self._mem_users: Dict[str, Dict[str, Any]] = {}
        self._mem_refresh_tokens: Dict[str, Dict[str, Any]] = {}
        self._mem_oauth_sessions: Dict[str, Dict[str, Any]] = {}

    def get_by_id(self, user_id: str) -> Optional[UserModel]:
        clean_id = str(user_id)
        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        u = session.query(UserModel).filter(UserModel.id == clean_id).first()
                        if u:
                            # Expunge so object remains accessible outside session
                            session.expunge(u)
                            return u
            except Exception as e:
                logger.warning(f"Error querying user by id: {e}")

        with self._lock:
            data = self._mem_users.get(clean_id)
            if data:
                return UserModel(
                    id=data["id"],
                    name=data["name"],
                    email=data["email"],
                    password_hash=data["password_hash"],
                    created_at=datetime.fromisoformat(data["created_at"])
                    if isinstance(data["created_at"], str)
                    else data["created_at"],
                    google_id=data.get("google_id"),
                )
        return None

    def get_by_email(self, email: str) -> Optional[UserModel]:
        clean_email = email.strip().lower()
        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        u = (
                            session.query(UserModel)
                            .filter(func.lower(UserModel.email) == clean_email)
                            .first()
                        )
                        if u:
                            session.expunge(u)
                            return u
            except Exception as e:
                logger.warning(f"Error querying user by email: {e}")

        with self._lock:
            for data in self._mem_users.values():
                if data.get("email", "").lower() == clean_email:
                    return UserModel(
                        id=data["id"],
                        name=data["name"],
                        email=data["email"],
                        password_hash=data["password_hash"],
                        created_at=datetime.fromisoformat(data["created_at"])
                        if isinstance(data["created_at"], str)
                        else data["created_at"],
                        google_id=data.get("google_id"),
                    )
        return None

    def get_by_google_id(self, google_id: str) -> Optional[UserModel]:
        if not google_id:
            return None
        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        u = session.query(UserModel).filter(UserModel.google_id == google_id).first()
                        if u:
                            session.expunge(u)
                            return u
            except Exception as e:
                logger.warning(f"Error querying user by google_id: {e}")

        with self._lock:
            for data in self._mem_users.values():
                if data.get("google_id") == google_id:
                    return UserModel(
                        id=data["id"],
                        name=data["name"],
                        email=data["email"],
                        password_hash=data["password_hash"],
                        created_at=datetime.fromisoformat(data["created_at"])
                        if isinstance(data["created_at"], str)
                        else data["created_at"],
                        google_id=data.get("google_id"),
                    )
        return None

    def create(self, user: UserModel) -> UserModel:
        clean_id = str(user.id)
        with self._lock:
            self._mem_users[clean_id] = {
                "id": clean_id,
                "name": user.name,
                "email": user.email.lower(),
                "password_hash": user.password_hash,
                "created_at": user.created_at.isoformat()
                if hasattr(user.created_at, "isoformat")
                else str(user.created_at),
                "google_id": user.google_id,
            }

        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        session.merge(user)
            except Exception as e:
                logger.warning(f"Error saving user to DB: {e}")
        return user

    def update(
        self,
        user_id: str,
        name: Optional[str] = None,
        password_hash: Optional[str] = None,
        google_id: Optional[str] = None,
    ) -> bool:
        clean_id = str(user_id)
        with self._lock:
            if clean_id in self._mem_users:
                if name is not None:
                    self._mem_users[clean_id]["name"] = name
                if password_hash is not None:
                    self._mem_users[clean_id]["password_hash"] = password_hash
                if google_id is not None:
                    self._mem_users[clean_id]["google_id"] = google_id

        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        u = session.query(UserModel).filter(UserModel.id == clean_id).first()
                        if u:
                            if name is not None:
                                u.name = name
                            if password_hash is not None:
                                u.password_hash = password_hash
                            if google_id is not None:
                                u.google_id = google_id
                            return True
            except Exception as e:
                logger.warning(f"Error updating user in DB: {e}")
        return clean_id in self._mem_users

    # Refresh tokens
    def save_refresh_token(self, token: RefreshTokenModel) -> RefreshTokenModel:
        with self._lock:
            self._mem_refresh_tokens[token.token_hash] = {
                "id": token.id,
                "user_id": token.user_id,
                "token_hash": token.token_hash,
                "family_id": token.family_id,
                "created_at": token.created_at,
                "expires_at": token.expires_at,
                "revoked_at": token.revoked_at,
                "replaced_by_hash": token.replaced_by_hash,
            }

        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        session.merge(token)
            except Exception as e:
                logger.warning(f"Error saving refresh token: {e}")
        return token

    def get_refresh_token(self, token_hash: str) -> Optional[RefreshTokenModel]:
        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        t = (
                            session.query(RefreshTokenModel)
                            .filter(RefreshTokenModel.token_hash == token_hash)
                            .first()
                        )
                        if t:
                            session.expunge(t)
                            return t
            except Exception as e:
                logger.warning(f"Error querying refresh token: {e}")

        with self._lock:
            data = self._mem_refresh_tokens.get(token_hash)
            if data:
                return RefreshTokenModel(
                    id=data["id"],
                    user_id=data["user_id"],
                    token_hash=data["token_hash"],
                    family_id=data["family_id"],
                    created_at=data["created_at"],
                    expires_at=data["expires_at"],
                    revoked_at=data.get("revoked_at"),
                    replaced_by_hash=data.get("replaced_by_hash"),
                )
        return None

    def revoke_refresh_token(
        self, token_hash: str, replaced_by: Optional[str] = None
    ) -> None:
        now = datetime.now(timezone.utc)
        with self._lock:
            if token_hash in self._mem_refresh_tokens:
                self._mem_refresh_tokens[token_hash]["revoked_at"] = now
                if replaced_by:
                    self._mem_refresh_tokens[token_hash]["replaced_by_hash"] = replaced_by

        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        t = (
                            session.query(RefreshTokenModel)
                            .filter(RefreshTokenModel.token_hash == token_hash)
                            .first()
                        )
                        if t:
                            t.revoked_at = now
                            if replaced_by:
                                t.replaced_by_hash = replaced_by
            except Exception as e:
                logger.warning(f"Error revoking refresh token: {e}")

    def revoke_token_family(self, family_id: str) -> None:
        now = datetime.now(timezone.utc)
        with self._lock:
            for t in self._mem_refresh_tokens.values():
                if t.get("family_id") == family_id and t.get("revoked_at") is None:
                    t["revoked_at"] = now

        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        session.query(RefreshTokenModel).filter(
                            RefreshTokenModel.family_id == family_id,
                            RefreshTokenModel.revoked_at.is_(None),
                        ).update({"revoked_at": now})
            except Exception as e:
                logger.warning(f"Error revoking token family: {e}")

    def revoke_all_user_tokens(self, user_id: str) -> None:
        now = datetime.now(timezone.utc)
        clean_id = str(user_id)
        with self._lock:
            for t in self._mem_refresh_tokens.values():
                if t.get("user_id") == clean_id and t.get("revoked_at") is None:
                    t["revoked_at"] = now

        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        session.query(RefreshTokenModel).filter(
                            RefreshTokenModel.user_id == clean_id,
                            RefreshTokenModel.revoked_at.is_(None),
                        ).update({"revoked_at": now})
            except Exception as e:
                logger.warning(f"Error revoking all user tokens: {e}")

    # OAuth sessions
    def save_oauth_session(self, session_model: OAuthSessionModel) -> OAuthSessionModel:
        with self._lock:
            self._mem_oauth_sessions[session_model.session_id] = {
                "session_id": session_model.session_id,
                "sender_address": session_model.sender_address,
                "state_hash": session_model.state_hash,
                "code_verifier": session_model.code_verifier,
                "redirect_uri": session_model.redirect_uri,
                "created_at": session_model.created_at,
                "expires_at": session_model.expires_at,
                "status": session_model.status,
                "handoff_code": session_model.handoff_code,
                "handoff_code_hash": session_model.handoff_code_hash,
                "user_id": session_model.user_id,
                "access_token": session_model.access_token,
                "refresh_token": session_model.refresh_token,
            }

        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        session.merge(session_model)
            except Exception as e:
                logger.warning(f"Error saving OAuth session: {e}")
        return session_model

    def get_oauth_session_by_id(self, session_id: str) -> Optional[OAuthSessionModel]:
        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        s = (
                            session.query(OAuthSessionModel)
                            .filter(OAuthSessionModel.session_id == session_id)
                            .first()
                        )
                        if s:
                            session.expunge(s)
                            return s
            except Exception as e:
                logger.warning(f"Error querying OAuth session by id: {e}")

        with self._lock:
            d = self._mem_oauth_sessions.get(session_id)
            if d:
                return OAuthSessionModel(**d)
        return None

    def get_oauth_session_by_state(self, state_hash: str) -> Optional[OAuthSessionModel]:
        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        s = (
                            session.query(OAuthSessionModel)
                            .filter(OAuthSessionModel.state_hash == state_hash)
                            .first()
                        )
                        if s:
                            session.expunge(s)
                            return s
            except Exception as e:
                logger.warning(f"Error querying OAuth session by state: {e}")

        with self._lock:
            for d in self._mem_oauth_sessions.values():
                if d.get("state_hash") == state_hash:
                    return OAuthSessionModel(**d)
        return None

    def get_oauth_session_by_handoff(
        self, handoff_code_hash: str
    ) -> Optional[OAuthSessionModel]:
        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        s = (
                            session.query(OAuthSessionModel)
                            .filter(
                                OAuthSessionModel.handoff_code_hash == handoff_code_hash
                            )
                            .first()
                        )
                        if s:
                            session.expunge(s)
                            return s
            except Exception as e:
                logger.warning(f"Error querying OAuth session by handoff: {e}")

        with self._lock:
            for d in self._mem_oauth_sessions.values():
                if d.get("handoff_code_hash") == handoff_code_hash:
                    return OAuthSessionModel(**d)
        return None


user_repo = UserRepository()
