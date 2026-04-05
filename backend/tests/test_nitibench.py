"""Tests for NitiBench — Thai Legal RAG Benchmark."""

import pytest

from app.services.nitibench import (
    SURVEY_CASES,
    BenchmarkCase,
    BenchmarkReport,
    evaluate_search_results,
    print_report,
    run_benchmark,
)


class TestSurveyCases:
    def test_has_at_least_10_cases(self):
        assert len(SURVEY_CASES) >= 10

    def test_all_cases_have_required_fields(self):
        for c in SURVEY_CASES:
            assert c.id
            assert c.query
            assert c.expected_statutes
            assert c.expected_case_type
            assert c.expected_keywords
            assert c.user_role in ("citizen", "lawyer", "government")

    def test_unique_ids(self):
        ids = [c.id for c in SURVEY_CASES]
        assert len(ids) == len(set(ids))


class TestEvaluateSearchResults:
    def test_perfect_hit(self):
        case = BenchmarkCase(
            id="T1", query="ฉ้อโกง",
            expected_statutes=["ป.อ. มาตรา 341"],
            expected_case_type="อาญา",
            expected_keywords=["ฉ้อโกง"],
        )
        results = [{"statutes": ["ป.อ. มาตรา 341"], "summary": "คดีฉ้อโกง", "title": "ฉ้อโกง"}]
        ev = evaluate_search_results(case, results)
        assert ev.hit_at_1 is True
        assert ev.hit_at_3 is True
        assert ev.reciprocal_rank == 1.0
        assert ev.citation_accuracy == 1.0

    def test_hit_at_rank_3(self):
        case = BenchmarkCase(
            id="T2", query="แรงงาน",
            expected_statutes=["พ.ร.บ.คุ้มครองแรงงาน"],
            expected_case_type="แพ่ง",
            expected_keywords=["แรงงาน"],
        )
        results = [
            {"statutes": [], "summary": "ไม่เกี่ยว", "title": "อื่น"},
            {"statutes": [], "summary": "ไม่เกี่ยว", "title": "อื่น"},
            {"statutes": ["พ.ร.บ.คุ้มครองแรงงาน"], "summary": "เลิกจ้าง", "title": "แรงงาน"},
        ]
        ev = evaluate_search_results(case, results)
        assert ev.hit_at_1 is False
        assert ev.hit_at_3 is True
        assert abs(ev.reciprocal_rank - 1 / 3) < 1e-9

    def test_no_hit(self):
        case = BenchmarkCase(
            id="T3", query="ภาษี",
            expected_statutes=["ประมวลรัษฎากร"],
            expected_case_type="แพ่ง",
            expected_keywords=["ภาษี"],
        )
        results = [{"statutes": [], "summary": "ไม่เกี่ยว", "title": "อื่น"}]
        ev = evaluate_search_results(case, results)
        assert ev.hit_at_1 is False
        assert ev.hit_at_3 is False
        assert ev.reciprocal_rank == 0.0

    def test_keyword_match_without_statute(self):
        case = BenchmarkCase(
            id="T4", query="ค่าปรับจราจร",
            expected_statutes=["พ.ร.บ.จราจรทางบก"],
            expected_case_type="อาญา",
            expected_keywords=["ค่าปรับ"],
        )
        results = [{"statutes": [], "summary": "ค่าปรับตาม พ.ร.บ.", "title": "ค่าปรับจราจร"}]
        ev = evaluate_search_results(case, results)
        assert ev.hit_at_1 is True  # keyword match

    def test_empty_results(self):
        case = BenchmarkCase(
            id="T5", query="test",
            expected_statutes=["X"],
            expected_case_type="แพ่ง",
            expected_keywords=["test"],
        )
        ev = evaluate_search_results(case, [])
        assert ev.hit_at_1 is False
        assert ev.citation_accuracy == 0.0

    def test_latency_recorded(self):
        case = BenchmarkCase(
            id="T6", query="test",
            expected_statutes=["X"],
            expected_case_type="แพ่ง",
            expected_keywords=["test"],
        )
        ev = evaluate_search_results(case, [], latency_ms=150.5)
        assert ev.latency_ms == 150.5


class TestRunBenchmark:
    def test_run_with_mock_search(self):
        cases = [
            BenchmarkCase(
                id="M1", query="ฉ้อโกง",
                expected_statutes=["ป.อ. มาตรา 341"],
                expected_case_type="อาญา",
                expected_keywords=["ฉ้อโกง"],
            ),
        ]

        def mock_search(query, role):
            return [{"statutes": ["ป.อ. มาตรา 341"], "summary": "ฉ้อโกง", "title": "คดีฉ้อโกง"}], 100.0

        report = run_benchmark(mock_search, cases)
        assert report.total_cases == 1
        assert report.hit_at_3 == 1.0
        assert report.mrr == 1.0

    def test_run_with_failing_search(self):
        cases = [
            BenchmarkCase(
                id="M2", query="test",
                expected_statutes=["X"],
                expected_case_type="แพ่ง",
                expected_keywords=["test"],
            ),
        ]

        def failing_search(query, role):
            raise RuntimeError("API down")

        report = run_benchmark(failing_search, cases)
        assert report.total_cases == 1
        assert report.hit_at_3 == 0.0


class TestPrintReport:
    def test_print_format(self):
        report = BenchmarkReport(total_cases=1, hit_at_3=1.0, mrr=1.0)
        text = print_report(report)
        assert "NitiBench" in text
        assert "Hit@3" in text
