from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class MetricPayload(BaseModel):
    """Schema for telemetry data sent from Python SDK (observ.py)"""
    agent_name: str = Field(default="assistant", description="Name of the agent")
    func_name: Optional[str] = Field(default="handle_message", description="Function name tracked")
    status: str = Field(default="success", description="Status (success or error)")
    latency_ms: float = Field(default=0.0, description="Execution time in milliseconds")
    cpu_before: float = Field(default=0.0)
    cpu_after: float = Field(default=0.0)
    memory_before: float = Field(default=0.0)
    memory_after: float = Field(default=0.0)
    request_count: int = Field(default=1)
    success_count: int = Field(default=1)
    error_count: int = Field(default=0)
    timestamp: Optional[str] = Field(default=None, description="ISO timestamp string")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Extra metadata")


class MetricSummary(BaseModel):
    """Schema for aggregated summary metrics"""
    total_requests: int
    total_success: int
    total_errors: int
    avg_latency_ms: float
    current_cpu: float
    current_memory: float
