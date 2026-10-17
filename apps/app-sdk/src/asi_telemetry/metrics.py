"""
Metrics tracking and runtime performance monitoring for AI agents and tools.
"""

import asyncio
import os
import time
from datetime import datetime, timezone
from functools import wraps
from typing import Any, Callable, Optional, Set

from .transport import send_metric_async


class MetricsTracker:
    """
    Real-time Agent and Tool execution metrics tracker.
    Monitors execution latency, success/failure counts, and SLA metrics,
    dispatching telemetry to the backend asynchronously.
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

                    # 2. Asynchronously dispatch metrics to backend
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
                    send_metric_async(payload, endpoint=self.backend_url)

            return wrapper

        if actual_func is not None:
            return decorator(actual_func)
        return decorator

    def print_metrics(
        self,
        response_time: float,
        func_name: Optional[str] = None,
        agent: Optional[str] = None,
    ) -> None:
        """Outputs formatted real-time metrics summary to the terminal."""
        success_rate = (self.success / self.requests * 100) if self.requests > 0 else 100.0
        failure_rate = (self.errors / self.requests * 100) if self.requests > 0 else 0.0

        header = "========== ASI AGENT METRICS =========="
        footer = "=" * len(header)

        print(f"\n{header}")
        if agent:
            print(f"Agent         : {agent}")
        if func_name:
            print(f"Function      : {func_name}")
        print(f"Requests      : {self.requests}")
        print(f"Success       : {self.success}")
        print(f"Errors        : {self.errors}")
        print(f"Success Rate  : {success_rate:.2f}%")
        print(f"Failure Rate  : {failure_rate:.2f}%")
        print(f"Duration      : {response_time:.2f} ms")
        print(f"{footer}\n")

    async def send_to_backend(
        self,
        response_time_ms: float,
        status: str,
        func_name: str,
        agent_name: Optional[str] = None,
    ) -> None:
        """Backward-compatible async helper for dispatching metrics."""
        payload = {
            "agent_name": agent_name or self.agent_name,
            "agent_address": self.agent_address,
            "agent_handle": self.agent_handle,
            "func_name": func_name,
            "status": status,
            "response_time_ms": round(response_time_ms, 2),
            "latency_ms": round(response_time_ms, 2),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        send_metric_async(payload, endpoint=self.backend_url)


# Backward compatibility alias
AgentMonitor = MetricsTracker
