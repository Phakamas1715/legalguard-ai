"""Tests for PII masking engine — covers each PII type from the TS port."""

from app.services.pii_masking import (
    PIISpan,
    PIIType,
    PII_TYPE_LABELS,
    detect_pii,
    mask_pii,
)


# ---------------------------------------------------------------------------
# Thai national ID
# ---------------------------------------------------------------------------


class TestThaiNationalID:
    def test_id_with_dashes(self):
        text = "เลขบัตร 1-1234-56789-01-2 ของจำเลย"
        spans = detect_pii(text)
        assert any(s.type == PIIType.id_card for s in spans)

    def test_id_without_dashes(self):
        text = "บัตรประชาชน 1123456789012 ของโจทก์"
        spans = detect_pii(text)
        assert any(s.type == PIIType.id_card for s in spans)

    def test_id_with_spaces(self):
        text = "เลข 1 1234 56789 01 2 ในสำนวน"
        spans = detect_pii(text)
        assert any(s.type == PIIType.id_card for s in spans)

    def test_id_masked(self):
        text = "เลขบัตร 1-1234-56789-01-2 ของจำเลย"
        masked, spans, count = mask_pii(text)
        assert "[เลขบัตรถูกปกปิด]" in masked
        assert "1-1234-56789-01-2" not in masked
        assert count >= 1


# ---------------------------------------------------------------------------
# Thai phone numbers
# ---------------------------------------------------------------------------


class TestThaiPhone:
    def test_mobile_with_dashes(self):
        text = "โทร 08-1234-5678 ติดต่อ"
        spans = detect_pii(text)
        assert any(s.type == PIIType.phone for s in spans)

    def test_mobile_no_dashes(self):
        text = "เบอร์ 0812345678 ของผู้เสียหาย"
        spans = detect_pii(text)
        assert any(s.type == PIIType.phone for s in spans)

    def test_plus66_format(self):
        text = "call +66 81 234 5678 now"
        spans = detect_pii(text)
        assert any(s.type == PIIType.phone for s in spans)

    def test_bangkok_landline(self):
        text = "สำนักงาน 02-123-4567"
        spans = detect_pii(text)
        assert any(s.type == PIIType.phone for s in spans)

    def test_phone_masked(self):
        text = "โทร 08-1234-5678 ด่วน"
        masked, _, _ = mask_pii(text)
        assert "[เบอร์โทรถูกปกปิด]" in masked
        assert "08-1234-5678" not in masked


# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------


class TestEmail:
    def test_standard_email(self):
        text = "ส่งที่ somchai@example.com ด้วย"
        spans = detect_pii(text)
        assert any(s.type == PIIType.email for s in spans)

    def test_email_masked(self):
        text = "อีเมล test.user@court.go.th ของศาล"
        masked, _, _ = mask_pii(text)
        assert "[อีเมลถูกปกปิด]" in masked
        assert "test.user@court.go.th" not in masked



# ---------------------------------------------------------------------------
# Bank account
# ---------------------------------------------------------------------------


class TestBankAccount:
    def test_bank_account_with_label(self):
        text = "บัญชีเลขที่ 123-4-56789-0 ธนาคารกรุงไทย"
        spans = detect_pii(text)
        assert any(s.type == PIIType.bank_account for s in spans)

    def test_bank_account_standalone(self):
        text = "โอนเข้า 123-4-56789-0 แล้ว"
        spans = detect_pii(text)
        assert any(s.type == PIIType.bank_account for s in spans)

    def test_bank_account_masked(self):
        text = "บัญชี 123-4-56789-0 ของจำเลย"
        masked, _, _ = mask_pii(text)
        assert "[เลขบัญชีถูกปกปิด]" in masked


# ---------------------------------------------------------------------------
# Thai address
# ---------------------------------------------------------------------------


class TestThaiAddress:
    def test_address_with_moo(self):
        text = "อยู่ที่ 123/45 หมู่ 5 ตำบลบางรัก อำเภอเมือง จังหวัดกรุงเทพ"
        spans = detect_pii(text)
        assert any(s.type == PIIType.address for s in spans)

    def test_address_with_soi(self):
        text = "บ้านเลขที่ 99/1 ซอยสุขุมวิท 23 แขวงคลองเตย เขตวัฒนา"
        spans = detect_pii(text)
        assert any(s.type == PIIType.address for s in spans)

    def test_address_masked(self):
        text = "ที่อยู่ 123/45 หมู่ 5 ตำบลบางรัก อำเภอเมือง จังหวัดกรุงเทพ"
        masked, _, _ = mask_pii(text)
        assert "[ที่อยู่ถูกปกปิด]" in masked


# ---------------------------------------------------------------------------
# Thai names with prefix
# ---------------------------------------------------------------------------


class TestThaiName:
    def test_thai_male_name(self):
        text = "นายสมชาย ใจดี เป็นโจทก์"
        spans = detect_pii(text)
        assert any(s.type == PIIType.name for s in spans)

    def test_thai_female_name(self):
        text = "นางสาวสมหญิง รักดี เป็นจำเลย"
        spans = detect_pii(text)
        assert any(s.type == PIIType.name for s in spans)

    def test_english_prefix_name(self):
        text = "Mr. John Smith filed a complaint"
        spans = detect_pii(text)
        assert any(s.type == PIIType.name for s in spans)

    def test_name_masked(self):
        text = "นายสมชาย ใจดี ยื่นฟ้อง"
        masked, _, _ = mask_pii(text)
        assert "[ชื่อ-นามสกุลถูกปกปิด]" in masked
        assert "สมชาย" not in masked


# ---------------------------------------------------------------------------
# Code-switch names (Thai prefix + English name)
# ---------------------------------------------------------------------------


class TestCodeSwitchName:
    def test_victim_english_name(self):
        text = "ผู้เสียหาย John Smith แจ้งความ"
        spans = detect_pii(text)
        assert any(s.type == PIIType.name for s in spans)

    def test_defendant_english_name(self):
        text = "จำเลย David Brown ให้การปฏิเสธ"
        spans = detect_pii(text)
        assert any(s.type == PIIType.name for s in spans)


# ---------------------------------------------------------------------------
# Thai passport
# ---------------------------------------------------------------------------


class TestThaiPassport:
    def test_passport_uppercase(self):
        text = "หนังสือเดินทาง PAB123456 ของจำเลย"
        spans = detect_pii(text)
        assert any(s.type == PIIType.id_card for s in spans)

    def test_passport_lowercase(self):
        text = "passport pAB123456 issued"
        spans = detect_pii(text)
        assert any(s.type == PIIType.id_card for s in spans)

    def test_passport_masked(self):
        text = "เลขที่ PAB123456 ในสำนวน"
        masked, _, _ = mask_pii(text)
        assert "[เลขหนังสือเดินทางถูกปกปิด]" in masked


# ---------------------------------------------------------------------------
# LINE ID
# ---------------------------------------------------------------------------


class TestLineID:
    def test_line_id_with_at(self):
        text = "LINE ID: @somchai_99 ติดต่อ"
        spans = detect_pii(text)
        assert any(s.type == PIIType.phone for s in spans)

    def test_line_id_thai_label(self):
        text = "ไลน์ ID: john.doe ของผู้ต้องหา"
        spans = detect_pii(text)
        assert any(s.type == PIIType.phone for s in spans)

    def test_line_id_masked(self):
        text = "LINE ID: @somchai_99 ติดต่อ"
        masked, _, _ = mask_pii(text)
        assert "[LINE ID ถูกปกปิด]" in masked


# ---------------------------------------------------------------------------
# mask_pii integration
# ---------------------------------------------------------------------------


class TestMaskPII:
    def test_no_pii(self):
        text = "ศาลมีคำสั่งให้ยกฟ้อง"
        masked, spans, count = mask_pii(text)
        assert masked == text
        assert spans == []
        assert count == 0

    def test_multiple_pii_types(self):
        text = "นายสมชาย ใจดี เลขบัตร 1-1234-56789-01-2 โทร 08-1234-5678"
        masked, spans, count = mask_pii(text)
        assert count >= 3
        assert "สมชาย" not in masked
        assert "1-1234-56789-01-2" not in masked
        assert "08-1234-5678" not in masked

    def test_spans_non_overlapping(self):
        text = "นายสมชาย ใจดี เลขบัตร 1-1234-56789-01-2 โทร 08-1234-5678"
        spans = detect_pii(text)
        for i in range(1, len(spans)):
            assert spans[i].start >= spans[i - 1].end


# ---------------------------------------------------------------------------
# PII_TYPE_LABELS
# ---------------------------------------------------------------------------


class TestPIITypeLabels:
    def test_all_types_have_labels(self):
        for pii_type in PIIType:
            assert pii_type in PII_TYPE_LABELS
            assert isinstance(PII_TYPE_LABELS[pii_type], str)
            assert len(PII_TYPE_LABELS[pii_type]) > 0
