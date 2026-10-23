"""ASI-Telemetry agent: uAgent runtime with the Agent Chat Protocol (ACP).

Implements Fetch.ai's Agent Chat Protocol v0.3.0 so the agent can be
discovered and used through Agentverse / ASI:ONE. See README.md for the
registration walkthrough.

Runtime identity comes from ``AGENT_SEED_PHRASE`` (kept in a local .env,
never committed). The agent is read-only: it answers questions about one
linked ASI-Telemetry account per chat participant and performs no account
modifications.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional, Tuple

from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    TextContent,
    chat_protocol_spec,
)

from api_client import TelemetryApiClient
from config import Settings, ConfigError
from handlers.chat import ChatProcessor
from services.account_link import AccountLinkStore
from services.telemetry import TelemetryService

logger = logging.getLogger("asi_telemetry.agent")


def _configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level, logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


def _extract_text(msg: ChatMessage) -> str:
    """Collect plain text from an incoming ChatMessage."""
    parts = []
    for item in msg.content:
        if isinstance(item, TextContent):
            parts.append(item.text)
    return "\n".join(parts).strip()


def build_agent(
    settings: Settings,
    processor: Optional[ChatProcessor] = None,
    client: Optional[TelemetryApiClient] = None,
) -> Tuple[Agent, TelemetryApiClient]:
    """Construct the uAgent with ACP handlers wired.

    The HTTP client is returned alongside the agent so the caller can close
    it on shutdown. A pre-built ``processor`` may be injected for tests.
    """
    seed = settings.require_seed_phrase()

    owns_client = client is None
    if client is None:
        client = TelemetryApiClient(
            base_url=settings.telemetry_api_base_url,
            timeout_seconds=settings.http_timeout_seconds,
        )

    if processor is None:
        links = AccountLinkStore()
        service = TelemetryService(client)
        processor = ChatProcessor(service, links)

    agent = Agent(
        name=settings.agent_name,
        seed=seed,
        port=settings.agent_port,
        endpoint=settings.agent_endpoint,
        mailbox=settings.agent_mailbox,
    )

    chat_proto = Protocol(spec=chat_protocol_spec)

    @agent.on_event("startup")
    async def _on_startup(ctx: Context) -> None:
        ctx.logger.info(
            "ASI-Telemetry agent '%s' started with address %s (ACP %s)",
            ctx.agent.name,
            ctx.agent.address,
            chat_protocol_spec.version,
        )
        ctx.logger.info(
            "Telemetry backend base URL: %s | mailbox mode: %s",
            settings.telemetry_api_base_url,
            settings.agent_mailbox,
        )

    @agent.on_event("shutdown")
    async def _on_shutdown(ctx: Context) -> None:
        if owns_client:
            await client.aclose()
        ctx.logger.info("ASI-Telemetry agent '%s' stopped", ctx.agent.name)

    @chat_proto.on_message(ChatMessage)
    async def _on_chat_message(ctx: Context, sender: str, msg: ChatMessage) -> None:
        # Acknowledge receipt first so the client knows the message arrived.
        try:
            await ctx.send(
                sender,
                ChatAcknowledgement(
                    timestamp=datetime.now(timezone.utc),
                    acknowledged_msg_id=msg.msg_id,
                ),
            )
        except Exception:  # noqa: BLE001
            ctx.logger.warning("Failed to acknowledge message from %s", sender)

        text = _extract_text(msg)
        if not text:
            reply_text = (
                "I can only process plain-text questions about your "
                "ASI-Telemetry account. Please send your question as text."
            )
        else:
            reply_text = await processor.process(text, sender)

        try:
            await ctx.send(
                sender,
                ChatMessage(
                    timestamp=datetime.now(timezone.utc),
                    content=[TextContent(type="text", text=reply_text)],
                ),
            )
        except Exception:  # noqa: BLE001 - a send failure must not crash the agent
            ctx.logger.exception("Failed to send reply to %s", sender)

    @chat_proto.on_message(ChatAcknowledgement)
    async def _on_chat_ack(ctx: Context, sender: str, msg: ChatAcknowledgement) -> None:
        # Receipt confirmations are informational only.
        ctx.logger.debug("Acknowledgement from %s for %s", sender, msg.acknowledged_msg_id)

    # publish_manifest advertises ACP support to Agentverse / ASI:ONE.
    agent.include(chat_proto, publish_manifest=True)
    return agent, client


def main() -> None:
    settings = Settings.from_env()
    _configure_logging(settings.log_level)
    try:
        settings.require_seed_phrase()
    except ConfigError as exc:
        logger.error("%s", exc)
        raise SystemExit(1) from exc

    agent, _client = build_agent(settings)
    logger.info(
        "Starting agent '%s' on port %s (address %s)",
        settings.agent_name,
        settings.agent_port,
        agent.address,
    )
    agent.run()


if __name__ == "__main__":
    main()
