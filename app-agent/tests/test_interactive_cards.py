"""Tests for ASI:One Interactive Cards protocol compliance and interactive chat flows.

Validates:
- Wire protocol constraints (card_protocol_version: "1", requires_card_interaction: "true")
- 64 KB payload size limit enforcement
- Predefined card schemas (carousel, detail, form, review, custom)
- ChatReply serialization into ACP ChatMessage with MetadataContent
- Incoming card selection JSON parsing and action routing
- End-to-end responses attaching rich interactive cards
"""

from __future__ import annotations

import json
import pytest
from uagents_core.contrib.protocols.chat import MetadataContent, TextContent

from cards import (
    CardKind,
    ChatReply,
    MAX_PAYLOAD_BYTES,
    build_carousel_card,
    build_custom_card,
    build_detail_card,
    build_form_card,
    build_review_card,
)
from handlers import responses
from handlers.intents import IntentName, parse_intent
from tests.conftest import KEY_A

SENDER = "agent1qaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"[:71]


# ============================================================================
# Card Builders & Protocol Serialization Tests
# ============================================================================


def test_card_reply_string_compatibility():
    """ChatReply must behave identically to str for all standard string operations."""
    reply = ChatReply("Welcome to ASI-Telemetry!", card_kind=CardKind.CAROUSEL, card_payload={"title": "Test"})
    assert reply == "Welcome to ASI-Telemetry!"
    assert "Welcome" in reply
    assert reply.startswith("Welcome")
    assert isinstance(reply, str)
    assert reply.has_card()


def test_card_metadata_wire_protocol_keys():
    """Metadata dict must contain all required wire protocol keys per ASI:One specification."""
    payload = build_detail_card(
        title="Test Detail",
        summary_rows=[{"label": "Account", "value": "Alice"}],
    )
    reply = ChatReply("Narration text", card_kind=CardKind.DETAIL, card_payload=payload)
    meta = reply.metadata_dict()

    # All wire values must be str
    assert isinstance(meta, dict)
    for k, v in meta.items():
        assert isinstance(k, str)
        assert isinstance(v, str)

    assert meta["card_protocol_version"] == "1"
    assert meta["requires_card_interaction"] == "true"
    assert meta["card_kind"] == "detail"
    assert meta["preferred_drawer_width_px"] == "540"

    decoded = json.loads(meta["card_payload"])
    assert decoded["title"] == "Test Detail"
    assert decoded["summary_rows"] == [{"label": "Account", "value": "Alice"}]


def test_card_drawer_width_clamping():
    """preferred_drawer_width_px must be clamped between 320 and 800."""
    reply_too_small = ChatReply("text", card_kind="detail", card_payload={"title": "T"}, preferred_drawer_width_px=200)
    assert reply_too_small.metadata_dict()["preferred_drawer_width_px"] == "320"

    reply_too_large = ChatReply("text", card_kind="detail", card_payload={"title": "T"}, preferred_drawer_width_px=1200)
    assert reply_too_large.metadata_dict()["preferred_drawer_width_px"] == "800"


def test_terminal_card_flag():
    """Terminal informational cards must set is_terminal: 'true'."""
    reply = ChatReply(
        "Notice",
        card_kind=CardKind.DETAIL,
        card_payload={"title": "Notice", "summary_rows": []},
        is_terminal=True,
    )
    meta = reply.metadata_dict()
    assert meta["is_terminal"] == "true"
    assert meta["requires_card_interaction"] == "false"


def test_card_payload_size_limit():
    """Payloads exceeding 64 KB must raise ValueError."""
    giant_payload = {"title": "Giant", "data": "x" * (MAX_PAYLOAD_BYTES + 100)}
    reply = ChatReply("text", card_kind=CardKind.DETAIL, card_payload=giant_payload)
    with pytest.raises(ValueError, match="exceeds limit"):
        reply.metadata_dict()


def test_to_chat_message_includes_text_and_metadata():
    """ChatReply.to_chat_message() creates valid ChatMessage with both TextContent and MetadataContent."""
    card = build_form_card(
        title="Form",
        fields=[{"name": "field1", "kind": "text", "label": "Label 1"}],
        submit_label="Save",
        submit_selection={"action": "save"},
    )
    reply = ChatReply("Please fill out this form:", card_kind=CardKind.FORM, card_payload=card)
    msg = reply.to_chat_message()

    assert len(msg.content) == 2
    assert isinstance(msg.content[0], TextContent)
    assert msg.content[0].text == "Please fill out this form:"
    assert isinstance(msg.content[1], MetadataContent)
    assert msg.content[1].type == "metadata"
    assert msg.content[1].metadata["card_kind"] == "form"


# ============================================================================
# Predefined Card Schemas Validation
# ============================================================================


def test_carousel_schema():
    items = [
        {
            "id": "item_1",
            "title": "Item 1",
            "subtitle": "Subtitle 1",
            "badges": [{"label": "Active", "variant": "success"}],
            "secondary_text": "USD 10",
            "primary_cta": {"label": "Select", "selection": {"id": "item_1"}},
        }
    ]
    payload = build_carousel_card(title="Test Carousel", items=items, subtitle="Sub")
    assert payload["title"] == "Test Carousel"
    assert payload["subtitle"] == "Sub"
    assert len(payload["items"]) == 1
    assert payload["items"][0]["primary_cta"]["label"] == "Select"


def test_review_schema():
    payload = build_review_card(
        title="Confirm Action",
        summary_rows=[{"label": "Action", "value": "Deploy"}],
        approve_label="Yes, Deploy",
        approve_selection={"action": "deploy_confirm"},
        reject_label="Abort",
        reject_selection={"action": "abort"},
    )
    assert payload["title"] == "Confirm Action"
    assert payload["approve_cta"]["primary"] is True
    assert payload["approve_cta"]["selection"] == {"action": "deploy_confirm"}
    assert payload["reject_cta"]["selection"] == {"action": "abort"}


def test_custom_element_tree_schema():
    root = {
        "type": "section",
        "title": "Custom Diagnostics",
        "children": [
            {"type": "heading", "value": "Error Details", "level": 2},
            {"type": "badge", "label": "Fatal", "variant": "warning"},
            {"type": "button", "label": "Fix Now", "primary": True, "action": {"selection": {"action": "fix"}}},
        ],
    }
    payload = build_custom_card(root)
    assert "root" in payload
    assert payload["root"]["type"] == "section"
    assert len(payload["root"]["children"]) == 3


# ============================================================================
# Card Selection Parsing Tests
# ============================================================================


def test_parse_intent_from_direct_card_selection_json():
    """Direct @mention selection JSON from ASI:One cards must map to respective Intents."""
    # 1. Overview selection
    intent = parse_intent('{"action": "overview"}')
    assert intent.name == IntentName.OVERVIEW

    # 2. Token usage with sub-option time range
    intent = parse_intent('{"action": "token_usage", "time_range": "30d"}')
    assert intent.name == IntentName.TOKEN_USAGE
    assert intent.time_range == "30d"

    # 3. Cost summary
    intent = parse_intent('{"action": "cost_summary", "time_range": "24h"}')
    assert intent.name == IntentName.COST_SUMMARY
    assert intent.time_range == "24h"

    # 4. Traces selection
    intent = parse_intent('{"action": "traces", "limit": 7}')
    assert intent.name == IntentName.TRACES
    assert intent.limit == 7

    # 5. Approve PR from review card
    intent = parse_intent('{"action": "approve_pr", "diagnostic_id": "diag_123"}')
    assert intent.name == IntentName.APPROVE_PR

    # 6. Form submission for account linking
    intent = parse_intent('{"action": "link", "handoff_code": "AUTH-ABCD1234"}')
    assert intent.name == IntentName.LINK
    assert intent.handoff_code == "AUTH-ABCD1234"

    # 7. Form submission for repo selection
    intent = parse_intent('{"action": "select_repo", "repo": "devrithm/sample-uagent"}')
    assert intent.name == IntentName.SELECT_REPO
    assert intent.repo == "devrithm/sample-uagent"

    # 8. Nested selection wrapper (some client variants)
    intent = parse_intent('{"selection": {"action": "diagnose"}}')
    assert intent.name == IntentName.DIAGNOSE


# ============================================================================
# End-to-End Chat Responses with Interactive Cards
# ============================================================================


async def test_welcome_returns_carousel_card(processor):
    reply = await processor.process("hi", SENDER)
    assert isinstance(reply, ChatReply)
    assert reply.has_card()
    assert reply.card_kind == CardKind.CAROUSEL
    items = reply.card_payload["items"]
    assert any(item["primary_cta"]["selection"]["action"] == "overview" for item in items)
    assert any(item["primary_cta"]["selection"]["action"] == "diagnose" for item in items)


async def test_unlinked_sender_gets_interactive_card(processor):
    reply = await processor.process("account overview", SENDER)
    assert isinstance(reply, ChatReply)
    assert reply.has_card()
    assert reply.card_kind == CardKind.DETAIL
    # The CTA to connect must be present
    ctas = reply.card_payload["ctas"]
    assert any(cta["selection"]["action"] == "connect" for cta in ctas)


async def test_authenticated_overview_returns_detail_card(processor):
    await processor.process(f"link account {KEY_A}", SENDER)
    reply = await processor.process("account overview", SENDER)
    assert isinstance(reply, ChatReply)
    assert reply.has_card()
    assert reply.card_kind == CardKind.DETAIL
    assert "Alice" in reply.card_payload["title"]
    assert "sub_options" in reply.card_payload
    assert reply.card_payload["sub_options"]["name"] == "time_range"


async def test_authenticated_token_usage_returns_detail_card(processor):
    await processor.process(f"link account {KEY_A}", SENDER)
    reply = await processor.process("token usage for the last 7 days", SENDER)
    assert isinstance(reply, ChatReply)
    assert reply.has_card()
    assert reply.card_kind == CardKind.DETAIL
    assert any("Total Tokens" in row["label"] for row in reply.card_payload["summary_rows"])


async def test_authenticated_traces_returns_carousel_card(processor):
    await processor.process(f"link account {KEY_A}", SENDER)
    reply = await processor.process("show me the last 5 traces", SENDER)
    assert isinstance(reply, ChatReply)
    assert reply.has_card()
    assert reply.card_kind == CardKind.CAROUSEL
    assert len(reply.card_payload["items"]) > 0


async def test_authenticated_diagnose_returns_review_card(processor):
    await processor.process(f"link account {KEY_A}", SENDER)
    # Trigger an error first
    await processor.process("simulate error", SENDER)
    reply = await processor.process("diagnose", SENDER)
    assert isinstance(reply, ChatReply)
    assert reply.has_card()
    assert reply.card_kind == CardKind.REVIEW
    assert reply.card_payload["approve_cta"]["selection"]["action"] == "approve_pr"
    assert reply.card_payload["approve_cta"]["primary"] is True


async def test_card_interaction_flow_from_json(processor):
    """Simulate user clicking a card CTA in ASI:One and receiving updated card."""
    await processor.process(f"link account {KEY_A}", SENDER)

    # User clicks "token_usage" card button with time_range="30d"
    card_click_msg = json.dumps({"action": "token_usage", "time_range": "30d"})
    reply = await processor.process(card_click_msg, SENDER)
    assert isinstance(reply, ChatReply)
    assert reply.has_card()
    assert reply.card_kind == CardKind.DETAIL
    assert "last 30 days" in reply.lower()
