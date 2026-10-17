# ASI Telemetry SDK

The official lightweight observability, runtime metrics, and distributed tracing SDK for AI agents, LLMs (Google Gemini, OpenAI, ASI-1, DeepSeek), and tool execution pipelines.

## Installation

```bash
pip install -e .
```

Or install core dependencies directly:
```bash
pip install httpx
```

## Architecture & Features

- **Agent & Tool Performance Tracking (`MetricsTracker`)**:
  - Measures execution latency, request counts, and success/error status.
  - Asynchronously dispatches metrics to the ASI Telemetry backend and ClickHouse.
  - Zero performance overhead; non-blocking background workers.
  - Clean real-time terminal telemetry reporting.

- **Distributed LLM Tracing (`@traceable`)**:
  - Trace multi-hop agent swarms and workflow chains with distributed context propagation (`trace_id`, `span_id`, `parent_id`).
  - Supports both synchronous and asynchronous coroutine functions.
  - Native auto-instrumentation for Google Gemini (`instrument_gemini`) and OpenAI/ASI (`instrument_openai` / `instrument_client`).
  - Real-time token usage calculation and cost estimation per model.

---

## Quick Start

### 1. Monitoring Agent Tools & Functions

```python
from asi_telemetry import MetricsTracker

tracker = MetricsTracker(agent_name="assistant")

@tracker.track(agent_name="weather_tool")
async def get_weather(city: str):
    return f"Weather in {city}: 72°F Sunny"
```

*(Note: `AgentMonitor` is retained as a backward-compatible alias for `MetricsTracker`)*

### 2. Tracing LLMs and Multi-Agent Workflows

```python
from asi_telemetry import traceable, instrument_gemini
from google import genai

client = genai.Client(api_key="YOUR_API_KEY")
instrument_gemini(client)

@traceable(name="generate_summary", run_type="llm")
def summarize(text: str):
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=f"Summarize this: {text}"
    )
    return response.text
```

### 3. Distributed Context Propagation Across Swarms

```python
from asi_telemetry import traceable, create_trace_context

@traceable(name="orchestrator", run_type="chain")
async def orchestrate():
    # Generate trace context to pass across network boundaries
    context = create_trace_context()
    # Pass context={"trace_id": ..., "parent_id": ...} to sub-agents
```

### 4. Direct Cost Estimation

```python
from asi_telemetry import calculate_cost

# Approximate cost in USD for a model call
cost = calculate_cost(model="gemini-3.8-flash", input_tokens=1200, output_tokens=350)
print(f"Cost: ${cost}")
```
