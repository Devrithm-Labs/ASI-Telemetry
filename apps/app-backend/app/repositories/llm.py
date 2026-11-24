from collections import defaultdict
from datetime import datetime, timedelta, timezone
import json
import logging
from typing import Any, Dict, List, Optional
from uuid import uuid4

from sqlalchemy import func, or_

from app.db.session import DatabaseManager, db_manager
from app.models.llm import LLMTraceModel

logger = logging.getLogger("asi_telemetry.llm_repo")


class LLMRepository:
    """PostgreSQL repository for inserting, searching, and aggregating LLM traces via SQLAlchemy."""

    def __init__(self, conn: DatabaseManager = db_manager):
        self.db = conn

    def insert_llm_trace(self, payload_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts a single LLM execution trace into PostgreSQL."""
        if not self.db.is_connected or not self.db.SessionFactory:
            raise RuntimeError("Database connection is not available. Cannot store LLM trace.")

        trace_id = payload_dict.get("trace_id") or payload_dict.get("id") or str(uuid4())
        name = payload_dict.get("name") or "agent_llm_call"
        run_type = payload_dict.get("run_type") or "llm"
        status = payload_dict.get("status") or "success"

        now_utc = datetime.now(timezone.utc)
        start_time_val = payload_dict.get("start_time")
        if isinstance(start_time_val, (int, float)):
            start_dt = datetime.fromtimestamp(start_time_val, tz=timezone.utc)
        elif isinstance(start_time_val, str) and start_time_val:
            try:
                start_dt = datetime.fromisoformat(start_time_val.replace("Z", "+00:00"))
            except Exception:
                start_dt = now_utc
        else:
            start_dt = now_utc

        end_time_val = payload_dict.get("end_time")
        if isinstance(end_time_val, (int, float)):
            end_dt = datetime.fromtimestamp(end_time_val, tz=timezone.utc)
        elif isinstance(end_time_val, str) and end_time_val:
            try:
                end_dt = datetime.fromisoformat(end_time_val.replace("Z", "+00:00"))
            except Exception:
                end_dt = start_dt
        else:
            end_dt = start_dt

        metadata = payload_dict.get("metadata", {}) or {}
        agent_address = metadata.get("agent_address", "")
        agent_handle = metadata.get("agent_handle", "")
        user_id = str(payload_dict.get("user_id") or "")

        record = {
            "id": trace_id,
            "trace_id": trace_id,
            "parent_trace_id": payload_dict.get("parent_trace_id"),
            "name": name,
            "run_type": run_type,
            "status": status,
            "start_time": start_dt.isoformat()[:19],
            "end_time": end_dt.isoformat()[:19],
            "model": payload_dict.get("model", "unknown-model"),
            "provider": payload_dict.get("provider", "openai"),
            "input": str(payload_dict.get("input", "")),
            "output": str(payload_dict.get("output", "")),
            "error": str(payload_dict.get("error", "")),
            "latency_ms": round(float(payload_dict.get("latency_ms", 0.0)), 2),
            "prompt_tokens": int(payload_dict.get("prompt_tokens", 0)),
            "completion_tokens": int(payload_dict.get("completion_tokens", 0)),
            "total_tokens": int(payload_dict.get("total_tokens", 0)),
            "cost_usd": round(float(payload_dict.get("cost_usd", 0.0)), 6),
            "metadata": metadata,
            "agent_address": agent_address,
            "agent_handle": agent_handle,
            "user_id": user_id,
        }

        span_id = payload_dict.get("span_id") or str(uuid4())
        parent_id = payload_dict.get("parent_id") or payload_dict.get("parent_trace_id")

        model = LLMTraceModel(
            id=record["id"],
            trace_id=record["trace_id"],
            span_id=span_id,
            parent_id=parent_id,
            name=record["name"],
            run_type=record["run_type"],
            status=record["status"],
            start_time=start_dt,
            end_time=end_dt,
            model=record["model"],
            input=record["input"],
            output=record["output"],
            error=record["error"],
            latency_ms=record["latency_ms"],
            prompt_tokens=record["prompt_tokens"],
            completion_tokens=record["completion_tokens"],
            total_tokens=record["total_tokens"],
            cost_usd=record["cost_usd"],
            meta_data=json.dumps(record["metadata"]),
            agent_address=record["agent_address"],
            agent_handle=record["agent_handle"],
            user_id=record["user_id"],
        )
        with self.db.session_scope() as session:
            session.add(model)
        return record

    def get_llm_traces(
        self,
        page: int = 1,
        limit: int = 50,
        run_type: Optional[str] = None,
        status: Optional[str] = None,
        model: Optional[str] = None,
        search: Optional[str] = None,
        trace_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Fetches LLM traces with filtering, search, and summary stats directly from PostgreSQL."""
        if not self.db.is_connected or not self.db.SessionFactory:
            raise RuntimeError("Database connection is not available. Please verify PostgreSQL configuration.")

        with self.db.session_scope() as session:
            q = session.query(LLMTraceModel)
            if user_id:
                q = q.filter(LLMTraceModel.user_id == str(user_id))
            if trace_id:
                q = q.filter(LLMTraceModel.trace_id == trace_id)
            if run_type and run_type != "all":
                q = q.filter(LLMTraceModel.run_type == run_type)
            if status and status != "all":
                q = q.filter(LLMTraceModel.status == status)
            if model and model != "all":
                q = q.filter(LLMTraceModel.model == model)
            if search:
                term = f"%{search}%"
                q = q.filter(
                    or_(
                        LLMTraceModel.input.ilike(term),
                        LLMTraceModel.output.ilike(term),
                        LLMTraceModel.name.ilike(term),
                        LLMTraceModel.model.ilike(term),
                        LLMTraceModel.trace_id.ilike(term),
                    )
                )

            total = q.count()
            offset = max(0, (page - 1) * limit)
            models = (
                q.order_by(LLMTraceModel.start_time.desc())
                .offset(offset)
                .limit(limit)
                .all()
            )
            records = [m.to_dict() for m in models]

            # Calculate aggregate stats
            stats_q = session.query(
                func.coalesce(func.sum(LLMTraceModel.latency_ms), 0.0),
                func.coalesce(func.sum(LLMTraceModel.total_tokens), 0),
                func.coalesce(func.sum(LLMTraceModel.cost_usd), 0.0),
            )
            if user_id:
                stats_q = stats_q.filter(LLMTraceModel.user_id == str(user_id))
            row = stats_q.first()
            total_lat, total_tokens, total_cost = (
                row if row else (0.0, 0, 0.0)
            )
            avg_lat = round(float(total_lat) / total, 2) if total else 0.0

            return {
                "traces": records,
                "total": total,
                "page": page,
                "limit": limit,
                "stats": {
                    "total_traces": total,
                    "avg_latency_ms": avg_lat,
                    "total_tokens": int(total_tokens),
                    "total_cost_usd": round(float(total_cost), 4),
                },
            }

    def get_llm_monitoring_data(
        self,
        time_range: str = "7d",
        model: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Calculates aggregated LLM monitoring data and KPIs from PostgreSQL."""
        if not self.db.is_connected or not self.db.SessionFactory:
            raise RuntimeError("Database connection is not available. Please verify PostgreSQL configuration.")

        now = datetime.now(timezone.utc)
        if time_range == "24h":
            cutoff = now - timedelta(hours=24)
        elif time_range == "30d":
            cutoff = now - timedelta(days=30)
        else:
            cutoff = now - timedelta(days=7)

        with self.db.session_scope() as session:
            q = session.query(LLMTraceModel).filter(LLMTraceModel.start_time >= cutoff)
            if user_id:
                q = q.filter(LLMTraceModel.user_id == str(user_id))
            if model and model != "all":
                q = q.filter(LLMTraceModel.model == model)

            traces = [m.to_dict() for m in q.order_by(LLMTraceModel.start_time.desc()).limit(500).all()]

        total_count = len(traces)
        total_tokens = sum(t.get("total_tokens", 0) for t in traces)
        prompt_tokens = sum(t.get("prompt_tokens", 0) for t in traces)
        completion_tokens = sum(t.get("completion_tokens", 0) for t in traces)
        total_cost = round(sum(t.get("cost_usd", 0.0) for t in traces), 4)
        avg_latency = (
            round(sum(t.get("latency_ms", 0.0) for t in traces) / total_count, 2)
            if total_count
            else 0.0
        )
        error_count = sum(1 for t in traces if t.get("status") in ("error", "failed"))
        error_rate = round((error_count / total_count) * 100, 2) if total_count else 0.0

        model_stats: Dict[str, Any] = defaultdict(
            lambda: {
                "calls": 0,
                "tokens": 0,
                "cost": 0.0,
                "total_latency": 0.0,
                "errors": 0,
            }
        )

        for t in traces:
            m_name = t.get("model", "unknown")
            ms = model_stats[m_name]
            ms["calls"] += 1
            ms["tokens"] += t.get("total_tokens", 0)
            ms["cost"] += t.get("cost_usd", 0.0)
            ms["total_latency"] += t.get("latency_ms", 0.0)
            if t.get("status") in ("error", "failed"):
                ms["errors"] += 1

        formatted_models = {
            m: {
                "calls": s["calls"],
                "tokens": s["tokens"],
                "cost": round(s["cost"], 4),
                "avgLatency": round(s["total_latency"] / s["calls"], 2) if s["calls"] else 0.0,
                "errorRate": round((s["errors"] / s["calls"]) * 100, 2) if s["calls"] else 0.0,
            }
            for m, s in model_stats.items()
        }

        return {
            "summary": {
                "totalCount": total_count,
                "totalTokens": total_tokens,
                "promptTokens": prompt_tokens,
                "completionTokens": completion_tokens,
                "totalCost": total_cost,
                "avgLatency": avg_latency,
                "errorRate": error_rate,
            },
            "models": formatted_models,
            "traces": traces,
        }

    def count_traces(self, user_id: Optional[str] = None) -> int:
        """Returns total count of LLM traces scoped to user."""
        if not self.db.is_connected or not self.db.SessionFactory:
            return 0
        with self.db.session_scope() as session:
            q = session.query(func.count(LLMTraceModel.id))
            if user_id:
                q = q.filter(LLMTraceModel.user_id == str(user_id))
            return q.scalar() or 0

    def clear_llm_traces(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Clears all LLM traces scoped to user in PostgreSQL."""
        if not self.db.is_connected or not self.db.SessionFactory:
            raise RuntimeError("Database connection is not available. Cannot clear traces.")

        with self.db.session_scope() as session:
            q = session.query(LLMTraceModel)
            if user_id:
                q = q.filter(LLMTraceModel.user_id == str(user_id))
            q.delete(synchronize_session=False)

        return {"status": "success", "message": "LLM traces cleared successfully"}


llm_repo = LLMRepository()
