"""Tests for CAL-130 audit log service."""
import hashlib
from app.services.audit_service import (
    AuditService,
    InMemoryAuditRepository,
    SQLiteAuditRepository,
    _sha256,
)


def _make_service(n: int = 3) -> AuditService:
    svc = AuditService(repository=InMemoryAuditRepository())
    for i in range(n):
        svc.log_entry(query=f"query {i}", action="search", result_count=i)
    return svc


class TestLogEntry:
    def test_first_entry_genesis(self):
        svc = AuditService(repository=InMemoryAuditRepository())
        e = svc.log_entry(query="hello", action="search")
        assert e.prev_hash == "genesis"
        assert e.entry_hash != ""

    def test_chain_links(self):
        svc = AuditService(repository=InMemoryAuditRepository())
        first = svc.log_entry(query="q1", action="search")
        second = svc.log_entry(query="q2", action="chat")
        assert second.prev_hash == first.entry_hash

    def test_query_hash_sha256(self):
        svc = AuditService(repository=InMemoryAuditRepository())
        e = svc.log_entry(query="test", action="search")
        assert e.query_hash == hashlib.sha256(b"test").hexdigest()

    def test_preview_truncated(self):
        svc = AuditService(repository=InMemoryAuditRepository())
        e = svc.log_entry(query="x" * 500, action="search")
        assert len(e.query_preview) == 200


class TestChainIntegrity:
    def test_valid(self):
        svc = _make_service(5)
        assert svc.verify_chain_integrity()["valid"] is True

    def test_broken(self):
        svc = _make_service(4)
        svc._entries[2].entry_hash = "tampered"
        r = svc.verify_chain_integrity()
        assert r["valid"] is False
        assert r["broken_at"] == 1

    def test_empty_valid(self):
        assert AuditService(repository=InMemoryAuditRepository()).verify_chain_integrity()["valid"] is True


class TestStats:
    def test_total(self):
        assert _make_service(3).get_stats()["total"] == 3

    def test_by_action(self):
        svc = AuditService(repository=InMemoryAuditRepository())
        svc.log_entry(query="a", action="search")
        svc.log_entry(query="b", action="chat")
        s = svc.get_stats()
        assert s["by_action"]["search"] == 1
        assert s["by_action"]["chat"] == 1


class TestSQLiteRepository:
    def test_sqlite_persists_across_instances(self, tmp_path):
        db_path = tmp_path / "audit.db"
        first = AuditService(repository=SQLiteAuditRepository(db_path))
        entry = first.log_entry(query="persistent query", action="search", result_count=2)

        second = AuditService(repository=SQLiteAuditRepository(db_path))
        entries = second.get_entries()

        assert len(entries) == 1
        assert entries[0].id == entry.id
        assert entries[0].query_preview == "persistent query"

    def test_sqlite_chain_integrity(self, tmp_path):
        db_path = tmp_path / "audit.db"
        svc = AuditService(repository=SQLiteAuditRepository(db_path))
        svc.log_entry(query="one", action="search")
        svc.log_entry(query="two", action="chat")

        assert svc.verify_chain_integrity()["valid"] is True
