"""
Client auto-instrumentation for Google Gemini, OpenAI, and compatible LLM providers.
"""

import functools
from typing import Any, Optional
from .models import calculate_cost


def save_token_usage(response: Any, span: dict, model: Optional[str] = None) -> None:
    """
    Extracts token usage metadata from Gemini or OpenAI/ASI responses
    and writes token counts and estimated costs into the span.
    """
    if not isinstance(span, dict):
        return

    # 1. Google Gemini style: response.usage_metadata
    usage = getattr(response, "usage_metadata", None)
    if usage:
        input_tokens = getattr(usage, "prompt_token_count", 0) or 0
        output_tokens = getattr(usage, "candidates_token_count", 0) or 0
        total_tokens = getattr(usage, "total_token_count", 0) or (input_tokens + output_tokens)
        resolved_model = model or span.get("metadata", {}).get("model", "gemini-3.8-flash")
    else:
        # 2. OpenAI / ASI style: response.usage
        usage = getattr(response, "usage", None)
        if not usage:
            return  # Not an LLM response with token usage
        input_tokens = getattr(usage, "prompt_tokens", 0) or 0
        output_tokens = getattr(usage, "completion_tokens", 0) or 0
        total_tokens = getattr(usage, "total_tokens", 0) or (input_tokens + output_tokens)
        resolved_model = model or getattr(response, "model", span.get("metadata", {}).get("model", "asi1-mini"))

    span.setdefault("metadata", {})["model"] = resolved_model
    span["tokens"] = {
        "input": input_tokens,
        "output": output_tokens,
        "total": total_tokens,
    }
    span["cost"] = calculate_cost(resolved_model, input_tokens, output_tokens)


def instrument_gemini(client: Any) -> None:
    """
    Auto-instruments Google Gemini genai client (client.models.generate_content)
    to automatically extract tokens and calculate costs for any enclosing span.
    """
    from .tracer import current_span

    if not hasattr(client, "models") or not hasattr(client.models, "generate_content"):
        return

    original_generate = client.models.generate_content

    @functools.wraps(original_generate)
    def wrapped_generate(*args, **kwargs):
        span = current_span.get()
        model_name = kwargs.get("model", args[0] if args else "gemini-3.8-flash")

        response = original_generate(*args, **kwargs)

        if span is not None:
            save_token_usage(response, span, model=model_name)
        return response

    client.models.generate_content = wrapped_generate


def instrument_openai(client: Any) -> None:
    """
    Auto-instruments OpenAI / ASI client (client.chat.completions.create)
    to capture token usage and calculate costs.
    """
    from .tracer import current_span

    if not hasattr(client, "chat") or not hasattr(client.chat, "completions"):
        return

    original_create = client.chat.completions.create

    @functools.wraps(original_create)
    def wrapped_create(*args, **kwargs):
        span = current_span.get()
        model_name = kwargs.get("model", "asi1-mini")

        response = original_create(*args, **kwargs)

        if span is not None:
            save_token_usage(response, span, model=model_name)
        return response

    client.chat.completions.create = wrapped_create


def instrument_client(client: Any) -> None:
    """
    Automatically detects LLM client type (Google Gemini, OpenAI, or ASI)
    and applies tracing instrumentation.
    """
    if hasattr(client, "models") and hasattr(client.models, "generate_content"):
        instrument_gemini(client)
    elif hasattr(client, "chat") and hasattr(client.chat, "completions"):
        instrument_openai(client)


# Backward-compatible alias
instrument_llm_provider = instrument_client


