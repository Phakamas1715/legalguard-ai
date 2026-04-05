"""Tests for e-Filing XML Export Service."""

import xml.etree.ElementTree as ET

import pytest

from app.services.efiling_xml import (
    Attorney,
    EFilingComplaint,
    EFilingXMLExporter,
    Party,
)


@pytest.fixture
def exporter():
    return EFilingXMLExporter()


def _make_complaint(**overrides) -> EFilingComplaint:
    """Helper to build a valid complaint with sensible defaults."""
    defaults = {
        "case_type": "civil",
        "court_name": "ศาลแพ่ง",
        "filing_date": "2568-04-05",
        "plaintiffs": [Party(prefix="นาย", first_name="สมชาย", last_name="ใจดี", address="กรุงเทพฯ", role="โจทก์")],
        "defendants": [Party(prefix="นาง", first_name="สมหญิง", last_name="รักดี", address="เชียงใหม่", role="จำเลย")],
        "facts": "จำเลยกู้ยืมเงินจากโจทก์จำนวน 100,000 บาท แล้วไม่ชำระคืน",
        "legal_grounds": "ป.พ.พ. มาตรา 653",
        "statutes": ["ป.พ.พ. มาตรา 653"],
        "relief_requested": "ขอให้จำเลยชำระเงิน 100,000 บาท พร้อมดอกเบี้ย",
        "damages_amount": 100000.0,
    }
    defaults.update(overrides)
    return EFilingComplaint(**defaults)


# --- Export tests ---

class TestExport:
    def test_civil_export_produces_valid_xml(self, exporter):
        complaint = _make_complaint()
        xml_str = exporter.export(complaint)
        root = ET.fromstring(xml_str)
        assert root.get("form") == "04"
        assert root.get("type") == "civil"
        assert root.find(".//court").text == "ศาลแพ่ง"

    def test_criminal_export_uses_form_06(self, exporter):
        complaint = _make_complaint(case_type="criminal")
        xml_str = exporter.export(complaint)
        root = ET.fromstring(xml_str)
        assert root.get("type") == "criminal"
        relief = root.find(".//relief")
        assert relief.get("form") == "06"

    def test_admin_export_uses_pk1(self, exporter):
        complaint = _make_complaint(
            case_type="administrative",
            court_name="ศาลปกครองกลาง",
            section_56_elements="ครบถ้วน",
            jurisdiction_reason="อยู่ในเขตอำนาจ",
            legal_interest="มีส่วนได้เสีย",
            filing_deadline_check="ภายใน 90 วัน",
        )
        xml_str = exporter.export(complaint)
        root = ET.fromstring(xml_str)
        assert root.get("form") == "pk1"
        assert root.find(".//section_56_elements").text == "ครบถ้วน"

    def test_export_includes_attorney(self, exporter):
        complaint = _make_complaint(
            attorney=Attorney(name="ทนาย ก", license_no="12345")
        )
        xml_str = exporter.export(complaint)
        root = ET.fromstring(xml_str)
        att = root.find(".//attorney")
        assert att is not None
        assert att.find("license_no").text == "12345"

    def test_export_includes_witnesses(self, exporter):
        complaint = _make_complaint(witness_list=["พยาน 1", "พยาน 2"])
        xml_str = exporter.export(complaint)
        root = ET.fromstring(xml_str)
        witnesses = root.findall(".//witness")
        assert len(witnesses) == 2

    def test_export_includes_disclaimer(self, exporter):
        complaint = _make_complaint()
        xml_str = exporter.export(complaint)
        root = ET.fromstring(xml_str)
        disclaimer = root.find(".//disclaimer")
        assert disclaimer is not None
        assert "LegalGuard AI" in disclaimer.text


# --- Validation tests ---

class TestValidation:
    def test_valid_complaint_passes(self, exporter):
        complaint = _make_complaint()
        xml_str = exporter.export(complaint)
        result = exporter.validate(xml_str)
        assert result["valid"] is True
        assert result["errors"] == []

    def test_missing_facts_fails(self, exporter):
        complaint = _make_complaint(facts="")
        xml_str = exporter.export(complaint)
        result = exporter.validate(xml_str)
        assert result["valid"] is False
        assert any("facts" in e.lower() for e in result["errors"])

    def test_missing_legal_grounds_fails(self, exporter):
        complaint = _make_complaint(legal_grounds="")
        xml_str = exporter.export(complaint)
        result = exporter.validate(xml_str)
        assert result["valid"] is False
        assert any("legal_grounds" in e for e in result["errors"])

    def test_no_plaintiffs_fails(self, exporter):
        complaint = _make_complaint(plaintiffs=[])
        xml_str = exporter.export(complaint)
        result = exporter.validate(xml_str)
        assert result["valid"] is False
        assert any("plaintiff" in e.lower() for e in result["errors"])

    def test_no_defendants_fails(self, exporter):
        complaint = _make_complaint(defendants=[])
        xml_str = exporter.export(complaint)
        result = exporter.validate(xml_str)
        assert result["valid"] is False
        assert any("defendant" in e.lower() for e in result["errors"])

    def test_admin_missing_section56_fails(self, exporter):
        complaint = _make_complaint(
            case_type="administrative",
            court_name="ศาลปกครองกลาง",
            section_56_elements="",
            jurisdiction_reason="",
            legal_interest="",
            filing_deadline_check="",
        )
        xml_str = exporter.export(complaint)
        result = exporter.validate(xml_str)
        assert result["valid"] is False
        assert any("section_56" in e for e in result["errors"])

    def test_malformed_xml_fails(self, exporter):
        result = exporter.validate("<broken><xml")
        assert result["valid"] is False
        assert any("parse error" in e.lower() for e in result["errors"])

    def test_missing_relief_fails(self, exporter):
        complaint = _make_complaint(relief_requested="")
        xml_str = exporter.export(complaint)
        result = exporter.validate(xml_str)
        assert result["valid"] is False
        assert any("relief_requested" in e for e in result["errors"])

    def test_party_missing_name_fails(self, exporter):
        complaint = _make_complaint(
            plaintiffs=[Party(prefix="นาย", first_name="", last_name="ใจดี", address="กรุงเทพฯ", role="โจทก์")]
        )
        xml_str = exporter.export(complaint)
        result = exporter.validate(xml_str)
        assert result["valid"] is False
        assert any("first_name" in e for e in result["errors"])


# --- Round-trip tests ---

class TestRoundTrip:
    def test_round_trip_preserves_facts(self, exporter):
        complaint = _make_complaint()
        result = exporter.round_trip(complaint)
        assert result["match"] is True
        assert result["xml_length"] > 0
        assert result["parsed_fields"] > 0

    def test_round_trip_with_thai_text(self, exporter):
        complaint = _make_complaint(
            facts="จำเลยที่ 1 ร่วมกันฉ้อโกงโจทก์ โดยหลอกลวงว่าจะขายที่ดิน"
        )
        result = exporter.round_trip(complaint)
        assert result["match"] is True

    def test_parse_returns_fields(self, exporter):
        complaint = _make_complaint()
        xml_str = exporter.export(complaint)
        parsed = exporter.parse(xml_str)
        assert "court" in parsed
        assert parsed["court"] == "ศาลแพ่ง"
        assert "facts" in parsed


# --- JSON fallback (endpoint-level behavior) ---

class TestExportEndpointLogic:
    """Test the logic that would be in the endpoint — JSON fallback on failure."""

    def test_valid_export_returns_xml(self, exporter):
        complaint = _make_complaint()
        xml_str = exporter.export(complaint)
        validation = exporter.validate(xml_str)
        assert validation["valid"] is True
        assert xml_str.startswith("<?xml")

    def test_invalid_export_can_provide_json_fallback(self, exporter):
        complaint = _make_complaint(facts="", plaintiffs=[])
        xml_str = exporter.export(complaint)
        validation = exporter.validate(xml_str)
        assert validation["valid"] is False
        # JSON fallback should still be available
        json_data = complaint.model_dump()
        assert json_data["case_type"] == "civil"
        assert json_data["court_name"] == "ศาลแพ่ง"
