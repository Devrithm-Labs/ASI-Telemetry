"""
ASI Telemetry SDK
=================
Lightweight, high-performance telemetry and distributed tracing SDK for AI agents,
LLMs, multi-agent systems, and tool monitoring.
"""

import os
from typing import Optional

from .metrics import MetricsTracker
from .tracer import (
    traceable,
    create_trace_context,
    get_current_trace_id,
    get_current_span_id,
    start_span,
    end_span,
    set_agent_info,
    get_agent_info,
    set_api_key,
    get_api_key,
    current_span,
)


def init(api_key: Optional[str] = None, backend_url: Optional[str] = None) -> None:
    """Initialize ASI Telemetry SDK with API Key and optional custom backend URL."""
    if api_key:
        set_api_key(api_key)
        os.environ["ASI_API_KEY"] = api_key
    if backend_url:
        os.environ["TELEMETRY_BACKEND_URL"] = backend_url
        os.environ["TELEMETRY_TRACES_URL"] = (
            backend_url if "/api/llm/traces" in backend_url else f"{backend_url.rstrip('/')}/api/llm/traces"
        )
from .instrumentation import (
    instrument_gemini,
    instrument_openai,
    instrument_client,
    instrument_llm_provider,
    save_token_usage,
)
from .models import (
    calculate_cost,
    PRICE_PER_MILLION,
    DEFAULT_PRICE,
)

__version__ = "0.2.0"

__all__ = [
    # Setup & Auth
    "init",
    "set_api_key",
    "get_api_key",
    # Metrics
    "MetricsTracker",
    # Tracing
    "traceable",
    "create_trace_context",
    "get_current_trace_id",
    "get_current_span_id",
    "start_span",
    "end_span",
    "set_agent_info",
    "get_agent_info",
    "current_span",
    # Instrumentation
    "instrument_gemini",
    "instrument_openai",
    "instrument_client",
    "instrument_llm_provider",
    "save_token_usage",
    # Models & Cost
    "calculate_cost",
    "PRICE_PER_MILLION",
    "DEFAULT_PRICE",
]
