"""
Asynchronous, non-blocking telemetry transport module.
Dispatches metrics and trace spans to the ASI Telemetry backend with fail-safe error suppression.
"""

import json
import os
import threading
import urllib.request
from typing import Any, Dict, Optional

DEFAULT_METRICS_URL = "http://127.0.0.1:8080/api/metrics"
DEFAULT_TRACES_URL = "http://127.0.0.1:8080/api/llm/traces"


def get_metrics_endpoint() -> str:
    """Returns the configured endpoint for agent tool metrics."""
    return os.getenv("TELEMETRY_METRICS_URL") or os.getenv("TELEMETRY_BACKEND_URL", DEFAULT_METRICS_URL)


def get_traces_endpoint() -> str:
    """Returns the configured endpoint for LLM and workflow traces."""
    base_backend = os.getenv("TELEMETRY_BACKEND_URL")
    if base_backend and "/api/metrics" in base_backend:
        return base_backend.replace("/api/metrics", "/api/llm/traces")
    return os.getenv("TELEMETRY_TRACES_URL") or (base_backend if base_backend and "/api/" in base_backend else DEFAULT_TRACES_URL)


def _post_json_background(url: str, payload: Dict[str, Any], timeout: float = 2.0) -> None:
    """Dispatches a JSON payload via an ephemeral daemon thread to avoid blocking."""
    def _worker():
        try:
            data = json.dumps(payload, default=str).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=timeout):
                pass
        except Exception:
            # Telemetry backend offline or unreachable; silently continue
            pass

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()


def send_metric_async(payload: Dict[str, Any], endpoint: Optional[str] = None) -> None:
    """Dispatches a metric event payload asynchronously."""
    url = endpoint or get_metrics_endpoint()
    _post_json_background(url, payload)


def send_span_async(payload: Dict[str, Any], endpoint: Optional[str] = None) -> None:
    """Dispatches a trace span payload asynchronously."""
    url = endpoint or get_traces_endpoint()
    _post_json_background(url, payload)
