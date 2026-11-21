import json
from datetime import datetime, timezone
from typing import Any, Dict

from sqlalchemy import DateTime, Float, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class TelemetryMetricModel(Base):
    """SQLAlchemy model for telemetry metrics table."""

    __tablename__ = "telemetry_metrics"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    agent_name: Mapped[str] = mapped_column(String(255), nullable=False, default="assistant", index=True)
    func_name: Mapped[str] = mapped_column(String(255), nullable=False, default="handle_message", index=True)
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="success", index=True)
    response_time_ms: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    memory_before: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    memory_after: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    meta_data: Mapped[str] = mapped_column("metadata", Text, nullable=False, default="{}")
    agent_address: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    agent_handle: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    user_id: Mapped[str] = mapped_column(String(128), nullable=False, default="", index=True)

    __table_args__ = (
        Index("idx_telemetry_user_time", "user_id", "timestamp"),
        Index("idx_telemetry_agent_time", "agent_name", "timestamp"),
    )

    def to_dict(self) -> Dict[str, Any]:
        meta: Dict[str, Any] = {}
        raw_meta = getattr(self, "meta_data", None)
        if raw_meta:
            try:
                meta = json.loads(str(raw_meta))
            except Exception:
                meta = {}
        ts_val = getattr(self, "timestamp", None)
        ts_str = ts_val.isoformat() if (ts_val is not None and hasattr(ts_val, "isoformat")) else str(ts_val or "")
        return {
            "id": str(getattr(self, "id", "")),
            "timestamp": ts_str[:19] if ts_str else "",
            "agent_name": str(getattr(self, "agent_name", "assistant") or "assistant"),
            "func_name": str(getattr(self, "func_name", "handle_message") or "handle_message"),
            "status": str(getattr(self, "status", "success") or "success"),
            "response_time_ms": float(getattr(self, "response_time_ms", 0.0) or 0.0),
            "memory_before": float(getattr(self, "memory_before", 0.0) or 0.0),
            "memory_after": float(getattr(self, "memory_after", 0.0) or 0.0),
            "metadata": meta,
            "agent_address": str(getattr(self, "agent_address", "") or ""),
            "agent_handle": str(getattr(self, "agent_handle", "") or ""),
            "user_id": str(getattr(self, "user_id", "") or ""),
        }
