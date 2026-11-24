import json
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ApiKeyModel(Base):
    """SQLAlchemy model for API keys table."""

    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(64), nullable=False)
    full_key: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    environment: Mapped[str] = mapped_column(String(64), nullable=False, default="production")
    permissions: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    rate_limit: Mapped[str] = mapped_column(String(128), nullable=False, default="25,000 req/min")
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    def get_permissions_list(self) -> List[str]:
        raw = getattr(self, "permissions", None)
        if not raw:
            return []
        try:
            return json.loads(str(raw))
        except Exception:
            return [p.strip() for p in str(raw).split(",") if p.strip()]
