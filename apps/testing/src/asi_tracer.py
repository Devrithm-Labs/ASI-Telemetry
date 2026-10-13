import functools
import inspect
import json
<<<<<<< HEAD
import os
import threading
import time
import urllib.request
=======
import time
>>>>>>> 8394fde (Updated code Login SignUp)
import uuid
from contextvars import ContextVar
from datetime import datetime

<<<<<<< HEAD

def _send_llm_trace_async(payload):
    """Sends trace record to FastAPI/ClickHouse backend asynchronously."""
    def _worker():
        try:
            backend_url = os.getenv("TELEMETRY_BACKEND_URL", "http://127.0.0.1:8080/api/llm/traces")
            data = json.dumps(payload, default=str).encode("utf-8")
            req = urllib.request.Request(
                backend_url,
                data=data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=2.0):
                pass
        except Exception:
            pass
    threading.Thread(target=_worker, daemon=True).start()

=======
>>>>>>> 8394fde (Updated code Login SignUp)
# ---------------------------------------------------------------
# Global state
# ---------------------------------------------------------------

# The span (one traced function call) that is running right now.
current_span = ContextVar("current_span", default=None)

# All spans collected so far for the current trace (parent + children).
spans_in_trace = ContextVar("spans_in_trace", default=None)

# The finished trace of the most recent top-level call (handy for debugging).
LAST_TRACE = None

# Price in USD per 1 million tokens.
PRICE_PER_MILLION = {
    "asi1-mini": {"input": 0.10, "output": 0.40},
    "asi-mini": {"input": 0.10, "output": 0.40},
<<<<<<< HEAD

=======
>>>>>>> 8394fde (Updated code Login SignUp)
    "asi1": {"input": 0.50, "output": 1.50},
    "gemini-3.8-flash": {"input": 0.075, "output": 0.30},
    "deepseek-chat": {"input": 0.14, "output": 0.28},
}
DEFAULT_PRICE = {"input": 0.10, "output": 0.40}


# ---------------------------------------------------------------
# Cost and token helpers
# ---------------------------------------------------------------

def calculate_cost(model, input_tokens, output_tokens):
    """Return the approximate cost in USD for one LLM call."""
    model = model.replace("models/", "").lower()
    price = PRICE_PER_MILLION.get(model, DEFAULT_PRICE)

    input_cost = input_tokens * price["input"] / 1_000_000
    output_cost = output_tokens * price["output"] / 1_000_000
    return round(input_cost + output_cost, 6)


def save_token_usage(response, span, model=None):
    """Read token counts from a Gemini or OpenAI/ASI response and store them in the span."""

    # Gemini style: response.usage_metadata
    usage = getattr(response, "usage_metadata", None)
    if usage:
        input_tokens = getattr(usage, "prompt_token_count", 0) or 0
        output_tokens = getattr(usage, "candidates_token_count", 0) or 0
        total_tokens = getattr(usage, "total_token_count", 0) or (input_tokens + output_tokens)
        model = model or span["metadata"].get("model", "gemini-3.8-flash")

    else:
        # OpenAI / ASI-1 style: response.usage
        usage = getattr(response, "usage", None)
        if not usage:
            return  # not an LLM response, nothing to record
        input_tokens = getattr(usage, "prompt_tokens", 0) or 0
        output_tokens = getattr(usage, "completion_tokens", 0) or 0
        total_tokens = getattr(usage, "total_tokens", 0) or (input_tokens + output_tokens)
        model = model or getattr(response, "model", span["metadata"].get("model", "asi1-mini"))

    span["metadata"]["model"] = model
    span["tokens"] = {"input": input_tokens, "output": output_tokens, "total": total_tokens}
    span["cost"] = calculate_cost(model, input_tokens, output_tokens)


# ---------------------------------------------------------------
# Start / end a span
# ---------------------------------------------------------------

<<<<<<< HEAD
def get_current_trace_id():
    """Returns current trace_id if inside a traced context, else None."""
    span = current_span.get()
    return span["trace_id"] if span else None


def get_current_span_id():
    """Returns current span_id if inside a traced context, else None."""
    span = current_span.get()
    return span.get("span_id") or span.get("id") if span else None


def create_trace_context():
    """Generates trace context dictionary to pass in inter-agent messages."""
    span = current_span.get()
    if span:
        return {"trace_id": span["trace_id"], "parent_id": span.get("span_id") or span.get("id")}
    new_trace_id = str(uuid.uuid4())
    return {"trace_id": new_trace_id, "parent_id": None}


def start_span(function_name, run_type, metadata, args, kwargs):
    """Create a new span and make it the current one, inheriting or accepting explicit trace_id."""
    parent_span = current_span.get()

    # Check for explicit trace propagation in kwargs or context payload
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

    span_id = str(uuid.uuid4())
    span = {
        "id": span_id,
        "span_id": span_id,
        "trace_id": trace_id,
        "parent_id": parent_id,
=======
def start_span(function_name, run_type, metadata, args, kwargs):
    """Create a new span and make it the current one."""
    parent_span = current_span.get()
    is_top_level = parent_span is None

    # Children share the parent's trace id. A top-level call starts a new trace.
    trace_id = str(uuid.uuid4()) if is_top_level else parent_span["trace_id"]

    span = {
        "trace_id": trace_id,
        "span_id": str(uuid.uuid4()),
        "parent_id": None if is_top_level else parent_span["span_id"],
>>>>>>> 8394fde (Updated code Login SignUp)
        "name": function_name,
        "run_type": run_type,
        "start_time": time.time(),
        "start_clock": datetime.now().strftime("%H:%M:%S.%f")[:-3],
        "inputs": kwargs if kwargs else (args[0] if len(args) == 1 else args),
        "outputs": None,
        "error": None,
        "tokens": {"input": 0, "output": 0, "total": 0},
        "cost": 0.0,
        "metadata": dict(metadata or {}),
    }

    span_reset_token = current_span.set(span)

    if is_top_level:
<<<<<<< HEAD
        trace_reset_token = spans_in_trace.set([span])
    else:
=======
        # Start a fresh list that will collect every span of this trace.
        trace_reset_token = spans_in_trace.set([span])
    else:
        # Add this span to the list that the top-level call created.
>>>>>>> 8394fde (Updated code Login SignUp)
        trace_reset_token = None
        all_spans = spans_in_trace.get()
        if all_spans is not None:
            all_spans.append(span)

    return span, span_reset_token, trace_reset_token, is_top_level


def end_span(span, span_reset_token, trace_reset_token, is_top_level, result=None, error=None):
<<<<<<< HEAD
    """Finish the span and dispatch trace telemetry to backend."""
=======
    """Finish the span. If it was the top-level one, print the whole trace as JSON."""
>>>>>>> 8394fde (Updated code Login SignUp)
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

<<<<<<< HEAD
        # Prepare span payload to ingest into ClickHouse
        in_val = span.get("inputs")
        input_str = json.dumps(in_val, default=str) if isinstance(in_val, (dict, list)) else str(in_val or "")
        out_val = span.get("outputs")
        output_str = json.dumps(out_val, default=str) if isinstance(out_val, (dict, list)) else str(out_val or "")

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
            "metadata": span.get("metadata", {}),
        }
        # Send each individual span with the shared trace_id
        _send_llm_trace_async(span_payload)

=======
>>>>>>> 8394fde (Updated code Login SignUp)
        if is_top_level and trace_reset_token:
            all_spans = spans_in_trace.get() or []
            spans_in_trace.reset(trace_reset_token)

            LAST_TRACE = {
<<<<<<< HEAD
                "trace_id": span.get("trace_id"),
                "name": span.get("name"),
                "total_latency_ms": span.get("duration_ms", 0.0),
                "total_tokens": sum(s.get("tokens", {}).get("total", 0) for s in all_spans),
                "total_cost_usd": round(sum(s.get("cost", 0.0) for s in all_spans), 6),
=======
                "trace_id": span["trace_id"],
                "name": span["name"],
                "total_latency_ms": span["duration_ms"],
                "total_tokens": sum(s["tokens"]["total"] for s in all_spans),
                "total_cost_usd": round(sum(s["cost"] for s in all_spans), 6),
>>>>>>> 8394fde (Updated code Login SignUp)
                "spans": all_spans,
            }
            print(json.dumps(LAST_TRACE, indent=2, default=str))


<<<<<<< HEAD


=======
>>>>>>> 8394fde (Updated code Login SignUp)
# ---------------------------------------------------------------
# The decorator
# ---------------------------------------------------------------

def traceable(name=None, run_type="chain", metadata=None):
    """Decorator: record timing, inputs, outputs, tokens and cost of a function."""

    def decorator(function):
        function_name = name or function.__name__

        if inspect.iscoroutinefunction(function):
            @functools.wraps(function)
            async def async_wrapper(*args, **kwargs):
                span_info = start_span(function_name, run_type, metadata, args, kwargs)
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
            span_info = start_span(function_name, run_type, metadata, args, kwargs)
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


# ---------------------------------------------------------------
# Auto-instrument LLM clients
# ---------------------------------------------------------------

def instrument_gemini(client):
    """Wrap client.models.generate_content so token usage is recorded automatically."""
    original_function = client.models.generate_content

    @functools.wraps(original_function)
    def wrapped_function(*args, **kwargs):
        span = current_span.get()
        model_name = kwargs.get("model", args[0] if args else "gemini-3.8-flash")

        response = original_function(*args, **kwargs)

        if span is not None:
            save_token_usage(response, span, model=model_name)
        return response

    client.models.generate_content = wrapped_function


def instrument_llm_provider(client):
    """Wrap either a Gemini client or an OpenAI/ASI client."""

    # Gemini client
    if hasattr(client, "models") and hasattr(client.models, "generate_content"):
        instrument_gemini(client)

    # OpenAI / ASI-1 client
    elif hasattr(client, "chat") and hasattr(client.chat, "completions"):
        original_function = client.chat.completions.create

        @functools.wraps(original_function)
        def wrapped_function(*args, **kwargs):
            span = current_span.get()
            model_name = kwargs.get("model", "asi1-mini")

            response = original_function(*args, **kwargs)

            if span is not None:
                save_token_usage(response, span, model=model_name)
            return response

        client.chat.completions.create = wrapped_function