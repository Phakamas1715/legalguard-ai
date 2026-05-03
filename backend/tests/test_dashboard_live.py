"""Tests for Dashboard Live Metrics."""

from __future__ import annotations

import pytest

from app.services.audit_service import AuditService
from app.services.audit_service import InMemoryAuditRepository
from app.services.dashboard_service import DashboardService


class TestLiveMetrics:
    def _make_service(self) -> DashboardService:
        audit = AuditService(repository=InMemoryAuditRepository())
        # Add some audit entries
        audit.log_entry("ค้นหาฉ้อโกง", "search", result_count=5, confidence=0.85)
        audit.log_entry("ร่างคำฟ้อง", "chat", result_count=1, confidence=0.75)
        audit.log_entry("ตรวจเอกสาร", "complaint_verification", result_count=1, confidence=0.90)
        return DashboardService(audit_service=audit)

    def test_live_metrics_returns_all_fields(self):
        svc = self._make_service()
        metrics = svc.get_live_metrics()

        assert "timestamp" in metrics
        assert "requests_1h" in metrics
        assert "requests_24h" in metrics
        assert "requests_by_action_1h" in metrics
        assert "cache_hit_rate_1h" in metrics
        assert "error_rate_1h" in metrics
        assert "system_health" in metrics
        assert "ai_metrics" in metrics

    def test_live_metrics_counts_recent_entries(self):
        svc = self._make_service()
        metrics = svc.get_live_metrics()

        assert metrics["requests_1h"] == 3
        assert metrics["requests_24h"] == 3

    def test_live_metrics_action_breakdown(self):
        svc = self._make_service()
        metrics = svc.get_live_metrics()

        actions = metrics["requests_by_action_1h"]
        assert actions.get("search", 0) == 1
        assert actions.get("chat", 0) == 1

    def test_live_metrics_confidence(self):
        svc = self._make_service()
        metrics = svc.get_live_metrics()

        assert metrics["avg_confidence_1h"] > 0
        assert metrics["avg_confidence_1h"] <= 1.0

    def test_live_metrics_system_health(self):
        svc = self._make_service()
        metrics = svc.get_live_metrics()

        health = metrics["system_health"]
        assert health["api"] == "healthy"
        assert health["search_pipeline"] == "healthy"

    def test_live_metrics_empty_audit(self):
        svc = DashboardService(audit_service=AuditService(repository=InMemoryAuditRepository()))
        metrics = svc.get_live_metrics()

        assert metrics["requests_1h"] == 0
        assert metrics["requests_24h"] == 0

    def test_safety_pipeline_returns_all_7_layers(self):
        svc = self._make_service()
        payload = svc.get_safety_pipeline()

        assert payload["architecture_version"] == "backend_runtime_v1"
        assert payload["integrity"]["audit_chain_valid"] is True
        assert len(payload["layers"]) == 7
        assert payload["layers"][0]["title"] == "PII Sanitization"
        assert payload["layers"][5]["layer_code"] == "L6"

    def test_safety_pipeline_includes_runtime_evidence(self):
        svc = self._make_service()
        payload = svc.get_safety_pipeline()

        first = payload["layers"][0]
        assert first["runtime_status"] == "healthy"
        assert "runtime_evidence" in first
        assert "avg_honesty_score" in first["runtime_evidence"]

    def test_agentic_architecture_returns_all_components(self):
        svc = self._make_service()
        payload = svc.get_agentic_architecture()

        assert payload["architecture_version"] == "backend_runtime_v1"
        assert payload["integrity"]["audit_chain_valid"] is True
        assert len(payload["components"]) == 6
        assert payload["components"][0]["title"] == "Role-Aware Access Layer"
        assert "relation_to_safety_pipeline" in payload

    def test_agentic_architecture_includes_runtime_evidence(self):
        svc = self._make_service()
        payload = svc.get_agentic_architecture()

        first = payload["components"][0]
        assert "runtime_evidence" in first
        assert "system_health" in first["runtime_evidence"]

    def test_recent_audit_entries_returns_rows(self):
        svc = self._make_service()
        payload = svc.get_recent_audit_entries(limit=2)

        assert payload["chain_valid"] is True
        assert len(payload["entries"]) == 2
        assert payload["entries"][0]["action"] in {"search", "chat", "complaint_verification"}
        assert payload["page"] == 1
        assert payload["page_size"] == 2

    def test_audit_entry_detail_returns_full_metadata(self):
        audit = AuditService(repository=InMemoryAuditRepository())
        entry = audit.log_entry(
            "ค้นหาแนวคำพิพากษา",
            "search",
            result_count=3,
            confidence=0.91,
            metadata={"court_type": "civil", "result_ids": ["A", "B", "C"]},
        )
        svc = DashboardService(audit_service=audit)

        payload = svc.get_audit_entry_detail(entry.id)

        assert payload is not None
        assert payload["entry"]["id"] == entry.id
        assert payload["entry"]["metadata"]["court_type"] == "civil"
        assert payload["entry"]["metadata"]["result_ids"] == ["A", "B", "C"]
        assert payload["entry"]["query_storage"] == "preview_only"

    def test_audit_entry_detail_returns_none_when_missing(self):
        svc = DashboardService(audit_service=AuditService(repository=InMemoryAuditRepository()))

        assert svc.get_audit_entry_detail("missing") is None

    def test_recent_audit_entries_support_filters(self):
        audit = AuditService(repository=InMemoryAuditRepository())
        audit.log_entry(
            "ค้นหาคดีแพ่ง",
            "search",
            result_count=2,
            agent_role="researcher",
            metadata={"case_type": "civil"},
        )
        audit.log_entry(
            "ร่างคำฟ้องคดีอาญา",
            "chat",
            result_count=1,
            agent_role="drafter",
            metadata={"case_type": "criminal"},
        )
        audit.log_entry(
            "ค้นหาคดีอาญา",
            "search",
            result_count=4,
            agent_role="researcher",
            metadata={"case_type": "criminal"},
        )
        svc = DashboardService(audit_service=audit)

        payload = svc.get_recent_audit_entries(
            limit=10,
            action="search",
            agent_role="researcher",
            case_type="criminal",
            query="อาญา",
        )

        assert len(payload["entries"]) == 1
        assert payload["entries"][0]["query_preview"] == "ค้นหาคดีอาญา"

    def test_recent_audit_entries_support_pagination(self):
        audit = AuditService(repository=InMemoryAuditRepository())
        for index in range(6):
            audit.log_entry(f"query {index}", "search", result_count=index)
        svc = DashboardService(audit_service=audit)

        payload = svc.get_recent_audit_entries(limit=2, page=2, page_size=2)

        assert payload["total"] == 6
        assert payload["page"] == 2
        assert payload["page_size"] == 2
        assert payload["total_pages"] == 3
        assert len(payload["entries"]) == 2

    def test_export_audit_entries_respects_filters(self):
        audit = AuditService(repository=InMemoryAuditRepository())
        audit.log_entry("ค้นหาคดีแพ่ง", "search", agent_role="researcher", metadata={"case_type": "civil"})
        audit.log_entry("ค้นหาคดีอาญา", "search", agent_role="researcher", metadata={"case_type": "criminal"})
        svc = DashboardService(audit_service=audit)

        payload = svc.export_audit_entries(case_type="criminal")

        assert payload["total"] == 1
        assert payload["entries"][0]["query_preview"] == "ค้นหาคดีอาญา"

    def test_export_audit_entries_supports_current_page_scope(self):
        audit = AuditService(repository=InMemoryAuditRepository())
        for index in range(5):
            audit.log_entry(f"query {index}", "search", result_count=index)
        svc = DashboardService(audit_service=audit)

        payload = svc.export_audit_entries(scope="current_page", page=2, page_size=2)

        assert payload["scope"] == "current_page"
        assert payload["total"] == 2
        assert len(payload["entries"]) == 2
