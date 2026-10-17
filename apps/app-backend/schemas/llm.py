from typing import Any, Dict, Optional
from pydantic import BaseModel, Field, model_validator


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
    agent_address: Optional[str] = Field(default=None, description="uAgent or wallet address")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Arbitrary metadata dictionary")

    @model_validator(mode="after")
    def sync_total_tokens(self):
        calc_total = (self.prompt_tokens or 0) + (self.completion_tokens or 0)
        if calc_total > 0:
            self.total_tokens = calc_total
        elif self.total_tokens > 0 and calc_total == 0:
            self.prompt_tokens = self.total_tokens
        return self
