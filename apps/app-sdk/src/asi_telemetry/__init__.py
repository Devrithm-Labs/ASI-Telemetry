"""
ASI Telemetry SDK
=================
Lightweight, high-performance telemetry and distributed tracing SDK for AI agents,
LLMs, multi-agent systems, and tool monitoring.
"""

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
    current_span,
    spans_in_trace,
    LAST_TRACE,
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
    "spans_in_trace",
    "LAST_TRACE",
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
