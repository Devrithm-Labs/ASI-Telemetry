"""
Compatibility export for AgentMonitor.
Allows `from observ import AgentMonitor` or `from asi_telemetry import AgentMonitor`.
"""

from asi_telemetry.observ import AgentMonitor

__all__ = ["AgentMonitor"]
