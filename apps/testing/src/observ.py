import asyncio
import os
import time
import httpx
import psutil

from functools import wraps

from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import (
    ConsoleMetricExporter,
    PeriodicExportingMetricReader,
)

# -------------------------
# OpenTelemetry Setup
# -------------------------

reader = PeriodicExportingMetricReader(
    ConsoleMetricExporter(),
    export_interval_millis=5000,
)

provider = MeterProvider(
    metric_readers=[reader]
)

metrics.set_meter_provider(provider)

meter = metrics.get_meter(
    "observagent"
)


class AgentMonitor:

    def __init__(self, backend_url: str = None):
        self.backend_url = backend_url or os.getenv(
            "TELEMETRY_BACKEND_URL", "http://127.0.0.1:8080/api/metrics"
        )

        # In-memory stats
        self.requests = 0
        self.success = 0
        self.errors = 0

        # OpenTelemetry Metrics
        self.request_counter = meter.create_counter(
            "agent_requests_total"
        )

        self.success_counter = meter.create_counter(
            "agent_success_total"
        )

        self.error_counter = meter.create_counter(
            "agent_errors_total"
        )

        self.latency_histogram = meter.create_histogram(
            "agent_latency_ms"
        )

        self.cpu_histogram = meter.create_histogram(
            "agent_cpu_percent"
        )

        self.memory_histogram = meter.create_histogram(
            "agent_memory_percent"
        )

    def track(self):

        def decorator(func):

            @wraps(func)
            async def wrapper(*args, **kwargs):

                # -------------------------
                # Count Request
                # -------------------------

                self.requests += 1

                self.request_counter.add(1)

                # -------------------------
                # Start Timer
                # -------------------------

                start_time = time.perf_counter()

                # -------------------------
                # Measure Resources
                # -------------------------

                cpu_before = psutil.cpu_percent()

                memory_before = (
                    psutil.virtual_memory().percent
                )

                status = "success"
                try:

                    # -------------------------
                    # Execute Agent Logic
                    # -------------------------

                    result = await func(
                        *args,
                        **kwargs
                    )

                    # -------------------------
                    # Success
                    # -------------------------

                    self.success += 1

                    self.success_counter.add(1)

                    return result

                except Exception:

                    # -------------------------
                    # Error
                    # -------------------------

                    self.errors += 1

                    self.error_counter.add(1)
                    status = "error"

                    raise

                finally:

                    # -------------------------
                    # Stop Timer
                    # -------------------------

                    latency = (
                        time.perf_counter()
                        - start_time
                    ) * 1000

                    # -------------------------
                    # Measure Resources Again
                    # -------------------------

                    cpu_after = (
                        psutil.cpu_percent()
                    )

                    memory_after = (
                        psutil.virtual_memory().percent
                    )

                    # -------------------------
                    # Record Metrics
                    # -------------------------

                    self.latency_histogram.record(
                        latency
                    )

                    self.cpu_histogram.record(
                        cpu_after
                    )

                    self.memory_histogram.record(
                        memory_after
                    )

                    # -------------------------
                    # Print Dashboard
                    # -------------------------

                    self.print_metrics(
                        latency,
                        cpu_before,
                        cpu_after,
                        memory_before,
                        memory_after
                    )

                    # -------------------------
                    # Export to FastAPI Backend
                    # -------------------------

                    agent_name = "assistant"
                    if args and hasattr(args[0], "name"):
                        agent_name = getattr(args[0], "name", "assistant")

                    asyncio.create_task(
                        self.export_to_backend(
                            latency=latency,
                            cpu_before=cpu_before,
                            cpu_after=cpu_after,
                            memory_before=memory_before,
                            memory_after=memory_after,
                            status=status,
                            func_name=func.__name__,
                            agent_name=agent_name,
                        )
                    )

            return wrapper

        return decorator

    async def export_to_backend(
        self,
        latency: float,
        cpu_before: float,
        cpu_after: float,
        memory_before: float,
        memory_after: float,
        status: str = "success",
        func_name: str = "handle_message",
        agent_name: str = "assistant",
    ):
        payload = {
            "agent_name": agent_name,
            "request_count": self.requests,
            "success_count": self.success,
            "error_count": self.errors,
            "latency_ms": round(latency, 2),
            "cpu_before": round(cpu_before, 2),
            "cpu_after": round(cpu_after, 2),
            "memory_before": round(memory_before, 2),
            "memory_after": round(memory_after, 2),
            "status": status,
            "func_name": func_name,
        }
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                await client.post(self.backend_url, json=payload)
        except Exception:
            # Backend not reachable; fail silently without disrupting agent
            pass

    def print_metrics(
        self,
        latency,
        cpu_before,
        cpu_after,
        memory_before,
        memory_after,
    ):

        success_rate = (
            self.success / self.requests
        ) * 100

        failure_rate = (
            self.errors / self.requests
        ) * 100

        print("\n========== OBSERVAGENT ==========")

        print(
            f"Requests      : {self.requests}"
        )

        print(
            f"Success       : {self.success}"
        )

        print(
            f"Errors        : {self.errors}"
        )

        print(
            f"Success Rate  : {success_rate:.2f}%"
        )

        print(
            f"Failure Rate  : {failure_rate:.2f}%"
        )

        print(
            f"Latency       : {latency:.2f} ms"
        )

        print(
            f"CPU Before    : {cpu_before}%"
        )

        print(
            f"CPU After     : {cpu_after}%"
        )

        print(
            f"Memory Before : {memory_before}%"
        )

        print(
            f"Memory After  : {memory_after}%"
        )

        print("=================================\n")
