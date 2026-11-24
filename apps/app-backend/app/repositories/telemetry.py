from collections import defaultdict
from datetime import datetime, timedelta, timezone
import json
import logging
from typing import Any, Dict, List, Optional
from uuid import uuid4

from sqlalchemy import case, func

from app.db.session import DatabaseManager, db_manager
from app.models.telemetry import TelemetryMetricModel

logger = logging.getLogger("asi_telemetry.telemetry_repo")


class TelemetryRepository:
    """PostgreSQL repository for inserting and querying telemetry metrics via SQLAlchemy."""

    def __init__(self, conn: DatabaseManager = db_manager):
        self.conn = conn

    def insert_metric(self, payload_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts a single telemetry record into PostgreSQL."""
        if not self.conn.is_connected or not self.conn.SessionFactory:
            raise RuntimeError("Database connection is not available. Cannot store telemetry metric.")

        record_id = payload_dict.get("id") or str(uuid4())
        user_id = str(payload_dict.get("user_id") or "")

        now_utc = datetime.now(timezone.utc)
        ts_val = payload_dict.get("timestamp")
        if isinstance(ts_val, (int, float)):
            dt_utc = datetime.fromtimestamp(ts_val, tz=timezone.utc)
        elif isinstance(ts_val, str) and ts_val:
            try:
                dt_utc = datetime.fromisoformat(ts_val.replace("Z", "+00:00"))
            except Exception:
                dt_utc = now_utc
        else:
            dt_utc = now_utc

        agent_name = payload_dict.get("agent_name", "default_agent")
        meta = payload_dict.get("metadata", {}) or {}
        resp_time = payload_dict.get("response_time_ms")
        if resp_time is None:
            resp_time = payload_dict.get("latency_ms", 0.0)
        func_name = payload_dict.get("func_name", "handle_message")
        status = payload_dict.get("status", "success")

        record = {
            "id": record_id,
            "timestamp": dt_utc.isoformat()[:19],
            "agent_name": agent_name,
            "func_name": func_name,
            "status": status,
            "response_time_ms": round(float(resp_time), 2),
            "memory_before": 0.0,
            "memory_after": 0.0,
            "metadata": meta,
            "agent_address": meta.get("agent_address", ""),
            "agent_handle": meta.get("agent_handle", ""),
            "user_id": user_id,
        }

        metric = TelemetryMetricModel(
            id=record_id,
            timestamp=dt_utc,
            agent_name=agent_name,
            func_name=func_name,
            status=status,
            response_time_ms=record["response_time_ms"],
            memory_before=record["memory_before"],
            memory_after=record["memory_after"],
            meta_data=json.dumps(meta),
            agent_address=meta.get("agent_address", ""),
            agent_handle=meta.get("agent_handle", ""),
            user_id=user_id,
        )
        with self.conn.session_scope() as session:
            session.add(metric)

        return record

    def insert_metrics_batch(self, batch_payloads: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        inserted: List[Dict[str, Any]] = []
        for p in batch_payloads:
            try:
                res = self.insert_metric(p)
                inserted.append(res)
            except Exception as e:
                logger.error(f"Error inserting metric batch item: {e}")
        return inserted

    def get_dashboard_data(
        self,
        time_range: str = "7d",
        limit: int = 500,
        agent_name: Optional[str] = None,
        func_name: Optional[str] = None,
        user_id: Optional[str] = None,
        hours: Optional[int] = None,
        agent_address: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Calculates dashboard summary KPIs, applications, and formatted traces directly from PostgreSQL."""
        if not self.conn.is_connected or not self.conn.SessionFactory:
            raise RuntimeError("Database connection is not available. Please verify PostgreSQL configuration.")

        safe_limit = max(1, min(limit, 5000))
        now = datetime.now(timezone.utc)
        if hours:
            cutoff = now - timedelta(hours=hours)
        elif time_range == "24h":
            cutoff = now - timedelta(hours=24)
        elif time_range == "30d":
            cutoff = now - timedelta(days=30)
        else:
            cutoff = now - timedelta(days=7)

        records: List[Dict[str, Any]] = []
        apps_map = defaultdict(set)
        uptime_val = 100.0

        with self.conn.session_scope() as session:
            query = session.query(TelemetryMetricModel).filter(
                TelemetryMetricModel.timestamp >= cutoff
            )
            if user_id:
                query = query.filter(TelemetryMetricModel.user_id == str(user_id))
            if agent_name and agent_name not in ("all-applications", "All Applications", "all"):
                query = query.filter(TelemetryMetricModel.agent_name == agent_name)
            if func_name and func_name not in ("all", "All Functions", "All"):
                query = query.filter(TelemetryMetricModel.func_name == func_name)
            if agent_address:
                query = query.filter(TelemetryMetricModel.agent_address == agent_address)

            models = (
                query.order_by(TelemetryMetricModel.timestamp.desc())
                .limit(safe_limit)
                .all()
            )
            records = [m.to_dict() for m in models]

            # Collect application mapping
            app_q = session.query(
                TelemetryMetricModel.agent_name, TelemetryMetricModel.func_name
            )
            if user_id:
                app_q = app_q.filter(TelemetryMetricModel.user_id == str(user_id))
            for aname, fname in app_q.distinct().all():
                if aname:
                    apps_map[aname].add(fname or "default")

            # 30-day uptime query
            t30_cutoff = now - timedelta(days=30)
            up_q = session.query(
                func.count(TelemetryMetricModel.id),
                func.sum(
                    case(
                        (TelemetryMetricModel.status == "success", 1),
                        else_=0,
                    )
                ),
            ).filter(TelemetryMetricModel.timestamp >= t30_cutoff)
            if user_id:
                up_q = up_q.filter(TelemetryMetricModel.user_id == str(user_id))
            if agent_address:
                up_q = up_q.filter(TelemetryMetricModel.agent_address == agent_address)

            up_res = up_q.first()
            if up_res and up_res[0]:
                t30 = int(up_res[0])
                s30 = int(up_res[1] or 0)
                uptime_val = round((s30 / t30) * 100, 1) if t30 > 0 else 100.0

        applications = [
            {"agent_name": k, "functions": sorted(list(v))}
            for k, v in sorted(apps_map.items())
        ]

        total = len(records)
        succ = sum(1 for r in records if r.get("status") == "success")
        err = total - succ
        avg_resp = round(sum(r.get("response_time_ms", 0.0) for r in records) / total, 2) if total else 0.0

        summary = {
            "total_requests": total,
            "total_success": succ,
            "total_errors": err,
            "success_rate": round(succ / total * 100, 1) if total else 100.0,
            "error_rate": round(err / total * 100, 1) if total else 0.0,
            "avg_response_time_ms": avg_resp,
            "uptime": uptime_val,
            "uptime_desc": "Percent of requests the agent replied to in the last 30 days.",
            "agent_address": agent_address or (records[0].get("agent_address") if records else None),
        }

        # Build formatted traces
        formatted_traces: List[Dict[str, Any]] = []
        for r in records[:100]:
            formatted_traces.append(
                {
                    "id": r.get("id"),
                    "trace_id": r.get("id"),
                    "name": r.get("func_name"),
                    "agent_name": r.get("agent_name"),
                    "status": r.get("status"),
                    "latency_ms": r.get("response_time_ms"),
                    "response_time_ms": r.get("response_time_ms"),
                    "timestamp": r.get("timestamp"),
                    "start_time": r.get("timestamp"),
                    "metadata": r.get("metadata", {}),
                    "agent_address": r.get("agent_address", ""),
                    "agent_handle": r.get("agent_handle", ""),
                }
            )

        return {
            "summary": summary,
            "traces": formatted_traces,
            "recentTraces": formatted_traces,
            "applications": applications,
            "timeSeries": [],
        }

    def get_traces(
        self,
        page: int = 1,
        limit: int = 50,
        status: Optional[str] = None,
        func_name: Optional[str] = None,
        agent_name: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Fetches paginated traces from PostgreSQL."""
        if not self.conn.is_connected or not self.conn.SessionFactory:
            raise RuntimeError("Database connection is not available. Please verify PostgreSQL configuration.")

        with self.conn.session_scope() as session:
            query = session.query(TelemetryMetricModel)
            if user_id:
                query = query.filter(TelemetryMetricModel.user_id == str(user_id))
            if status:
                query = query.filter(TelemetryMetricModel.status == status)
            if func_name:
                query = query.filter(TelemetryMetricModel.func_name == func_name)
            if agent_name:
                query = query.filter(TelemetryMetricModel.agent_name == agent_name)

            total = query.count()
            offset = max(0, (page - 1) * limit)
            models = (
                query.order_by(TelemetryMetricModel.timestamp.desc())
                .offset(offset)
                .limit(limit)
                .all()
            )
            return {
                "traces": [m.to_dict() for m in models],
                "total": total,
                "page": page,
                "limit": limit,
            }

    def delete_traces(
        self, trace_ids: Optional[List[str]] = None, user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Deletes specific traces or clears all tool traces for the user in PostgreSQL."""
        if not self.conn.is_connected or not self.conn.SessionFactory:
            raise RuntimeError("Database connection is not available. Cannot delete traces.")

        with self.conn.session_scope() as session:
            q = session.query(TelemetryMetricModel)
            if user_id:
                q = q.filter(TelemetryMetricModel.user_id == str(user_id))
            if trace_ids:
                q = q.filter(TelemetryMetricModel.id.in_(trace_ids))
            q.delete(synchronize_session=False)

        return {"status": "success", "message": "Telemetry traces deleted successfully."}

    def get_agent_summary(
        self, agent_address: Optional[str] = None, user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        return self.get_dashboard_data(hours=720, user_id=user_id, agent_address=agent_address).get(
            "summary", {}
        )

    def count_metrics(self, user_id: Optional[str] = None) -> int:
        if not self.conn.is_connected or not self.conn.SessionFactory:
            return 0
        with self.conn.session_scope() as session:
            q = session.query(func.count(TelemetryMetricModel.id))
            if user_id:
                q = q.filter(TelemetryMetricModel.user_id == str(user_id))
            return q.scalar() or 0


telemetry_repo = TelemetryRepository()
