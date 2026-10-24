"""Tests for multi-tenant GitHub MCP integration and in-chat repository selection in ASI:One."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from handlers.chat import ChatProcessor
from handlers.intents import parse_intent, IntentName
from services.account_link import AccountLinkStore
from services.diagnostics import DiagnosticService
from services.github_service import GitHubIntegrationService
from services.telemetry import TelemetryService


SENDER_ALICE = "agent1qalice111111111111111111111111111111111111111111111111111"
SENDER_BOB = "agent1qbob2222222222222222222222222222222222222222222222222222"


def test_github_service_rejects_missing_or_invalid_repo():
    # 1. Unspecified repo has empty repository attribute
    service = GitHubIntegrationService()
    assert service.repository == ""

    # 2. Invalid repository format is rejected
    with pytest.raises(ValueError, match="Invalid repository format"):
        GitHubIntegrationService(repo="invalid-format-without-owner")

    # 3. Valid repository format is accepted
    service_valid = GitHubIntegrationService(repo="my-org/my-agent")
    assert service_valid.repository == "my-org/my-agent"


@pytest.mark.asyncio
async def test_repo_selection_and_status_in_chat():
    telemetry_mock = MagicMock(spec=TelemetryService)
    links = AccountLinkStore()
    diagnostics = DiagnosticService()
    processor = ChatProcessor(telemetry_mock, links, diagnostics=diagnostics)

    # 1. Check status before selection
    status_reply = await processor.process("repo status", SENDER_ALICE)
    assert "None selected" in status_reply

    # 2. Select repository for Alice
    select_reply = await processor.process("select repo alice-org/agent-service", SENDER_ALICE)
    assert "Target Repository Selected" in select_reply
    assert "alice-org/agent-service" in select_reply

    # 3. Verify status now reflects selected repo
    status_reply2 = await processor.process("current repo", SENDER_ALICE)
    assert "alice-org/agent-service" in status_reply2

    # 4. Verify Bob does not share Alice's repository (multi-tenant isolation)
    bob_status = await processor.process("repo status", SENDER_BOB)
    assert "None selected" in bob_status


@pytest.mark.asyncio
async def test_link_github_in_chat():
    telemetry_mock = MagicMock(spec=TelemetryService)
    links = AccountLinkStore()
    diagnostics = DiagnosticService()
    processor = ChatProcessor(telemetry_mock, links, diagnostics=diagnostics)

    # Link with token and repo
    link_reply = await processor.process(
        "link github ghp_1234567890abcdef bob-org/bob-agent", SENDER_BOB
    )
    assert "GitHub Integration Linked Successfully" in link_reply
    assert "bob-org/bob-agent" in link_reply
    assert "[SECURELY LINKED]" in link_reply

    token, repo = links.get_github(SENDER_BOB)
    assert token == "ghp_1234567890abcdef"
    assert repo == "bob-org/bob-agent"


@pytest.mark.asyncio
async def test_diagnose_and_approve_prompts_for_repo_selection():
    telemetry_mock = MagicMock(spec=TelemetryService)
    links = AccountLinkStore()
    diagnostics = DiagnosticService()
    processor = ChatProcessor(telemetry_mock, links, diagnostics=diagnostics)

    # Simulate an error
    try:
        raise KeyError("missing_metric")
    except KeyError as exc:
        diagnostics.capture_exception(exc, sender=SENDER_ALICE, category="agent_defect", status_code=500)

    # 1. Diagnose without selected repo asks user to select repo
    diag_reply = await processor.process("diagnose", SENDER_ALICE)
    assert "Target Repository: None" in diag_reply or "select repo <owner/repo>" in diag_reply

    # 2. Attempting to approve PR before selecting repo prompts for repo selection
    pr_prompt = await processor.process("approve pr", SENDER_ALICE)
    assert "Please select the GitHub repository where this error occurred" in pr_prompt

    # 3. User selects repo
    await processor.process("select repo alice-org/agent-service", SENDER_ALICE)

    # 4. Now approve PR uses the selected repo
    pr_reply = await processor.process("approve pr", SENDER_ALICE)
    assert "Pull Request Created Successfully" in pr_reply
    assert "alice-org/agent-service" in pr_reply


@pytest.mark.asyncio
async def test_unlink_cleans_up_github_bindings():
    links = AccountLinkStore()
    links.set_github(SENDER_ALICE, token="ghp_test123", repo="alice/repo")
    assert links.get_selected_repo(SENDER_ALICE) == "alice/repo"

    links.unlink(SENDER_ALICE)
    assert links.get_selected_repo(SENDER_ALICE) is None
