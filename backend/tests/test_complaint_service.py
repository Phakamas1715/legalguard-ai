"""Tests for the Complaint Drafting Assistant service."""

from __future__ import annotations

import pytest

from app.services.complaint_service import (
    ClassifyRequest,
    ClassifyResponse,
    ComplaintService,
    DraftRequest,
    DraftResponse,
    ValidateRequest,
    ValidateResponse,
    VerifyRequest,
    VerifyResponse,
    _DISCLAIMER,
)


@pytest.fixture
def service() -> ComplaintService:
    return ComplaintService()


# ---------------------------------------------------------------------------
# Classification tests
# ---------------------------------------------------------------------------


class TestClassify:
    def test_criminal_keywords(self, service: ComplaintService):
        resp = service.classify(ClassifyRequest(facts="ถูกฉ้อโกงเงิน 100,000 บาท"))
        assert resp.case_type == "criminal"
        assert resp.confidence > 0.3
        assert "ป.อ." in resp.statutes

    def test_civil_keywords(self, service: ComplaintService):
        resp = service.classify(ClassifyRequest(facts="ผิดสัญญาเช่าบ้าน ไม่จ่ายค่าเช่า"))
        assert resp.case_type == "civil"
        assert resp.confidence > 0.3
        assert "ป.พ.พ." in resp.statutes

    def test_administrative_keywords(self, service: ComplaintService):
        resp = service.classify(ClassifyRequest(
            facts="หน่วยงานรัฐไม่ออกใบอนุญาตตามกฎหมายปกครอง"
        ))
        assert resp.case_type == "administrative"
        assert resp.confidence > 0.3

    def test_no_keywords_defaults_civil(self, service: ComplaintService):
        resp = service.classify(ClassifyRequest(facts="มีปัญหาทั่วไป"))
        assert resp.case_type == "civil"
        assert resp.confidence == 0.3

    def test_confidence_capped_at_095(self, service: ComplaintService):
        resp = service.classify(ClassifyRequest(facts="ฉ้อโกง ลักทรัพย์ ทำร้าย"))
        assert resp.confidence <= 0.95

    def test_returns_valid_case_type(self, service: ComplaintService):
        for facts in ["ฉ้อโกง", "สัญญา", "หน่วยงานรัฐ", "random text"]:
            resp = service.classify(ClassifyRequest(facts=facts))
            assert resp.case_type in ("civil", "criminal", "administrative")
            assert 0 < resp.confidence <= 0.95
            assert resp.recommended_court
            assert isinstance(resp.statutes, list)


# ---------------------------------------------------------------------------
# Draft generation tests
# ---------------------------------------------------------------------------


class TestDraft:
    def test_civil_draft(self, service: ComplaintService):
        resp = service.draft(DraftRequest(
            facts="ผิดสัญญาซื้อขาย",
            case_type="civil",
            plaintiff="นายทดสอบ",
            defendant="นายจำเลย",
        ))
        assert resp.case_type == "civil"
        assert "คำฟ้องคดีแพ่ง" in resp.draft_text
        assert "นายทดสอบ" in resp.draft_text
        assert "นายจำเลย" in resp.draft_text
        assert resp.disclaimer == _DISCLAIMER
        assert resp.fields["plaintiff"] == "นายทดสอบ"

    def test_criminal_draft(self, service: ComplaintService):
        resp = service.draft(DraftRequest(
            facts="ถูกฉ้อโกง",
            case_type="criminal",
        ))
        assert resp.case_type == "criminal"
        assert "คำฟ้องคดีอาญา" in resp.draft_text

    def test_administrative_draft(self, service: ComplaintService):
        resp = service.draft(DraftRequest(
            facts="หน่วยงานรัฐไม่ออกใบอนุญาต",
            case_type="administrative",
        ))
        assert resp.case_type == "administrative"
        assert "คำฟ้องคดีปกครอง" in resp.draft_text
        assert "มาตรา 56" in resp.draft_text

    def test_unknown_case_type_defaults_civil(self, service: ComplaintService):
        resp = service.draft(DraftRequest(facts="test", case_type="unknown"))
        assert resp.case_type == "civil"

    def test_draft_includes_facts(self, service: ComplaintService):
        resp = service.draft(DraftRequest(facts="ข้อเท็จจริงสำคัญ", case_type="civil"))
        assert "ข้อเท็จจริงสำคัญ" in resp.draft_text

    def test_draft_fields_contain_case_type(self, service: ComplaintService):
        resp = service.draft(DraftRequest(facts="test", case_type="criminal"))
        assert resp.fields["case_type"] == "criminal"


# ---------------------------------------------------------------------------
# Validation tests
# ---------------------------------------------------------------------------


class TestValidate:
    def test_complete_civil_draft(self, service: ComplaintService):
        resp = service.validate(ValidateRequest(draft={
            "plaintiff": "นายก",
            "defendant": "นายข",
            "facts": "ผิดสัญญา",
            "case_type": "civil",
            "court": "ศาลแพ่ง",
            "relief": "ชดใช้ค่าเสียหาย",
        }))
        assert resp.completeness_score == 1.0
        assert resp.missing_fields == []

    def test_missing_fields_civil(self, service: ComplaintService):
        resp = service.validate(ValidateRequest(draft={
            "plaintiff": "นายก",
            "case_type": "civil",
        }))
        assert resp.completeness_score < 1.0
        assert len(resp.missing_fields) > 0
        missing_names = [f["field"] for f in resp.missing_fields]
        assert "defendant" in missing_names
        assert "facts" in missing_names

    def test_administrative_warnings(self, service: ComplaintService):
        resp = service.validate(ValidateRequest(draft={
            "plaintiff": "นายก",
            "defendant": "หน่วยงาน",
            "facts": "ไม่ออกใบอนุญาต",
            "case_type": "administrative",
            "court": "ศาลปกครอง",
        }))
        assert resp.completeness_score < 1.0
        assert len(resp.warnings) > 0
        assert any("มาตรา 56" in w for w in resp.warnings)

    def test_complete_administrative_draft(self, service: ComplaintService):
        resp = service.validate(ValidateRequest(draft={
            "plaintiff": "นายก",
            "defendant": "หน่วยงาน",
            "facts": "ไม่ออกใบอนุญาต",
            "case_type": "administrative",
            "court": "ศาลปกครอง",
            "section_56_elements": "ครบถ้วน",
            "jurisdiction": "มีอำนาจ",
            "legal_interest": "มีส่วนได้เสีย",
            "filing_deadline": "ภายใน 90 วัน",
        }))
        assert resp.completeness_score == 1.0
        assert resp.warnings == []

    def test_empty_string_fields_treated_as_missing(self, service: ComplaintService):
        resp = service.validate(ValidateRequest(draft={
            "plaintiff": "",
            "defendant": "  ",
            "facts": "test",
            "case_type": "civil",
            "court": "ศาลแพ่ง",
            "relief": "test",
        }))
        missing_names = [f["field"] for f in resp.missing_fields]
        assert "plaintiff" in missing_names
        assert "defendant" in missing_names

    def test_missing_fields_have_instructions(self, service: ComplaintService):
        resp = service.validate(ValidateRequest(draft={"case_type": "civil"}))
        for mf in resp.missing_fields:
            assert "field" in mf
            assert "instruction" in mf
            assert mf["instruction"]  # non-empty


# ---------------------------------------------------------------------------
# Verify & Summarize tests
# ---------------------------------------------------------------------------


class TestVerifyAndSummarize:
    def test_complete_complaint_high_score(self, service: ComplaintService):
        resp = service.verify_and_summarize(VerifyRequest(
            complaint={
                "plaintiff": "นายก",
                "defendant": "นายข",
                "facts": "ผิดสัญญาซื้อขาย",
                "case_type": "civil",
                "court": "ศาลแพ่ง",
                "relief": "ชดใช้ค่าเสียหาย",
                "statutes": "ป.พ.พ., มาตรา 391",
            },
            target_court="justice",
        ))
        assert resp.completeness_score == 1.0
        assert resp.missing_elements == []
        assert resp.case_type == "civil"
        assert "นายก" in resp.parties["plaintiff"]
        assert len(resp.cited_statutes) == 2

    def test_incomplete_complaint_lists_missing(self, service: ComplaintService):
        resp = service.verify_and_summarize(VerifyRequest(
            complaint={
                "facts": "ถูกฉ้อโกง",
                "case_type": "criminal",
            },
            target_court="justice",
        ))
        assert resp.completeness_score < 0.7
        assert len(resp.missing_elements) > 0
        missing_names = [e["element"] for e in resp.missing_elements]
        assert "plaintiff" in missing_names

    def test_administrative_court_uses_admin_fields(self, service: ComplaintService):
        resp = service.verify_and_summarize(VerifyRequest(
            complaint={
                "plaintiff": "นายก",
                "defendant": "หน่วยงาน",
                "facts": "ไม่ออกใบอนุญาต",
                "case_type": "administrative",
                "court": "ศาลปกครอง",
            },
            target_court="administrative",
        ))
        # Administrative has more required fields
        assert resp.completeness_score < 1.0

    def test_summary_contains_key_info(self, service: ComplaintService):
        resp = service.verify_and_summarize(VerifyRequest(
            complaint={
                "plaintiff": "นายทดสอบ",
                "defendant": "นายจำเลย",
                "facts": "ข้อเท็จจริงสำคัญ",
                "case_type": "civil",
                "court": "ศาลแพ่ง",
                "relief": "ชดใช้",
            },
            target_court="justice",
        ))
        assert "civil" in resp.summary
        assert "นายทดสอบ" in resp.summary

    def test_statutes_parsed_from_comma_string(self, service: ComplaintService):
        resp = service.verify_and_summarize(VerifyRequest(
            complaint={
                "facts": "test",
                "case_type": "civil",
                "statutes": "ป.พ.พ., มาตรา 391, มาตรา 420",
            },
            target_court="justice",
        ))
        assert len(resp.cited_statutes) == 3
