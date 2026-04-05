"""Tests for DashboardService — stats, bottleneck detection, CFS fairness scoring."""

from datetime import datetime, timedelta, timezone

from app.services.audit_service import AuditService
from app.services.dashboard_service import (
    STANDARD_TIMELINES,
    DashboardService,
    calc_court_fairness,
    calc_geo_fairness,
    calc_time_fairness,
)


def _make_audit_with_entries(entries_meta: list[dict]) -> AuditService:
    """Create an AuditService pre-populated with entries carrying given metadata."""
    audit = AuditService()
    for meta in entries_meta:
        audit.log_entry(
            query=meta.get("query", "test"),
            action=meta.get("action", "search"),
            metadata=meta,
        )
    return audit


# ======================================================================
# Stats
# ======================================================================


class TestGetStats:
    def test_empty_audit(self):
        svc = DashboardService(audit_service=AuditService())
        stats = svc.get_stats()
        assert stats["total_cases"] == 0
        assert stats["by_case_type"] == {}

    def test_counts_by_case_type(self):
        audit = _make_audit_with_entries([
            {"case_type": "civil"},
            {"case_type": "civil"},
            {"case_type": "criminal"},
        ])
        stats = DashboardService(audit_service=audit).get_stats()
        assert stats["by_case_type"]["civil"] == 2
        assert stats["by_case_type"]["criminal"] == 1
        assert stats["total_cases"] == 3

    def test_counts_by_court(self):
        audit = _make_audit_with_entries([
            {"court_type": "supreme"},
            {"court_type": "supreme"},
            {"court_type": "admin"},
        ])
        stats = DashboardService(audit_service=audit).get_stats()
        assert stats["by_court"]["supreme"] == 2
        assert stats["by_court"]["admin"] == 1

    def test_rejection_rates_and_top_reasons(self):
        audit = _make_audit_with_entries([
            {"case_type": "civil", "status": "rejected", "rejection_reason": "incomplete"},
            {"case_type": "civil", "status": "rejected", "rejection_reason": "incomplete"},
            {"case_type": "civil", "status": "rejected", "rejection_reason": "wrong_court"},
            {"case_type": "civil", "status": "accepted"},
        ])
        stats = DashboardService(audit_service=audit).get_stats()
        assert stats["rejection_rates"]["civil"] == 0.75
        reasons = stats["top_rejection_reasons"]["civil"]
        assert reasons[0]["reason"] == "incomplete"
        assert reasons[0]["count"] == 2

    def test_time_period_param(self):
        svc = DashboardService(audit_service=AuditService())
        for period in ("daily", "weekly", "monthly"):
            stats = svc.get_stats(time_period=period)
            assert stats["time_period"] == period


# ======================================================================
# Bottleneck Detection
# ======================================================================


class TestGetBottlenecks:
    def test_no_data(self):
        svc = DashboardService(audit_service=AuditService())
        result = svc.get_bottlenecks()
        assert result["bottlenecks"] == []

    def test_no_bottleneck_within_standard(self):
        """Processing times within standard → no bottleneck."""
        audit = _make_audit_with_entries([
            {"case_type": "civil", "processing_days": 100},
            {"case_type": "civil", "processing_days": 150},
        ])
        result = DashboardService(audit_service=audit).get_bottlenecks()
        assert result["bottlenecks"] == []
        assert result["analysis"]["civil"]["is_bottleneck"] is False

    def test_bottleneck_detected(self):
        """Avg processing time > 1.5× standard → bottleneck flagged."""
        standard = STANDARD_TIMELINES["civil"]  # 180
        threshold = standard * 1.5  # 270
        # avg = 300 > 270 → bottleneck
        audit = _make_audit_with_entries([
            {"case_type": "civil", "processing_days": 280},
            {"case_type": "civil", "processing_days": 320},
        ])
        result = DashboardService(audit_service=audit).get_bottlenecks()
        assert len(result["bottlenecks"]) == 1
        bn = result["bottlenecks"][0]
        assert bn["case_type"] == "civil"
        assert bn["is_bottleneck"] is True
        assert bn["avg_processing_days"] == 300.0
        assert len(bn["contributing_factors"]) >= 1

    def test_exactly_at_threshold_not_bottleneck(self):
        """Avg == 1.5× standard → NOT a bottleneck (must exceed, not equal)."""
        standard = STANDARD_TIMELINES["criminal"]  # 120
        threshold = standard * 1.5  # 180
        audit = _make_audit_with_entries([
            {"case_type": "criminal", "processing_days": 180},
        ])
        result = DashboardService(audit_service=audit).get_bottlenecks()
        assert result["bottlenecks"] == []

    def test_default_standard_for_unknown_type(self):
        """Unknown case types use the default standard timeline."""
        default_std = STANDARD_TIMELINES["default"]  # 150
        over_threshold = default_std * 1.5 + 1  # 226
        audit = _make_audit_with_entries([
            {"case_type": "exotic", "processing_days": over_threshold},
        ])
        result = DashboardService(audit_service=audit).get_bottlenecks()
        assert len(result["bottlenecks"]) == 1
        assert result["bottlenecks"][0]["case_type"] == "exotic"


# ======================================================================
# CFS Fairness Scoring
# ======================================================================


class TestCalcGeoFairness:
    def test_empty(self):
        assert calc_geo_fairness([]) == 1.0

    def test_all_bangkok(self):
        results = [{"province": "กรุงเทพมหานคร"}] * 10
        score = calc_geo_fairness(results)
        assert score < 1.0  # penalised for concentration

    def test_diverse_provinces(self):
        results = [
            {"province": "เชียงใหม่"},
            {"province": "ขอนแก่น"},
            {"province": "สงขลา"},
            {"province": "ชลบุรี"},
        ]
        score = calc_geo_fairness(results)
        assert score >= 0.9  # diverse + no Bangkok


class TestCalcCourtFairness:
    def test_empty(self):
        assert calc_court_fairness([]) == 1.0

    def test_single_court_type(self):
        results = [{"court_type": "supreme"}] * 10
        score = calc_court_fairness(results)
        assert score < 1.0  # penalised for domination

    def test_balanced_courts(self):
        results = [
            {"court_type": "supreme"},
            {"court_type": "appeal"},
            {"court_type": "district"},
            {"court_type": "admin"},
        ]
        score = calc_court_fairness(results)
        assert score >= 0.9


class TestCalcTimeFairness:
    def test_empty(self):
        assert calc_time_fairness([]) == 1.0

    def test_same_year(self):
        results = [{"year": 2568}] * 5
        score = calc_time_fairness(results)
        assert score == 0.0  # no spread

    def test_five_year_spread(self):
        results = [{"year": y} for y in range(2564, 2569)]
        score = calc_time_fairness(results)
        assert score >= 0.8

    def test_large_spread_capped(self):
        results = [{"year": 2550}, {"year": 2568}]
        score = calc_time_fairness(results)
        assert score == 1.0  # spread > 5 → capped at 1


class TestGetFairnessMetrics:
    def test_empty_results_high_fairness(self):
        svc = DashboardService(audit_service=AuditService())
        metrics = svc.get_fairness_metrics([])
        assert metrics["cfs"] >= 0.9
        assert metrics["warning"] is False

    def test_warning_when_cfs_below_07(self):
        """All same court, same year, all Bangkok → low CFS → warning."""
        results = [
            {"province": "กรุงเทพมหานคร", "court_type": "supreme", "year": 2568}
        ] * 10
        svc = DashboardService(audit_service=AuditService())
        metrics = svc.get_fairness_metrics(results)
        assert metrics["cfs"] < 0.7
        assert metrics["warning"] is True
        assert metrics["label"] == "ควรปรับปรุง"

    def test_high_fairness_diverse_results(self):
        results = [
            {"province": "เชียงใหม่", "court_type": "supreme", "year": 2564},
            {"province": "ขอนแก่น", "court_type": "appeal", "year": 2565},
            {"province": "สงขลา", "court_type": "district", "year": 2566},
            {"province": "ชลบุรี", "court_type": "admin", "year": 2568},
        ]
        svc = DashboardService(audit_service=AuditService())
        metrics = svc.get_fairness_metrics(results)
        assert metrics["cfs"] >= 0.7
        assert metrics["warning"] is False

    def test_bias_breakdown_present(self):
        results = [
            {"province": "เชียงใหม่", "court_type": "supreme", "year": 2568, "case_type": "civil"},
        ]
        svc = DashboardService(audit_service=AuditService())
        metrics = svc.get_fairness_metrics(results)
        assert "bias_breakdown" in metrics
        assert "geographic" in metrics["bias_breakdown"]
        assert "court_type" in metrics["bias_breakdown"]


# ======================================================================
# Report Generation
# ======================================================================


class TestGenerateReport:
    def test_report_structure(self):
        svc = DashboardService(audit_service=AuditService())
        report = svc.generate_report()
        assert report["report_type"] == "dashboard_summary"
        assert "stats" in report
        assert "bottlenecks" in report
        assert report["format"] == "json"

    def test_report_with_data(self):
        audit = _make_audit_with_entries([
            {"case_type": "civil", "processing_days": 300},
        ])
        report = DashboardService(audit_service=audit).generate_report()
        assert report["stats"]["total_cases"] == 1
