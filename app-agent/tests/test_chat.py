"""End-to-end chat flow tests with a mocked backend.

Covers: valid supported questions, unsupported questions, backend success
and failure, authentication failures, missing/invalid account linkage,
missing analytics data, malformed backend responses, and prevention of
unauthorized cross-account access.
"""

from __future__ import annotations

from handlers import responses
from tests.conftest import KEY_A, KEY_B, UNKNOWN_KEY

SENDER_A = "agent1qaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"[:71]
SENDER_B = "agent1qbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"[:71]


async def link_alice(processor):
    return await processor.process(f"link account {KEY_A}", SENDER_A)


# ---------------------------------------------------------------------------
# Account linking
# ---------------------------------------------------------------------------


async def test_link_validates_and_confirms(processor, backend):
    reply = await link_alice(processor)
    assert "Account linked" in reply
    assert "Alice" in reply
    assert "account #1" in reply
    # The key itself must never appear in the reply.
    assert KEY_A not in reply


async def test_link_with_invalid_backend_key_is_rejected(processor):
    # Locally well-formed but unknown to the backend -> 401 -> rejected.
    reply = await processor.process(f"link account {UNKNOWN_KEY}", SENDER_A)
    assert "rejected" in reply
    # And the sender must remain unlinked.
    assert "token usage" not in reply.lower()
    reply2 = await processor.process("token usage", SENDER_A)
    assert reply2 == responses.LINK_INSTRUCTIONS


async def test_unlinked_sender_gets_link_instructions(processor):
    for question in (
        "account overview",
        "token usage",
        "estimated cost",
        "project summary",
        "error rate",
        "recent traces",
    ):
        reply = await processor.process(question, SENDER_A)
        assert reply == responses.LINK_INSTRUCTIONS, question


async def test_unlink(processor):
    await link_alice(processor)
    reply = await processor.process("unlink account", SENDER_A)
    assert "unlinked" in reply.lower()
    reply2 = await processor.process("token usage", SENDER_A)
    assert reply2 == responses.LINK_INSTRUCTIONS


async def test_unlink_when_not_linked(processor):
    reply = await processor.process("unlink account", SENDER_A)
    assert "nothing to remove" in reply


# ---------------------------------------------------------------------------
# Supported questions (authorized)
# ---------------------------------------------------------------------------


async def test_token_usage_answer(processor):
    await link_alice(processor)
    reply = await processor.process("how many tokens did I use in the last 7 days", SENDER_A)
    assert "Token usage" in reply
    assert "1,111" in reply
    assert "the last 7 days" in reply


async def test_estimated_cost_answer_is_labeled(processor):
    await link_alice(processor)
    reply = await processor.process("what did I spend in the last 30 days", SENDER_A)
    assert "Estimated cost" in reply
    assert "$1.5000" in reply
    assert "not confirmed provider billing" in reply


async def test_overview_answer(processor):
    await link_alice(processor)
    reply = await processor.process("account overview", SENDER_A)
    assert "Alice" in reply
    assert "alice@example.com" not in reply  # email is masked
    assert "a***@example.com" in reply
    assert "Backend: healthy" in reply


async def test_application_summary_answer(processor):
    await link_alice(processor)
    reply = await processor.process("project summary this week", SENDER_A)
    assert "assistant" in reply
    assert "weather-agent" in reply
    assert "100" in reply  # total requests for Alice's account


async def test_errors_performance_answer(processor):
    await link_alice(processor)
    reply = await processor.process("error rate and latency last 24 hours", SENDER_A)
    assert "Errors & performance" in reply
    assert "p99" in reply
    assert "910.2" in reply


async def test_recent_traces_answer(processor):
    await link_alice(processor)
    reply = await processor.process("show me the last 5 traces", SENDER_A)
    assert "trace-aaa" in reply or "gemini_generate" in reply
    assert "42 tokens" in reply
    assert "est." in reply


# ---------------------------------------------------------------------------
# Unsupported questions
# ---------------------------------------------------------------------------


async def test_unsupported_question(processor):
    reply = await processor.process("what is the meaning of life", SENDER_A)
    assert reply == responses.UNSUPPORTED_TEXT


async def test_help_and_welcome(processor):
    assert "Supported questions" in await processor.process("help", SENDER_A)
    assert "Hello!" in await processor.process("hello", SENDER_A)


# ---------------------------------------------------------------------------
# Backend failures
# ---------------------------------------------------------------------------


async def test_backend_down(processor, backend):
    await link_alice(processor)
    backend.failure_mode = "timeout"
    reply = await processor.process("token usage", SENDER_A)
    assert reply == responses.BACKEND_DOWN_TEXT


async def test_backend_connection_error(processor, backend):
    await link_alice(processor)
    backend.failure_mode = "connect_error"
    reply = await processor.process("account overview", SENDER_A)
    assert reply == responses.BACKEND_DOWN_TEXT


async def test_malformed_backend_response(processor, backend):
    await link_alice(processor)
    backend.failure_mode = "malformed"
    reply = await processor.process("token usage", SENDER_A)
    assert "unexpected format" in reply


async def test_auth_failure_on_data_query_unlinks(processor, backend):
    await link_alice(processor)
    # The key is revoked after linking (backend no longer recognizes it).
    del backend.users[KEY_A]
    reply = await processor.process("token usage", SENDER_A)
    assert reply == responses.AUTH_FAILED_TEXT
    # Subsequent questions get fresh linking instructions.
    reply2 = await processor.process("token usage", SENDER_A)
    assert reply2 == responses.LINK_INSTRUCTIONS


# ---------------------------------------------------------------------------
# Missing analytics data
# ---------------------------------------------------------------------------


async def test_no_data_for_period(processor, backend):
    await link_alice(processor)
    empty = backend.monitoring[KEY_A]
    empty["summary"]["totalCount"] = 0
    reply = await processor.process("token usage", SENDER_A)
    assert "No LLM traces recorded" in reply


async def test_no_traces(processor, backend):
    await link_alice(processor)
    backend.traces[KEY_A]["traces"] = []
    backend.traces[KEY_A]["total"] = 0
    reply = await processor.process("recent traces", SENDER_A)
    assert "No recent traces" in reply


# ---------------------------------------------------------------------------
# Cross-account isolation
# ---------------------------------------------------------------------------


async def test_cross_account_isolation(processor):
    await link_alice(processor)
    await processor.process(f"link account {KEY_B}", SENDER_B)

    reply_a = await processor.process("token usage", SENDER_A)
    reply_b = await processor.process("token usage", SENDER_B)

    assert "1,111" in reply_a and "9,999" not in reply_a
    assert "9,999" in reply_b and "1,111" not in reply_b


async def test_relinking_changes_scope(processor):
    await link_alice(processor)
    # The same sender re-links to Bob's account; Alice's numbers disappear.
    await processor.process(f"link account {KEY_B}", SENDER_A)
    reply = await processor.process("token usage", SENDER_A)
    assert "9,999" in reply
    assert "1,111" not in reply
