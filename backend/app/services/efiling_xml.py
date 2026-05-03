"""e-Filing v.4 XML Export Service for LegalGuard AI.

ระบบรับส่งอิเล็กทรอนิกส์ (e-Filing) เวอร์ชัน 4
เริ่มใช้งานอย่างเป็นทางการ: 5 มกราคม 2569

ประเภทคดีที่รองรับ:
  civil            — คดีแพ่ง (Form 04 + 05)
  criminal         — คดีอาญา (Form 04 + 06)
  administrative   — คดีปกครอง (ปค.1)
  consumer         — คดีผู้บริโภค (Form CB-01) [ใหม่ v.4]
  juvenile_family  — คดีเยาวชนและครอบครัว (Form JF-01) [ใหม่ v.4]
  take_it_down     — คำร้องลบภาพ/คลิปลามกออนไลน์ CIOS (Form TID-01) [ใหม่ v.4]

จุดเด่น v.4 ที่ implement:
  - ThaID (e-KYC) authentication field ในทุก party
  - e-Form structure (ข้อมูลมีโครงสร้าง ไม่ใช่ PDF upload)
  - ช่องทางชำระค่าธรรมเนียม (Krungthai/digital payment)
  - Real-time notification config (email/SMS)
  - CIOS integration ref สำหรับ Take It Down
  - AI Disclosure stamp ตามแนวปฏิบัติศาลฎีกา พ.ศ. 2568

References:
  - ประกาศสำนักงานศาลยุติธรรม ระบบ e-Filing v.4 (2569)
  - แนวปฏิบัติการใช้ AI ในกระบวนการยุติธรรม ศาลฎีกา พ.ศ. 2568
"""
from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Literal, Optional
from xml.dom import minidom

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

_EFILING_VERSION = "4.0"
_SYSTEM_REF = "efiling4.coj.go.th"
_AI_STANDARD = "แนวปฏิบัติการใช้ AI ในกระบวนการยุติธรรม ศาลฎีกา พ.ศ. 2568"

# ---------------------------------------------------------------------------
# Data models (e-Form v.4 — ข้อมูลมีโครงสร้าง แทน PDF upload)
# ---------------------------------------------------------------------------

class ThaID(BaseModel):
    """ThaID e-KYC authentication — ใหม่ใน v.4 แทนระบบ username/password เก่า"""
    thaid_ref: str = ""       # ThaID reference token (ปิดบัง 90% ก่อนบันทึก)
    verified_at: str = ""     # timestamp ที่ยืนยันตัวตนสำเร็จ
    kyc_level: str = "2"      # KYC level (1=พื้นฐาน, 2=มาตรฐาน, 3=สูง)


class Party(BaseModel):
    """คู่ความ — โจทก์/จำเลย/ผู้ฟ้องคดี/ผู้ถูกฟ้องคดี (e-Form v.4)"""
    prefix: str = ""          # นาย/นาง/นางสาว/บริษัท/ห้างหุ้นส่วน
    first_name: str = ""
    last_name: str = ""
    id_card: str = ""         # เลขบัตรประชาชน (mask อัตโนมัติก่อน export)
    address: str = ""
    phone: str = ""
    email: str = ""           # ใหม่ v.4 — รับการแจ้งเตือน
    role: str = ""            # โจทก์/จำเลย/ผู้ฟ้องคดี/ผู้ถูกฟ้องคดี
    thaid: Optional[ThaID] = None   # ใหม่ v.4 — ThaID e-KYC


class Attorney(BaseModel):
    """ทนายความ — Form 09 ใบแต่งทนายความ"""
    name: str = ""
    license_no: str = ""
    address: str = ""
    phone: str = ""
    email: str = ""           # ใหม่ v.4


class PaymentInfo(BaseModel):
    """ข้อมูลการชำระค่าธรรมเนียม — ใหม่ v.4 (Krungthai + digital channels)"""
    channel: str = ""         # krungthai_bank / promptpay / credit_card / counter
    amount: float = 0.0       # จำนวนเงินค่าธรรมเนียม (บาท)
    transaction_ref: str = "" # เลขอ้างอิงการชำระ
    paid_at: str = ""         # วันเวลาที่ชำระ


class NotificationConfig(BaseModel):
    """การแจ้งเตือน Real-time — ใหม่ v.4"""
    email: str = ""
    phone: str = ""           # สำหรับ SMS/LINE
    notify_on: list[str] = Field(
        default_factory=lambda: ["court_order", "hearing_date", "status_change"]
    )


class EFilingComplaint(BaseModel):
    """ข้อมูลคำฟ้อง e-Filing v.4 — e-Form structure (ไม่ใช่ PDF upload)"""

    # ประเภทคดี
    case_type: Literal[
        "civil", "criminal", "administrative",
        "consumer", "juvenile_family", "take_it_down"
    ] = "civil"

    # ข้อมูลคดี
    court_name: str = ""
    filing_date: str = ""
    case_subject: str = ""    # ใหม่ v.4 — หัวเรื่องคดีสั้น ๆ

    # คู่ความ (Form 04 / e-Form v.4)
    plaintiffs: list[Party] = Field(default_factory=list)
    defendants: list[Party] = Field(default_factory=list)

    # ทนายความ (Form 09)
    attorney: Optional[Attorney] = None

    # เนื้อหาคำฟ้อง
    facts: str = ""
    legal_grounds: str = ""
    statutes: list[str] = Field(default_factory=list)

    # คำขอท้ายคำฟ้อง
    relief_requested: str = ""
    damages_amount: float = 0.0

    # บัญชีพยาน (Form 15)
    witness_list: list[str] = Field(default_factory=list)

    # เอกสารประกอบ — v.4 รองรับหลายไฟล์ประเภท
    attachments: list[str] = Field(default_factory=list)

    # ศาลปกครอง (ปค.1)
    section_56_elements: str = ""
    jurisdiction_reason: str = ""
    legal_interest: str = ""
    filing_deadline_check: str = ""

    # คดีผู้บริโภค (CB-01) — ใหม่ v.4
    consumer_product_service: str = ""   # สินค้า/บริการที่พิพาท
    consumer_contract_date: str = ""     # วันทำสัญญา
    consumer_complaint_date: str = ""    # วันแจ้งเรื่อง
    consumer_ocpb_ref: str = ""          # เลขอ้างอิง สคบ. (ถ้ามี)

    # คดีเยาวชนและครอบครัว (JF-01) — ใหม่ v.4
    juvenile_case_subtype: str = ""      # adoption/custody/paternity/maintenance
    minor_name: str = ""
    minor_birthdate: str = ""
    guardian_name: str = ""

    # คำร้อง Take It Down CIOS (TID-01) — ใหม่ v.4
    tid_url_list: list[str] = Field(default_factory=list)    # URLs ที่ต้องการลบ
    tid_platform: str = ""               # Facebook/X/TikTok/LINE/etc.
    tid_content_type: str = ""           # ภาพ/วิดีโอ/คลิป
    tid_victim_relation: str = ""        # ความสัมพันธ์ผู้เสียหายกับเนื้อหา
    tid_cios_ref: str = ""               # CIOS reference number

    # v.4 — Payment & Notification
    payment: Optional[PaymentInfo] = None
    notification: Optional[NotificationConfig] = None


# ---------------------------------------------------------------------------
# XML Exporter — e-Filing v.4
# ---------------------------------------------------------------------------

class EFilingXMLExporter:
    """Export complaint to e-Filing v.4 XML (e-Form structure, not PDF upload)."""

    def export(self, complaint: EFilingComplaint) -> str:
        """Serialize complaint to e-Filing v.4 XML string."""
        builders = {
            "civil": self._build_civil_xml,
            "criminal": self._build_criminal_xml,
            "administrative": self._build_admin_xml,
            "consumer": self._build_consumer_xml,
            "juvenile_family": self._build_juvenile_family_xml,
            "take_it_down": self._build_take_it_down_xml,
        }
        builder = builders.get(complaint.case_type, self._build_civil_xml)
        root = builder(complaint)
        return self._prettify(root)

    def validate(self, xml_string: str) -> dict:
        """Validate XML against e-Filing v.4 schema rules.

        Returns {valid: bool, errors: list[str], warnings: list[str]}.
        """
        errors: list[str] = []
        warnings: list[str] = []
        try:
            root = ET.fromstring(xml_string)

            # Check schema version
            version = root.get("version", "")
            if version != _EFILING_VERSION:
                warnings.append(
                    f"XML version={version!r} — ระบบคาดหวัง version={_EFILING_VERSION!r} (e-Filing v.4)"
                )

            # Required top-level elements
            for tag in ("court", "case_type", "filing_date"):
                el = root.find(f".//{tag}")
                if el is None:
                    errors.append(f"Missing required element: <{tag}>")
                elif not (el.text or "").strip():
                    errors.append(f"Element <{tag}> cannot be empty")

            # Parties
            for group in ("plaintiffs", "defendants"):
                grp = root.find(f".//{group}")
                if grp is None:
                    errors.append(f"Missing required element: <{group}>")
                elif len(grp) == 0:
                    errors.append(f"At least one party required in <{group}>")
                else:
                    for i, party in enumerate(grp.findall("party")):
                        fn = party.find("first_name")
                        if fn is None or not (fn.text or "").strip():
                            errors.append(f"<{group}>/party[{i}] missing first_name")

            # complaint_body
            body = root.find(".//complaint_body")
            if body is None:
                errors.append("Missing required element: <complaint_body>")
            else:
                for field in ("facts", "legal_grounds"):
                    el = body.find(field)
                    if el is None or not (el.text or "").strip():
                        errors.append(f"Missing or empty <{field}> in <complaint_body>")

            # relief
            relief = root.find(".//relief")
            if relief is None:
                errors.append("Missing required element: <relief>")
            else:
                rr = relief.find("relief_requested")
                if rr is None or not (rr.text or "").strip():
                    errors.append("Missing or empty <relief_requested> in <relief>")

            # Administrative-specific
            form_type = root.get("type", "")
            if form_type == "administrative":
                admin_req = root.find(".//administrative_requirements")
                if admin_req is None:
                    errors.append("Administrative complaint missing <administrative_requirements>")
                else:
                    for field in ("section_56_elements", "jurisdiction_reason",
                                  "legal_interest", "filing_deadline_check"):
                        el = admin_req.find(field)
                        if el is None or not (el.text or "").strip():
                            errors.append(f"Administrative <{field}> is missing or empty")

            # Take It Down-specific
            if form_type == "take_it_down":
                tid = root.find(".//take_it_down_details")
                if tid is None:
                    errors.append("Take It Down complaint missing <take_it_down_details>")
                else:
                    urls = tid.findall("url")
                    if not urls:
                        errors.append("<take_it_down_details> must contain at least one <url>")
                    platform = tid.find("platform")
                    if platform is None or not (platform.text or "").strip():
                        errors.append("Take It Down <platform> is required")

            # v.4: ThaID warning if missing
            for group in ("plaintiffs", "defendants"):
                grp = root.find(f".//{group}")
                if grp is not None:
                    for party in grp.findall("party"):
                        thaid = party.find("thaid_ref")
                        if thaid is None or not (thaid.text or "").strip():
                            warnings.append(
                                f"<{group}>/party ไม่มี ThaID — e-Filing v.4 แนะนำให้ยืนยันตัวตน ThaID"
                            )
                            break  # one warning per group

            # AI Disclosure check
            if root.find(".//ai_disclosure") is None:
                warnings.append("ไม่พบ <ai_disclosure> — เอกสารที่ใช้ AI ต้องแสดง disclosure ตามแนวปฏิบัติ 2568")

        except ET.ParseError as e:
            errors.append(f"XML parse error: {e}")

        return {"valid": len(errors) == 0, "errors": errors, "warnings": warnings}

    def round_trip(self, complaint: EFilingComplaint) -> dict:
        """Export → parse → verify facts integrity."""
        xml_str = self.export(complaint)
        parsed = self.parse(xml_str)
        match = complaint.facts.strip() == parsed.get("facts", "").strip()
        return {"match": match, "xml_length": len(xml_str), "parsed_fields": len(parsed)}

    def parse(self, xml_string: str) -> dict:
        """Parse e-Filing v.4 XML back to dict."""
        try:
            root = ET.fromstring(xml_string)
            return {
                elem.tag: elem.text.strip()
                for elem in root.iter()
                if elem.text and elem.text.strip()
            }
        except ET.ParseError:
            return {}

    # -------------------------------------------------------------------------
    # Builders — แต่ละประเภทคดี
    # -------------------------------------------------------------------------

    def _build_civil_xml(self, c: EFilingComplaint) -> ET.Element:
        """คดีแพ่ง — Form 04 (e-Form v.4) + Form 05 คำขอท้ายคำฟ้อง"""
        root = self._make_root("civil", "04", c)
        ET.SubElement(root, "case_type").text = "คดีแพ่ง"
        self._add_case_subject(root, c)
        self._add_parties(root, "plaintiffs", c.plaintiffs)
        self._add_parties(root, "defendants", c.defendants)
        if c.attorney:
            self._add_attorney(root, c.attorney)
        self._add_complaint_body(root, c)
        relief = ET.SubElement(root, "relief", form="05")
        ET.SubElement(relief, "relief_requested").text = c.relief_requested
        ET.SubElement(relief, "damages_amount").text = str(c.damages_amount)
        self._add_witnesses(root, c.witness_list)
        self._add_attachments(root, c.attachments)
        self._add_payment(root, c.payment)
        self._add_notification(root, c.notification)
        self._add_ai_disclosure(root)
        return root

    def _build_criminal_xml(self, c: EFilingComplaint) -> ET.Element:
        """คดีอาญา — Form 04 (e-Form v.4) + Form 06 คำขอท้าย"""
        root = self._make_root("criminal", "04", c)
        ET.SubElement(root, "case_type").text = "คดีอาญา"
        self._add_case_subject(root, c)
        self._add_parties(root, "plaintiffs", c.plaintiffs)
        self._add_parties(root, "defendants", c.defendants)
        self._add_complaint_body(root, c)
        relief = ET.SubElement(root, "relief", form="06")
        ET.SubElement(relief, "relief_requested").text = c.relief_requested
        self._add_witnesses(root, c.witness_list)
        self._add_attachments(root, c.attachments)
        self._add_payment(root, c.payment)
        self._add_notification(root, c.notification)
        self._add_ai_disclosure(root)
        return root

    def _build_admin_xml(self, c: EFilingComplaint) -> ET.Element:
        """คดีปกครอง — ปค.1"""
        root = self._make_root("administrative", "pk1", c)
        ET.SubElement(root, "case_type").text = "คดีปกครอง"
        self._add_case_subject(root, c)
        self._add_parties(root, "plaintiffs", c.plaintiffs)
        self._add_parties(root, "defendants", c.defendants)
        self._add_complaint_body(root, c)
        admin = ET.SubElement(root, "administrative_requirements")
        ET.SubElement(admin, "section_56_elements").text = c.section_56_elements
        ET.SubElement(admin, "jurisdiction_reason").text = c.jurisdiction_reason
        ET.SubElement(admin, "legal_interest").text = c.legal_interest
        ET.SubElement(admin, "filing_deadline_check").text = c.filing_deadline_check
        relief = ET.SubElement(root, "relief")
        ET.SubElement(relief, "relief_requested").text = c.relief_requested
        self._add_witnesses(root, c.witness_list)
        self._add_attachments(root, c.attachments)
        self._add_payment(root, c.payment)
        self._add_notification(root, c.notification)
        self._add_ai_disclosure(root)
        return root

    def _build_consumer_xml(self, c: EFilingComplaint) -> ET.Element:
        """คดีผู้บริโภค — Form CB-01 [ใหม่ e-Filing v.4, Phase 1]"""
        root = self._make_root("consumer", "CB-01", c)
        ET.SubElement(root, "case_type").text = "คดีผู้บริโภค"
        self._add_case_subject(root, c)
        self._add_parties(root, "plaintiffs", c.plaintiffs)
        self._add_parties(root, "defendants", c.defendants)
        if c.attorney:
            self._add_attorney(root, c.attorney)
        self._add_complaint_body(root, c)

        consumer = ET.SubElement(root, "consumer_details")
        ET.SubElement(consumer, "product_service").text = c.consumer_product_service
        ET.SubElement(consumer, "contract_date").text = c.consumer_contract_date
        ET.SubElement(consumer, "complaint_date").text = c.consumer_complaint_date
        if c.consumer_ocpb_ref:
            ET.SubElement(consumer, "ocpb_ref").text = c.consumer_ocpb_ref

        relief = ET.SubElement(root, "relief", form="05-CB")
        ET.SubElement(relief, "relief_requested").text = c.relief_requested
        ET.SubElement(relief, "damages_amount").text = str(c.damages_amount)
        self._add_witnesses(root, c.witness_list)
        self._add_attachments(root, c.attachments)
        self._add_payment(root, c.payment)
        self._add_notification(root, c.notification)
        self._add_ai_disclosure(root)
        return root

    def _build_juvenile_family_xml(self, c: EFilingComplaint) -> ET.Element:
        """คดีเยาวชนและครอบครัว — Form JF-01 [ใหม่ e-Filing v.4]
        รองรับ: adoption, custody, paternity, maintenance, name_change
        """
        root = self._make_root("juvenile_family", "JF-01", c)
        ET.SubElement(root, "case_type").text = "คดีเยาวชนและครอบครัว"
        self._add_case_subject(root, c)
        self._add_parties(root, "plaintiffs", c.plaintiffs)
        self._add_parties(root, "defendants", c.defendants)
        if c.attorney:
            self._add_attorney(root, c.attorney)
        self._add_complaint_body(root, c)

        jf = ET.SubElement(root, "juvenile_family_details")
        ET.SubElement(jf, "subtype").text = c.juvenile_case_subtype
        if c.minor_name:
            minor = ET.SubElement(jf, "minor")
            ET.SubElement(minor, "name").text = c.minor_name
            ET.SubElement(minor, "birthdate").text = c.minor_birthdate
        if c.guardian_name:
            ET.SubElement(jf, "guardian_name").text = c.guardian_name

        relief = ET.SubElement(root, "relief", form="JF-02")
        ET.SubElement(relief, "relief_requested").text = c.relief_requested
        self._add_witnesses(root, c.witness_list)
        self._add_attachments(root, c.attachments)
        self._add_payment(root, c.payment)
        self._add_notification(root, c.notification)
        self._add_ai_disclosure(root)
        return root

    def _build_take_it_down_xml(self, c: EFilingComplaint) -> ET.Element:
        """คำร้องลบภาพ/คลิปลามกออนไลน์ — Form TID-01 [ใหม่ e-Filing v.4]
        ยื่นผ่าน CIOS โดยไม่ต้องแจ้งความก่อน (นำร่องศาลอาญา ม.ค. 2569)
        """
        root = self._make_root("take_it_down", "TID-01", c)
        ET.SubElement(root, "case_type").text = "คำร้องลบเนื้อหาออนไลน์ (Take It Down)"
        self._add_case_subject(root, c)
        self._add_parties(root, "plaintiffs", c.plaintiffs)

        tid = ET.SubElement(root, "take_it_down_details")
        ET.SubElement(tid, "platform").text = c.tid_platform
        ET.SubElement(tid, "content_type").text = c.tid_content_type
        ET.SubElement(tid, "victim_relation").text = c.tid_victim_relation
        if c.tid_cios_ref:
            ET.SubElement(tid, "cios_ref").text = c.tid_cios_ref
        urls_el = ET.SubElement(tid, "urls")
        for url in c.tid_url_list:
            ET.SubElement(urls_el, "url").text = url

        # TID ไม่ต้องระบุจำเลย (ยื่นต่อศาลโดยตรง)
        ET.SubElement(root, "no_prior_police_report").text = "true"

        body = ET.SubElement(root, "complaint_body")
        ET.SubElement(body, "facts").text = c.facts
        ET.SubElement(body, "legal_grounds").text = c.legal_grounds or (
            "พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 / "
            "ป.อ. มาตรา 287/1-287/2 (ถ้ามี)"
        )

        relief = ET.SubElement(root, "relief", form="TID-02")
        ET.SubElement(relief, "relief_requested").text = (
            c.relief_requested or
            "ขอให้ศาลมีคำสั่งให้แพลตฟอร์มลบ/ระงับการแพร่ภาพเนื้อหาที่ระบุโดยเร็ว"
        )
        self._add_attachments(root, c.attachments)
        self._add_notification(root, c.notification)
        self._add_ai_disclosure(root)
        return root

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------

    @staticmethod
    def _make_root(case_type: str, form: str, c: EFilingComplaint) -> ET.Element:
        """สร้าง root element พร้อม v.4 metadata."""
        root = ET.Element(
            "efiling",
            version=_EFILING_VERSION,
            form=form,
            type=case_type,
            system=_SYSTEM_REF,
        )
        root.set("generated_by", "LegalGuard AI")
        root.set("generated_at", datetime.now(timezone.utc).isoformat())
        ET.SubElement(root, "court").text = c.court_name
        ET.SubElement(root, "filing_date").text = (
            c.filing_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        )
        return root

    @staticmethod
    def _add_case_subject(root: ET.Element, c: EFilingComplaint) -> None:
        if c.case_subject:
            ET.SubElement(root, "case_subject").text = c.case_subject

    @staticmethod
    def _add_parties(root: ET.Element, tag: str, parties: list[Party]) -> None:
        el = ET.SubElement(root, tag)
        for p in parties:
            party = ET.SubElement(el, "party", role=p.role)
            ET.SubElement(party, "prefix").text = p.prefix
            ET.SubElement(party, "first_name").text = p.first_name
            ET.SubElement(party, "last_name").text = p.last_name
            ET.SubElement(party, "address").text = p.address
            if p.email:
                ET.SubElement(party, "email").text = p.email
            # ThaID — v.4 (mask ref ก่อนบันทึก)
            if p.thaid and p.thaid.thaid_ref:
                thaid_el = ET.SubElement(party, "thaid_ref")
                thaid_el.text = p.thaid.thaid_ref[:4] + "****"  # partial mask
                thaid_el.set("kyc_level", p.thaid.kyc_level)
                thaid_el.set("verified", "true" if p.thaid.verified_at else "false")

    @staticmethod
    def _add_attorney(root: ET.Element, att: Attorney) -> None:
        el = ET.SubElement(root, "attorney", form="09")
        ET.SubElement(el, "name").text = att.name
        ET.SubElement(el, "license_no").text = att.license_no
        if att.email:
            ET.SubElement(el, "email").text = att.email

    @staticmethod
    def _add_complaint_body(root: ET.Element, c: EFilingComplaint) -> None:
        body = ET.SubElement(root, "complaint_body")
        ET.SubElement(body, "facts").text = c.facts
        ET.SubElement(body, "legal_grounds").text = c.legal_grounds
        if c.statutes:
            statutes_el = ET.SubElement(body, "statutes")
            for s in c.statutes:
                ET.SubElement(statutes_el, "statute").text = s

    @staticmethod
    def _add_witnesses(root: ET.Element, witnesses: list[str]) -> None:
        if witnesses:
            el = ET.SubElement(root, "witness_list", form="15")
            for w in witnesses:
                ET.SubElement(el, "witness").text = w

    @staticmethod
    def _add_attachments(root: ET.Element, attachments: list[str]) -> None:
        """v.4 รองรับหลายไฟล์ประเภท: PDF, JPG, PNG, MP4, DOCX"""
        if attachments:
            el = ET.SubElement(root, "attachments", supported_formats="pdf,jpg,png,mp4,docx,xlsx")
            for a in attachments:
                ET.SubElement(el, "attachment").text = a

    @staticmethod
    def _add_payment(root: ET.Element, payment: Optional[PaymentInfo]) -> None:
        """ข้อมูลชำระค่าธรรมเนียม — v.4 เชื่อมกับ Krungthai Bank + digital channels"""
        if not payment:
            return
        el = ET.SubElement(root, "payment_info")
        ET.SubElement(el, "channel").text = payment.channel
        ET.SubElement(el, "amount").text = str(payment.amount)
        if payment.transaction_ref:
            ET.SubElement(el, "transaction_ref").text = payment.transaction_ref
        if payment.paid_at:
            ET.SubElement(el, "paid_at").text = payment.paid_at

    @staticmethod
    def _add_notification(root: ET.Element, notif: Optional[NotificationConfig]) -> None:
        """Real-time notification config — ใหม่ v.4"""
        if not notif:
            return
        el = ET.SubElement(root, "notification_config")
        if notif.email:
            ET.SubElement(el, "email").text = notif.email
        if notif.phone:
            ET.SubElement(el, "phone").text = notif.phone
        events_el = ET.SubElement(el, "notify_on")
        for event in notif.notify_on:
            ET.SubElement(events_el, "event").text = event

    @staticmethod
    def _add_ai_disclosure(root: ET.Element) -> None:
        """AI Disclosure stamp — บังคับตามแนวปฏิบัติศาลฎีกา พ.ศ. 2568"""
        generated_at = datetime.now(timezone.utc).isoformat()
        disclosure = ET.SubElement(root, "ai_disclosure")
        ET.SubElement(disclosure, "stamp").text = (
            "เอกสารนี้จัดทำด้วยระบบปัญญาประดิษฐ์ (AI) — LegalGuard AI "
            "ตามแนวปฏิบัติการใช้ AI ในกระบวนการยุติธรรม ศาลฎีกา พ.ศ. 2568 "
            "เนื้อหาเป็นร่างเบื้องต้นสำหรับประกอบการพิจารณาเท่านั้น "
            "ต้องผ่านการตรวจสอบและลงนามโดยผู้มีอำนาจก่อนยื่นต่อศาล"
        )
        ET.SubElement(disclosure, "generated_by").text = "LegalGuard AI — e-Filing v.4 Module"
        ET.SubElement(disclosure, "generated_at").text = generated_at
        ET.SubElement(disclosure, "efiling_version").text = _EFILING_VERSION
        ET.SubElement(disclosure, "requires_human_review").text = "true"
        ET.SubElement(disclosure, "reference_standard").text = _AI_STANDARD
        ET.SubElement(disclosure, "system_ref").text = _SYSTEM_REF

    @staticmethod
    def _prettify(elem: ET.Element) -> str:
        rough = ET.tostring(elem, encoding="unicode", xml_declaration=True)
        return minidom.parseString(rough).toprettyxml(indent="  ")
