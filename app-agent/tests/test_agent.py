"""Agent construction tests (offline; the agent is never started)."""

from __future__ import annotations

import pytest
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    StartSessionContent,
    TextContent,
    chat_protocol_spec,
)

from agent import _extract_text, build_agent
from config import ConfigError, Settings

TEST_SEED = "test-only-seed-phrase-not-a-real-credential-1234"


def make_settings(**overrides) -> Settings:
    defaults = dict(
        agent_name="test_agent",
        agent_seed_phrase=TEST_SEED,
        agent_port=18999,
        agent_endpoint=["http://localhost:18999/submit"],
        agent_mailbox=False,
        telemetry_api_base_url="http://localhost:8080",
        telemetry_account_auth_mode="link",
        http_timeout_seconds=5.0,
        log_level="INFO",
    )
    defaults.update(overrides)
    return Settings(**defaults)


async def test_agent_builds_with_deterministic_address():
    agent1, client1 = build_agent(make_settings())
    agent2, client2 = build_agent(make_settings())
    try:
        assert agent1.name == "test_agent"
        assert agent1.address.startswith("agent1")
        # Same seed -> same identity.
        assert agent1.address == agent2.address
    finally:
        await client1.aclose()
        await client2.aclose()


async def test_agent_requires_seed_phrase():
    with pytest.raises(ConfigError, match="AGENT_SEED_PHRASE"):
        build_agent(make_settings(agent_seed_phrase=None))


async def test_chat_protocol_included_and_manifest_published():
    agent, client = build_agent(make_settings())
    try:
        registered_specs = [getattr(p, "spec", None) for p in agent.protocols.values()]
        assert any(s is chat_protocol_spec for s in registered_specs)
    finally:
        await client.aclose()


def test_chat_protocol_spec_version():
    assert chat_protocol_spec.name == "AgentChatProtocol"
    assert chat_protocol_spec.version == "0.3.0"


def test_extract_text_collects_text_content():
    msg = ChatMessage(
        content=[
            TextContent(type="text", text="token usage"),
            TextContent(type="text", text="please"),
        ]
    )
    assert _extract_text(msg) == "token usage\nplease"


def test_extract_text_ignores_non_text_content():
    msg = ChatMessage(content=[StartSessionContent(type="start-session")])
    assert _extract_text(msg) == ""
