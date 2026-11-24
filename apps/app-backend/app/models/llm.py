import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import DateTime, Float, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class LLMTraceModel(Base):
    """SQLAlchemy model for LLM traces and spans table."""

    __tablename__ = "llm_traces"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    trace_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    span_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    parent_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="gemini_generate")
    run_type: Mapped[str] = mapped_column(String(64), nullable=False, default="llm")
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="success")
    model: Mapped[str] = mapped_column(String(128), nullable=False, default="gemini-3.8-flash", index=True)
    input: Mapped[str] = mapped_column(Text, nullable=False, default="")
    output: Mapped[str] = mapped_column(Text, nullable=False, default="")
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    latency_ms: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cost_usd: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    meta_data: Mapped[str] = mapped_column("metadata", Text, nullable=False, default="{}")
    agent_address: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    agent_handle: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    user_id: Mapped[str] = mapped_column(String(128), nullable=False, default="", index=True)

    __table_args__ = (
        Index("idx_llm_user_start", "user_id", "start_time"),
        Index("idx_llm_model_start", "model", "start_time"),
    )

    def to_dict(self) -> Dict[str, Any]:
        meta: Dict[str, Any] = {}
        raw_meta = getattr(self, "meta_data", None)
        if raw_meta:
            try:
                meta = json.loads(str(raw_meta))
            except Exception:
                meta = {}

        addr = str(getattr(self, "agent_address", "") or meta.get("agent_address", ""))
        hdl = str(getattr(self, "agent_handle", "") or meta.get("agent_handle", ""))
        agent_name = str(meta.get("agent_name", "") or "")
        parent_id = getattr(self, "parent_id", None)
        is_root = bool(meta.get("is_agent_root", parent_id is None))

        st_val = getattr(self, "start_time", None)
        st_str = st_val.isoformat() if (st_val is not None and hasattr(st_val, "isoformat")) else str(st_val or "")
        et_val = getattr(self, "end_time", None)
        et_str = (
            et_val.isoformat()
            if (et_val is not None and hasattr(et_val, "isoformat"))
            else (str(et_val) if et_val else "")
        )
        err_val = getattr(self, "error", None)

        return {
            "id": str(getattr(self, "id", "")),
            "trace_id": str(getattr(self, "trace_id", "")),
            "span_id": str(getattr(self, "span_id", "")),
            "parent_id": str(parent_id) if parent_id else None,
            "name": str(getattr(self, "name", "")),
            "run_type": str(getattr(self, "run_type", "")),
            "status": str(getattr(self, "status", "")),
            "model": str(getattr(self, "model", "")),
            "input": str(getattr(self, "input", "")),
            "output": str(getattr(self, "output", "")),
            "error": str(err_val) if err_val else None,
            "start_time": st_str,
            "end_time": et_str,
            "latency_ms": float(getattr(self, "latency_ms", 0.0) or 0.0),
            "prompt_tokens": int(getattr(self, "prompt_tokens", 0) or 0),
            "completion_tokens": int(getattr(self, "completion_tokens", 0) or 0),
            "total_tokens": int(getattr(self, "total_tokens", 0) or 0),
            "cost_usd": float(getattr(self, "cost_usd", 0.0) or 0.0),
            "metadata": meta,
            "agent_address": addr,
            "agent_handle": hdl,
            "agent_name": agent_name,
            "is_agent_root": is_root,
            "user_id": str(getattr(self, "user_id", "")),
        }
