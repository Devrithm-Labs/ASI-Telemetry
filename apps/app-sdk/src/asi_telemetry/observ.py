import asyncio
import os
import time
from datetime import datetime, timezone
from functools import wraps
from typing import Any, Optional
import httpx


class AgentMonitor:
    """
    Real-time Agent and Tool execution monitor.
    Tracks latency and execution status, dispatching telemetry
    to the ASI Telemetry backend and ClickHouse without heavy host CPU/memory overhead.
    """
    def __init__(
        self,
        agent_name: str = "assistant",
        agent_address: Optional[str] = None,
        agent_handle: Optional[str] = None,
        backend_url: str = None,
    ):
        self.agent_name = agent_name
        self.agent_address = agent_address
        self.agent_handle = agent_handle

        try:
            from .asi_tracer import set_agent_info
            set_agent_info(
                agent_name=agent_name,
                agent_address=agent_address,
                agent_handle=agent_handle,
            )
        except Exception:
            pass

        # Backend endpoint to receive metrics
        self.backend_url = backend_url or os.getenv(
            "TELEMETRY_BACKEND_URL", "http://127.0.0.1:8080/api/metrics"
        )
        self.requests = 0
        self.success = 0
        self.errors = 0

        # Keep references to background tasks so they aren't garbage-collected
        self._tasks = set()

    def track(self, agentname: Any = None, agent_name: Optional[str] = None):
        """
        Decorator to track agent execution:
        Measures response time and execution status, then dispatches telemetry.
        Supports:
          @monitor.track(agentname="weather")
          @monitor.track("weather")
          @monitor.track()
          @monitor.track
        """
        actual_func = None
        if callable(agentname):
            actual_func = agentname
            target_agent = self.agent_name
        else:
            target_agent = agentname or agent_name or self.agent_name

        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # 1. Increment total requests
                self.requests += 1

                # 2. Record start time
                start_time = time.perf_counter()

                status = "success"
                try:
                    # 3. Run the agent function
                    result = await func(*args, **kwargs)
                    self.success += 1
                    return result
                except asyncio.CancelledError:
                    # CancelledError is not an Exception subclass, so handle it separately
                    status = "cancelled"
                    raise
                except Exception:
                    self.errors += 1
                    status = "error"
                    raise
                finally:
                    # 4. Record execution duration
                    response_time_ms = (time.perf_counter() - start_time) * 1000

                    # 5. Print formatted CLI stats
                    self.print_metrics(response_time_ms)

                    # 6. Send telemetry to backend in the background
                    task = asyncio.create_task(
                        self.send_to_backend(
                            agent_name=target_agent,
                            response_time_ms=response_time_ms,
                            status=status,
                            func_name=func.__name__,
                        )
                    )
                    self._tasks.add(task)
                    task.add_done_callback(self._tasks.discard)

            return wrapper

        if actual_func is not None:
            return decorator(actual_func)
        return decorator

    async def send_to_backend(
        self,
        response_time_ms: float,
        status: str,
        func_name: str,
        agent_name: Optional[str] = None,
    ):
        """Sends the metric record to the FastAPI backend."""
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
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                await client.post(self.backend_url, json=payload)
        except Exception:
            # If backend is not running, fail silently so agent doesn't crash
            pass

    def print_metrics(self, response_time: float):
        """Displays clear metrics in the terminal."""
        success_rate = (self.success / self.requests * 100) if self.requests > 0 else 100.0
        failure_rate = (self.errors / self.requests * 100) if self.requests > 0 else 0.0

        print("\n========== OBSERVAGENT ==========")
        print(f"Requests      : {self.requests}")
        print(f"Success       : {self.success}")
        print(f"Errors        : {self.errors}")
        print(f"Success Rate  : {success_rate:.2f}%")
        print(f"Failure Rate  : {failure_rate:.2f}%")
        print(f"Response Time : {response_time:.2f} ms")
        print("=================================\n")
