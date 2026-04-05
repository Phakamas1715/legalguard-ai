"""Tests for Responsible AI Engine — Risk Tiers, CBB, Honesty Score, Circuit Breaker."""

from __future__ import annotations

import pytest

from app.services.responsible_ai import (
    CircuitBreaker,
    CommitRevealProtocol,
    StrategicDishonestyDetector,
    apply_confidence_bound,
    apply_missing_data_penalty,
    calculate_honesty_score,
    confidence_badge,
    detect_bias_convergence,
    enforce_risk_tier,
    generate_ethical_disclaimer,
    governance_score,
    honesty_level,
    legal_risk_score,
    partition_knowledge,
    risk_level_from_score,
)


# ---------------------------------------------------------------------------
# Risk Tiers
# ---------------------------------------------------------------------------


class TestRiskTiers:
    def test_r0_no_risk(self):
        result = enforce_risk_tier("faq_lookup", 0.99)
        assert not result.blocked
        assert result.risk_level == "R0"
        assert result.confidence_bounded == 0.99

    def test_r5_blocked(self):
        result = enforce_risk_tier("case_ruling", 0.95)
        assert result.blocked
        assert result.risk_level == "R5"
        assert result.confidence_bounded == 0.0

    def test_r3_caps_confidence(self):
        result = enforce_risk_tier("complaint_draft", 0.95)
        assert not result.blocked
        assert result.risk_level == "R3"
        assert result.confidence_bounded == 0.85
        assert result.human_review_required

    def test_r4_judgment_draft(self):
        result = enforce_risk_tier("judgment_draft", 0.90)
        assert result.confidence_bounded == 0.80
        assert result.human_review_required

    def test_unknown_action_defaults_r3(self):
        result = enforce_risk_tier("unknown_action", 0.95)
        assert result.risk_level == "R3"
        assert result.confidence_bounded == 0.85


# ---------------------------------------------------------------------------
# CBB
# ---------------------------------------------------------------------------


class TestCBB:
    def test_caps_chatbot(self):
        assert apply_confidence_bound(0.99, "chatbot_response") == 0.90

    def test_caps_prediction(self):
        assert apply_confidence_bound(0.99, "case_prediction") == 0.85

    def test_no_cap_needed(self):
        assert apply_confidence_bound(0.50, "chatbot_response") == 0.50

    def test_disclaimer_low_confidence(self):
        d = generate_ethical_disclaimer("chatbot_response", 0.3)
        assert "ความมั่นใจต่ำ" in d

    def test_disclaimer_normal(self):
        d = generate_ethical_disclaimer("chatbot_response", 0.8)
        assert "ข้อมูลเบื้องต้น" in d


# ---------------------------------------------------------------------------
# Missing Data Penalty
# ---------------------------------------------------------------------------


class TestMissingDataPenalty:
    def test_all_sources_available(self):
        eff, human, disc = apply_missing_data_penalty(
            0.90, ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "B1", "B2", "B3", "B4", "B5"]
        )
        assert eff == 0.90
        assert not human
        assert "ครบถ้วน" in disc

    def test_some_missing(self):
        eff, human, disc = apply_missing_data_penalty(0.90, ["A1", "A2"])
        assert eff < 0.90
        assert "ยังไม่พร้อม" in disc

    def test_most_missing_triggers_human_review(self):
        eff, human, disc = apply_missing_data_penalty(0.90, ["A1"])
        assert human is True
        assert eff < 0.50


# ---------------------------------------------------------------------------
# Honesty Score
# ---------------------------------------------------------------------------


class TestHonestyScore:
    def test_perfect_response(self):
        response = {
            "citations": [{"verified": True}],
            "confidence": 0.80,
            "disclaimer": "⚠️ test",
            "content": "ข้อมูลทดสอบ",
            "debate_metadata": {"verdict": "researcher_wins"},
        }
        state = {"confidence_cap": 0.90, "uncertainty_ratio": 0.0}
        score = calculate_honesty_score(response, state)
        assert score >= 0.80

    def test_low_honesty_with_pii_leak(self):
        response = {
            "citations": [],
            "confidence": 0.99,
            "content": "นายสมชาย ใจดี โทร 089-123-4567",  # PII present
        }
        state = {"confidence_cap": 0.85}
        score = calculate_honesty_score(response, state)
        assert score < 0.50  # PII leak + over-confidence

    def test_honesty_levels(self):
        assert honesty_level(0.95)[0] == "ซื่อสัตย์สูง"
        assert honesty_level(0.75)[0] == "ซื่อสัตย์ปานกลาง"
        assert honesty_level(0.55)[0] == "ต้องระวัง"
        assert honesty_level(0.30)[0] == "ไม่น่าเชื่อถือ"


# ---------------------------------------------------------------------------
# Confidence Badge
# ---------------------------------------------------------------------------


class TestConfidenceBadge:
    def test_green_badge(self):
        badge = confidence_badge(0.95, cfs_score=0.95, citations_complete=True)
        assert badge["badge"] == "🟢"
        assert badge["level"] == "high"

    def test_yellow_badge(self):
        badge = confidence_badge(0.75, cfs_score=0.80)
        assert badge["badge"] == "🟡"
        assert badge["level"] == "medium"

    def test_red_badge(self):
        badge = confidence_badge(0.40, cfs_score=0.50)
        assert badge["badge"] == "🔴"
        assert badge["level"] == "low"


# ---------------------------------------------------------------------------
# Circuit Breaker
# ---------------------------------------------------------------------------


class TestCircuitBreaker:
    def test_no_alerts_for_good_response(self):
        cb = CircuitBreaker()
        result = cb.check(
            {"confidence": 0.80},
            {"honesty_score": 0.90, "pii_leaked": 0},
        )
        assert not result["should_block"]
        assert not result["should_warn"]

    def test_blocks_on_low_honesty(self):
        cb = CircuitBreaker()
        result = cb.check(
            {"confidence": 0.80},
            {"honesty_score": 0.30, "pii_leaked": 0},
        )
        assert result["should_block"]

    def test_blocks_on_pii_leak(self):
        cb = CircuitBreaker()
        result = cb.check(
            {"confidence": 0.80},
            {"honesty_score": 0.90, "pii_leaked": 3},
        )
        assert result["should_block"]

    def test_warns_on_low_confidence(self):
        cb = CircuitBreaker()
        result = cb.check(
            {"confidence": 0.30},
            {"honesty_score": 0.90, "pii_leaked": 0},
        )
        assert result["should_warn"]
        assert not result["should_block"]

    def test_warns_on_conflicting_precedents(self):
        cb = CircuitBreaker()
        result = cb.check(
            {"confidence": 0.80, "conflicting_precedents": ["ฎ.1/2560", "ฎ.2/2565"]},
            {"honesty_score": 0.90, "pii_leaked": 0},
        )
        assert result["should_warn"]


# ---------------------------------------------------------------------------
# Commit-Reveal Protocol
# ---------------------------------------------------------------------------


class TestCommitRevealProtocol:
    def test_commit_and_reveal_match(self):
        protocol = CommitRevealProtocol()
        response = {"answer": "ฉ้อโกง มาตรา 341", "confidence": 0.85}
        commit_hash = protocol.commit("researcher", response)
        assert len(commit_hash) == 64  # SHA-256
        assert protocol.reveal("researcher", response)

    def test_reveal_fails_on_tampered_response(self):
        protocol = CommitRevealProtocol()
        original = {"answer": "ฉ้อโกง มาตรา 341"}
        protocol.commit("researcher", original)
        tampered = {"answer": "ฉ้อโกง มาตรา 342"}
        assert not protocol.reveal("researcher", tampered)

    def test_reveal_fails_for_unknown_agent(self):
        protocol = CommitRevealProtocol()
        assert not protocol.reveal("unknown", {"answer": "test"})

    def test_reset_clears_state(self):
        protocol = CommitRevealProtocol()
        protocol.commit("researcher", {"answer": "test"})
        protocol.reset()
        assert not protocol.reveal("researcher", {"answer": "test"})


# ---------------------------------------------------------------------------
# Knowledge Partition
# ---------------------------------------------------------------------------


class TestKnowledgePartition:
    def test_splits_into_two_shards(self):
        results = [{"id": i} for i in range(10)]
        shard_a, shard_b = partition_knowledge(results, seed=42)
        assert len(shard_a) + len(shard_b) == 10
        assert len(shard_a) == 5

    def test_deterministic_with_same_seed(self):
        results = [{"id": i} for i in range(10)]
        a1, b1 = partition_knowledge(results, seed=42)
        a2, b2 = partition_knowledge(results, seed=42)
        assert a1 == a2
        assert b1 == b2

    def test_different_seeds_different_splits(self):
        results = [{"id": i} for i in range(10)]
        a1, _ = partition_knowledge(results, seed=42)
        a2, _ = partition_knowledge(results, seed=99)
        assert a1 != a2


# ---------------------------------------------------------------------------
# Bias Convergence Detection
# ---------------------------------------------------------------------------


class TestBiasConvergence:
    def test_no_convergence_on_different_texts(self):
        result = detect_bias_convergence("ฉ้อโกง มาตรา 341", "ยักยอก มาตรา 352", 1)
        assert not result["convergence_detected"]

    def test_detects_convergence_on_identical_texts(self):
        text = "ฉ้อโกง มาตรา 341 ต้องจำคุก"
        result = detect_bias_convergence(text, text, 1)
        assert result["convergence_detected"]
        assert result["similarity"] > 0.95

    def test_no_convergence_after_multiple_rounds(self):
        text = "ฉ้อโกง มาตรา 341 ต้องจำคุก"
        result = detect_bias_convergence(text, text, 3)
        assert not result["convergence_detected"]  # debate_rounds > 1


# ---------------------------------------------------------------------------
# Strategic Dishonesty Detection
# ---------------------------------------------------------------------------


class TestStrategicDishonesty:
    def test_detects_under_claiming(self):
        detector = StrategicDishonestyDetector()
        result = detector.check(raw_confidence=0.90, bounded_confidence=0.40, evidence_strength=0.85)
        assert result["is_under_claiming"]
        assert result["action"] == "adjust_up"

    def test_no_under_claiming_when_calibrated(self):
        detector = StrategicDishonestyDetector()
        result = detector.check(raw_confidence=0.80, bounded_confidence=0.75, evidence_strength=0.80)
        assert not result["is_under_claiming"]
        assert result["action"] == "none"


# ---------------------------------------------------------------------------
# Legal Risk Score
# ---------------------------------------------------------------------------


class TestLegalRiskScore:
    def test_low_risk_for_clean_response(self):
        response = {"citations": [{"verified": True}], "confidence": 0.80}
        state = {"confidence_cap": 0.90, "missing_sources": [], "avg_honesty_score": 0.90}
        p = legal_risk_score(response, state)
        assert p < 0.5

    def test_high_risk_for_unverified_citations(self):
        response = {
            "citations": [{"verified": False}, {"verified": False}],
            "confidence": 0.99,
        }
        state = {"confidence_cap": 0.85, "missing_sources": ["A4", "A5", "B5"], "avg_honesty_score": 0.3}
        p = legal_risk_score(response, state)
        assert p > 0.5

    def test_risk_levels(self):
        assert risk_level_from_score(0.1)[0] == "ปลอดภัย"
        assert risk_level_from_score(0.4)[0] == "ระวัง"
        assert risk_level_from_score(0.7)[0] == "เสี่ยงสูง"
        assert risk_level_from_score(0.9)[0] == "อันตราย"


# ---------------------------------------------------------------------------
# Governance Score
# ---------------------------------------------------------------------------


class TestGovernanceScore:
    def test_passing_governance(self):
        response = {
            "citations": [{"verified": True}],
            "confidence": 0.80,
            "relevance_score": 0.85,
            "disclaimer": "⚠️ test",
            "pii_clean": True,
            "latency_score": 0.90,
        }
        state = {
            "confidence_cap": 0.90,
            "avg_user_rating": 0.85,
            "honesty_score": 0.90,
            "risk_level": "R2",
        }
        result = governance_score(response, state)
        assert result["raaia_compliance"] == 1
        assert result["governance_score"] > 0

    def test_failing_governance_r5(self):
        response = {"citations": [], "confidence": 0.50, "disclaimer": "test", "pii_clean": True}
        state = {"confidence_cap": 0.90, "honesty_score": 0.85, "risk_level": "R5"}
        result = governance_score(response, state)
        assert result["raaia_compliance"] == 0
