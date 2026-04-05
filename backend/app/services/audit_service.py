"""CAL-130 Audit Log Service — SHA-256 hash chain for immutable query logging.

Port of the TypeScript `src/lib/auditLog.ts` to Python, using an in-memory
store for now (PostgreSQL integration later).
"""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

AuditAction = Literal["search", "chat", "judgment_draft", "complaint_verification", "stt"]


class AuditEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    action: str
    query_hash: str
    query_preview: str
    agent_role: Optional[str] = None
    result_count: int = 0
    confidence: Optional[float] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    prev_hash: str = "genesis"
    entry_hash: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


def _sha256(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def _compute_entry_hash(query_hash: str, prev_hash: str, timestamp: str, action: str, agent_role: Optional[str], status: str) -> str:
    data = f"{query_hash}|{prev_hash}|{timestamp}|{action}|{agent_role or ''}|{status}"
    return _sha256(data)


class AuditService:
    """In-memory audit log with SHA-256 hash chain."""

    def __init__(self) -> None:
        self._entries: List[AuditEntry] = []

    def log_entry(self, query: str, action: str, result_count: int = 0, confidence: Optional[float] = None, user_id: Optional[str] = None, agent_role: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> AuditEntry:
        prev_hash = self._entries[0].entry_hash if self._entries else "genesis"
        query_hash = _sha256(query)
        now = datetime.now(timezone.utc)
        timestamp_str = str(int(now.timestamp() * 1000))
        entry_hash = _compute_entry_hash(query_hash, prev_hash, timestamp_str, action, agent_role, "success")
        entry = AuditEntry(user_id=user_id, action=action, query_hash=query_hash, query_preview=query[:200], agent_role=agent_role, result_count=result_count, confidence=confidence, metadata=metadata or {}, prev_hash=prev_hash, entry_hash=entry_hash, created_at=now)
        self._entries.insert(0, entry)
        return entry

    def get_entries(self, limit: int = 20) -> List[AuditEntry]:
        return self._entries[:limit]

    def verify_chain_integrity(self) -> dict:
        if len(self._entries) <= 1:
            return {"valid": True, "broken_at": None}
        for i in range(len(self._entries) - 1):
            if self._entries[i].prev_hash != self._entries[i + 1].entry_hash:
                return {"valid": False, "broken_at": i}
        return {"valid": True, "broken_at": None}

    def get_stats(self) -> dict:
        now = datetime.now(timezone.utc)
        today = [e for e in self._entries if (now - e.created_at).total_seconds() < 86400]
        by_action: Dict[str, int] = {}
        for e in self._entries:
            by_action[e.action] = by_action.get(e.action, 0) + 1
        return {"total": len(self._entries), "today": len(today), "by_action": by_action}
