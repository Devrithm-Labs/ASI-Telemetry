"""
Distributed tracing engine and context propagation for AI agents and LLM pipelines.
"""

import functools
import inspect
import json
import os
import time
import uuid
from contextvars import ContextVar
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Tuple

import threading
import urllib.request
from .instrumentation import save_token_usage


def _send_trace_async(payload: Dict[str, Any]) -> None:
    """Dispatches trace span directly to the backend asynchronously."""
    def _worker():
        try:
            backend_url = os.getenv("TELEMETRY_TRACES_URL") or os.getenv(
                "TELEMETRY_BACKEND_URL", "http://127.0.0.1:8080/api/llm/traces"
            )
            if "/api/metrics" in backend_url:
                backend_url = backend_url.replace("/api/metrics", "/api/llm/traces")
            data = json.dumps(payload, default=str).encode("utf-8")
            req = urllib.request.Request(
                backend_url,
                data=data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=2.0):
                pass
        except Exception:
            pass

    threading.Thread(target=_worker, daemon=True).start()

# Process-level default agent identity
_CURRENT_AGENT_INFO: Dict[str, Optional[str]] = {
    "agent_name": os.getenv("AGENT_NAME", "assistant"),
    "agent_address": os.getenv("AGENT_ADDRESS", None),
    "agent_handle": os.getenv("AGENT_HANDLE", None),
}


def set_agent_info(
    agent_name: Optional[str] = None,
    agent_address: Optional[str] = None,
    agent_handle: Optional[str] = None,
) -> None:
    """Sets process-level default agent credentials attached to all traces."""
    if agent_name:
        _CURRENT_AGENT_INFO["agent_name"] = agent_name
    if agent_address:
        _CURRENT_AGENT_INFO["agent_address"] = agent_address
    if agent_handle:
        _CURRENT_AGENT_INFO["agent_handle"] = agent_handle


def get_agent_info() -> Dict[str, Optional[str]]:
    """Returns current process-level agent identity dictionary."""
    return dict(_CURRENT_AGENT_INFO)


# Execution Context Variables
current_span: ContextVar[Optional[Dict[str, Any]]] = ContextVar("current_span", default=None)
spans_in_trace: ContextVar[Optional[List[Dict[str, Any]]]] = ContextVar("spans_in_trace", default=None)

# Cache of most recent completed top-level trace
LAST_TRACE: Optional[Dict[str, Any]] = None


def get_current_trace_id() -> Optional[str]:
    """Returns the trace_id of the active span context, or None if outside a trace."""
    span = current_span.get()
    return span["trace_id"] if span else None


def get_current_span_id() -> Optional[str]:
    """Returns the span_id of the active span context, or None if outside a trace."""
    span = current_span.get()
    return span.get("span_id") or span.get("id") if span else None


def create_trace_context() -> Dict[str, Optional[str]]:
    """
    Generates a distributed trace context dictionary to propagate across inter-agent messages.
    Returns: {"trace_id": ..., "parent_id": ...}
    """
    span = current_span.get()
    if span:
        return {
            "trace_id": span["trace_id"],
            "parent_id": span.get("span_id") or span.get("id"),
        }
    return {
        "trace_id": str(uuid.uuid4()),
        "parent_id": None,
    }


def start_span(
    function_name: str,
    run_type: str,
    metadata: Optional[Dict[str, Any]],
    args: tuple,
    kwargs: dict,
    agent_address: Optional[str] = None,
    agent_handle: Optional[str] = None,
) -> Tuple[Dict[str, Any], Any, Any, bool]:
    """Initializes a span, establishes parent-child hierarchy, and binds context variables."""
    parent_span = current_span.get()

    # Detect distributed trace headers passed via kwargs or metadata
    explicit_trace_id = None
    explicit_parent_id = None
    if isinstance(kwargs, dict):
        explicit_trace_id = kwargs.get("trace_id")
        explicit_parent_id = kwargs.get("parent_id") or kwargs.get("parent_span_id")
        if not explicit_trace_id and "context" in kwargs and isinstance(kwargs["context"], dict):
            explicit_trace_id = kwargs["context"].get("trace_id")
            explicit_parent_id = kwargs["context"].get("span_id") or kwargs["context"].get("parent_id")

    if not explicit_trace_id and metadata:
        explicit_trace_id = metadata.get("trace_id")
        explicit_parent_id = metadata.get("parent_id")

    is_top_level = (parent_span is None) and (not explicit_trace_id)

    if explicit_trace_id:
        trace_id = explicit_trace_id
        parent_id = explicit_parent_id or (parent_span.get("span_id") if parent_span else None)
    elif not is_top_level and parent_span:
        trace_id = parent_span["trace_id"]
        parent_id = parent_span.get("span_id") or parent_span.get("id")
    else:
        trace_id = str(uuid.uuid4())
        parent_id = None

    meta_dict = dict(metadata or {})
    resolved_addr = (
        agent_address
        or meta_dict.get("agent_address")
        or (parent_span.get("agent_address") if parent_span else None)
        or _CURRENT_AGENT_INFO.get("agent_address")
    )
    resolved_hdl = (
        agent_handle
        or meta_dict.get("agent_handle")
        or (parent_span.get("agent_handle") if parent_span else None)
        or _CURRENT_AGENT_INFO.get("agent_handle")
    )

    span_id = str(uuid.uuid4())
    span: Dict[str, Any] = {
        "id": span_id,
        "span_id": span_id,
        "trace_id": trace_id,
        "parent_id": parent_id,
        "name": function_name,
        "run_type": run_type,
        "start_time": time.time(),
        "start_clock": datetime.now().strftime("%H:%M:%S.%f")[:-3],
        "inputs": kwargs if kwargs else (args[0] if len(args) == 1 else args),
        "outputs": None,
        "error": None,
        "tokens": {"input": 0, "output": 0, "total": 0},
        "cost": 0.0,
        "agent_address": resolved_addr,
        "agent_handle": resolved_hdl,
        "metadata": meta_dict,
    }

    span_reset_token = current_span.set(span)

    if is_top_level:
        trace_reset_token = spans_in_trace.set([span])
    else:
        trace_reset_token = None
        all_spans = spans_in_trace.get()
        if all_spans is not None:
            all_spans.append(span)

    return span, span_reset_token, trace_reset_token, is_top_level


def end_span(
    span: Dict[str, Any],
    span_reset_token: Any,
    trace_reset_token: Any,
    is_top_level: bool,
    result: Any = None,
    error: Optional[Exception] = None,
) -> None:
    """Closes the span, computes duration and tokens, and dispatches trace telemetry."""
    global LAST_TRACE

    try:
        span["end_time"] = time.time()
        span["duration_ms"] = round((span["end_time"] - span["start_time"]) * 1000, 2)

        if error is not None:
            span["error"] = str(error)
        else:
            span["outputs"] = result
            save_token_usage(result, span)
    finally:
        current_span.reset(span_reset_token)

        # Build schema-compliant payload for backend ingestion
        in_val = span.get("inputs")
        input_str = json.dumps(in_val, default=str) if isinstance(in_val, (dict, list)) else str(in_val or "")
        out_val = span.get("outputs")
        output_str = json.dumps(out_val, default=str) if isinstance(out_val, (dict, list)) else str(out_val or "")

        meta_dict = dict(span.get("metadata") or {})
        addr = (
            span.get("agent_address")
            or meta_dict.get("agent_address")
            or _CURRENT_AGENT_INFO.get("agent_address")
            or "agent1qfzll7xq6t8d9rx5n3cnql32me650q2sakexpc979u0luhn702jh2af5mds"
        )
        hdl = (
            span.get("agent_handle")
            or meta_dict.get("agent_handle")
            or _CURRENT_AGENT_INFO.get("agent_handle")
            or "@weather-agent-13"
        )
        meta_dict["agent_address"] = addr
        meta_dict["agent_handle"] = hdl

        current_id = span.get("id") or span.get("span_id") or str(uuid.uuid4())
        span_payload = {
            "id": current_id,
            "trace_id": span.get("trace_id") or str(uuid.uuid4()),
            "span_id": current_id,
            "parent_id": span.get("parent_id"),
            "name": span.get("name") or "agent_execution",
            "run_type": span.get("run_type", "agent"),
            "status": "error" if span.get("error") else "success",
            "model": span.get("metadata", {}).get("model", "gemini-3.8-flash"),
            "input": input_str,
            "output": output_str,
            "error": str(span.get("error")) if span.get("error") else None,
            "latency_ms": span.get("duration_ms", 0.0),
            "prompt_tokens": span.get("tokens", {}).get("input", 0),
            "completion_tokens": span.get("tokens", {}).get("output", 0),
            "total_tokens": span.get("tokens", {}).get("total", 0),
            "cost_usd": span.get("cost", 0.0),
            "agent_address": addr,
            "agent_handle": hdl,
            "metadata": meta_dict,
        }

        # Asynchronously send individual span with shared trace_id
        _send_trace_async(span_payload)

        # If root span finished, aggregate session metrics
        if is_top_level and trace_reset_token:
            all_spans = spans_in_trace.get() or []
            spans_in_trace.reset(trace_reset_token)

            LAST_TRACE = {
                "trace_id": span.get("trace_id"),
                "name": span.get("name"),
                "total_latency_ms": span.get("duration_ms", 0.0),
                "total_tokens": sum(s.get("tokens", {}).get("total", 0) for s in all_spans),
                "total_cost_usd": round(sum(s.get("cost", 0.0) for s in all_spans), 6),
                "spans": all_spans,
            }
            print(json.dumps(LAST_TRACE, indent=2, default=str))


def traceable(
    name: Optional[str] = None,
    run_type: str = "chain",
    metadata: Optional[Dict[str, Any]] = None,
    agent_address: Optional[str] = None,
    agent_handle: Optional[str] = None,
) -> Callable:
    """
    Distributed tracing decorator: tracks execution duration, inputs, outputs,
    model tokens, and financial cost for synchronous and asynchronous functions.

    Usage:
        @traceable(name="execute_tool", run_type="tool")
        def my_tool(): ...

        @traceable(name="agent_workflow", run_type="chain")
        async def my_flow(): ...
    """
    def decorator(function: Callable) -> Callable:
        function_name = name or function.__name__

        if inspect.iscoroutinefunction(function):
            @functools.wraps(function)
            async def async_wrapper(*args, **kwargs):
                span_info = start_span(
                    function_name,
                    run_type,
                    metadata,
                    args,
                    kwargs,
                    agent_address=agent_address,
                    agent_handle=agent_handle,
                )
                result, error = None, None
                try:
                    result = await function(*args, **kwargs)
                    return result
                except Exception as e:
                    error = e
                    raise
                finally:
                    end_span(*span_info, result=result, error=error)

            return async_wrapper

        @functools.wraps(function)
        def sync_wrapper(*args, **kwargs):
            span_info = start_span(
                function_name,
                run_type,
                metadata,
                args,
                kwargs,
                agent_address=agent_address,
                agent_handle=agent_handle,
            )
            result, error = None, None
            try:
                result = function(*args, **kwargs)
                return result
            except Exception as e:
                error = e
                raise
            finally:
                end_span(*span_info, result=result, error=error)

        return sync_wrapper

    return decorator
