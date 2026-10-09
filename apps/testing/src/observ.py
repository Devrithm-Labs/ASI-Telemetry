import asyncio
import os
import time
from datetime import datetime, timezone
from functools import wraps
from typing import Any, Optional
import httpx
import psutil


class AgentMonitor:
    def __init__(self, agent_name: str = "assistant", backend_url: str = None):
        self.agent_name = agent_name
        # Backend endpoint to receive metrics
        self.backend_url = backend_url or os.getenv(
            "TELEMETRY_BACKEND_URL", "http://127.0.0.1:8080/api/metrics"
        )
        self.requests = 0
        self.success = 0
        self.errors = 0

        # Measure THIS process only (not the whole machine)
        self._proc = psutil.Process()
        # Keep references to background tasks so they aren't garbage-collected
        self._tasks = set()

    def _cpu_seconds(self) -> float:
        t = self._proc.cpu_times()
        return t.user + t.system

    def _mem_mb(self) -> float:
        return self._proc.memory_info().rss / 1e6

    def track(self, agentname: Any = None, agent_name: Optional[str] = None):
        """
        Decorator to track agent execution:
        Measures response time, CPU time, and memory, then sends data to the backend.
        Supports:
          @monitor.track(agentname="wheater")
          @monitor.track("wheater")
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

                # 2. Record start time & initial process resources
                start_time = time.perf_counter()
                cpu_before = self._cpu_seconds()
                mem_before = self._mem_mb()

                status = "success"
                try:
                    # 3. Run the agent function
                    result = await func(*args, **kwargs)
                    self.success += 1
                    return result
                except asyncio.CancelledError:
                    # CancelledError is not an Exception subclass, so handle it
                    # separately or it would be reported as "success"
                    status = "cancelled"
                    raise
                except Exception:
                    self.errors += 1
                    status = "error"
                    raise
                finally:
                    # 4. Record end time & final process resources
                    response_time_ms = (time.perf_counter() - start_time) * 1000
                    cpu_ms = (self._cpu_seconds() - cpu_before) * 1000
                    mem_after = self._mem_mb()

                    # 5. Print formatted CLI stats
                    self.print_metrics(response_time_ms, cpu_ms, mem_before, mem_after)

                    # 6. Send telemetry to backend in the background
                    task = asyncio.create_task(
                        self.send_to_backend(
                            agent_name=target_agent,
                            response_time_ms=response_time_ms,
                            cpu_ms=cpu_ms,
                            mem_before=mem_before,
                            mem_after=mem_after,
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
        cpu_ms: float,
        mem_before: float,
        mem_after: float,
        status: str,
        func_name: str,
        agent_name: Optional[str] = None,
    ):
        """Sends the metric record to the FastAPI backend."""
        payload = {
            "agent_name": agent_name or self.agent_name,
            "func_name": func_name,
            "status": status,
            "response_time_ms": round(response_time_ms, 2),
            "latency_ms": round(response_time_ms, 2),
            "cpu_ms": round(cpu_ms, 2),
            "cpu_after": round(cpu_ms, 2),
            "memory_before_mb": round(mem_before, 2),
            "memory_after_mb": round(mem_after, 2),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                await client.post(self.backend_url, json=payload)
        except Exception:
            # If backend is not running, fail silently so agent doesn't crash
            pass

    def print_metrics(
        self,
        response_time: float,
        cpu_ms: float,
        mem_before: float,
        mem_after: float,
    ):
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
        print(f"CPU Time      : {cpu_ms:.2f} ms")
        print(f"Memory Before : {mem_before:.2f} MB")
        print(f"Memory After  : {mem_after:.2f} MB")
        print("=================================\n")