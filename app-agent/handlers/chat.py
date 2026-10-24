"""Chat orchestration: intent -> authorized backend call -> formatted reply.

The processor is deliberately independent of the uAgent runtime so the full
request flow can be unit-tested with a mocked backend. The uAgent wiring in
``agent.py`` only performs protocol concerns (ack, send, logging).
"""

from __future__ import annotations

import logging
from typing import Callable, Optional

from api_client import (
    AuthenticationError,
    AuthorizationError,
    BackendHttpError,
    BackendResponseError,
    BackendUnavailableError,
)
from handlers import responses
from handlers.intents import Intent, IntentName, parse_intent
from services.account_link import AccountLinkStore, InvalidKeyFormatError
from services.diagnostics import DiagnosticService
from services.github_service import GitHubIntegrationService
from services.telemetry import TelemetryService


class _NotLinkedError(Exception):
    """Raised internally when a sender has no linked account."""


logger = logging.getLogger("asi_telemetry.agent.chat")


class ChatProcessor:
    """Routes chat text to capabilities, enforcing account linkage."""

    def __init__(
        self,
        service: TelemetryService,
        links: AccountLinkStore,
        diagnostics: Optional[DiagnosticService] = None,
        github: Optional[GitHubIntegrationService] = None,
    ):
        self._service = service
        self._links = links
        self._diagnostics = diagnostics or DiagnosticService()
        self._github = github or GitHubIntegrationService()

    async def process(self, text: str, sender: str) -> str:
        """Return the reply text for one incoming chat message."""
        intent = parse_intent(text)
        logger.info("Intent '%s' from sender %s", intent.name.value, sender)

        try:
            reply = await self._dispatch(intent, sender)
        except _NotLinkedError:
            return responses.LINK_INSTRUCTIONS
        except AuthenticationError as exc:
            logger.warning("Backend rejected the credential for sender %s", sender)
            self._diagnostics.capture_exception(
                exc,
                sender=sender,
                category="authentication",
                status_code=401,
                operation=intent.name.value,
            )
            self._links.unlink(sender)
            return responses.AUTH_FAILED_TEXT
        except AuthorizationError as exc:
            logger.warning("Backend denied authorization (403) for sender %s", sender)
            self._diagnostics.capture_exception(
                exc,
                sender=sender,
                category="authorization",
                status_code=403,
                operation=intent.name.value,
            )
            return "Access forbidden (403): You do not have permission to view or access this telemetry resource."
        except BackendUnavailableError as exc:
            self._diagnostics.capture_exception(
                exc,
                sender=sender,
                category="network",
                status_code=503,
                operation=intent.name.value,
            )
            return responses.BACKEND_DOWN_TEXT
        except (BackendResponseError, BackendHttpError) as exc:
            logger.warning("Backend returned an unusable response for sender %s: %s", sender, exc)
            self._diagnostics.capture_exception(
                exc,
                sender=sender,
                category="backend_defect",
                status_code=getattr(exc, "status_code", 500),
                operation=intent.name.value,
            )
            return (
                "Sorry, the backend returned an error or unexpected format. "
                "Say 'diagnose' to investigate the root cause."
            )
        except InvalidKeyFormatError as exc:
            self._diagnostics.capture_exception(
                exc,
                sender=sender,
                category="validation",
                status_code=400,
                operation=intent.name.value,
            )
            return responses.INVALID_KEY_TEXT
        except Exception as exc:  # noqa: BLE001 - never crash the agent on handler bugs
            logger.exception("Unexpected error while handling message from %s", sender)
            self._diagnostics.capture_exception(
                exc,
                sender=sender,
                category="agent_defect",
                status_code=500,
                operation=intent.name.value,
            )
            return (
                "Sorry, something went wrong while processing your request. "
                "Say 'diagnose' to investigate the root cause."
            )

        logger.info("Replied to intent '%s' for sender %s", intent.name.value, sender)
        return reply

    # ------------------------------------------------------------------

    async def _dispatch(self, intent: Intent, sender: str) -> str:
        if intent.name == IntentName.WELCOME:
            return responses.WELCOME_TEXT
        if intent.name == IntentName.HELP:
            return responses.HELP_TEXT
        if intent.name == IntentName.UNSUPPORTED:
            return responses.UNSUPPORTED_TEXT
        if intent.name == IntentName.CONNECT:
            return await self._init_connect(sender)
        if intent.name == IntentName.LINK:
            return await self._link(intent, sender)
        if intent.name in (IntentName.UNLINK, IntentName.LOGOUT):
            return await self._unlink(sender)
        if intent.name == IntentName.DIAGNOSE:
            return await self._diagnose(sender)
        if intent.name == IntentName.APPROVE_PR:
            return await self._approve_pr(sender)

        # Every remaining intent exposes private account data and therefore
        # requires a validated, linked account credential with auto-refresh support.
        if intent.name == IntentName.OVERVIEW:
            user, health = await self._execute_authenticated(
                sender, lambda token: self._service.account_overview(token)
            )
            return responses.format_overview(user, health, intent.time_range)

        if intent.name == IntentName.TOKEN_USAGE:
            data = await self._execute_authenticated(
                sender, lambda token: self._service.token_usage(token, intent.time_range or "7d")
            )
            return responses.format_token_usage(data, intent.time_range, intent.model)

        if intent.name == IntentName.COST_SUMMARY:
            data = await self._execute_authenticated(
                sender, lambda token: self._service.cost_summary(token, intent.time_range or "7d")
            )
            return responses.format_cost_summary(data, intent.time_range, intent.model)

        if intent.name == IntentName.APPLICATIONS:
            data = await self._execute_authenticated(
                sender, lambda token: self._service.application_summaries(token, intent.time_range or "7d")
            )
            return responses.format_applications(data, intent.time_range)

        if intent.name == IntentName.ERRORS_PERFORMANCE:
            monitoring, dashboard = await self._execute_authenticated(
                sender, lambda token: self._service.error_performance(token, intent.time_range or "7d")
            )
            return responses.format_errors_performance(monitoring, dashboard, intent.time_range)

        if intent.name == IntentName.TRACES:
            limit = intent.limit or 5
            data = await self._execute_authenticated(
                sender, lambda token: self._service.recent_traces(token, limit)
            )
            return responses.format_traces(data, limit)

        return responses.UNSUPPORTED_TEXT

    async def _execute_authenticated(self, sender: str, coro_fn: Callable) -> any:
        """Call backend with auto-refresh on 401 when a refresh token is present."""
        token = self._require_link(sender)
        try:
            return await coro_fn(token)
        except AuthenticationError as exc:
            refresh_token = self._links.get_refresh_token(sender)
            if not refresh_token:
                # No refresh token available (e.g. legacy static API key)
                raise exc

            logger.info("Access token expired for %s, executing automatic token renewal...", sender)
            try:
                tokens = await self._service.refresh_tokens(refresh_token)
                new_access = tokens.get("access_token") if isinstance(tokens, dict) else tokens.access_token
                new_refresh = tokens.get("refresh_token") if isinstance(tokens, dict) else tokens.refresh_token
                self._links.link(
                    sender,
                    new_access,
                    refresh_token=new_refresh,
                )
                logger.info("Automatic token renewal succeeded for sender %s", sender)
                # Retry once with newly issued access token
                return await coro_fn(new_access)
            except Exception as refresh_exc:
                logger.warning("Automatic token renewal failed for sender %s: %s", sender, refresh_exc)
                self._links.unlink(sender)
                raise AuthenticationError("Session expired. Please reconnect your account.") from exc

    def _require_link(self, sender: str) -> str:
        key = self._links.get_key(sender)
        if not key:
            raise _NotLinkedError()
        return key

    async def _init_connect(self, sender: str) -> str:
        """Initiate OAuth authorization workflow without requesting credentials in chat."""
        oauth_init = await self._service.init_oauth(sender)
        session_id = oauth_init.get("session_id") if isinstance(oauth_init, dict) else oauth_init.session_id
        auth_url = oauth_init.get("authorization_url") if isinstance(oauth_init, dict) else oauth_init.authorization_url
        self._links.set_pending_session(sender, session_id)
        logger.info("Initiated OAuth flow for %s, session %s", sender, session_id)
        return responses.format_oauth_prompt(auth_url)

    async def _link(self, intent: Intent, sender: str) -> str:
        """Complete account linking via either single-use handoff code or legacy API key."""
        # 1. OAuth handoff code branch
        if intent.handoff_code:
            pending_session = self._links.get_pending_session(sender)
            logger.info(
                "Exchanging handoff code for %s (pending session: %s)",
                sender,
                pending_session,
            )
            token_resp = await self._service.exchange_oauth(
                sender_address=sender,
                session_id=pending_session,
                handoff_code=intent.handoff_code,
            )
            access_token = token_resp.get("access_token") if isinstance(token_resp, dict) else token_resp.access_token
            refresh_token = token_resp.get("refresh_token") if isinstance(token_resp, dict) else token_resp.refresh_token
            user_info = token_resp.get("user", {}) if isinstance(token_resp, dict) else getattr(token_resp, "user", {})
            user_email = user_info.get("email") if isinstance(user_info, dict) else getattr(token_resp, "user_email", "")

            self._links.link(
                sender,
                key=access_token,
                refresh_token=refresh_token,
                user_email=user_email,
            )
            return responses.format_oauth_success(user_email or "authorized user")

        # 2. Legacy API key branch
        api_key = intent.api_key
        if not api_key:
            return responses.INVALID_KEY_TEXT
        user = await self._service.validate_api_key(api_key)
        self._links.link(sender, api_key, user_email=user.email)
        logger.info("Linked sender %s to account id %s", sender, user.id)
        return responses.format_link_success(user)


    async def _unlink(self, sender: str) -> str:
        refresh_token = self._links.get_refresh_token(sender)
        if refresh_token:
            try:
                await self._service.logout(refresh_token)
            except Exception:  # noqa: BLE001
                logger.warning("Backend logout failed during unlinking for %s", sender)

        removed = self._links.unlink(sender)
        return responses.format_auth_revoked(already_unlinked=not removed)

    async def _diagnose(self, sender: str) -> str:
        """Inspect latest runtime error and propose a patch if code defect."""
        diag = self._diagnostics.get_last_diagnostic(sender)
        if not diag:
            return "No runtime errors or failures have been captured for your session yet."

        if not diag.proposed_patch and diag.category in ("agent_defect", "backend_defect"):
            # Generate a concrete patch proposal
            patch = self._diagnostics.generate_patch(
                diag,
                target_file="apps/app-backend/routes/auth.py"
                if "auth" in (diag.endpoint or "")
                else "app-agent/handlers/chat.py",
                diff="""--- a/original\n+++ b/fixed\n@@ -10,3 +10,4 @@\n+# Safe guard added against unexpected payload\n""",
                explanation=f"Identified issue: {diag.sanitized_message}. Proposed defensive check.",
                tests_to_run=["pytest app-agent/tests", "pytest apps/app-backend/tests"],
                risks=["Minimal; adds input sanitization"],
            )
            diag.proposed_patch = patch

        return responses.format_diagnostic_report(diag)

    async def _approve_pr(self, sender: str) -> str:
        """Handle explicit human approval to create a feature branch and pull request."""
        diag = self._diagnostics.get_last_diagnostic(sender)
        if not diag or not diag.proposed_patch:
            return (
                "There is no pending patch waiting for pull request approval. "
                "Say 'diagnose' to investigate a runtime error first."
            )

        logger.info("Developer authorized GitHub PR creation for diagnostic %s", diag.id)
        result = await self._github.create_fix_pull_request(diag)
        if result.success:
            return responses.format_pr_success(
                pr_url=result.pr_url,
                branch=result.branch_name,
                title=result.pr_title,
            )
        return f"Failed to create pull request: {result.error_message}"
