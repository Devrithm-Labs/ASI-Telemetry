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
from typing import Callable, Optional


class MetricsTracker:

    def __init__(
        self,
        agent_name: str = "assistant",
        agent_address: Optional[str] = None,
        api_key: Optional[str] = None,
        backend_url: Optional[str] = None,
    ):
        self.agent_name = agent_name
        self.agent_address = agent_address
        self.api_key = api_key or os.getenv("ASI_API_KEY") or os.getenv("ASI_TELEMETRY_API_KEY") or os.getenv("TELEMETRY_API_KEY")
        url = backend_url or os.getenv("TELEMETRY_BACKEND_URL") or "http://127.0.0.1:8080/api/metrics"
        if not url.endswith("/api/metrics"):
            url = url.rstrip("/") + "/api/metrics"
        self.backend_url = url

        # Sync process-level agent identity and API key with tracer
        try:
            from .tracer import set_agent_info, set_api_key
            set_agent_info(
                agent_name=agent_name,
                agent_address=agent_address,
            )
            if self.api_key:
                set_api_key(self.api_key)
        except Exception:
            pass

    def _dispatch_payload(self, payload: dict) -> None:
        def _worker():
            try:
                headers = {"Content-Type": "application/json"}
                api_key = self.api_key or os.getenv("ASI_API_KEY") or os.getenv("ASI_TELEMETRY_API_KEY") or os.getenv("TELEMETRY_API_KEY")
                if api_key:
                    headers["x-api-key"] = api_key
                    headers["Authorization"] = f"Bearer {api_key}"
                    payload["api_key"] = api_key

                data = json.dumps(payload, default=str).encode("utf-8")
                req = urllib.request.Request(
                    self.backend_url,
                    data=data,
                    headers=headers,
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=2.0):
                    pass
            except Exception:
                # Backend unreachable; fail silently so agent is not affected
                pass

        threading.Thread(target=_worker, daemon=True).start()

    def track(self, tool_name: Optional[str] = None) -> Callable:
        def decorator(func: Callable) -> Callable:
            #if in case user not provided the tool_name, then it will use the function name as a tool name.................
            target_name = tool_name or func.__name__

            @wraps(func)
            async def wrapper(*args, **kwargs):
                start_time = time.perf_counter()
                status = "success"

                try:
                    result = await func(*args, **kwargs)
                    return result
                except asyncio.CancelledError:
                    status = "cancelled"
                    raise
                except Exception:
                    status = "error"
                    raise
                finally:
                    duration_ms = (time.perf_counter() - start_time) * 1000

                    # Build payload and dispatch directly to backend in background
                    payload = {
                        "agent_name": self.agent_name,
                        "agent_address": self.agent_address,
                        "func_name": target_name,
                        "status": status,
                        "response_time_ms": round(duration_ms, 2),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                    self._dispatch_payload(payload)

            return wrapper

        return decorator

