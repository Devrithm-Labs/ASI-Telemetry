"""
Compatibility export for ASI Tracer.
Allows `from asi_tracer import traceable, ...` or `from asi_telemetry import traceable, ...`.
"""

from asi_telemetry.asi_tracer import (
    traceable,
    instrument_gemini,
    instrument_llm_provider,
    calculate_cost,
    create_trace_context,
    get_current_trace_id,
    get_current_span_id,
    start_span,
    end_span,
    PRICE_PER_MILLION,
    DEFAULT_PRICE,
)

__all__ = [
    "traceable",
    "instrument_gemini",
    "instrument_llm_provider",
    "calculate_cost",
    "create_trace_context",
    "get_current_trace_id",
    "get_current_span_id",
    "start_span",
    "end_span",
    "PRICE_PER_MILLION",
    "DEFAULT_PRICE",
]
