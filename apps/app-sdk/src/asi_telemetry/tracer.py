import functools
import inspect
import json
import os
import threading
import time
import urllib.request
import uuid
from contextvars import ContextVar
from typing import Any, Callable, Dict, Optional, Tuple

from .instrumentation import save_token_usage

sdk_config: Dict[str, Any] = {
    "api_key": os.getenv("ASI_API_KEY") or os.getenv("ASI_TELEMETRY_API_KEY") or os.getenv("TELEMETRY_API_KEY"),
}

current_agent: Dict[str, Optional[str]] = {
    "agent_name": os.getenv("AGENT_NAME", "assistant"),
    "agent_address": os.getenv("AGENT_ADDRESS", None),
}
CURRENT_AGENT_INFO = current_agent

active_span: ContextVar[Optional[Dict[str, Any]]] = ContextVar("active_span", default=None)
current_span = active_span


def set_api_key(api_key: str) -> None:
    sdk_config["api_key"] = api_key
    os.environ["ASI_API_KEY"] = api_key


def get_api_key() -> Optional[str]:
    return sdk_config.get("api_key") or os.getenv("ASI_API_KEY") or os.getenv("ASI_TELEMETRY_API_KEY") or os.getenv("TELEMETRY_API_KEY")


def set_agent_info(agent_name: Optional[str] = None, agent_address: Optional[str] = None) -> None:
    if agent_name:
        current_agent["agent_name"] = agent_name
    if agent_address:
        current_agent["agent_address"] = agent_address


def get_agent_info() -> Dict[str, Optional[str]]:
    return dict(current_agent)


def get_current_trace_id() -> Optional[str]:
    span = active_span.get()
    return span["trace_id"] if span else None


def get_current_span_id() -> Optional[str]:
    span = active_span.get()
    return span["span_id"] if span else None


def create_trace_context() -> Dict[str, Optional[str]]:
    span = active_span.get()
    if span:
        return {"trace_id": span["trace_id"], "parent_id": span["span_id"]}
    return {"trace_id": str(uuid.uuid4()), "parent_id": None}


def _extract_trace_context(args: tuple, kwargs: dict, metadata: Optional[Dict[str, Any]]) -> Tuple[Optional[str], Optional[str]]:
    candidates = [metadata] + list(args) + list(kwargs.values())
    for item in candidates:
        ctx = getattr(item, "trace_context", None) or (item.get("trace_context") if isinstance(item, dict) else item)
        if isinstance(ctx, dict) and ctx.get("trace_id"):
            return ctx["trace_id"], ctx.get("parent_id") or ctx.get("span_id")
    return None, None


def _dispatch_span(payload: Dict[str, Any]) -> None:
    def _worker():
        try:
            url = os.getenv("TELEMETRY_TRACES_URL") or os.getenv("TELEMETRY_BACKEND_URL", "http://127.0.0.1:8080/api/llm/traces")
            if "/api/metrics" in url:
                url = url.replace("/api/metrics", "/api/llm/traces")

            api_key = get_api_key()
            headers = {"Content-Type": "application/json"}
            if api_key:
                headers["x-api-key"] = api_key
                headers["Authorization"] = f"Bearer {api_key}"
                payload["api_key"] = api_key

            req = urllib.request.Request(
                url,
                data=json.dumps(payload, default=str).encode("utf-8"),
                headers=headers,
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=2.0):
                pass
        except Exception:
            pass

    threading.Thread(target=_worker, daemon=True).start()


def start_span(
    function_name: str,
    run_type: str,
    metadata: Optional[Dict[str, Any]],
    args: tuple,
    kwargs: dict,
    agent_address: Optional[str] = None,
) -> Tuple[Dict[str, Any], Any]:
    parent_span = active_span.get()
    incoming_trace_id, incoming_parent_id = _extract_trace_context(args, kwargs, metadata)

    if incoming_trace_id:
        trace_id = incoming_trace_id
        parent_id = incoming_parent_id or (parent_span["span_id"] if parent_span else None)
    elif parent_span:
        trace_id = parent_span["trace_id"]
        parent_id = parent_span["span_id"]
    else:
        trace_id = str(uuid.uuid4())
        parent_id = None

    is_parent_root = (parent_span is None)
    agent_name = current_agent.get("agent_name", "assistant")
    meta = dict(metadata or {})
    meta["is_agent_root"] = is_parent_root
    meta["agent_name"] = agent_name

    addr = agent_address or meta.get("agent_address") or (parent_span.get("agent_address") if parent_span else None) or current_agent.get("agent_address")
    span_id = str(uuid.uuid4())
    inputs = kwargs if kwargs else (args[0] if len(args) == 1 else args)

    span = {
        "id": span_id,
        "span_id": span_id,
        "trace_id": trace_id,
        "parent_id": parent_id,
        "name": function_name,
        "run_type": run_type,
        "start_time": time.time(),
        "inputs": inputs,
        "outputs": None,
        "error": None,
        "tokens": {"input": 0, "output": 0, "total": 0},
        "cost": 0.0,
        "agent_name": agent_name,
        "is_agent_root": is_parent_root,
        "agent_address": addr,
        "metadata": meta,
    }

    reset_token = active_span.set(span)
    return span, reset_token


def end_span(
    span: Dict[str, Any],
    reset_token: Any,
    result: Any = None,
    error: Optional[Exception] = None,
) -> None:
    try:
        span["end_time"] = time.time()
        span["duration_ms"] = round((span["end_time"] - span["start_time"]) * 1000, 2)
        if error is not None:
            span["error"] = str(error)
        else:
            span["outputs"] = result
            save_token_usage(result, span)
    finally:
        active_span.reset(reset_token)

        in_val = span.get("inputs")
        out_val = span.get("outputs")
        meta = dict(span.get("metadata") or {})
        addr = span.get("agent_address")
        if addr:
            meta["agent_address"] = addr
        meta["agent_name"] = span.get("agent_name", "assistant")
        meta["is_agent_root"] = span.get("is_agent_root", False)

        payload = {
            "id": span["span_id"],
            "trace_id": span["trace_id"],
            "span_id": span["span_id"],
            "parent_id": span.get("parent_id"),
            "name": span.get("name") or "agent_execution",
            "run_type": span.get("run_type", "agent"),
            "status": "error" if span.get("error") else "success",
            "model": meta.get("model", "agent-tool"),
            "input": json.dumps(in_val, default=str) if isinstance(in_val, (dict, list)) else str(in_val or ""),
            "output": json.dumps(out_val, default=str) if isinstance(out_val, (dict, list)) else str(out_val or ""),
            "error": str(span["error"]) if span.get("error") else None,
            "latency_ms": span.get("duration_ms", 0.0),
            "prompt_tokens": span.get("tokens", {}).get("input", 0),
            "completion_tokens": span.get("tokens", {}).get("output", 0),
            "total_tokens": span.get("tokens", {}).get("total", 0),
            "cost_usd": span.get("cost", 0.0),
            "agent_address": addr,
            "agent_name": meta["agent_name"],
            "is_agent_root": meta["is_agent_root"],
            "metadata": meta,
        }
        _dispatch_span(payload)


def traceable(
    name: Optional[Any] = None,
    run_type: str = "chain",
    metadata: Optional[Dict[str, Any]] = None,
    agent_address: Optional[str] = None,
) -> Callable:
    def decorator(func: Callable) -> Callable:
        fn_name = (name if isinstance(name, str) else None) or func.__name__

        if inspect.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                span, token = start_span(fn_name, run_type, metadata, args, kwargs, agent_address)
                result, error = None, None
                try:
                    result = await func(*args, **kwargs)
                    return result
                except Exception as e:
                    error = e
                    raise
                finally:
                    end_span(span, token, result=result, error=error)
            return async_wrapper

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            span, token = start_span(fn_name, run_type, metadata, args, kwargs, agent_address)
            result, error = None, None
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                error = e
                raise
            finally:
                end_span(span, token, result=result, error=error)
        return sync_wrapper

    if callable(name):
        func = name
        name = None
        return decorator(func)

    return decorator
