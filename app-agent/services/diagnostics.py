"""Sanitized diagnostic capture and AI-assisted error investigation for ASI-Telemetry."""

from __future__ import annotations

import logging
import re
import traceback
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid

logger = logging.getLogger("asi_telemetry.agent.diagnostics")

# Secrets redaction patterns (OAuth tokens, API keys, Bearer headers, passwords, database URLs)
_SECRET_PATTERNS = [
    (re.compile(r"[a-zA-Z0-9+._-]+:\/\/[a-zA-Z0-9_.-]+:[^@\s]+@[^\s]+"), "[REDACTED_DB_URL]"),
    (re.compile(r"Bearer\s+[a-zA-Z0-9._-]+", re.IGNORECASE), "Bearer [REDACTED_BEARER_TOKEN]"),
    (re.compile(r"asi_[a-z0-9]+_[0-9a-fA-F]{16,64}"), "[REDACTED_API_KEY]"),
    (re.compile(r"asi_rf_[a-zA-Z0-9_-]{20,80}"), "[REDACTED_REFRESH_TOKEN]"),
    (re.compile(r"ey[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+"), "[REDACTED_JWT]"),
    (re.compile(r"password['\"]?\s*[:=]\s*['\"]?[^\s,'\"]+['\"]?", re.IGNORECASE), "password=[REDACTED]"),
    (re.compile(r"client_secret['\"]?\s*[:=]\s*['\"]?[^\s,'\"]+['\"]?", re.IGNORECASE), "client_secret=[REDACTED]"),
]



def sanitize_text(text: str) -> str:
    """Removes API keys, tokens, and credentials from error messages and logs."""
    if not text:
        return ""
    sanitized = str(text)
    for pattern, replacement in _SECRET_PATTERNS:
        sanitized = pattern.sub(replacement, sanitized)
    return sanitized


@dataclass
class ProposedPatch:
    target_file: str
    diff: str
    explanation: str
    tests_to_run: List[str] = field(default_factory=list)
    risks: List[str] = field(default_factory=list)


@dataclass
class DiagnosticRecord:
    error_id: str
    category: str
    sanitized_message: str
    timestamp: str
    http_status: Optional[int] = None
    endpoint: Optional[str] = None
    operation: Optional[str] = None
    trace_id: Optional[str] = None
    stack_frames: List[Dict[str, Any]] = field(default_factory=list)
    retry_count: int = 0
    suggested_fix: Optional[str] = None
    affected_files: List[str] = field(default_factory=list)
    patch_diff: Optional[str] = None
    proposed_patch: Optional[ProposedPatch] = None
    approval_pending: bool = False

    @property
    def id(self) -> str:
        return self.error_id

    @property
    def status_code(self) -> Optional[int]:
        return self.http_status

    @property
    def root_cause_analysis(self) -> Optional[str]:
        return self.suggested_fix

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class DiagnosticService:
    """Thread-safe store for recent runtime errors and AI-assisted root cause analysis."""

    def __init__(self, max_history: int = 20):
        self._max_history = max_history
        self._diagnostics: Dict[str, DiagnosticRecord] = {}  # error_id -> record
        self._last_error_by_sender: Dict[str, str] = {}  # sender -> error_id

    def capture_exception(
        self,
        exc: Exception,
        sender: str,
        endpoint: Optional[str] = None,
        http_status: Optional[int] = None,
        trace_id: Optional[str] = None,
        category: Optional[str] = None,
        status_code: Optional[int] = None,
        operation: Optional[str] = None,
        **kwargs: Any,
    ) -> DiagnosticRecord:
        """Captures and sanitizes an exception for runtime diagnosis."""
        error_id = f"err_{uuid.uuid4().hex[:8]}"
        effective_status = status_code if status_code is not None else http_status
        detected_category = category or type(exc).__name__
        sanitized_msg = sanitize_text(str(exc))

        frames = []
        tb = exc.__traceback__
        if tb:
            for frame in traceback.extract_tb(tb)[-5:]:
                frames.append({
                    "filename": sanitize_text(frame.filename.split("\\")[-1].split("/")[-1]),
                    "line": frame.lineno,
                    "func": frame.name,
                })

        # Infer category and initial suggested fix
        suggested_fix = None
        affected_files = []
        if "AuthenticationError" in detected_category or effective_status in (401, 403):
            detected_category = "AuthenticationFailure"
            suggested_fix = (
                "The session credential or API key is invalid or expired. "
                "Initiate account linking by asking 'connect my account' to re-authenticate with Google."
            )
        elif "BackendUnavailableError" in detected_category or "Timeout" in detected_category or "Connection" in detected_category:
            detected_category = "BackendConnectivity"
            suggested_fix = (
                "Backend service is temporarily unreachable or timing out. "
                "Verify the FastAPI backend is running on port 8080 and ClickHouse is online."
            )
        elif "BackendResponseError" in detected_category or "ValidationError" in detected_category:
            detected_category = "DataContractMismatch"
            suggested_fix = (
                "Backend response schema differed from expected client schema. "
                "Check backend endpoint response models against api_client.py Pydantic schemas."
            )
            affected_files = ["app-agent/api_client.py", "apps/app-backend/routes/"]


        record = DiagnosticRecord(
            error_id=error_id,
            category=detected_category,
            sanitized_message=sanitized_msg,
            timestamp=datetime.now(timezone.utc).isoformat(),
            http_status=effective_status,
            endpoint=endpoint,
            operation=operation,
            trace_id=trace_id,
            stack_frames=frames,
            suggested_fix=suggested_fix,
            affected_files=affected_files,
        )

        self._diagnostics[error_id] = record
        self._last_error_by_sender[sender] = error_id

        # Keep bound history size
        if len(self._diagnostics) > self._max_history:
            oldest = next(iter(self._diagnostics))
            self._diagnostics.pop(oldest, None)

        logger.info("Captured sanitized diagnostic %s (category: %s)", error_id, detected_category)
        return record

    def get_last_diagnostic(self, sender: str) -> Optional[DiagnosticRecord]:
        error_id = self._last_error_by_sender.get(sender)
        if error_id and error_id in self._diagnostics:
            return self._diagnostics[error_id]
        return None

    def get_diagnostic_by_id(self, error_id: str) -> Optional[DiagnosticRecord]:
        return self._diagnostics.get(error_id)

    def generate_patch(
        self,
        record: DiagnosticRecord,
        target_file: str,
        diff: str,
        explanation: str,
        tests_to_run: Optional[List[str]] = None,
        risks: Optional[List[str]] = None,
    ) -> ProposedPatch:
        """Generates a patch proposal for explicit developer review and approval."""
        patch = ProposedPatch(
            target_file=target_file,
            diff=diff,
            explanation=explanation,
            tests_to_run=tests_to_run or ["pytest"],
            risks=risks or ["Minimal risk; defensive patch"],
        )
        record.proposed_patch = patch
        record.patch_diff = diff
        record.affected_files = [target_file]
        record.approval_pending = True
        return patch

    def mark_approval_pending(self, error_id: str, patch_diff: str, files: List[str]) -> None:
        rec = self._diagnostics.get(error_id)
        if rec:
            rec.patch_diff = patch_diff
            rec.affected_files = files
            rec.approval_pending = True

