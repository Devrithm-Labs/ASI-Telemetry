import os
from typing import Any, Callable, Dict, Optional

from .metrics import MetricsTracker
from .tracer import (
    traceable,
    create_trace_context,
    set_agent_info,
    set_api_key,
)
from .instrumentation import (
    instrument_gemini,
    instrument_openai,
    instrument_client,
    instrument_llm_provider,
)
from .models import calculate_cost

__version__ = "0.2.0"


class ASI_Telemetry:
    """
    Unified ASI Telemetry client.

    Usage:
        from asi_telemetry import ASI_Telemetry

        observe = ASI_Telemetry(
            api_key="asi_live_...",
            agent_name="assistant",
            agent_address=agent.address,
        )

        @observe.track("handle_message")
        @observe.traceable(name="handle_message", run_type="tool")
        async def handle_message(ctx, sender, msg):
            ...
    """

    DEFAULT_BACKEND_URL = "http://127.0.0.1:8080"

    def __init__(
        self,
        api_key: str = "",
        agent_name: str = "assistant",
        agent_address: str = "",
        backend_url: Optional[str] = None,
    ):
        self.api_key = (
            api_key
            or os.getenv("ASI_API_KEY")
            or os.getenv("ASI_TELEMETRY_API_KEY")
            or os.getenv("TELEMETRY_API_KEY")
            or ""
        )
        self.backend_url = (
            backend_url
            or os.getenv("TELEMETRY_BACKEND_URL")
            or self.DEFAULT_BACKEND_URL
        )
        self.agent_name = agent_name
        self.agent_address = agent_address

        # Initialize global environment & agent identities
        if self.api_key:
            set_api_key(self.api_key)
            os.environ["ASI_API_KEY"] = self.api_key
        if self.backend_url:
            os.environ["TELEMETRY_BACKEND_URL"] = self.backend_url
            os.environ["TELEMETRY_METRICS_URL"] = (
                self.backend_url
                if "/api/metrics" in self.backend_url or "/api/telemetry" in self.backend_url
                else f"{self.backend_url.rstrip('/')}/api/metrics"
            )
            os.environ["TELEMETRY_TRACES_URL"] = (
                self.backend_url
                if "/api/llm/traces" in self.backend_url
                else f"{self.backend_url.rstrip('/')}/api/llm/traces"
            )

        set_agent_info(agent_name=self.agent_name, agent_address=self.agent_address)

        # Internal metrics tracker
        self.metrics = MetricsTracker(
            agent_name=self.agent_name,
            agent_address=self.agent_address,
            api_key=self.api_key,
            backend_url=os.environ.get("TELEMETRY_METRICS_URL", self.backend_url),
        )

    def track(self, tool_name: Optional[Any] = None) -> Callable:
        """Track function execution time, status, and agent performance metrics."""
        return self.metrics.track(tool_name)

    # Alias for track
    tool_monitoring = track

    def traceable(
        self,
        name: Optional[Any] = None,
        run_type: str = "chain",
        metadata: Optional[Dict[str, Any]] = None,
        agent_address: Optional[str] = None,
    ) -> Callable:
        """Trace function execution, inputs, outputs, errors, latency, and tokens."""
        return traceable(
            name=name,
            run_type=run_type,
            metadata=metadata,
            agent_address=agent_address or self.agent_address,
        )

    def create_trace_context(self) -> Dict[str, Optional[str]]:
        """Create a distributed tracing context dictionary for inter-agent messages."""
        return create_trace_context()

    def instrument_gemini(self, client: Any) -> Any:
        """Auto-instrument Google GenAI Gemini client."""
        return instrument_gemini(client)

    def instrument_openai(self, client: Any) -> Any:
        """Auto-instrument OpenAI client."""
        return instrument_openai(client)

    def instrument_client(self, client: Any, provider: str = "custom") -> Any:
        """Auto-instrument any LLM client."""
        return instrument_client(client, provider)


# Aliases for backward compatibility
ASITelemetry = ASI_Telemetry


__all__ = [
    # Primary Client
    "ASI_Telemetry",
    "ASITelemetry",
    # Core Entry Points
    "init",
    "traceable",
    "create_trace_context",
    "MetricsTracker",
    # Instrumentations
    "instrument_gemini",
    "instrument_openai",
    "instrument_client",
    "instrument_llm_provider",
    # Cost Utility
    "calculate_cost",
]
