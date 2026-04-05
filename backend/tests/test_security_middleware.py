"""Tests for security middleware — data classification, access control, LLM gateway."""

from app.middleware.security import (
    AccessCheckResult,
    DataClassification,
    LLMGateway,
    check_access,
    classify_source,
)


class TestClassifySource:
    def test_public_sources(self):
        assert classify_source("A2.1") == DataClassification.PUBLIC
        assert classify_source("A7.1") == DataClassification.PUBLIC
        assert classify_source("B2.1") == DataClassification.PUBLIC

    def test_internal_sources(self):
        assert classify_source("A1.1") == DataClassification.INTERNAL
        assert classify_source("A3.1") == DataClassification.INTERNAL
        assert classify_source("B1.1") == DataClassification.INTERNAL

    def test_confidential_sources(self):
        assert classify_source("A4.1") == DataClassification.CONFIDENTIAL
        assert classify_source("A5.1") == DataClassification.CONFIDENTIAL
        assert classify_source("B5.1") == DataClassification.CONFIDENTIAL

    def test_unknown_defaults_internal(self):
        assert classify_source("Z9.9") == DataClassification.INTERNAL


class TestCheckAccess:
    def test_citizen_can_access_public(self):
        r = check_access("A2.1", "citizen")
        assert r.allowed is True

    def test_citizen_cannot_access_confidential(self):
        r = check_access("A4.1", "citizen")
        assert r.allowed is False

    def test_government_can_access_confidential(self):
        r = check_access("A4.1", "government")
        assert r.allowed is True

    def test_lawyer_can_access_internal(self):
        r = check_access("A1.1", "lawyer")
        assert r.allowed is True

    def test_invalid_role_defaults_citizen(self):
        r = check_access("A2.1", "invalid")
        assert r.allowed is True  # public is accessible


class TestLLMGateway:
    def test_masks_pii_before_sending(self):
        gw = LLMGateway()
        result = gw.send_to_llm("นายสมชาย ใจดี โทร 081-234-5678")
        assert result["pii_count"] > 0
        assert "081-234-5678" not in result["masked_text"]
        assert result["data_sovereignty"] == "text sent to LLM contains no PII"

    def test_no_pii_passes_through(self):
        gw = LLMGateway()
        result = gw.send_to_llm("ศาลมีคำสั่งให้ยกฟ้อง")
        assert result["pii_count"] == 0

    def test_fallback_to_ollama(self):
        gw = LLMGateway()
        gw._external_available = False
        result = gw.send_to_llm("test")
        assert result["provider"] == "ollama"
