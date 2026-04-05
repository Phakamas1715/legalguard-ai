"""Tests for metadata_extractor.py — Thai legal document metadata extraction."""

import pytest

from app.services.metadata_extractor import (
    DocumentMetadata,
    MetadataExtractor,
    SOURCE_TO_DOCTYPE,
)


@pytest.fixture
def extractor() -> MetadataExtractor:
    return MetadataExtractor()


# -----------------------------------------------------------------------
# Case number extraction
# -----------------------------------------------------------------------

class TestCaseNoExtraction:
    def test_supreme_court_case(self, extractor: MetadataExtractor):
        text = "คดีหมายเลข ฎ.1234/2568 ศาลฎีกา"
        meta = extractor.extract(text, "A4.1")
        assert meta.case_no == "ฎ.1234/2568"
        assert meta.court_type == "supreme"
        assert meta.year == 2568

    def test_appeal_court_case(self, extractor: MetadataExtractor):
        text = "คดี อ.999/2567"
        meta = extractor.extract(text, "A4.2")
        assert meta.case_no == "อ.999/2567"
        assert meta.court_type == "appeal"

    def test_district_court_case_cht(self, extractor: MetadataExtractor):
        text = "คดี ชต.12/2566"
        meta = extractor.extract(text, "A4.3")
        assert meta.case_no == "ชต.12/2566"
        assert meta.court_type == "district"

    def test_admin_court_case(self, extractor: MetadataExtractor):
        text = "คดี ปค.45/2565"
        meta = extractor.extract(text, "B5.1")
        assert meta.case_no == "ปค.45/2565"
        assert meta.court_type == "admin"

    def test_district_court_phob(self, extractor: MetadataExtractor):
        text = "คดี ผบ.100/2560"
        meta = extractor.extract(text, "A4.3")
        assert meta.case_no == "ผบ.100/2560"
        assert meta.court_type == "district"

    def test_district_court_rong(self, extractor: MetadataExtractor):
        text = "คดี รง.50/2561"
        meta = extractor.extract(text, "A4.3")
        assert meta.case_no == "รง.50/2561"
        assert meta.court_type == "district"

    def test_no_case_number(self, extractor: MetadataExtractor):
        text = "คู่มือการยื่นฟ้อง e-Filing"
        meta = extractor.extract(text, "A2.1")
        assert meta.case_no is None
        assert meta.court_type is None


# -----------------------------------------------------------------------
# Year extraction
# -----------------------------------------------------------------------

class TestYearExtraction:
    def test_year_from_case_no(self, extractor: MetadataExtractor):
        text = "ฎ.1234/2568"
        meta = extractor.extract(text, "A4.1")
        assert meta.year == 2568

    def test_year_from_text_with_prefix(self, extractor: MetadataExtractor):
        text = "ประกาศ พ.ศ. 2566 เรื่องระเบียบศาล"
        meta = extractor.extract(text, "A3.1")
        assert meta.year == 2566

    def test_year_from_text_standalone(self, extractor: MetadataExtractor):
        text = "สถิติคดีปี 2567 ศาลยุติธรรม"
        meta = extractor.extract(text, "A6.1")
        assert meta.year == 2567

    def test_no_year(self, extractor: MetadataExtractor):
        text = "คู่มือทั่วไป"
        meta = extractor.extract(text, "A2.1")
        assert meta.year is None


# -----------------------------------------------------------------------
# Statute extraction
# -----------------------------------------------------------------------

class TestStatuteExtraction:
    def test_single_statute(self, extractor: MetadataExtractor):
        text = "ตาม มาตรา 341 ป.อ."
        meta = extractor.extract(text, "A4.1")
        assert "มาตรา 341" in meta.statutes
        assert "ป.อ." in meta.statutes

    def test_multiple_statutes(self, extractor: MetadataExtractor):
        text = "มาตรา 341 และ มาตรา 342 ป.อ. ป.พ.พ."
        meta = extractor.extract(text, "A4.1")
        assert "มาตรา 341" in meta.statutes
        assert "มาตรา 342" in meta.statutes
        assert "ป.อ." in meta.statutes
        assert "ป.พ.พ." in meta.statutes

    def test_prb_statute(self, extractor: MetadataExtractor):
        text = "พ.ร.บ.คุ้มครองแรงงาน มาตรา 61"
        meta = extractor.extract(text, "A3.1")
        assert "พ.ร.บ.คุ้มครองแรงงาน" in meta.statutes
        assert "มาตรา 61" in meta.statutes

    def test_no_statutes(self, extractor: MetadataExtractor):
        text = "คู่มือการใช้งานระบบ"
        meta = extractor.extract(text, "A2.1")
        assert meta.statutes == []

    def test_dedup_statutes(self, extractor: MetadataExtractor):
        text = "มาตรา 341 ป.อ. มาตรา 341 ป.อ."
        meta = extractor.extract(text, "A4.1")
        assert meta.statutes.count("มาตรา 341") == 1
        assert meta.statutes.count("ป.อ.") == 1


# -----------------------------------------------------------------------
# Form number extraction
# -----------------------------------------------------------------------

class TestFormNumberExtraction:
    def test_form_number_from_text(self, extractor: MetadataExtractor):
        text = "แบบฟอร์ม 04 คำฟ้อง"
        meta = extractor.extract(text, "A1.1")
        assert meta.form_number == "04"

    def test_form_number_pk1(self, extractor: MetadataExtractor):
        text = "แบบคำฟ้อง ปค.1 ศาลปกครอง"
        meta = extractor.extract(text, "B1.1")
        assert meta.form_number == "ปค.1"

    def test_form_number_from_filename(self, extractor: MetadataExtractor):
        text = "เนื้อหาเอกสาร"
        meta = extractor.extract(text, "A1.1", file_path="data/04 แบบพิมพ์คำฟ้อง.pdf")
        assert meta.form_number == "04"

    def test_no_form_number(self, extractor: MetadataExtractor):
        text = "คู่มือทั่วไป"
        meta = extractor.extract(text, "A2.1")
        assert meta.form_number is None


# -----------------------------------------------------------------------
# Form category extraction
# -----------------------------------------------------------------------

class TestFormCategoryExtraction:
    def test_category_complaint(self, extractor: MetadataExtractor):
        text = "แบบพิมพ์คำฟ้อง"
        meta = extractor.extract(text, "A1.1")
        assert meta.form_category == "คำฟ้อง"

    def test_category_petition(self, extractor: MetadataExtractor):
        text = "แบบฟอร์มคำร้อง"
        meta = extractor.extract(text, "A1.1")
        assert meta.form_category == "คำร้อง"

    def test_category_summons(self, extractor: MetadataExtractor):
        text = "หมายเรียกคดีแพ่ง"
        meta = extractor.extract(text, "A1.1")
        assert meta.form_category == "หมาย"

    def test_category_supporting_doc(self, extractor: MetadataExtractor):
        text = "บัญชีพยาน"
        meta = extractor.extract(text, "A1.1")
        assert meta.form_category == "เอกสารประกอบ"

    def test_category_from_filepath(self, extractor: MetadataExtractor):
        text = "เนื้อหา"
        meta = extractor.extract(text, "A1.1", file_path="15 แบบฟอร์มบัญชีพยาน.pdf")
        assert meta.form_category == "เอกสารประกอบ"

    def test_no_category(self, extractor: MetadataExtractor):
        text = "สถิติคดี"
        meta = extractor.extract(text, "A6.1")
        assert meta.form_category is None


# -----------------------------------------------------------------------
# Document type from source code
# -----------------------------------------------------------------------

class TestDocumentType:
    @pytest.mark.parametrize(
        "source_code,expected",
        [
            ("A1.1", "court_form"),
            ("A2.1", "guide"),
            ("A3.1", "regulation"),
            ("A4.1", "judgment"),
            ("A5.1", "training"),
            ("A6.1", "statistics"),
            ("A7.1", "reference"),
            ("B1.1", "court_form"),
            ("B2.1", "guide"),
            ("B3.1", "regulation"),
            ("B4.1", "validation"),
            ("B5.1", "judgment"),
        ],
    )
    def test_source_to_doctype(self, extractor: MetadataExtractor, source_code: str, expected: str):
        meta = extractor.extract("", source_code)
        assert meta.document_type == expected

    def test_unknown_source_defaults_to_court_form(self, extractor: MetadataExtractor):
        meta = extractor.extract("", "Z9.9")
        assert meta.document_type == "court_form"


# -----------------------------------------------------------------------
# Source code tagging
# -----------------------------------------------------------------------

class TestSourceCodeTagging:
    def test_source_code_preserved(self, extractor: MetadataExtractor):
        meta = extractor.extract("text", "A1.1")
        assert meta.source_code == "A1.1"

    def test_source_code_b_series(self, extractor: MetadataExtractor):
        meta = extractor.extract("text", "B5.4")
        assert meta.source_code == "B5.4"

    def test_empty_source_code(self, extractor: MetadataExtractor):
        meta = extractor.extract("text", "")
        assert meta.source_code == ""


# -----------------------------------------------------------------------
# Integration: full extraction
# -----------------------------------------------------------------------

class TestFullExtraction:
    def test_judgment_text(self, extractor: MetadataExtractor):
        text = (
            "คำพิพากษาศาลฎีกา ฎ.1234/2568 "
            "จำเลยมีความผิดตาม มาตรา 341 ป.อ. "
            "และ มาตรา 83 ป.อ."
        )
        meta = extractor.extract(text, "A4.1")
        assert meta.case_no == "ฎ.1234/2568"
        assert meta.court_type == "supreme"
        assert meta.year == 2568
        assert "มาตรา 341" in meta.statutes
        assert "มาตรา 83" in meta.statutes
        assert "ป.อ." in meta.statutes
        assert meta.document_type == "judgment"
        assert meta.source_code == "A4.1"

    def test_court_form_with_filepath(self, extractor: MetadataExtractor):
        text = "แบบพิมพ์คำฟ้อง ศาลแพ่ง"
        meta = extractor.extract(
            text, "A1.1", file_path="data/04 แบบพิมพ์คำฟ้อง.pdf"
        )
        assert meta.form_number == "04"
        assert meta.form_category == "คำฟ้อง"
        assert meta.document_type == "court_form"

    def test_empty_text(self, extractor: MetadataExtractor):
        meta = extractor.extract("", "A1.1")
        assert meta.case_no is None
        assert meta.court_type is None
        assert meta.year is None
        assert meta.statutes == []
        assert meta.source_code == "A1.1"
