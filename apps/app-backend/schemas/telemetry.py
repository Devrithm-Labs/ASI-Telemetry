from typing import Any, Dict, Optional
from pydantic import BaseModel, Field, model_validator
from schemas.llm import LLMTracePayload


class MetricPayload(BaseModel):
    """Schema for telemetry data sent from Python SDK (observ.py)"""
    agent_name: str = Field(default="assistant", description="Name of the agent")
    agent_address: Optional[str] = Field(default=None, description="Fetch.ai / uAgent address")
    agent_handle: Optional[str] = Field(default=None, description="Agent handle identifier")
    func_name: Optional[str] = Field(default="handle_message", description="Function name tracked")
    status: str = Field(default="success", description="Status (success, error, or cancelled)")
    response_time_ms: float = Field(default=0.0, description="Response time in milliseconds")
    latency_ms: Optional[float] = Field(default=None, description="Legacy latency alias")
    cpu_before: Optional[float] = Field(default=0.0)
    cpu_after: Optional[float] = Field(default=0.0)
    cpu_ms: Optional[float] = Field(default=None)
    memory_before: Optional[float] = Field(default=0.0)
    memory_after: Optional[float] = Field(default=0.0)
    memory_before_mb: Optional[float] = Field(default=None)
    memory_after_mb: Optional[float] = Field(default=None)
    timestamp: Optional[str] = Field(default=None, description="ISO timestamp string")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Extra metadata")

    @model_validator(mode="after")
    def normalize_fields(self):
        if self.latency_ms is not None and self.response_time_ms == 0.0:
            self.response_time_ms = self.latency_ms
        elif self.response_time_ms != 0.0 and self.latency_ms is None:
            self.latency_ms = self.response_time_ms
        return self


class MetricSummary(BaseModel):
    """Schema for aggregated summary metrics computed on the backend"""
    total_requests: int
    total_success: int
    total_errors: int
    success_rate: float
    error_rate: float
    avg_response_time_ms: float
    uptime: float = 100.0
    uptime_desc: str = "Percent of requests the agent replied to in the last 30 days."
    agent_address: Optional[str] = None
    agent_handle: Optional[str] = None


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


__all__ = [
    "MetricPayload",
    "MetricSummary",
    "AnalyticsBucket",
    "LLMTracePayload",
]
