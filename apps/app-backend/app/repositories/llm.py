import json
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import func, or_

from app.db.session import DatabaseManager, db_manager
from app.models.llm import LLMTraceModel

logger = logging.getLogger("asi_telemetry.repo.llm")


class LLMRepository:
    """Repository handling all database queries and aggregations for LLM traces."""

    def __init__(self, db: DatabaseManager = db_manager, conn: Optional[DatabaseManager] = None):
        self.db = conn or db

    def insert_llm_trace(self, payload_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts an LLM trace into PostgreSQL."""
        trace_id = payload_dict.get("trace_id") or f"trace-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
        span_id = payload_dict.get("span_id") or f"span-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
        record_id = payload_dict.get("id") or f"llm-{int(datetime.now(timezone.utc).timestamp() * 1000)}"

        dt_start = datetime.now(timezone.utc)
        if payload_dict.get("start_time"):
            try:
                dt_start = datetime.fromisoformat(payload_dict["start_time"].replace("Z", "+00:00"))
                if not dt_start.tzinfo:
                    dt_start = dt_start.replace(tzinfo=timezone.utc)
            except Exception:
                pass

        dt_end = None
        if payload_dict.get("end_time"):
            try:
                dt_end = datetime.fromisoformat(payload_dict["end_time"].replace("Z", "+00:00"))
                if not dt_end.tzinfo:
                    dt_end = dt_end.replace(tzinfo=timezone.utc)
            except Exception:
                pass

        meta = payload_dict.get("metadata") or {}
        if isinstance(meta, str):
            try:
                meta = json.loads(meta)
            except Exception:
                meta = {}
        if payload_dict.get("agent_address"):
            meta["agent_address"] = payload_dict["agent_address"]

        record = {
            "id": record_id,
            "trace_id": trace_id,
            "span_id": span_id,
            "parent_id": payload_dict.get("parent_id"),
            "name": payload_dict.get("name", "gemini_generate"),
            "run_type": payload_dict.get("run_type", "llm"),
            "status": payload_dict.get("status", "success"),
            "model": payload_dict.get("model", "gemini-3.8-flash"),
            "input": payload_dict.get("input", ""),
            "output": payload_dict.get("output", ""),
            "error": payload_dict.get("error"),
            "start_time": dt_start.isoformat(),
            "end_time": dt_end.isoformat() if dt_end else None,
            "latency_ms": round(float(payload_dict.get("latency_ms", 0.0) or 0.0), 2),
            "prompt_tokens": int(payload_dict.get("prompt_tokens", 0) or 0),
            "completion_tokens": int(payload_dict.get("completion_tokens", 0) or 0),
            "total_tokens": int(payload_dict.get("total_tokens", 0) or 0),
            "cost_usd": float(payload_dict.get("cost_usd", 0.0) or 0.0),
            "metadata": meta,
            "agent_address": payload_dict.get("agent_address") or meta.get("agent_address", ""),
            "agent_handle": payload_dict.get("agent_handle") or meta.get("agent_handle", ""),
            "agent_name": meta.get("agent_name", ""),
            "is_agent_root": meta.get("is_agent_root", payload_dict.get("parent_id") is None),
            "user_id": str(payload_dict.get("user_id") or ""),
        }

        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        model = LLMTraceModel(
                            id=record["id"],
                            trace_id=record["trace_id"],
                            span_id=record["span_id"],
                            parent_id=record["parent_id"],
                            name=record["name"],
                            run_type=record["run_type"],
                            status=record["status"],
                            model=record["model"],
                            input=record["input"],
                            output=record["output"],
                            error=record["error"],
                            start_time=dt_start,
                            end_time=dt_end,
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
                        session.add(model)
                return record
            except Exception as e:
                logger.warning(f"Error persisting LLM trace: {e}. Using in-memory fallback.")

        self.db.llm_records.append(record)
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
        """Fetches LLM traces with filtering, search, and summary stats."""
        records: List[Dict[str, Any]] = []

        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
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
            except Exception as e:
                logger.warning(f"Error querying LLM traces: {e}")

        # In-memory fallback
        filtered = list(self.db.llm_records)
        if user_id:
            filtered = [r for r in filtered if r.get("user_id") == str(user_id)]
        if trace_id:
            filtered = [r for r in filtered if r.get("trace_id") == trace_id]
        if run_type and run_type != "all":
            filtered = [r for r in filtered if r.get("run_type") == run_type]
        if status and status != "all":
            filtered = [r for r in filtered if r.get("status") == status]
        if model and model != "all":
            filtered = [r for r in filtered if r.get("model") == model]
        if search:
            st = search.lower()
            filtered = [
                r
                for r in filtered
                if st in r.get("input", "").lower()
                or st in r.get("output", "").lower()
                or st in r.get("name", "").lower()
                or st in r.get("model", "").lower()
                or st in r.get("trace_id", "").lower()
            ]

        total = len(filtered)
        start = (page - 1) * limit
        end = start + limit
        paginated = filtered[start:end]

        tot_tokens = sum(int(r.get("total_tokens", 0)) for r in filtered)
        tot_cost = sum(float(r.get("cost_usd", 0.0)) for r in filtered)
        avg_lat = (
            round(sum(float(r.get("latency_ms", 0.0)) for r in filtered) / total, 2)
            if total
            else 0.0
        )

        return {
            "traces": paginated,
            "total": total,
            "page": page,
            "limit": limit,
            "stats": {
                "total_traces": total,
                "avg_latency_ms": avg_lat,
                "total_tokens": tot_tokens,
                "total_cost_usd": round(tot_cost, 4),
            },
        }

    def get_llm_monitoring_data(
        self, user_id: Optional[str] = None, time_range: str = "24h", model: Optional[str] = None
    ) -> Dict[str, Any]:
        """Calculates time-series, model breakdowns, and KPI analytics for LLM monitoring."""
        hours = 24
        if time_range == "1h":
            hours = 1
        elif time_range == "7d":
            hours = 168
        elif time_range == "30d":
            hours = 720

        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        records: List[Dict[str, Any]] = []

        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        q = session.query(LLMTraceModel).filter(LLMTraceModel.start_time >= since)
                        if user_id:
                            q = q.filter(LLMTraceModel.user_id == str(user_id))
                        if model and model != "all":
                            q = q.filter(LLMTraceModel.model == model)
                        models = q.order_by(LLMTraceModel.start_time.asc()).limit(2000).all()
                        records = [m.to_dict() for m in models]
            except Exception as e:
                logger.warning(f"Error querying monitoring data: {e}")

        if not records and self.db.llm_records:
            filtered = [
                r
                for r in self.db.llm_records
                if r.get("start_time", "") >= since.isoformat()
            ]
            if user_id:
                filtered = [r for r in filtered if r.get("user_id") == str(user_id)]
            if model and model != "all":
                filtered = [r for r in filtered if r.get("model") == model]
            records = filtered

        total_count = len(records)
        total_tokens = sum(int(r.get("total_tokens", 0)) for r in records)
        prompt_tokens = sum(int(r.get("prompt_tokens", 0)) for r in records)
        completion_tokens = sum(int(r.get("completion_tokens", 0)) for r in records)
        total_cost = sum(float(r.get("cost_usd", 0.0)) for r in records)
        total_latency = sum(float(r.get("latency_ms", 0.0)) for r in records)
        avg_latency = round(total_latency / total_count, 2) if total_count else 0.0
        error_count = sum(1 for r in records if r.get("status") in ("error", "failed"))
        error_rate = round(error_count / total_count * 100, 2) if total_count else 0.0

        model_counts: Dict[str, int] = defaultdict(int)
        for r in records:
            model_counts[r.get("model", "unknown")] += 1

        return {
            "summary": {
                "totalCount": total_count,
                "totalTokens": total_tokens,
                "promptTokens": prompt_tokens,
                "completionTokens": completion_tokens,
                "totalCost": round(total_cost, 4),
                "avgLatency": avg_latency,
                "errorRate": error_rate,
            },
            "models": model_counts,
            "traces": records[-50:] if records else [],
        }

    def clear_llm_traces(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Clears LLM traces."""
        deleted_count = 0
        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        q = session.query(LLMTraceModel)
                        if user_id:
                            q = q.filter(LLMTraceModel.user_id == str(user_id))
                        deleted_count = q.delete(synchronize_session=False)
            except Exception as e:
                logger.error(f"Error deleting LLM traces: {e}")

        if user_id:
            self.db.llm_records = [
                r for r in self.db.llm_records if r.get("user_id") != str(user_id)
            ]
        else:
            self.db.llm_records.clear()

        return {"status": "success", "message": f"Deleted {deleted_count} LLM trace records."}

    def count_traces(self, user_id: Optional[str] = None) -> int:
        if self.db.is_connected and self.db.SessionFactory:
            try:
                with self.db.session_scope() as session:
                    if session:
                        q = session.query(func.count(LLMTraceModel.id))
                        if user_id:
                            q = q.filter(LLMTraceModel.user_id == str(user_id))
                        return q.scalar() or 0
            except Exception:
                pass
        return len(self.db.llm_records)


llm_repo = LLMRepository()
