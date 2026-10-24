"""Formatting of backend data into chat replies.

All numbers rendered here come from validated backend responses. Cost
figures are always labeled as estimates derived from telemetry because the
backend stores SDK-computed ``cost_usd`` values, not provider billing data.
"""

from __future__ import annotations

from typing import Optional

from api_client import DashboardResponse, MonitoringResponse, TracesResponse, UserProfile

COST_CAVEAT = (
    "Note: cost figures are estimates derived from ingested telemetry "
    "(SDK-computed cost_usd), not confirmed provider billing."
)

LINK_INSTRUCTIONS = (
    "Your ASI:ONE address is not linked to an ASI-Telemetry account yet, "
    "so I can't show private telemetry.\n\n"
    "To link your account securely (without sharing permanent API keys):\n"
    "1. Sign in to your ASI-Telemetry Web Dashboard -> API Keys.\n"
    "2. Click 'Connect ASI:One Agent' to generate a temporary single-use code (e.g. ASI-PAIR-A1B2C3, valid for 5 min).\n"
    "3. Reply here with: link <pairing-code>\n\n"
    "Your account will be verified instantly and securely!"
)

HELP_TEXT = (
    "I answer read-only questions about your ASI-Telemetry account.\n"
    "Link your account first: 'link <pairing-code>' (click 'Connect ASI:One Agent' in "
    "the ASI-Telemetry dashboard to generate your code).\n"
    "Supported questions:\n"
    "- account overview: 'account overview'\n"
    "- token usage: 'token usage for the last 7 days'\n"
    "- estimated cost: 'estimated cost for the last 30 days'\n"
    "- applications/agents: 'project summary' or 'which applications are active'\n"
    "- errors & performance: 'error rate and latency this week'\n"
    "- recent traces: 'show me the last 5 traces'\n"
    "Time ranges: last hour, 24 hours/today, 7 days/this week, "
    "30 days/this month, all time."
)

WELCOME_TEXT = (
    "Hello! I'm the ASI-Telemetry agent. Ask me about your account's token "
    "usage, estimated costs, application activity, errors, latency, or recent "
    "traces. Type 'help' for examples. If you haven't linked your account "
    "yet, generate a pairing code in your dashboard and send 'link <pairing-code>'."
)


UNSUPPORTED_TEXT = (
    "Sorry, I didn't understand that. I only answer read-only questions "
    "about your ASI-Telemetry telemetry: account overview, token usage, "
    "estimated cost, application summaries, error/performance stats, and "
    "recent traces. Type 'help' for examples."
)

BACKEND_DOWN_TEXT = (
    "Sorry, the ASI-Telemetry backend is currently unreachable. "
    "Please try again in a few minutes."
)

AUTH_FAILED_TEXT = (
    "Your linked API key was rejected by the ASI-Telemetry backend "
    "(it may have been revoked or expired). Please send "
    "'link account <new-api-key>' to relink your account."
)

INVALID_KEY_TEXT = (
    "That doesn't look like a valid ASI-Telemetry API key. Keys look like "
    "asi_dev_... or asi_live_... and are created in the ASI-Telemetry "
    "dashboard under Settings -> API Keys."
)


def _time_range_label(time_range: Optional[str]) -> str:
    return {
        "1h": "the last hour",
        "24h": "the last 24 hours",
        "7d": "the last 7 days",
        "30d": "the last 30 days",
        "all": "all time",
    }.get(time_range or "7d", "the last 7 days")


def format_link_success(user: UserProfile) -> str:
    email = user.email or ""
    masked_email = _mask_email(email)
    return (
        f"Account linked. Welcome, {user.name or 'developer'} "
        f"(account #{user.id}, {masked_email}).\n"
        "Your ASI:ONE address now maps to this account until you send "
        "'unlink' or the agent restarts. Ask me anything from the 'help' list."
    )


def _mask_email(email: str) -> str:
    if "@" not in email or len(email) < 4:
        return "[hidden]"
    local, domain = email.split("@", 1)
    return f"{local[0]}***@{domain}"


def format_link_removed(already_unlinked: bool) -> str:
    if already_unlinked:
        return "No account was linked for this chat, so there was nothing to remove."
    return "Account unlinked. Your API key has been removed from this agent's memory."


def format_overview(user: UserProfile, health, time_range: Optional[str] = None) -> str:  # noqa: ANN001
    """Format account identity + backend availability."""
    lines = [
        "Account overview:",
        f"- Account: {user.name or 'developer'} (id {user.id})",
        f"- Email: {_mask_email(user.email)}",
        f"- Backend: {health.status}"
        + (" (telemetry storage connected)" if health.clickhouse_connected else " (telemetry storage offline)"),
        "Usage numbers: ask 'token usage', 'estimated cost', 'project summary', or 'recent traces'.",
    ]
    return "\n".join(lines)


def format_token_usage(data: MonitoringResponse, time_range: Optional[str], model: Optional[str] = None) -> str:
    s = data.summary
    model_label = f" for model {model}" if model else ""
    if s.totalCount == 0:
        return (
            f"No LLM traces recorded{model_label} in {_time_range_label(time_range)} - "
            "there is no token usage to report for this period."
        )
    lines = [
        f"Token usage{model_label} ({_time_range_label(time_range)}):",
        f"- Total tokens: {s.totalTokens:,} (prompt {s.promptTokens:,} + completion {s.completionTokens:,})",
        f"- Traces: {s.totalCount:,} ({s.successCount:,} success / {s.errorCount:,} errors)",
        f"- Success rate: {s.successRate}%",
    ]
    return "\n".join(lines)


def format_cost_summary(data: MonitoringResponse, time_range: Optional[str], model: Optional[str] = None) -> str:
    s = data.summary
    model_label = f" for model {model}" if model else ""
    if s.totalCount == 0:
        return (
            f"No cost data{model_label} in {_time_range_label(time_range)} - "
            "no telemetry was recorded for this period."
        )
    lines = [
        f"Estimated cost{model_label} ({_time_range_label(time_range)}):",
        f"- Estimated total: ${s.totalCost:.4f} USD across {s.totalCount:,} traces",
        f"- Estimated average per trace: ${s.totalCost / s.totalCount:.6f}",
        COST_CAVEAT,
    ]
    return "\n".join(lines)


def format_applications(data: DashboardResponse, time_range: Optional[str]) -> str:
    s = data.summary
    if not data.applications and s.total_requests == 0:
        return (
            f"No tool/application activity recorded in {_time_range_label(time_range)}. "
            "Once your instrumented agents send telemetry, per-application summaries appear here."
        )
    app_names = ", ".join(a.agent_name for a in data.applications[:8]) or "none detected"
    lines = [
        f"Application summary ({_time_range_label(time_range)}):",
        f"- Applications reporting telemetry: {app_names}",
        f"- Tool/function requests: {s.total_requests:,} "
        f"({s.total_success:,} success / {s.total_errors:,} errors, {s.success_rate}% success rate)",
        f"- 30-day uptime: {s.uptime}%",
        "Note: ASI-Telemetry currently groups telemetry by application/agent name; "
        "a separate 'projects' entity does not exist yet.",
    ]
    return "\n".join(lines)


def format_errors_performance(
    monitoring: MonitoringResponse, dashboard: DashboardResponse, time_range: Optional[str]
) -> str:
    m = monitoring.summary
    d = dashboard.summary
    if m.totalCount == 0 and d.total_requests == 0:
        return (
            f"No telemetry recorded in {_time_range_label(time_range)}, "
            "so there are no error or performance statistics for this period."
        )
    lines = [
        f"Errors & performance ({_time_range_label(time_range)}):",
        "LLM calls:",
        f"- Errors: {m.errorCount:,} of {m.totalCount:,} traces ({m.successRate}% success)",
        f"- Latency: avg {m.avgLatencyMs} ms, p99 {m.p99LatencyMs} ms",
        "Tool/function calls:",
        f"- Requests: {d.total_requests:,} ({d.error_rate}% error rate)",
        f"- Avg response time: {d.avg_response_time_ms} ms | 30-day uptime: {d.uptime}%",
    ]
    return "\n".join(lines)


def format_traces(data: TracesResponse, limit: int) -> str:
    if not data.traces:
        return "No recent traces found for your account."
    header = (
        f"Most recent {len(data.traces)} of {data.total:,} traces "
        f"(avg latency {data.stats.avg_latency_ms} ms):"
    )
    lines = [header]
    for trace in data.traces[:limit]:
        status = trace.status or "unknown"
        cost = f", est. ${trace.cost_usd:.5f}" if trace.cost_usd else ""
        start = f" @ {trace.start_time}" if trace.start_time else ""
        lines.append(
            f"- [{status}] {trace.name or 'unnamed'} ({trace.model or 'n/a'}) - "
            f"{trace.total_tokens:,} tokens, {trace.latency_ms:.0f} ms{cost}{start}"
        )
    lines.append(COST_CAVEAT)
    return "\n".join(lines)
