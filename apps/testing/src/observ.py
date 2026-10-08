import asyncio
import os
import time
from datetime import datetime, timezone
from functools import wraps
import httpx
import psutil


class AgentMonitor:
    def __init__(self, backend_url: str = None):
        # Backend endpoint to receive metrics
        self.backend_url = backend_url or os.getenv(
            "TELEMETRY_BACKEND_URL", "http://127.0.0.1:8080/api/metrics"
        )
        self.requests = 0
        self.success = 0
        self.errors = 0

    def track(self):
        """
        Decorator to track agent execution:
        Measures execution time, CPU, and memory, then sends data to the backend.
        """
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # 1. Increment total requests
                self.requests += 1

                # 2. Record start time & initial system resources
                start_time = time.perf_counter()
                cpu_before = psutil.cpu_percent()
                mem_before = psutil.virtual_memory().percent

                status = "success"
                try:
                    # 3. Run the agent function
                    result = await func(*args, **kwargs)
                    self.success += 1
                    return result
                except Exception:
                    self.errors += 1
                    status = "error"
                    raise
                finally:
                    # 4. Record end time & final system resources
                    latency_ms = (time.perf_counter() - start_time) * 1000
                    cpu_after = psutil.cpu_percent()
                    mem_after = psutil.virtual_memory().percent

                    # 5. Print formatted CLI stats
                    self.print_metrics(latency_ms, cpu_before, cpu_after, mem_before, mem_after)

                    # 6. Send telemetry to backend asynchronously in the background
                    asyncio.create_task(
                        self.send_to_backend(
                            latency_ms=latency_ms,
                            cpu_before=cpu_before,
                            cpu_after=cpu_after,
                            mem_before=mem_before,
                            mem_after=mem_after,
                            status=status,
                            func_name=func.__name__,
                        )
                    )

            return wrapper
        return decorator

    async def send_to_backend(
        self,
        latency_ms: float,
        cpu_before: float,
        cpu_after: float,
        mem_before: float,
        mem_after: float,
        status: str,
        func_name: str,
    ):
        """Sends the metric record to the FastAPI backend."""
        payload = {
            "agent_name": "assistant",
            "func_name": func_name,
            "status": status,
            "latency_ms": round(latency_ms, 2),
            "cpu_before": round(cpu_before, 2),
            "cpu_after": round(cpu_after, 2),
            "memory_before": round(mem_before, 2),
            "memory_after": round(mem_after, 2),
            "request_count": self.requests,
            "success_count": self.success,
            "error_count": self.errors,
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
        latency: float,
        cpu_before: float,
        cpu_after: float,
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
        print(f"Latency       : {latency:.2f} ms")
        print(f"CPU Before    : {cpu_before}%")
        print(f"CPU After     : {cpu_after}%")
        print(f"Memory Before : {mem_before}%")
        print(f"Memory After  : {mem_after}%")
        print("=================================\n")
