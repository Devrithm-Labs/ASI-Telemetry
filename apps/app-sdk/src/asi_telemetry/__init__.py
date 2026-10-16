"""
ASI Telemetry SDK
=================
Lightweight, high-performance telemetry and tracing SDK for AI agents,
LLMs, multi-agent systems, and tool monitoring.
"""

from .observ import AgentMonitor
from .asi_tracer import (
    traceable,
    instrument_gemini,
    instrument_llm_provider,
    calculate_cost,
    create_trace_context,
    get_current_trace_id,
    get_current_span_id,
    start_span,
    end_span,
    set_agent_info,
)

__version__ = "0.1.0"
__all__ = [
    "AgentMonitor",
    "traceable",
    "instrument_gemini",
    "instrument_llm_provider",
    "calculate_cost",
    "create_trace_context",
    "get_current_trace_id",
    "get_current_span_id",
    "start_span",
    "end_span",
    "set_agent_info",
]
