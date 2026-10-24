"""ASI:One Interactive Cards protocol implementation and card catalog for ASI-Telemetry.

Provides typed schemas and builders for Fetch.ai's ASI:One Interactive Cards:
- carousel: horizontally scrollable list of rich cards with action CTAs
- detail: single item detail view with hero image, summary rows, sub-options & CTAs
- form: structured input fields (text, email, select, etc.) with submit CTA
- review: approval screen with approve/reject CTAs for safety-critical actions
- custom: bespoke element trees composed of layout, content, and interactive primitives

Card declarations are attached to Agent Chat Protocol (ACP) ChatMessage objects
as MetadataContent alongside the plain text bubble. When users interact with the
card inside ASI:One's drawer UI, the selection is sent back as a chat message.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from uagents_core.contrib.protocols.chat import ChatMessage, MetadataContent, TextContent

MAX_PAYLOAD_BYTES = 64 * 1024  # 64 KB limit


class CardKind(str, Enum):
    CAROUSEL = "carousel"
    DETAIL = "detail"
    FORM = "form"
    REVIEW = "review"
    CUSTOM = "custom"


class ChatReply(str):
    """String subclass containing chat text and optional ASI:One Interactive Card metadata.

    Inheriting from str ensures complete backwards compatibility with existing
    code and tests expecting a plain string, while carrying the card structure
    so the uAgent runtime can attach MetadataContent to ACP messages.
    """

    card_kind: Optional[str]
    card_payload: Optional[Dict[str, Any]]
    preferred_drawer_width_px: int
    is_terminal: bool

    def __new__(
        cls,
        text: str,
        card_kind: Optional[str] = None,
        card_payload: Optional[Dict[str, Any]] = None,
        preferred_drawer_width_px: int = 540,
        is_terminal: bool = False,
    ) -> ChatReply:
        obj = super().__new__(cls, text)
        obj.card_kind = card_kind
        obj.card_payload = card_payload
        obj.preferred_drawer_width_px = preferred_drawer_width_px
        obj.is_terminal = is_terminal
        return obj

    def has_card(self) -> bool:
        """Check if this reply carries an interactive card declaration."""
        return bool(self.card_kind and self.card_payload)

    def metadata_dict(self) -> Dict[str, str]:
        """Generate the MetadataContent.metadata dict[str, str] block for ACP."""
        if not self.has_card():
            return {}

        payload_json = json.dumps(self.card_payload, ensure_ascii=False)
        if len(payload_json.encode("utf-8")) > MAX_PAYLOAD_BYTES:
            raise ValueError(
                f"card_payload size ({len(payload_json.encode('utf-8'))} bytes) exceeds limit of {MAX_PAYLOAD_BYTES} bytes"
            )

        width = max(320, min(800, self.preferred_drawer_width_px))
        kind_val = self.card_kind.value if hasattr(self.card_kind, "value") else str(self.card_kind)
        meta: Dict[str, str] = {
            "card_protocol_version": "1",
            "requires_card_interaction": "false" if self.is_terminal else "true",
            "card_kind": str(kind_val),
            "card_payload": payload_json,
            "preferred_drawer_width_px": str(width),
        }
        if self.is_terminal:
            meta["is_terminal"] = "true"
        return meta

    def to_chat_message(self, timestamp: Optional[datetime] = None) -> ChatMessage:
        """Build an ACP ChatMessage with TextContent and optional MetadataContent."""
        ts = timestamp or datetime.now(timezone.utc)
        items: List[Any] = [TextContent(type="text", text=str(self))]
        if self.has_card():
            items.append(
                MetadataContent(
                    type="metadata",
                    metadata=self.metadata_dict(),
                )
            )
        return ChatMessage(timestamp=ts, msg_id=uuid4(), content=items)


# ============================================================================
# Card Builders
# ============================================================================


def build_carousel_card(
    title: str,
    items: List[Dict[str, Any]],
    subtitle: Optional[str] = None,
) -> Dict[str, Any]:
    """Construct a 'carousel' card payload."""
    payload: Dict[str, Any] = {
        "title": title,
        "items": items,
    }
    if subtitle:
        payload["subtitle"] = subtitle
    return payload


def build_detail_card(
    title: str,
    summary_rows: List[Dict[str, str]],
    sub_options: Optional[Dict[str, Any]] = None,
    hero_image: Optional[str] = None,
    ctas: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Construct a 'detail' card payload."""
    payload: Dict[str, Any] = {
        "title": title,
        "summary_rows": summary_rows,
    }
    if hero_image:
        payload["hero_image"] = hero_image
    if sub_options:
        payload["sub_options"] = sub_options
    if ctas:
        payload["ctas"] = ctas
    return payload


def build_form_card(
    title: str,
    fields: List[Dict[str, Any]],
    submit_label: str = "Submit",
    submit_selection: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Construct a 'form' card payload."""
    return {
        "title": title,
        "fields": fields,
        "submit_cta": {
            "label": submit_label,
            "selection": submit_selection or {"action": "submit"},
        },
    }


def build_review_card(
    title: str,
    summary_rows: List[Dict[str, str]],
    approve_label: str = "Approve",
    approve_selection: Optional[Dict[str, Any]] = None,
    reject_label: str = "Cancel",
    reject_selection: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Construct a 'review' card payload."""
    return {
        "title": title,
        "summary_rows": summary_rows,
        "approve_cta": {
            "label": approve_label,
            "primary": True,
            "selection": approve_selection or {"action": "approve"},
        },
        "reject_cta": {
            "label": reject_label,
            "selection": reject_selection or {"action": "cancel"},
        },
    }


def build_custom_card(root_element: Dict[str, Any]) -> Dict[str, Any]:
    """Construct a 'custom' element-tree card payload."""
    return {"root": root_element}
