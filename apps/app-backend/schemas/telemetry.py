from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, model_validator


class MetricPayload(BaseModel):
    """Schema for telemetry data sent from Python SDK (observ.py)"""
    agent_name: str = Field(default="assistant", description="Name of the agent")
    func_name: Optional[str] = Field(default="handle_message", description="Function name tracked")
    status: str = Field(default="success", description="Status (success, error, or cancelled)")
    response_time_ms: float = Field(default=0.0, description="Response time in milliseconds")
    latency_ms: Optional[float] = Field(default=None, description="Legacy latency alias")
    cpu_before: float = Field(default=0.0)
    cpu_after: float = Field(default=0.0)
    cpu_ms: Optional[float] = Field(default=None, description="CPU time in ms alias")
    memory_before: float = Field(default=0.0)
    memory_after: float = Field(default=0.0)
    memory_before_mb: Optional[float] = Field(default=None, description="Memory before in MB")
    memory_after_mb: Optional[float] = Field(default=None, description="Memory after in MB")
    timestamp: Optional[str] = Field(default=None, description="ISO timestamp string")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Extra metadata")

    @model_validator(mode="after")
    def normalize_fields(self):
        # Normalize legacy latency_ms -> response_time_ms
        if self.latency_ms is not None and self.response_time_ms == 0.0:
            self.response_time_ms = self.latency_ms
        elif self.response_time_ms != 0.0 and self.latency_ms is None:
            self.latency_ms = self.response_time_ms

        # Normalize cpu_ms -> cpu_after
        if self.cpu_ms is not None and self.cpu_after == 0.0:
            self.cpu_after = self.cpu_ms

        # Normalize memory MB -> memory
        if self.memory_before_mb is not None and self.memory_before == 0.0:
            self.memory_before = self.memory_before_mb
        if self.memory_after_mb is not None and self.memory_after == 0.0:
            self.memory_after = self.memory_after_mb
        return self


class MetricSummary(BaseModel):
    """Schema for aggregated summary metrics computed on the backend"""
    total_requests: int
    total_success: int
    total_errors: int
    success_rate: float
    error_rate: float
    avg_response_time_ms: float
    current_cpu: float
    current_memory: float


class AnalyticsBucket(BaseModel):
    """Time-bucketed aggregation with native ClickHouse quantiles"""
    time: str
    total: int
    success: int
    failure: int
    p50: float
    p90: float
    p95: float
    p99: float
    avg_cpu: float
    avg_memory: float
    error_rate: float


class LLMTracePayload(BaseModel):
    """Schema for individual LLM call traces / LangSmith-like execution traces."""
    id: Optional[str] = Field(default=None, description="Unique trace record id")
    trace_id: Optional[str] = Field(default=None, description="Correlation trace id")
    span_id: Optional[str] = Field(default=None, description="Span id")
    parent_id: Optional[str] = Field(default=None, description="Parent span id")
    name: str = Field(default="gemini_generate", description="Execution or function name")
    run_type: str = Field(default="llm", description="Run type (llm, chain, agent, tool)")
    status: str = Field(default="success", description="Status (success, error)")
    model: str = Field(default="gemini-3.8-flash", description="Model name")
    input: str = Field(default="", description="Input prompt or message")
    output: Optional[str] = Field(default="", description="LLM output text")
    error: Optional[str] = Field(default="", description="Error message if failed")
    start_time: Optional[str] = Field(default=None, description="ISO timestamp start")
    end_time: Optional[str] = Field(default=None, description="ISO timestamp end")
    latency_ms: float = Field(default=0.0, description="Latency in milliseconds")
    prompt_tokens: int = Field(default=0, description="Prompt/input tokens")
    completion_tokens: int = Field(default=0, description="Completion/output tokens")
    total_tokens: int = Field(default=0, description="Total tokens used")
    cost_usd: float = Field(default=0.0, description="Calculated cost in USD")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Arbitrary metadata dictionary")
