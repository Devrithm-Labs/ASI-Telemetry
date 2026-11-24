import json
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import func

from app.db.session import DatabaseManager, db_manager
from app.models.telemetry import TelemetryMetricModel

logger = logging.getLogger("asi_telemetry.repo.telemetry")


class TelemetryRepository:
    """Service handling SDK telemetry metrics, dashboard time-series, and trace operations via SQLAlchemy."""

    def __init__(self, db: DatabaseManager = db_manager, conn: Optional[DatabaseManager] = None):
        self.conn = conn or db
        self.db = self.conn

    def insert_metric(self, payload_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Inserts an SDK telemetry record into PostgreSQL with UTC timestamp."""
        dt_utc = datetime.now(timezone.utc)
        if payload_dict.get("timestamp"):
            try:
                dt_utc = datetime.fromisoformat(payload_dict["timestamp"].replace("Z", "+00:00"))
                if not dt_utc.tzinfo:
                    dt_utc = dt_utc.replace(tzinfo=timezone.utc)
            except Exception:
                pass

        record_id = f"metric-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
        resp_time = payload_dict.get("response_time_ms") or payload_dict.get("latency_ms") or 0.0
        meta = payload_dict.get("metadata") or {}
        if isinstance(meta, str):
            try:
                meta = json.loads(meta)
            except Exception:
                meta = {}
        if payload_dict.get("agent_address"):
            meta["agent_address"] = payload_dict["agent_address"]
        user_id = str(payload_dict.get("user_id") or "")
        agent_name = payload_dict.get("agent_name", "assistant")
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

        self.conn.memory_records.append(record)

        if self.conn.is_connected and self.conn.SessionFactory:
            try:
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
                    if session:
                        session.add(metric)
            except Exception as e:
                logger.error(f"PostgreSQL insert error in insert_metric: {e}")

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
        """Retrieves and computes unified dashboard telemetry data via SQLAlchemy ORM."""
        records: List[Dict[str, Any]] = []
        safe_limit = max(1, min(int(limit), 2000))

        if hours is not None:
            time_range = f"{hours}h"

        time_range_norm = (time_range or "7d").lower()
        now_utc = datetime.now(timezone.utc)
        cutoff = None
        if time_range_norm == "1h":
            cutoff = now_utc - timedelta(hours=1)
        elif time_range_norm in ("24h", "1d"):
            cutoff = now_utc - timedelta(hours=24)
        elif time_range_norm == "7d":
            cutoff = now_utc - timedelta(days=7)
        elif time_range_norm == "30d":
            cutoff = now_utc - timedelta(days=30)
        elif time_range_norm.endswith("h"):
            try:
                h_val = int(time_range_norm[:-1])
                cutoff = now_utc - timedelta(hours=h_val)
            except Exception:
                cutoff = now_utc - timedelta(days=7)

        apps_map: Dict[str, set] = defaultdict(set)
        uptime_val = 100.0

        if self.conn.is_connected and self.conn.SessionFactory:
            try:
                with self.conn.session_scope() as session:
                    if session:
                        q = session.query(TelemetryMetricModel)
                        if user_id:
                            q = q.filter(TelemetryMetricModel.user_id == str(user_id))
                        if agent_name and agent_name not in ("all-applications", "All Applications", "all"):
                            q = q.filter(TelemetryMetricModel.agent_name == agent_name)
                        if func_name and func_name not in ("all", "All Functions", "All"):
                            q = q.filter(TelemetryMetricModel.func_name == func_name)
                        if agent_address:
                            q = q.filter(TelemetryMetricModel.agent_address == agent_address)
                        if cutoff is not None:
                            q = q.filter(TelemetryMetricModel.timestamp >= cutoff)

                        items = q.order_by(TelemetryMetricModel.timestamp.desc()).limit(safe_limit).all()
                        records = [item.to_dict() for item in items]

                        app_q = session.query(
                            TelemetryMetricModel.agent_name,
                            TelemetryMetricModel.func_name,
                        ).distinct()
                        if user_id:
                            app_q = app_q.filter(TelemetryMetricModel.user_id == str(user_id))
                        for a_name, f_name in app_q.all():
                            if a_name:
                                apps_map[a_name].add(f_name or "default")

                        cutoff_30d = now_utc - timedelta(days=30)
                        up_q = session.query(
                            func.count(TelemetryMetricModel.id),
                            func.sum(
                                func.case(
                                    (TelemetryMetricModel.status == "success", 1),
                                    else_=0,
                                )
                            ),
                        ).filter(TelemetryMetricModel.timestamp >= cutoff_30d)
                        if user_id:
                            up_q = up_q.filter(TelemetryMetricModel.user_id == str(user_id))
                        if agent_name and agent_name not in ("All Applications", "all"):
                            up_q = up_q.filter(TelemetryMetricModel.agent_name == agent_name)

                        up_res = up_q.first()
                        if up_res and up_res[0]:
                            t30 = int(up_res[0])
                            s30 = int(up_res[1] or 0)
                            uptime_val = round((s30 / t30) * 100, 1) if t30 > 0 else 100.0
            except Exception as e:
                logger.error(f"PostgreSQL get_dashboard_data error: {e}")
                records = []

        if not records:
            mem_src = [r for r in self.conn.memory_records if (not user_id or r.get("user_id") == user_id)]
            if agent_name and agent_name not in ("all-applications", "All Applications", "all"):
                mem_src = [r for r in mem_src if r.get("agent_name") == agent_name]
            if func_name and func_name not in ("all", "All Functions", "All"):
                mem_src = [r for r in mem_src if r.get("func_name") == func_name]
            records = mem_src[:safe_limit]

            for r in self.conn.memory_records:
                if not user_id or r.get("user_id") == user_id:
                    if r.get("agent_name"):
                        apps_map[r["agent_name"]].add(r.get("func_name", "default"))

        applications = [
            {"agent_name": k, "functions": sorted(list(v))}
            for k, v in sorted(apps_map.items())
        ]

        total = len(records)
        succ = sum(1 for r in records if r.get("status") == "success")
        err = total - succ
        avg_resp = round(sum(r.get("response_time_ms", 0.0) for r in records) / total, 2) if total else 0.0

        if not self.conn.is_connected:
            uptime_val = round(succ / total * 100, 1) if total else 100.0

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
        """Fetches paginated traces from database or memory."""
        if self.conn.is_connected and self.conn.SessionFactory:
            try:
                with self.conn.session_scope() as session:
                    if session:
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
            except Exception as e:
                logger.warning(f"Error querying traces: {e}")

        filtered = list(self.conn.memory_records)
        if user_id:
            filtered = [r for r in filtered if r.get("user_id") == str(user_id)]
        if status:
            filtered = [r for r in filtered if r.get("status") == status]
        if func_name:
            filtered = [r for r in filtered if r.get("func_name") == func_name]
        if agent_name:
            filtered = [r for r in filtered if r.get("agent_name") == agent_name]

        total = len(filtered)
        start = (page - 1) * limit
        end = start + limit
        return {
            "traces": filtered[start:end],
            "total": total,
            "page": page,
            "limit": limit,
        }

    def delete_traces(
        self, trace_ids: Optional[List[str]] = None, user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Deletes specific traces or clears all tool traces for the user."""
        if self.conn.is_connected and self.conn.SessionFactory:
            try:
                with self.conn.session_scope() as session:
                    if session:
                        q = session.query(TelemetryMetricModel)
                        if user_id:
                            q = q.filter(TelemetryMetricModel.user_id == str(user_id))
                        if trace_ids:
                            q = q.filter(TelemetryMetricModel.id.in_(trace_ids))
                        q.delete(synchronize_session=False)
            except Exception as e:
                logger.error(f"Error deleting telemetry traces: {e}")

        # In-memory cleanup
        if trace_ids:
            self.conn.memory_records = [
                r for r in self.conn.memory_records
                if r.get("id") not in trace_ids or (user_id and r.get("user_id") != str(user_id))
            ]
        else:
            if user_id:
                self.conn.memory_records = [
                    r for r in self.conn.memory_records if r.get("user_id") != str(user_id)
                ]
            else:
                self.conn.memory_records.clear()

        return {"status": "success", "message": "Telemetry traces deleted successfully."}

    def get_agent_summary(
        self, agent_address: Optional[str] = None, user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        return self.get_dashboard_data(hours=720, user_id=user_id, agent_address=agent_address).get(
            "summary", {}
        )

    def count_metrics(self, user_id: Optional[str] = None) -> int:
        if self.conn.is_connected and self.conn.SessionFactory:
            try:
                with self.conn.session_scope() as session:
                    if session:
                        q = session.query(func.count(TelemetryMetricModel.id))
                        if user_id:
                            q = q.filter(TelemetryMetricModel.user_id == str(user_id))
                        return q.scalar() or 0
            except Exception:
                pass
        return len(self.conn.memory_records)


telemetry_repo = TelemetryRepository()
