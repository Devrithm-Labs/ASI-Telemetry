import json
import logging
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.db.session import DatabaseManager, db_manager
from app.models.api_key import ApiKeyModel

logger = logging.getLogger("asi_telemetry.repo.api_key")


class ApiKeyRepository:
    """Repository handling all database queries and storage for API keys."""

    def __init__(self, db: DatabaseManager = db_manager):
        self.db = db
        self._lock = threading.Lock()
        self._mem_keys: Dict[str, Dict[str, Any]] = {}

    def create(self, key_model: ApiKeyModel) -> ApiKeyModel:
        clean_id = str(key_model.id)
        with self._lock:
            self._mem_keys[clean_id] = {
                "id": clean_id,
                "user_id": str(key_model.user_id),
                "name": key_model.name,
                "key_prefix": key_model.key_prefix,
                "full_key": key_model.full_key,
                "environment": key_model.environment,
                "permissions": key_model.permissions,
                "rate_limit": key_model.rate_limit,
                "status": key_model.status,
                "created_at": key_model.created_at,
                "last_used_at": key_model.last_used_at,
                "expires_at": key_model.expires_at,
            }

        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        session.add(key_model)
            except Exception as e:
                logger.warning(f"Error inserting API key into DB: {e}")
        return key_model

    def list_by_user(self, user_id: str) -> List[ApiKeyModel]:
        clean_user_id = str(user_id)
        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        keys = (
                            session.query(ApiKeyModel)
                            .filter(ApiKeyModel.user_id == clean_user_id)
                            .order_by(ApiKeyModel.created_at.desc())
                            .all()
                        )
                        for k in keys:
                            session.expunge(k)
                        return keys
            except Exception as e:
                logger.warning(f"Error querying API keys for user: {e}")

        with self._lock:
            res: List[ApiKeyModel] = []
            for d in self._mem_keys.values():
                if d.get("user_id") == clean_user_id:
                    res.append(ApiKeyModel(**d))
            res.sort(key=lambda x: str(x.created_at), reverse=True)
            return res

    def get_by_id(self, key_id: str, user_id: str) -> Optional[ApiKeyModel]:
        clean_key_id = str(key_id)
        clean_user_id = str(user_id)
        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        k = (
                            session.query(ApiKeyModel)
                            .filter(
                                ApiKeyModel.id == clean_key_id,
                                ApiKeyModel.user_id == clean_user_id,
                            )
                            .first()
                        )
                        if k:
                            session.expunge(k)
                            return k
            except Exception as e:
                logger.warning(f"Error querying API key by id: {e}")

        with self._lock:
            d = self._mem_keys.get(clean_key_id)
            if d and d.get("user_id") == clean_user_id:
                return ApiKeyModel(**d)
        return None

    def get_by_full_key(self, full_key: str) -> Optional[ApiKeyModel]:
        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        k = (
                            session.query(ApiKeyModel)
                            .filter(
                                ApiKeyModel.full_key == full_key,
                                ApiKeyModel.status == "active",
                            )
                            .first()
                        )
                        if k:
                            session.expunge(k)
                            return k
            except Exception as e:
                logger.warning(f"Error resolving API key: {e}")

        with self._lock:
            for d in self._mem_keys.values():
                if d.get("full_key") == full_key and d.get("status") == "active":
                    return ApiKeyModel(**d)
        return None

    def revoke(self, key_id: str, user_id: str) -> bool:
        clean_key_id = str(key_id)
        clean_user_id = str(user_id)
        with self._lock:
            if clean_key_id in self._mem_keys and self._mem_keys[clean_key_id].get("user_id") == clean_user_id:
                self._mem_keys[clean_key_id]["status"] = "revoked"

        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        k = (
                            session.query(ApiKeyModel)
                            .filter(
                                ApiKeyModel.id == clean_key_id,
                                ApiKeyModel.user_id == clean_user_id,
                            )
                            .first()
                        )
                        if k:
                            k.status = "revoked"
                            return True
            except Exception as e:
                logger.warning(f"Error revoking API key: {e}")
        return clean_key_id in self._mem_keys

    def update_last_used(self, key_id: str) -> None:
        now = datetime.now(timezone.utc)
        clean_key_id = str(key_id)
        with self._lock:
            if clean_key_id in self._mem_keys:
                self._mem_keys[clean_key_id]["last_used_at"] = now

        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        k = session.query(ApiKeyModel).filter(ApiKeyModel.id == clean_key_id).first()
                        if k:
                            k.last_used_at = now
            except Exception as e:
                logger.warning(f"Error updating API key last_used_at: {e}")


api_key_repo = ApiKeyRepository()
