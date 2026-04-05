"""Tests for Dashboard Live Metrics."""

from __future__ import annotations

import pytest

from app.services.audit_service import AuditService
from app.services.dashboard_service import DashboardService


class TestLiveMetrics:
    def _make_service(self) -> DashboardService:
        audit = AuditService()
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
        svc = DashboardService(audit_service=AuditService())
        metrics = svc.get_live_metrics()

        assert metrics["requests_1h"] == 0
        assert metrics["requests_24h"] == 0
