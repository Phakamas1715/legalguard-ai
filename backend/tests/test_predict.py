"""Tests for Case Outcome Prediction API."""

from __future__ import annotations

import pytest

from app.routers.predict import (
    PredictRequest,
    PredictResponse,
    SimilarCase,
    _classify_outcome,
    _compute_win_loss_ratio,
    _extract_factors,
)


class TestOutcomeClassification:
    def test_plaintiff_wins(self):
        assert _classify_outcome("ศาลพิพากษาลงโทษจำคุก 2 ปี") == "plaintiff_wins"

    def test_defendant_wins(self):
        assert _classify_outcome("ศาลพิพากษายกฟ้อง") == "defendant_wins"

    def test_settlement(self):
        assert _classify_outcome("คู่ความประนีประนอมยอมความ") == "settlement"

    def test_dismissed(self):
        assert _classify_outcome("ศาลมีคำสั่งจำหน่ายคดี") == "dismissed"

    def test_default_plaintiff(self):
        assert _classify_outcome("ข้อความทั่วไป") == "plaintiff_wins"


class TestWinLossRatio:
    def test_all_wins(self):
        cases = [{"outcome": "plaintiff_wins"}, {"outcome": "plaintiff_wins"}]
        assert _compute_win_loss_ratio(cases) == 1.0

    def test_mixed(self):
        cases = [
            {"outcome": "plaintiff_wins"},
            {"outcome": "defendant_wins"},
            {"outcome": "plaintiff_wins"},
            {"outcome": "settlement"},
        ]
        assert _compute_win_loss_ratio(cases) == 0.5

    def test_empty(self):
        assert _compute_win_loss_ratio([]) == 0.0


class TestExtractFactors:
    def test_basic_factors(self):
        cases = [
            {"court_type": "supreme", "statutes": ["มาตรา 341"], "relevance_score": 0.9},
            {"court_type": "appeal", "statutes": ["มาตรา 341", "มาตรา 342"], "relevance_score": 0.8},
        ]
        factors = _extract_factors("ฉ้อโกง", cases)
        assert factors["similar_cases_found"] == 2
        assert "supreme" in factors["case_type_distribution"]
        assert "มาตรา 341" in factors["statute_frequency"]
        assert factors["avg_relevance"] > 0


class TestPredictResponse:
    def test_response_model(self):
        resp = PredictResponse(
            predicted_outcome="plaintiff_wins",
            confidence=0.75,
            similar_cases_count=5,
            win_loss_ratio=0.6,
            top_precedents=[],
            factors={},
            low_confidence_warning=True,
        )
        assert resp.predicted_outcome == "plaintiff_wins"
        assert resp.low_confidence_warning
        assert resp.risk_level == "R4"
        assert "พยากรณ์" in resp.disclaimer
