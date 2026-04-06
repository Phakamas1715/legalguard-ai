"""CAL-130 Audit Log Service — SHA-256 hash chain with pluggable persistence.

Runtime defaults to a SQLite-backed repository stored in ``data/jobs.db`` so
audit state survives backend restarts and shares the same local persistence
store used by ingestion jobs. Unit tests continue to use the in-memory backend
unless explicitly overridden.
"""
from __future__ import annotations

from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Protocol

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


def _compute_entry_hash(
    query_hash: str,
    prev_hash: str,
    timestamp: str,
    action: str,
    agent_role: Optional[str],
    status: str,
) -> str:
    data = f"{query_hash}|{prev_hash}|{timestamp}|{action}|{agent_role or ''}|{status}"
    return _sha256(data)


def _default_db_path() -> Path:
    project_root = Path(__file__).resolve().parents[3]
    return project_root / "data" / "jobs.db"


def _parse_created_at(value: str) -> datetime:
    created_at = datetime.fromisoformat(value)
    if created_at.tzinfo is None:
        return created_at.replace(tzinfo=timezone.utc)
    return created_at


class AuditRepository(Protocol):
    def latest_entry(self) -> Optional[AuditEntry]:
        ...

    def add_entry(self, entry: AuditEntry) -> AuditEntry:
        ...

    def list_entries(self, limit: int = 20) -> List[AuditEntry]:
        ...

    def get_entry(self, entry_id: str) -> Optional[AuditEntry]:
        ...


class InMemoryAuditRepository:
    """Fast repository used by tests and local ephemeral usage."""

    def __init__(self) -> None:
        self._entries: List[AuditEntry] = []

    def latest_entry(self) -> Optional[AuditEntry]:
        return self._entries[0] if self._entries else None

    def add_entry(self, entry: AuditEntry) -> AuditEntry:
        self._entries.insert(0, entry)
        return entry

    def list_entries(self, limit: int = 20) -> List[AuditEntry]:
        return self._entries[:limit]

    def get_entry(self, entry_id: str) -> Optional[AuditEntry]:
        return next((entry for entry in self._entries if entry.id == entry_id), None)


class SQLiteAuditRepository:
    """SQLite-backed repository that persists CAL-130 audit entries."""

    def __init__(self, db_path: str | Optional[Path] = None) -> None:
        self._path = Path(db_path or _default_db_path())
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()

    def latest_entry(self) -> Optional[AuditEntry]:
        row = self._fetchone("SELECT * FROM audit_log ORDER BY rowid DESC LIMIT 1")
        return self._row_to_entry(row) if row else None

    def add_entry(self, entry: AuditEntry) -> AuditEntry:
        with sqlite3.connect(self._path) as conn:
            conn.execute(
                """
                INSERT INTO audit_log (
                    id, user_id, action, query_hash, query_preview,
                    agent_role, result_count, confidence, metadata,
                    prev_hash, entry_hash, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    entry.id,
                    entry.user_id,
                    entry.action,
                    entry.query_hash,
                    entry.query_preview,
                    entry.agent_role,
                    entry.result_count,
                    entry.confidence,
                    json.dumps(entry.metadata, ensure_ascii=False),
                    entry.prev_hash,
                    entry.entry_hash,
                    entry.created_at.isoformat(),
                ),
            )
        return entry

    def list_entries(self, limit: int = 20) -> List[AuditEntry]:
        rows = self._fetchall(
            "SELECT * FROM audit_log ORDER BY rowid DESC LIMIT ?",
            (limit,),
        )
        return [self._row_to_entry(row) for row in rows]

    def get_entry(self, entry_id: str) -> Optional[AuditEntry]:
        row = self._fetchone("SELECT * FROM audit_log WHERE id = ?", (entry_id,))
        return self._row_to_entry(row) if row else None

    def _ensure_schema(self) -> None:
        with sqlite3.connect(self._path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS audit_log (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,
                    action TEXT NOT NULL,
                    query_hash TEXT,
                    query_preview TEXT,
                    agent_role TEXT,
                    result_count INTEGER DEFAULT 0,
                    confidence REAL,
                    metadata TEXT DEFAULT '{}',
                    prev_hash TEXT,
                    entry_hash TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at)"
            )

    def _fetchone(
        self,
        query: str,
        params: tuple[Any, ...] = (),
    ) -> sqlite3.Optional[Row]:
        with sqlite3.connect(self._path) as conn:
            conn.row_factory = sqlite3.Row
            return conn.execute(query, params).fetchone()

    def _fetchall(
        self,
        query: str,
        params: tuple[Any, ...] = (),
    ) -> list[sqlite3.Row]:
        with sqlite3.connect(self._path) as conn:
            conn.row_factory = sqlite3.Row
            return conn.execute(query, params).fetchall()

    @staticmethod
    def _row_to_entry(row: sqlite3.Row) -> AuditEntry:
        metadata_raw = row["metadata"] or "{}"
        try:
            metadata = json.loads(metadata_raw)
        except json.JSONDecodeError:
            metadata = {}

        return AuditEntry(
            id=row["id"],
            user_id=row["user_id"],
            action=row["action"],
            query_hash=row["query_hash"] or "",
            query_preview=row["query_preview"] or "",
            agent_role=row["agent_role"],
            result_count=row["result_count"] or 0,
            confidence=row["confidence"],
            metadata=metadata,
            prev_hash=row["prev_hash"] or "genesis",
            entry_hash=row["entry_hash"] or "",
            created_at=_parse_created_at(row["created_at"]),
        )


def _default_repository() -> AuditRepository:
    backend = os.getenv("AUDIT_BACKEND", "").strip().lower()
    if not backend and "PYTEST_CURRENT_TEST" in os.environ:
        backend = "memory"

    if backend in {"", "sqlite"}:
        db_path = os.getenv("AUDIT_DB_PATH")
        return SQLiteAuditRepository(db_path)

    if backend == "memory":
        return InMemoryAuditRepository()

    raise ValueError(f"Unsupported AUDIT_BACKEND: {backend}")


class AuditService:
    """CAL-130 audit service with SHA-256 hash chaining and pluggable storage."""

    def __init__(self, repository: Optional[AuditRepository] = None) -> None:
        self._repository = repository or _default_repository()

    @property
    def _entries(self) -> List[AuditEntry]:
        if isinstance(self._repository, InMemoryAuditRepository):
            return self._repository._entries
        raise AttributeError("_entries is only available for the in-memory audit repository")

    def log_entry(
        self,
        query: str,
        action: str,
        result_count: int = 0,
        confidence: Optional[float] = None,
        user_id: Optional[str] = None,
        agent_role: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditEntry:
        previous = self._repository.latest_entry()
        prev_hash = previous.entry_hash if previous else "genesis"
        query_hash = _sha256(query)
        now = datetime.now(timezone.utc)
        timestamp_str = str(int(now.timestamp() * 1000))
        entry_hash = _compute_entry_hash(
            query_hash,
            prev_hash,
            timestamp_str,
            action,
            agent_role,
            "success",
        )
        entry = AuditEntry(
            user_id=user_id,
            action=action,
            query_hash=query_hash,
            query_preview=query[:200],
            agent_role=agent_role,
            result_count=result_count,
            confidence=confidence,
            metadata=metadata or {},
            prev_hash=prev_hash,
            entry_hash=entry_hash,
            created_at=now,
        )
        return self._repository.add_entry(entry)

    def get_entries(self, limit: int = 20) -> List[AuditEntry]:
        return self._repository.list_entries(limit=limit)

    def get_entry(self, entry_id: str) -> Optional[AuditEntry]:
        return self._repository.get_entry(entry_id)

    def verify_chain_integrity(self) -> dict:
        entries = self._repository.list_entries(limit=100_000)
        if len(entries) <= 1:
            return {"valid": True, "broken_at": None}
        for i in range(len(entries) - 1):
            if entries[i].prev_hash != entries[i + 1].entry_hash:
                return {"valid": False, "broken_at": i}
        return {"valid": True, "broken_at": None}

    def get_stats(self) -> dict:
        entries = self._repository.list_entries(limit=100_000)
        now = datetime.now(timezone.utc)
        today = [e for e in entries if (now - e.created_at).total_seconds() < 86400]
        by_action: Dict[str, int] = {}
        for entry in entries:
            by_action[entry.action] = by_action.get(entry.action, 0) + 1
        return {"total": len(entries), "today": len(today), "by_action": by_action}
