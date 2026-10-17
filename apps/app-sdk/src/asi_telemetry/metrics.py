"""
Metrics tracking and runtime performance monitoring for AI agents and tools.
"""

import asyncio
import json
import os
import threading
import time
import urllib.request
from datetime import datetime, timezone
from functools import wraps
from typing import Any, Callable, Optional


class MetricsTracker:
    """
    Real-time Agent and Tool execution metrics tracker.
    Monitors execution latency, success/failure counts, and SLA metrics,
    dispatching telemetry directly to the backend.
    """

    def __init__(
        self,
        agent_name: str = "assistant",
        agent_address: Optional[str] = None,
        agent_handle: Optional[str] = None,
        backend_url: Optional[str] = None,
    ):
        self.agent_name = agent_name
        self.agent_address = agent_address
        self.agent_handle = agent_handle
        self.backend_url = backend_url or os.getenv(
            "TELEMETRY_BACKEND_URL", "http://127.0.0.1:8080/api/metrics"
        )

        self.requests = 0
        self.success = 0
        self.errors = 0

        # Sync process-level agent identity with tracer
        try:
            from .tracer import set_agent_info
            set_agent_info(
                agent_name=agent_name,
                agent_address=agent_address,
                agent_handle=agent_handle,
            )
        except Exception:
            pass

    def _dispatch_payload(self, payload: dict) -> None:
        """Dispatches metric payload to the backend on a daemon thread without blocking."""
        def _worker():
            try:
                data = json.dumps(payload, default=str).encode("utf-8")
                req = urllib.request.Request(
                    self.backend_url,
                    data=data,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=2.0):
                    pass
            except Exception:
                # Backend unreachable; fail silently so agent is not affected
                pass

        threading.Thread(target=_worker, daemon=True).start()

    def track(
        self,
        target: Any = None,
        *,
        agent_name: Optional[str] = None,
        agentname: Optional[str] = None,
    ) -> Callable:
        """
        Decorator to track execution duration, outcomes, and metrics of an async agent tool or function.

        Usage:
            @tracker.track
            @tracker.track()
            @tracker.track("weather_service")
            @tracker.track(agent_name="weather_service")
        """
        actual_func = None
        if callable(target):
            actual_func = target
            resolved_agent = self.agent_name
        else:
            resolved_agent = target or agent_name or agentname or self.agent_name

        def decorator(func: Callable) -> Callable:
            @wraps(func)
            async def wrapper(*args, **kwargs):
                self.requests += 1
                start_time = time.perf_counter()
                status = "success"

                try:
                    result = await func(*args, **kwargs)
                    self.success += 1
                    return result
                except asyncio.CancelledError:
                    status = "cancelled"
                    raise
                except Exception:
                    self.errors += 1
                    status = "error"
                    raise
                finally:
                    duration_ms = (time.perf_counter() - start_time) * 1000

                    # 1. Print formatted terminal telemetry
                    self.print_metrics(duration_ms, func_name=func.__name__, agent=resolved_agent)

                    # 2. Build payload and dispatch directly to backend in background
                    payload = {
                        "agent_name": resolved_agent or self.agent_name,
                        "agent_address": self.agent_address,
                        "agent_handle": self.agent_handle,
                        "func_name": func.__name__,
                        "status": status,
                        "response_time_ms": round(duration_ms, 2),
                        "latency_ms": round(duration_ms, 2),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                    self._dispatch_payload(payload)

            return wrapper

        if actual_func is not None:
            return decorator(actual_func)
        return decorator

    async def send_to_backend(
        self,
        payload_or_time: Any,
        status: Optional[str] = None,
        func_name: Optional[str] = None,
        agent_name: Optional[str] = None,
    ) -> None:
        """Sends metric record directly to the backend endpoint."""
        if isinstance(payload_or_time, dict):
            payload = payload_or_time
        else:
            response_time_ms = float(payload_or_time)
            payload = {
                "agent_name": agent_name or self.agent_name,
                "agent_address": self.agent_address,
                "agent_handle": self.agent_handle,
                "func_name": func_name or "unknown",
                "status": status or "success",
                "response_time_ms": round(response_time_ms, 2),
                "latency_ms": round(response_time_ms, 2),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        self._dispatch_payload(payload)


# Backward compatibility alias
AgentMonitor = MetricsTracker
