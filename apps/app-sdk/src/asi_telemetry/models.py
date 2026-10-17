"""
Data models, pricing tables, and schema constants for ASI Telemetry.
"""

from typing import Dict, Any, Optional

# Price in USD per 1 million tokens
PRICE_PER_MILLION: Dict[str, Dict[str, float]] = {
    "asi1-mini": {"input": 0.10, "output": 0.40},
    "asi-mini": {"input": 0.10, "output": 0.40},
    "asi1": {"input": 0.50, "output": 1.50},
    "gemini-3.8-flash": {"input": 0.075, "output": 0.30},
    "gemini-2.5-flash": {"input": 0.075, "output": 0.30},
    "gemini-3.5-flash": {"input": 0.075, "output": 0.30},
    "gemini-3.5-flash-lite": {"input": 0.0375, "output": 0.15}
}

DEFAULT_PRICE: Dict[str, float] = {"input": 0.10, "output": 0.40}


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """
    Calculates estimated USD cost for a given model and token counts.
    """
    normalized_model = (model or "").replace("models/", "").lower()
    price = PRICE_PER_MILLION.get(normalized_model, DEFAULT_PRICE)

    input_cost = (input_tokens * price["input"]) / 1_000_000
    output_cost = (output_tokens * price["output"]) / 1_000_000
    return round(input_cost + output_cost, 6)
