# ASI Telemetry SDK

The official lightweight observability, metrics, and distributed tracing SDK for AI agents, LLM providers (Google Gemini, OpenAI, ASI-1, DeepSeek), and tool execution pipelines.

## Installation

```bash
pip install -e .
```
Or with dependencies:
```bash
pip install httpx psutil
```

## Features

- **Agent & Tool Resource Monitoring (`AgentMonitor`)**:
  - Automatically captures process CPU time, memory usage, latency, error/success status.
  - Asynchronously streams metrics to the ASI Telemetry backend and ClickHouse.
  - Zero performance overhead; non-blocking background network tasks.

- **Distributed LLM Tracing (`@traceable`)**:
  - Trace multi-hop agent swarms and chains with distributed trace propagation (`trace_id`, `span_id`, `parent_id`).
  - Auto-instrumentation for Google Gemini (`instrument_gemini`) and OpenAI/ASI providers (`instrument_llm_provider`).
  - Real-time token usage calculation (input, output, total) and cost estimation per model.

## Quick Start

### 1. Monitoring Agent Tools & Functions

```python
from asi_telemetry import AgentMonitor

monitor = AgentMonitor(agent_name="assistant")

@monitor.track(agentname="weather_tool")
async def get_weather(city: str):
    return f"Weather in {city}: 72°F Sunny"
```

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
