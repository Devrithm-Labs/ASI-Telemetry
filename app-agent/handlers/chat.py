"""Chat orchestration: intent -> authorized backend call -> formatted reply.

The processor is deliberately independent of the uAgent runtime so the full
request flow can be unit-tested with a mocked backend. The uAgent wiring in
``agent.py`` only performs protocol concerns (ack, send, logging).
"""

from __future__ import annotations

import logging

from api_client import (
    AuthenticationError,
    BackendHttpError,
    BackendResponseError,
    BackendUnavailableError,
)
from handlers import responses
from handlers.intents import Intent, IntentName, parse_intent
from services.account_link import AccountLinkStore, InvalidKeyFormatError
from services.telemetry import TelemetryService


class _NotLinkedError(Exception):
    """Raised internally when a sender has no linked account."""


logger = logging.getLogger("asi_telemetry.agent.chat")


class ChatProcessor:
    """Routes chat text to capabilities, enforcing account linkage."""

    def __init__(self, service: TelemetryService, links: AccountLinkStore):
        self._service = service
        self._links = links

    async def process(self, text: str, sender: str) -> str:
        """Return the reply text for one incoming chat message."""
        intent = parse_intent(text)
        logger.info("Intent '%s' from sender %s", intent.name.value, sender)

        try:
            reply = await self._dispatch(intent, sender)
        except _NotLinkedError:
            return responses.LINK_INSTRUCTIONS
        except AuthenticationError:
            logger.warning("Backend rejected the linked key for sender %s", sender)
            # The stored credential is no longer valid; drop it so the user
            # receives consistent linking instructions on the next question.
            self._links.unlink(sender)
            return responses.AUTH_FAILED_TEXT
        except BackendUnavailableError:
            return responses.BACKEND_DOWN_TEXT
        except (BackendResponseError, BackendHttpError):
            logger.warning("Backend returned an unusable response for sender %s", sender)
            return (
                "Sorry, the backend returned data in an unexpected format. "
                "Please try again later."
            )
        except InvalidKeyFormatError:
            return responses.INVALID_KEY_TEXT
        except Exception:  # noqa: BLE001 - never crash the agent on handler bugs
            logger.exception("Unexpected error while handling message from %s", sender)
            return (
                "Sorry, something went wrong while processing your request. "
                "Please try again."
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
        if intent.name == IntentName.LINK:
            return await self._link(intent, sender)
        if intent.name == IntentName.UNLINK:
            removed = self._links.unlink(sender)
            return responses.format_link_removed(already_unlinked=not removed)

        # Every remaining intent exposes private account data and therefore
        # requires a validated, linked account credential.
        api_key = self._require_link(sender)
        if intent.name == IntentName.OVERVIEW:
            user, health = await self._service.account_overview(api_key)
            return responses.format_overview(user, health, intent.time_range)
        if intent.name == IntentName.TOKEN_USAGE:
            data = await self._service.token_usage(api_key, intent.time_range or "7d")
            return responses.format_token_usage(data, intent.time_range, intent.model)
        if intent.name == IntentName.COST_SUMMARY:
            data = await self._service.cost_summary(api_key, intent.time_range or "7d")
            return responses.format_cost_summary(data, intent.time_range, intent.model)
        if intent.name == IntentName.APPLICATIONS:
            data = await self._service.application_summaries(api_key, intent.time_range or "7d")
            return responses.format_applications(data, intent.time_range)
        if intent.name == IntentName.ERRORS_PERFORMANCE:
            monitoring, dashboard = await self._service.error_performance(
                api_key, intent.time_range or "7d"
            )
            return responses.format_errors_performance(monitoring, dashboard, intent.time_range)
        if intent.name == IntentName.TRACES:
            data = await self._service.recent_traces(api_key, intent.limit or 5)
            return responses.format_traces(data, intent.limit or 5)

        return responses.UNSUPPORTED_TEXT

    def _require_link(self, sender: str) -> str:
        key = self._links.get_key(sender)
        if not key:
            raise _NotLinkedError()
        return key

    async def _link(self, intent: Intent, sender: str) -> str:
        api_key = intent.api_key
        if not api_key:
            return responses.INVALID_KEY_TEXT
        user = await self._service.validate_api_key(api_key)
        self._links.link(sender, api_key)
        logger.info("Linked sender %s to account id %s", sender, user.id)
        return responses.format_link_success(user)
