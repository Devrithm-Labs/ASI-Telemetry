import json
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import func

from core.database import DatabaseManager, db_connection
from models.telemetry import TelemetryMetricModel

logger = logging.getLogger("backend.services.telemetry")


class TelemetryRepository:
    """Service handling SDK telemetry metrics, dashboard time-series, and trace operations via SQLAlchemy."""

    def __init__(self, conn: DatabaseManager = db_connection):
        self.conn = conn

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

        # 1. Update in-memory records
        self.conn.memory_records.append(record)
        if len(self.conn.memory_records) > 500:
            self.conn.memory_records.pop(0)

        # 2. Persist to PostgreSQL if connected
        if self.conn.is_connected and self.conn.SessionFactory:
            try:
                metric = TelemetryMetricModel(
                    id=record_id,
                    timestamp=dt_utc,
                    agent_name=agent_name,
                    func_name=func_name,
                    status=status,
                    response_time_ms=round(float(resp_time), 2),
                    memory_before=0.0,
                    memory_after=0.0,
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

    def get_dashboard_data(
        self,
        time_range: str = "7d",
        limit: int = 500,
        agent_name: Optional[str] = None,
        func_name: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Retrieves and computes unified dashboard telemetry data via SQLAlchemy ORM."""
        records: List[Dict[str, Any]] = []
        safe_limit = max(1, min(int(limit), 2000))

        # Determine cutoff timestamp for time filtering
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
                        if cutoff is not None:
                            q = q.filter(TelemetryMetricModel.timestamp >= cutoff)

                        items = q.order_by(TelemetryMetricModel.timestamp.desc()).limit(safe_limit).all()
                        records = [item.to_dict() for item in items]

                        # Application fleet discovery
                        app_q = session.query(
                            TelemetryMetricModel.agent_name,
                            TelemetryMetricModel.func_name,
                        ).distinct()
                        if user_id:
                            app_q = app_q.filter(TelemetryMetricModel.user_id == str(user_id))
                        for a_name, f_name in app_q.all():
                            if a_name:
                                apps_map[a_name].add(f_name or "default")

                        # 30-day uptime calculation
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

        # Fallback to memory records if database is offline or returned empty
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

        agent_address_map = {
            "weather-agent": "agent1qfzll7xq6t8d9rx5n3cnql32me650q2sakexpc979u0luhn702jh2af5mds",
            "assistant": "agent1qtj4m78hdr2dmldtssn7kw7gt0e3ycledny3cadpmdau9dmnv9a4yzjxcx0",
            "receiver": "agent1qfzll7xq6t8d9rx5n3cnql32me650q2sakexpc979u0luhn702jh2af5mds",
            "sender": "agent1qtj4m78hdr2dmldtssn7kw7gt0e3ycledny3cadpmdau9dmnv9a4yzjxcx0",
        }
        active_agent = agent_name or (records[0]["agent_name"] if records else "weather-agent")
        found_addr = None
        for r in records:
            m = r.get("metadata") or {}
            if m.get("agent_address"):
                found_addr = m["agent_address"]
                break

        agent_addr = found_addr or agent_address_map.get(active_agent) or f"agent1q{abs(hash(active_agent)):016x}4gkq"

        summary = {
            "total_requests": total,
            "total_success": succ,
            "total_errors": err,
            "success_rate": round(succ / total * 100, 1) if total else 100.0,
            "error_rate": round(err / total * 100, 1) if total else 0.0,
            "avg_response_time_ms": avg_resp,
            "uptime": uptime_val,
            "uptime_desc": "Percent of requests the agent replied to in the last 30 days.",
            "agent_address": agent_addr,
        }

        # Timeline Ticks & Labels
        now_dt = datetime.now().astimezone()
        if time_range_norm == "1h":
            start_tick = now_dt - timedelta(hours=1)
            ticks = [start_tick + timedelta(minutes=12 * i) for i in range(6)]
            labels = []
            for i, dt in enumerate(ticks):
                if i == 0 or dt.date() != ticks[max(0, i - 1)].date():
                    labels.append(f"{dt.month}/{dt.day}/{str(dt.year)[-2:]}")
                else:
                    labels.append(dt.strftime("%I:%M %p").lstrip("0"))
        elif time_range_norm in ("24h", "1d"):
            start_tick = now_dt - timedelta(hours=24)
            step = timedelta(hours=24) / 5
            ticks = [start_tick + step * i for i in range(6)]
            labels = []
            for i, dt in enumerate(ticks):
                if i == 0 or (i == len(ticks) - 1 and dt.date() != ticks[0].date()):
                    labels.append(f"{dt.month}/{dt.day}/{str(dt.year)[-2:]}")
                else:
                    labels.append(dt.strftime("%I %p").lstrip("0"))
        elif time_range_norm == "7d":
            start_tick = now_dt - timedelta(days=6)
            ticks = [start_tick + timedelta(days=i) for i in range(7)]
            labels = [f"{dt.month}/{dt.day}/{str(dt.year)[-2:]}" for dt in ticks]
        elif time_range_norm == "30d":
            start_tick = now_dt - timedelta(days=30)
            ticks = [start_tick + timedelta(days=6 * i) for i in range(6)]
            labels = [f"{dt.month}/{dt.day}/{str(dt.year)[-2:]}" for dt in ticks]
        else:
            start_tick = now_dt - timedelta(days=30)
            ticks = [start_tick + timedelta(days=6 * i) for i in range(6)]
            labels = [f"{dt.month}/{dt.day}/{str(dt.year)[-2:]}" for dt in ticks]

        def get_record_local_dt(ts_val) -> Optional[datetime]:
            if not ts_val:
                return None
            if isinstance(ts_val, datetime):
                return ts_val.astimezone() if ts_val.tzinfo else ts_val.replace(tzinfo=timezone.utc).astimezone()
            try:
                cleaned = str(ts_val).replace("Z", "+00:00").replace(" ", "T")
                dt = datetime.fromisoformat(cleaned)
                return dt.astimezone() if dt.tzinfo else dt.replace(tzinfo=timezone.utc).astimezone()
            except Exception:
                return None

        buckets_map: Dict[str, List[Dict[str, Any]]] = {lbl: [] for lbl in labels}
        for r in records:
            r_dt = get_record_local_dt(r.get("timestamp"))
            if r_dt is None:
                continue
            cur_dt = r_dt
            closest_idx = min(range(len(ticks)), key=lambda idx: abs((cur_dt - ticks[idx]).total_seconds()))
            buckets_map[labels[closest_idx]].append(r)

        req_data = []
        resp_data = []
        err_data = []

        for time_key in labels:
            items = buckets_map[time_key]
            n = len(items)
            succ_cnt = sum(1 for i in items if i.get("status") == "success")
            fail_cnt = n - succ_cnt
            times = [float(i.get("response_time_ms") or 0.0) for i in items]
            err_rate = round((fail_cnt / n * 100), 1) if n else 0.0

            c_timeout = 0
            c_ratelimit = 0
            c_server = 0
            c_validation = 0
            for i in items:
                if i.get("status") != "success":
                    m_data = i.get("metadata") or {}
                    status_code = m_data.get("status_code") or m_data.get("statusCode") or 500
                    err_str = str(m_data.get("error") or m_data.get("message") or i.get("status") or "").lower()
                    if status_code == 429 or "rate" in err_str or "429" in err_str:
                        c_ratelimit += 1
                    elif status_code == 504 or "timeout" in err_str or "timed out" in err_str or "504" in err_str:
                        c_timeout += 1
                    elif status_code in (400, 422) or "validation" in err_str or "schema" in err_str:
                        c_validation += 1
                    else:
                        c_server += 1

            avg_latency = round(sum(times) / n, 1) if n > 0 else 0.0

            req_data.append({
                "time": time_key,
                "total": n,
                "success": succ_cnt,
                "failure": fail_cnt,
            })
            resp_data.append({
                "time": time_key,
                "avg": avg_latency,
                "latency": avg_latency,
                "p50": avg_latency,
                "p90": avg_latency,
                "p95": avg_latency,
                "p99": avg_latency,
                "slaLimit": 300,
            })
            err_data.append({
                "time": time_key,
                "errorRate": err_rate,
                "timeout": c_timeout,
                "rateLimit": c_ratelimit,
                "serverError": c_server,
                "validationError": c_validation,
            })

        traces = []
        for r in records[:50]:
            resp_ms = float(r.get("response_time_ms") or 0.0)
            is_ok = r.get("status") == "success"
            traces.append({
                "id": r["id"],
                "name": r.get("func_name", "handle_message"),
                "service": r.get("agent_name", "assistant"),
                "status": r.get("status", "success"),
                "statusCode": 200 if is_ok else 500,
                "responseTimeMs": resp_ms,
                "latencyMs": resp_ms,
                "tokens": 0,
                "model": "uAgent",
                "timestamp": r.get("timestamp", ""),
                "spans": [
                    {
                        "name": r.get("func_name", "handle_message"),
                        "durationMs": resp_ms,
                        "status": "ok" if is_ok else "error",
                    }
                ],
            })

        return {
            "summary": summary,
            "timeseries": {
                "requests": req_data,
                "response_time": resp_data,
                "errors": err_data,
            },
            "traces": traces,
            "applications": applications,
        }

    def delete_traces(self, trace_ids: Optional[List[str]] = None, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Deletes telemetry traces by ID or truncates/clears metrics for a user."""
        safe_uid = str(user_id) if user_id else None

        if not trace_ids:
            if safe_uid:
                self.conn.memory_records = [r for r in self.conn.memory_records if r.get("user_id") != safe_uid]
                if self.conn.is_connected and self.conn.SessionFactory:
                    try:
                        with self.conn.session_scope() as session:
                            if session:
                                session.query(TelemetryMetricModel).filter(
                                    TelemetryMetricModel.user_id == safe_uid
                                ).delete(synchronize_session=False)
                    except Exception as e:
                        logger.error(f"Error deleting telemetry_metrics for user: {e}")
                        return {"status": "error", "message": str(e)}
                return {"status": "success", "message": "User tracing data cleared successfully"}
            else:
                self.conn.memory_records.clear()
                if self.conn.is_connected and self.conn.SessionFactory:
                    try:
                        with self.conn.session_scope() as session:
                            if session:
                                session.query(TelemetryMetricModel).delete(synchronize_session=False)
                    except Exception as e:
                        logger.error(f"Error truncating telemetry_metrics: {e}")
                        return {"status": "error", "message": str(e)}
                return {"status": "success", "message": "All tracing data cleared successfully"}
        else:
            ids_set = set(trace_ids)
            self.conn.memory_records = [r for r in self.conn.memory_records if r.get("id") not in ids_set]
            if self.conn.is_connected and self.conn.SessionFactory:
                try:
                    with self.conn.session_scope() as session:
                        if session:
                            q = session.query(TelemetryMetricModel).filter(
                                TelemetryMetricModel.id.in_(trace_ids)
                            )
                            if safe_uid:
                                q = q.filter(TelemetryMetricModel.user_id == safe_uid)
                            q.delete(synchronize_session=False)
                except Exception as e:
                    logger.error(f"Error deleting traces from PostgreSQL: {e}")
                    return {"status": "error", "message": str(e)}
            return {"status": "success", "message": f"{len(trace_ids)} trace(s) deleted successfully"}


# Default repository instance
telemetry_repo = TelemetryRepository()
