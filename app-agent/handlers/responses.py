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
    "so I can't show private telemetry.\n"
    "To securely connect your account without pasting keys into chat:\n"
    "1. Send: connect my account\n"
    "2. Open the secure Google authorization link in your browser.\n"
    "3. Sign in with Google to authorize ASI-Telemetry.\n"
    "4. Return here and send your authorization handoff code (AUTH-...). "
    "Or send: link account <your-api-key> as a fallback."
)

HELP_TEXT = (
    "I answer questions about your ASI-Telemetry account and help diagnose errors.\n"
    "Connect your account first: send 'connect my account' to sign in with Google securely, "
    "or send 'link account <api-key>' as fallback.\n"
    "Supported questions:\n"
    "- connect account: 'connect my account'\n"
    "- account overview: 'account overview'\n"
    "- token usage: 'token usage for the last 7 days'\n"
    "- estimated cost: 'estimated cost for the last 30 days'\n"
    "- applications/agents: 'project summary' or 'which applications are active'\n"
    "- errors & performance: 'error rate and latency this week'\n"
    "- recent traces: 'show me the last 5 traces'\n"
    "- diagnose runtime error: 'diagnose' or 'why did it fail'\n"
    "- select GitHub repo: 'select repo <owner/repo>'\n"
    "- link GitHub account: 'link github <token> <owner/repo>' or 'connect github'\n"
    "- check active repo: 'repo status'\n"
    "- approve PR fix: 'approve pr'\n"
    "- disconnect/logout: 'unlink' or 'logout'\n"
    "Time ranges: last hour, 24 hours/today, 7 days/this week, "
    "30 days/this month, all time."
)

WELCOME_TEXT = (
    "Hello! I'm the ASI-Telemetry agent. Ask me about your account's token "
    "usage, estimated costs, application activity, errors, latency, recent "
    "traces, or runtime error diagnosis. Type 'help' for examples. "
    "To connect your account securely, send 'connect my account'."
)

UNSUPPORTED_TEXT = (
    "Sorry, I didn't understand that. I answer questions about your "
    "ASI-Telemetry telemetry: account overview, token usage, estimated cost, "
    "application summaries, error/performance stats, recent traces, and "
    "runtime diagnostics. Type 'help' for examples."
)

BACKEND_DOWN_TEXT = (
    "Sorry, the ASI-Telemetry backend is currently unreachable. "
    "Please try again in a few minutes."
)

AUTH_FAILED_TEXT = (
    "Your linked session or API key was rejected by the ASI-Telemetry backend "
    "(it may have been revoked or expired). Please send "
    "'connect my account' to securely reconnect with Google."
)

INVALID_KEY_TEXT = (
    "That doesn't look like a valid ASI-Telemetry API key or authorization code. "
    "Keys look like asi_dev_... and authorization codes look like AUTH-..."
)


def format_oauth_prompt(auth_url: str, connect_url: Optional[str] = None) -> str:
    portal_url = connect_url or auth_url
    return (
        "🔐 **ASI-Telemetry Account Authorization**\n\n"
        "To securely connect your ASI-Telemetry account, complete Google sign-in "
        "using the button below. You will not need to share an API key in this chat:\n\n"
        f"👉 **[ 🔐 Connect with Google ]({portal_url})**\n\n"
        "Once authorized, you will see a single-use authorization code (e.g. AUTH-...). "
        "Return here and paste the code to link your session."
    )


def format_oauth_success(email: str, name: Optional[str] = None) -> str:
    masked_email = _mask_email(email)
    user_str = f" {name}" if name else ""
    user_name = name or "Developer"
    return (
        f"Your ASI-Telemetry account{user_str} ({masked_email}) is connected successfully.\n\n"
        "🎉 **Account Successfully Connected**\n\n"
        "📋 **Session Profile:**\n"
        f"• **User**: {user_name}\n"
        f"• **Email**: {masked_email}\n"
        "• **Auth Method**: Google OAuth 2.0 (PKCE)\n"
        "• **Session Status**: 🟢 Active & Auto-Renewing\n\n"
        "🚀 **What you can ask now:**\n"
        "• `account overview` — view system health & profile\n"
        "• `token usage` — check prompt & completion tokens\n"
        "• `cost summary` — review estimated LLM spending\n"
        "• `recent traces` — inspect live execution logs\n"
        "• `unlink` — revoke session & logout"
    )


def format_auth_revoked(already_unlinked: bool = False) -> str:
    if already_unlinked:
        return "No account was linked for this chat, so there was nothing to remove."
    return "Account unlinked. Your session credentials and refresh tokens have been revoked."


def format_diagnostic_report(diag, selected_repo: Optional[str] = None) -> str:  # noqa: ANN001
    """Format sanitized diagnostic report with human approval notice and repository context."""
    lines = [
        "🔍 Runtime Diagnostic Report:",
        f"- Diagnostic ID: {diag.id}",
        f"- Timestamp: {diag.timestamp}",
        f"- Error Category: {diag.category}",
        f"- Status Code: {diag.status_code or 'N/A'}",
        f"- Endpoint / Operation: {diag.endpoint or diag.operation or 'N/A'}",
        f"- Sanitized Error: {diag.sanitized_message}",
    ]
    if diag.root_cause_analysis:
        lines.append(f"\n💡 Root Cause Analysis:\n{diag.root_cause_analysis}")
    if diag.proposed_patch:
        patch = diag.proposed_patch
        lines.append(f"\n🛠️ Proposed Patch ({patch.target_file}):")
        lines.append("```diff")
        lines.append(patch.diff)
        lines.append("```")
        lines.append(f"Explanation: {patch.explanation}")
        lines.append(f"Intended Tests: {', '.join(patch.tests_to_run)}")
        lines.append(f"Risks: {', '.join(patch.risks)}")

        if selected_repo:
            lines.append(f"\n🎯 Target Repository: `{selected_repo}`")
            lines.append(
                f"\n⚠️ Developer Approval Required: To create a feature branch and "
                f"open a GitHub pull request on '{selected_repo}' with this patch, reply 'approve pr'. "
                "To discard, reply 'cancel'."
            )
        else:
            lines.append(
                "\n⚠️ Developer Approval Required: Please select the target GitHub repository for this fix by replying: "
                "`select repo <owner/repo>` or `link github <token> <owner/repo>`. Once selected, reply 'approve pr' to create the pull request."
            )
    else:
        lines.append("\nNo automatic code patch proposed for this operational or network error.")
    return "\n".join(lines)


def format_repo_selected(repo: str) -> str:
    """Format confirmation that user's target repository is set."""
    return (
        f"🎯 **Target Repository Selected:** `{repo}`\n\n"
        "Approved patches and diagnostic fixes will now create isolated branches "
        f"and pull requests on `{repo}`. Reply 'approve pr' when ready."
    )


def format_github_linked(repo: Optional[str], has_token: bool) -> str:
    """Format confirmation of GitHub linking."""
    lines = ["🔗 **GitHub Integration Linked Successfully:**"]
    if repo:
        lines.append(f"• **Target Repository**: `{repo}`")
    else:
        lines.append("• **Target Repository**: Not selected yet (reply `select repo <owner/repo>`)")
    lines.append(f"• **Credentials**: {'[SECURELY LINKED]' if has_token else 'Sandbox Mode'}")
    lines.append("\nYou can now diagnose runtime errors and automatically push fixes via 'approve pr'.")
    return "\n".join(lines)


def format_repo_status(repo: Optional[str], has_token: bool) -> str:
    """Format current repository and GitHub connection status."""
    lines = ["📋 **GitHub Integration & Repository Status:**"]
    if repo:
        lines.append(f"• **Active Target Repository**: `{repo}`")
    else:
        lines.append("• **Active Target Repository**: None selected. (Reply `select repo <owner/repo>` to set one)")
    lines.append(f"• **GitHub Token**: {'🟢 Connected' if has_token else '⚪ Unconfigured / Mock Sandbox'}")
    return "\n".join(lines)


def format_pr_success(pr_url: str, branch: str, title: str) -> str:
    return (
        "✅ Pull Request Created Successfully:\n"
        f"- Title: {title}\n"
        f"- Branch: {branch}\n"
        f"- Pull Request: {pr_url}\n\n"
        "Security Note: No credentials, tokens, or sensitive production logs were included. "
        "The change is isolated to the feature branch and requires code review before merging."
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
    lines = [
        f"Account linked. Welcome, {user.name or 'developer'} (account #{user.id}, {masked_email}).\n",
        "👤 **Account Profile:**",
        f"• **User**: {user.name or 'developer'}",
        f"• **Account ID**: `{user.id}`",
        f"• **Email**: {masked_email}",
        "• **Status**: 🟢 Active\n",
        "Your ASI:ONE address now maps to this account until you send 'unlink' or the agent restarts. Ask me anything from the 'help' list.",
    ]
    return "\n".join(lines)


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
    storage_desc = "telemetry storage connected" if health.clickhouse_connected else "telemetry storage offline"
    lines = [
        "📊 **ASI-Telemetry Account Overview**\n",
        "👤 **Account Profile:**",
        f"• **Account**: {user.name or 'developer'} (id {user.id})",
        f"• **Email**: {_mask_email(user.email)}",
        f"• **Backend: {health.status}** ({storage_desc})\n",
        "💡 **Available Commands:**",
        "• `token usage` — view prompt and completion tokens",
        "• `cost summary` — track estimated LLM spending",
        "• `project summary` — summarize active applications",
        "• `recent traces` — view recent agent execution logs",
        "• `unlink` — disconnect this chat session\n",
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
