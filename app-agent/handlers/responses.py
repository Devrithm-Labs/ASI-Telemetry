"""Formatting of backend data into chat replies and ASI:One Interactive Cards.

All numbers rendered here come from validated backend responses. Cost
figures are always labeled as estimates derived from telemetry because the
backend stores SDK-computed ``cost_usd`` values, not provider billing data.

Every response is wrapped in a ``ChatReply`` object (a string subclass) that
attaches an ASI:One Interactive Card (carousel, detail, form, review) to provide
rich, guided user interactions inside ASI:One conversations.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from api_client import DashboardResponse, MonitoringResponse, TracesResponse, UserProfile
from cards import (
    CardKind,
    ChatReply,
    build_carousel_card,
    build_detail_card,
    build_form_card,
    build_review_card,
)

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


def _mask_email(email: str) -> str:
    if "@" not in email or len(email) < 4:
        return "[hidden]"
    local, domain = email.split("@", 1)
    return f"{local[0]}***@{domain}"


def _time_range_label(time_range: Optional[str]) -> str:
    return {
        "1h": "the last hour",
        "24h": "the last 24 hours",
        "7d": "the last 7 days",
        "30d": "the last 30 days",
        "all": "all time",
    }.get(time_range or "7d", "the last 7 days")


# ============================================================================
# Card-Enhanced Response Formatters
# ============================================================================


def format_welcome_reply() -> ChatReply:
    """Format welcome greeting with an interactive Carousel card showcasing capabilities."""
    items = [
        {
            "id": "item_overview",
            "title": "Account Overview",
            "subtitle": "Live account health, active tier, and telemetry summary",
            "badges": [{"label": "Live Status", "variant": "info"}],
            "secondary_text": "Real-time Metrics",
            "primary_cta": {
                "label": "View Overview",
                "selection": {"action": "overview"},
            },
        },
        {
            "id": "item_tokens",
            "title": "Token Usage",
            "subtitle": "Prompt vs completion token consumption across models",
            "badges": [{"label": "Analytics", "variant": "info"}],
            "secondary_text": "7 Days Default",
            "primary_cta": {
                "label": "Token Usage",
                "selection": {"action": "token_usage", "time_range": "7d"},
            },
        },
        {
            "id": "item_costs",
            "title": "Estimated Costs",
            "subtitle": "Estimated LLM spending per model and cost-per-trace metrics",
            "badges": [{"label": "Financials", "variant": "success"}],
            "secondary_text": "Cost Estimations",
            "primary_cta": {
                "label": "Cost Summary",
                "selection": {"action": "cost_summary", "time_range": "7d"},
            },
        },
        {
            "id": "item_apps",
            "title": "Active Applications",
            "subtitle": "Discover registered uAgents, success rates, and 30-day uptime",
            "badges": [{"label": "Workloads", "variant": "info"}],
            "secondary_text": "Agentverse Fleet",
            "primary_cta": {
                "label": "View Apps",
                "selection": {"action": "applications"},
            },
        },
        {
            "id": "item_diagnostics",
            "title": "Diagnostics & Auto-Fix",
            "subtitle": "Inspect runtime exceptions, review unified diffs, and create PRs",
            "badges": [{"label": "Self-Healing", "variant": "warning"}],
            "secondary_text": "PR Automation",
            "primary_cta": {
                "label": "Diagnose Errors",
                "selection": {"action": "diagnose"},
            },
        },
        {
            "id": "item_connect",
            "title": "Connect Account",
            "subtitle": "Authenticate securely via Google OAuth 2.0 or developer API key",
            "badges": [{"label": "Security", "variant": "info"}],
            "secondary_text": "PKCE Sign-In",
            "primary_cta": {
                "label": "Connect Account",
                "selection": {"action": "connect"},
            },
        },
    ]
    card = build_carousel_card(
        title="ASI-Telemetry Agent Capabilities",
        subtitle="Explore telemetry, monitor costs, and automate error resolution",
        items=items,
    )
    return ChatReply(WELCOME_TEXT, card_kind=CardKind.CAROUSEL, card_payload=card)


def format_help_reply() -> ChatReply:
    """Format help text with an interactive Carousel card."""
    reply = format_welcome_reply()
    return ChatReply(HELP_TEXT, card_kind=reply.card_kind, card_payload=reply.card_payload)


def format_unsupported_reply() -> ChatReply:
    """Format fallback message with quick navigation CTAs."""
    card = build_detail_card(
        title="ASI-Telemetry Commands & Capabilities",
        summary_rows=[
            {"label": "Overview", "value": "account overview, health check"},
            {"label": "Tokens", "value": "token usage (1h, 24h, 7d, 30d)"},
            {"label": "Costs", "value": "estimated cost summary"},
            {"label": "Apps", "value": "active applications & agents"},
            {"label": "Diagnostics", "value": "diagnose, simulate error, approve pr"},
        ],
        ctas=[
            {"label": "Account Overview", "selection": {"action": "overview"}, "primary": True},
            {"label": "Help & Features", "selection": {"action": "help"}},
        ],
    )
    return ChatReply(UNSUPPORTED_TEXT, card_kind=CardKind.DETAIL, card_payload=card)


def format_link_instructions() -> ChatReply:
    """Format unlinked instructions with interactive connection card."""
    card = build_detail_card(
        title="ASI-Telemetry Account Required",
        summary_rows=[
            {"label": "Status", "value": "Unlinked ASI:ONE participant"},
            {"label": "Recommended", "value": "Google OAuth 2.0 (Click Connect below)"},
            {"label": "Alternative", "value": "Developer API Key (asi_dev_...)"},
        ],
        ctas=[
            {"label": "Connect with Google", "primary": True, "selection": {"action": "connect"}},
            {"label": "Enter Key / Code", "selection": {"action": "open_link_form"}},
        ],
    )
    return ChatReply(LINK_INSTRUCTIONS, card_kind=CardKind.DETAIL, card_payload=card)


def format_connect_form() -> ChatReply:
    """Present a Form card allowing direct entry of authorization code or API key."""
    narration = (
        "🔐 **Link ASI-Telemetry Account**\n\n"
        "Enter your Google authorization handoff code (`AUTH-...`) or dashboard API key (`asi_dev_...`) below:"
    )
    card = build_form_card(
        title="Connect ASI-Telemetry Account",
        fields=[
            {
                "name": "handoff_code",
                "kind": "text",
                "label": "Google Auth Code (AUTH-...)",
                "placeholder": "AUTH-XXXXXXXX",
                "required": False,
            },
            {
                "name": "api_key",
                "kind": "text",
                "label": "Or Dashboard API Key",
                "placeholder": "asi_dev_...",
                "required": False,
            },
        ],
        submit_label="Link Account",
        submit_selection={"action": "link"},
    )
    return ChatReply(narration, card_kind=CardKind.FORM, card_payload=card)


def format_select_repo_form(current_repo: Optional[str] = None) -> ChatReply:
    """Present a Form card to configure the target GitHub repository for automated fixes."""
    narration = (
        "🎯 **Select GitHub Repository**\n\n"
        "Configure the target repository where self-healing error diagnostics "
        "will create branches and pull requests:"
    )
    card = build_form_card(
        title="Select Target GitHub Repository",
        fields=[
            {
                "name": "repo",
                "kind": "text",
                "label": "Repository (owner/name)",
                "placeholder": current_repo or "e.g. devrithm/sample-uagent",
                "required": True,
            },
            {
                "name": "github_token",
                "kind": "text",
                "label": "Personal Access Token (optional if set in env)",
                "placeholder": "ghp_...",
                "required": False,
            },
        ],
        submit_label="Save Target Repository",
        submit_selection={"action": "select_repo"},
    )
    return ChatReply(narration, card_kind=CardKind.FORM, card_payload=card)


def format_oauth_prompt(auth_url: str, connect_url: Optional[str] = None) -> ChatReply:
    portal_url = connect_url or auth_url
    narration = (
        "🔐 **ASI-Telemetry Account Authorization**\n\n"
        "To securely connect your ASI-Telemetry account, complete Google sign-in "
        "using the button below. You will not need to share an API key in this chat:\n\n"
        f"👉 **[ 🔐 Connect with Google ]({portal_url})**\n\n"
        "Once authorized, you will see a single-use authorization code (e.g. AUTH-...). "
        "Return here and paste the code to link your session."
    )
    card = build_detail_card(
        title="Google OAuth Authorization",
        summary_rows=[
            {"label": "Authentication", "value": "Google OAuth 2.0 (PKCE)"},
            {"label": "Security", "value": "Single-use authorization code"},
            {"label": "Authorization Portal", "value": portal_url[:50] + "..."},
        ],
        ctas=[
            {"label": "Enter Auth Code / Key", "primary": True, "selection": {"action": "open_link_form"}},
        ],
    )
    return ChatReply(narration, card_kind=CardKind.DETAIL, card_payload=card)


def format_oauth_success(email: str, name: Optional[str] = None) -> ChatReply:
    masked_email = _mask_email(email)
    user_str = f" {name}" if name else ""
    user_name = name or "Developer"
    narration = (
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
    card = build_detail_card(
        title=f"Connected: {user_name}",
        summary_rows=[
            {"label": "User", "value": user_name},
            {"label": "Email", "value": masked_email},
            {"label": "Authentication", "value": "Google OAuth 2.0"},
            {"label": "Session Status", "value": "Active & Auto-Renewing"},
        ],
        ctas=[
            {"label": "Account Overview", "primary": True, "selection": {"action": "overview"}},
            {"label": "Token Usage", "selection": {"action": "token_usage", "time_range": "7d"}},
            {"label": "Active Applications", "selection": {"action": "applications"}},
        ],
    )
    return ChatReply(narration, card_kind=CardKind.DETAIL, card_payload=card)


def format_link_success(user: UserProfile) -> ChatReply:
    email = user.email or ""
    masked_email = _mask_email(email)
    narration = (
        f"Account linked. Welcome, {user.name or 'developer'} (account #{user.id}, {masked_email}).\n\n"
        "👤 **Account Profile:**\n"
        f"• **User**: {user.name or 'developer'}\n"
        f"• **Account ID**: `{user.id}`\n"
        f"• **Email**: {masked_email}\n"
        "• **Status**: 🟢 Active\n\n"
        "Your ASI:ONE address now maps to this account until you send 'unlink' or the agent restarts. Ask me anything from the 'help' list."
    )
    card = build_detail_card(
        title=f"Account Linked: {user.name or 'Developer'}",
        summary_rows=[
            {"label": "User", "value": user.name or "Developer"},
            {"label": "Account ID", "value": str(user.id)},
            {"label": "Email", "value": masked_email},
            {"label": "Status", "value": "Active & Linked"},
        ],
        ctas=[
            {"label": "Account Overview", "primary": True, "selection": {"action": "overview"}},
            {"label": "Token Usage", "selection": {"action": "token_usage", "time_range": "7d"}},
            {"label": "Active Applications", "selection": {"action": "applications"}},
        ],
    )
    return ChatReply(narration, card_kind=CardKind.DETAIL, card_payload=card)


def format_auth_revoked(already_unlinked: bool = False) -> ChatReply:
    if already_unlinked:
        narration = "No account was linked for this chat, so there was nothing to remove."
    else:
        narration = "Account unlinked. Your session credentials and refresh tokens have been revoked."
    card = build_detail_card(
        title="Session Disconnected",
        summary_rows=[
            {"label": "Status", "value": "Unlinked"},
            {"label": "Credentials", "value": "Revoked & Cleared"},
        ],
        ctas=[
            {"label": "Reconnect Account", "primary": True, "selection": {"action": "connect"}},
        ],
    )
    return ChatReply(narration, card_kind=CardKind.DETAIL, card_payload=card)


def format_link_removed(already_unlinked: bool) -> ChatReply:
    return format_auth_revoked(already_unlinked)


def format_overview(user: UserProfile, health, time_range: Optional[str] = None) -> ChatReply:  # noqa: ANN001
    """Format account identity + backend availability with a rich Detail card."""
    storage_desc = "telemetry storage connected" if health.clickhouse_connected else "telemetry storage offline"
    narration = (
        "📊 **ASI-Telemetry Account Overview**\n\n"
        "👤 **Account Profile:**\n"
        f"• **Account**: {user.name or 'developer'} (id {user.id})\n"
        f"• **Email**: {_mask_email(user.email)}\n"
        f"• **Backend: {health.status}** ({storage_desc})\n\n"
        "💡 **Available Commands:**\n"
        "• `token usage` — view prompt and completion tokens\n"
        "• `cost summary` — track estimated LLM spending\n"
        "• `project summary` — summarize active applications\n"
        "• `recent traces` — view recent agent execution logs\n"
        "• `unlink` — disconnect this chat session\n\n"
        "Usage numbers: ask 'token usage', 'estimated cost', 'project summary', or 'recent traces'."
    )
    card = build_detail_card(
        title=f"Telemetry Overview · {user.name or 'Developer'}",
        summary_rows=[
            {"label": "Account", "value": f"{user.name or 'developer'} (id {user.id})"},
            {"label": "Email", "value": _mask_email(user.email)},
            {"label": "Backend Status", "value": f"{health.status} ({storage_desc})"},
        ],
        sub_options={
            "name": "time_range",
            "kind": "radio",
            "label": "Time Filter",
            "choices": [
                {"value": "24h", "label": "Last 24 Hours"},
                {"value": "7d", "label": "Last 7 Days (Default)"},
                {"value": "30d", "label": "Last 30 Days"},
                {"value": "all", "label": "All Time"},
            ],
        },
        ctas=[
            {"label": "Token Usage", "primary": True, "selection": {"action": "token_usage"}},
            {"label": "Cost Summary", "selection": {"action": "cost_summary"}},
            {"label": "Recent Traces", "selection": {"action": "traces", "limit": 5}},
        ],
    )
    return ChatReply(narration, card_kind=CardKind.DETAIL, card_payload=card)


def format_token_usage(data: MonitoringResponse, time_range: Optional[str], model: Optional[str] = None) -> ChatReply:
    s = data.summary
    model_label = f" for model {model}" if model else ""
    if s.totalCount == 0:
        narration = (
            f"No LLM traces recorded{model_label} in {_time_range_label(time_range)} - "
            "there is no token usage to report for this period."
        )
        card = build_detail_card(
            title=f"Token Usage · {_time_range_label(time_range)}",
            summary_rows=[
                {"label": "Total Tokens", "value": "0"},
                {"label": "Traces", "value": "0 recorded"},
                {"label": "Time Window", "value": _time_range_label(time_range)},
            ],
            ctas=[
                {"label": "Account Overview", "primary": True, "selection": {"action": "overview"}},
            ],
        )
        return ChatReply(narration, card_kind=CardKind.DETAIL, card_payload=card)

    lines = [
        f"Token usage{model_label} ({_time_range_label(time_range)}):",
        f"- Total tokens: {s.totalTokens:,} (prompt {s.promptTokens:,} + completion {s.completionTokens:,})",
        f"- Traces: {s.totalCount:,} ({s.successCount:,} success / {s.errorCount:,} errors)",
        f"- Success rate: {s.successRate}%",
    ]
    summary_rows = [
        {"label": "Total Tokens", "value": f"{s.totalTokens:,}"},
        {"label": "Prompt Tokens", "value": f"{s.promptTokens:,}"},
        {"label": "Completion Tokens", "value": f"{s.completionTokens:,}"},
        {"label": "Traces Analyzed", "value": f"{s.totalCount:,} ({s.successCount:,} ok / {s.errorCount:,} err)"},
        {"label": "Success Rate", "value": f"{s.successRate}%"},
    ]
    if model:
        summary_rows.append({"label": "Filtered Model", "value": str(model)})

    card = build_detail_card(
        title=f"Token Usage Summary · {_time_range_label(time_range)}",
        summary_rows=summary_rows,
        ctas=[
            {"label": "Cost Summary", "primary": True, "selection": {"action": "cost_summary", "time_range": time_range or "7d"}},
            {"label": "Recent Traces", "selection": {"action": "traces", "limit": 5}},
            {"label": "Errors & Performance", "selection": {"action": "errors_performance", "time_range": time_range or "7d"}},
        ],
    )
    return ChatReply("\n".join(lines), card_kind=CardKind.DETAIL, card_payload=card)


def format_cost_summary(data: MonitoringResponse, time_range: Optional[str], model: Optional[str] = None) -> ChatReply:
    s = data.summary
    model_label = f" for model {model}" if model else ""
    if s.totalCount == 0:
        narration = (
            f"No cost data{model_label} in {_time_range_label(time_range)} - "
            "no telemetry was recorded for this period."
        )
        card = build_detail_card(
            title=f"Estimated Cost · {_time_range_label(time_range)}",
            summary_rows=[
                {"label": "Estimated Total", "value": "$0.00 USD"},
                {"label": "Traces", "value": "0"},
            ],
            ctas=[
                {"label": "Account Overview", "primary": True, "selection": {"action": "overview"}},
            ],
        )
        return ChatReply(narration, card_kind=CardKind.DETAIL, card_payload=card)

    avg_cost = s.totalCost / s.totalCount if s.totalCount > 0 else 0.0
    lines = [
        f"Estimated cost{model_label} ({_time_range_label(time_range)}):",
        f"- Estimated total: ${s.totalCost:.4f} USD across {s.totalCount:,} traces",
        f"- Estimated average per trace: ${avg_cost:.6f}",
        COST_CAVEAT,
    ]
    summary_rows = [
        {"label": "Estimated Total", "value": f"${s.totalCost:.4f} USD"},
        {"label": "Average / Trace", "value": f"${avg_cost:.6f} USD"},
        {"label": "Total Traces", "value": f"{s.totalCount:,}"},
    ]
    if model:
        summary_rows.append({"label": "Filtered Model", "value": str(model)})

    card = build_detail_card(
        title=f"Estimated Cost Summary · {_time_range_label(time_range)}",
        summary_rows=summary_rows,
        ctas=[
            {"label": "Token Usage", "primary": True, "selection": {"action": "token_usage", "time_range": time_range or "7d"}},
            {"label": "Account Overview", "selection": {"action": "overview"}},
            {"label": "Active Applications", "selection": {"action": "applications"}},
        ],
    )
    return ChatReply("\n".join(lines), card_kind=CardKind.DETAIL, card_payload=card)


def format_applications(data: DashboardResponse, time_range: Optional[str]) -> ChatReply:
    s = data.summary
    if not data.applications and s.total_requests == 0:
        narration = (
            f"No tool/application activity recorded in {_time_range_label(time_range)}. "
            "Once your instrumented agents send telemetry, per-application summaries appear here."
        )
        card = build_detail_card(
            title=f"Application Summary · {_time_range_label(time_range)}",
            summary_rows=[
                {"label": "Active Applications", "value": "None detected yet"},
                {"label": "Workload Requests", "value": "0"},
            ],
            ctas=[
                {"label": "Account Overview", "primary": True, "selection": {"action": "overview"}},
            ],
        )
        return ChatReply(narration, card_kind=CardKind.DETAIL, card_payload=card)

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

    items = []
    for idx, app in enumerate(data.applications[:8]):
        items.append({
            "id": f"app_{idx}_{app.agent_name}",
            "title": app.agent_name,
            "subtitle": f"Requests: {s.total_requests:,} · Success: {s.success_rate}%",
            "badges": [{"label": "Active", "variant": "success"}],
            "secondary_text": f"Uptime: {s.uptime}%",
            "primary_cta": {
                "label": "Inspect Traces",
                "selection": {"action": "traces", "limit": 5},
            },
        })

    if items:
        card = build_carousel_card(
            title=f"Active Applications · {_time_range_label(time_range)}",
            subtitle=f"{len(data.applications)} application(s) actively reporting",
            items=items,
        )
        return ChatReply("\n".join(lines), card_kind=CardKind.CAROUSEL, card_payload=card)

    card = build_detail_card(
        title=f"Application Summary · {_time_range_label(time_range)}",
        summary_rows=[
            {"label": "Total Requests", "value": f"{s.total_requests:,}"},
            {"label": "Success Rate", "value": f"{s.success_rate}%"},
            {"label": "30-Day Uptime", "value": f"{s.uptime}%"},
        ],
        ctas=[
            {"label": "Account Overview", "primary": True, "selection": {"action": "overview"}},
        ],
    )
    return ChatReply("\n".join(lines), card_kind=CardKind.DETAIL, card_payload=card)


def format_errors_performance(
    monitoring: MonitoringResponse, dashboard: DashboardResponse, time_range: Optional[str]
) -> ChatReply:
    m = monitoring.summary
    d = dashboard.summary
    if m.totalCount == 0 and d.total_requests == 0:
        narration = (
            f"No telemetry recorded in {_time_range_label(time_range)}, "
            "so there are no error or performance statistics for this period."
        )
        card = build_detail_card(
            title=f"Errors & Performance · {_time_range_label(time_range)}",
            summary_rows=[
                {"label": "Status", "value": "No executions recorded"},
            ],
            ctas=[
                {"label": "Account Overview", "primary": True, "selection": {"action": "overview"}},
            ],
        )
        return ChatReply(narration, card_kind=CardKind.DETAIL, card_payload=card)

    lines = [
        f"Errors & performance ({_time_range_label(time_range)}):",
        "LLM calls:",
        f"- Errors: {m.errorCount:,} of {m.totalCount:,} traces ({m.successRate}% success)",
        f"- Latency: avg {m.avgLatencyMs} ms, p99 {m.p99LatencyMs} ms",
        "Tool/function calls:",
        f"- Requests: {d.total_requests:,} ({d.error_rate}% error rate)",
        f"- Avg response time: {d.avg_response_time_ms} ms | 30-day uptime: {d.uptime}%",
    ]
    card = build_detail_card(
        title=f"Errors & Performance · {_time_range_label(time_range)}",
        summary_rows=[
            {"label": "LLM Errors", "value": f"{m.errorCount:,} of {m.totalCount:,} ({m.successRate}% success)"},
            {"label": "LLM Latency", "value": f"Avg: {m.avgLatencyMs}ms | P99: {m.p99LatencyMs}ms"},
            {"label": "Tool Requests", "value": f"{d.total_requests:,} ({d.error_rate}% errors)"},
            {"label": "Tool Latency", "value": f"Avg: {d.avg_response_time_ms}ms"},
            {"label": "30-Day Uptime", "value": f"{d.uptime}%"},
        ],
        ctas=[
            {"label": "Diagnose Errors", "primary": True, "selection": {"action": "diagnose"}},
            {"label": "Simulate Defect", "selection": {"action": "simulate_error"}},
            {"label": "Account Overview", "selection": {"action": "overview"}},
        ],
    )
    return ChatReply("\n".join(lines), card_kind=CardKind.DETAIL, card_payload=card)


def format_traces(data: TracesResponse, limit: int) -> ChatReply:
    if not data.traces:
        narration = "No recent traces found for your account."
        card = build_detail_card(
            title="Recent Traces",
            summary_rows=[{"label": "Traces", "value": "None found"}],
            ctas=[{"label": "Account Overview", "primary": True, "selection": {"action": "overview"}}],
        )
        return ChatReply(narration, card_kind=CardKind.DETAIL, card_payload=card)

    header = (
        f"Most recent {len(data.traces)} of {data.total:,} traces "
        f"(avg latency {data.stats.avg_latency_ms} ms):"
    )
    lines = [header]
    items = []
    for idx, trace in enumerate(data.traces[:limit]):
        status = trace.status or "unknown"
        cost = f", est. ${trace.cost_usd:.5f}" if trace.cost_usd else ""
        start = f" @ {trace.start_time}" if trace.start_time else ""
        lines.append(
            f"- [{status}] {trace.name or 'unnamed'} ({trace.model or 'n/a'}) - "
            f"{trace.total_tokens:,} tokens, {trace.latency_ms:.0f} ms{cost}{start}"
        )
        is_err = status.lower() != "success"
        items.append({
            "id": f"trace_{idx}_{trace.name or 'trace'}",
            "title": f"Trace: {trace.name or 'LLM Call'}",
            "subtitle": f"{trace.model or 'Model'} · {trace.latency_ms:.0f}ms · {trace.total_tokens:,} tokens",
            "badges": [{"label": status.capitalize(), "variant": "warning" if is_err else "success"}],
            "secondary_text": f"Est: ${trace.cost_usd:.5f}" if trace.cost_usd else "$0.00",
            "primary_cta": {
                "label": "Diagnose" if is_err else "Token Usage",
                "selection": {"action": "diagnose" if is_err else "token_usage"},
            },
        })
    lines.append(COST_CAVEAT)

    card = build_carousel_card(
        title="Recent Execution Traces",
        subtitle=f"Showing {len(items)} trace(s) (avg latency: {data.stats.avg_latency_ms}ms)",
        items=items,
    )
    return ChatReply("\n".join(lines), card_kind=CardKind.CAROUSEL, card_payload=card)


def format_diagnostic_report(diag, selected_repo: Optional[str] = None) -> ChatReply:  # noqa: ANN001
    """Format sanitized diagnostic report with human approval notice and Review card."""
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

    narration = "\n".join(lines)

    target_file = diag.proposed_patch.target_file if diag.proposed_patch else "N/A"
    summary_rows = [
        {"label": "Diagnostic ID", "value": str(diag.id)},
        {"label": "Error Category", "value": str(diag.category)},
        {"label": "Target File", "value": str(target_file)},
        {"label": "Target Repository", "value": str(selected_repo or "None selected (click Select Repo)")},
        {"label": "Patch Status", "value": "Ready for Review" if diag.proposed_patch else "Informational Only"},
    ]

    card = build_review_card(
        title=f"Review Fix Proposal: {diag.category.replace('_', ' ').title()}",
        summary_rows=summary_rows,
        approve_label="Approve & Create Pull Request",
        approve_selection={"action": "approve_pr", "diagnostic_id": str(diag.id)},
        reject_label="Select Repository" if not selected_repo else "Dismiss",
        reject_selection={"action": "select_repo_prompt"} if not selected_repo else {"action": "overview"},
    )
    return ChatReply(narration, card_kind=CardKind.REVIEW, card_payload=card)


def format_repo_selected(repo: str) -> ChatReply:
    narration = (
        f"🎯 **Target Repository Selected:** `{repo}`\n\n"
        "Approved patches and diagnostic fixes will now create isolated branches "
        f"and pull requests on `{repo}`. Reply 'approve pr' when ready."
    )
    card = build_detail_card(
        title="Target Repository Configured",
        summary_rows=[
            {"label": "Repository", "value": str(repo)},
            {"label": "Status", "value": "Ready for automated PR patches"},
        ],
        ctas=[
            {"label": "Diagnose Errors", "primary": True, "selection": {"action": "diagnose"}},
            {"label": "Change Repository", "selection": {"action": "select_repo_prompt"}},
        ],
    )
    return ChatReply(narration, card_kind=CardKind.DETAIL, card_payload=card)


def format_github_linked(repo: Optional[str], has_token: bool) -> ChatReply:
    lines = ["🔗 **GitHub Integration Linked Successfully:**"]
    if repo:
        lines.append(f"• **Target Repository**: `{repo}`")
    else:
        lines.append("• **Target Repository**: Not selected yet (reply `select repo <owner/repo>`)")
    lines.append(f"• **Credentials**: {'[SECURELY LINKED]' if has_token else 'Sandbox Mode'}")
    lines.append("\nYou can now diagnose runtime errors and automatically push fixes via 'approve pr'.")
    card = build_detail_card(
        title="GitHub Integration Linked",
        summary_rows=[
            {"label": "Target Repository", "value": str(repo or "None selected")},
            {"label": "Credentials", "value": "🟢 Connected" if has_token else "⚪ Sandbox Mode"},
        ],
        ctas=[
            {"label": "Diagnose Errors", "primary": True, "selection": {"action": "diagnose"}},
            {"label": "Set / Change Repo", "selection": {"action": "select_repo_prompt"}},
        ],
    )
    return ChatReply("\n".join(lines), card_kind=CardKind.DETAIL, card_payload=card)


def format_repo_status(repo: Optional[str], has_token: bool) -> ChatReply:
    lines = ["📋 **GitHub Integration & Repository Status:**"]
    if repo:
        lines.append(f"• **Active Target Repository**: `{repo}`")
    else:
        lines.append("• **Active Target Repository**: None selected. (Reply `select repo <owner/repo>` to set one)")
    lines.append(f"• **GitHub Token**: {'🟢 Connected' if has_token else '⚪ Unconfigured / Mock Sandbox'}")
    card = build_detail_card(
        title="GitHub Integration Status",
        summary_rows=[
            {"label": "Active Target Repository", "value": str(repo or "None selected")},
            {"label": "GitHub Token", "value": "🟢 Connected" if has_token else "⚪ Unconfigured / Mock Sandbox"},
        ],
        ctas=[
            {"label": "Set / Change Repo", "primary": True, "selection": {"action": "select_repo_prompt"}},
            {"label": "Diagnose Errors", "selection": {"action": "diagnose"}},
        ],
    )
    return ChatReply("\n".join(lines), card_kind=CardKind.DETAIL, card_payload=card)


def format_pr_success(pr_url: str, branch: str, title: str) -> ChatReply:
    narration = (
        "✅ Pull Request Created Successfully:\n"
        f"- Title: {title}\n"
        f"- Branch: {branch}\n"
        f"- Pull Request: {pr_url}\n\n"
        "Security Note: No credentials, tokens, or sensitive production logs were included. "
        "The change is isolated to the feature branch and requires code review before merging."
    )
    card = build_detail_card(
        title="Pull Request Created Successfully",
        summary_rows=[
            {"label": "PR Title", "value": str(title)},
            {"label": "Branch", "value": str(branch)},
            {"label": "Pull Request", "value": str(pr_url)},
            {"label": "Security", "value": "Isolated branch, human review required"},
        ],
        ctas=[
            {"label": "Account Overview", "primary": True, "selection": {"action": "overview"}},
            {"label": "Errors & Performance", "selection": {"action": "errors_performance"}},
        ],
    )
    return ChatReply(narration, card_kind=CardKind.DETAIL, card_payload=card)
