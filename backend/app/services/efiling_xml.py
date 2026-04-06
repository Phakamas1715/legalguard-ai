"""e-Filing XML Export Service for LegalGuard AI.

Generates e-Filing XML from complaint drafts based on actual court form structure:
- แบบพิมพ์คำฟ้อง (Form 04) — Justice Court
- แบบคำร้อง ปค.1 — Administrative Court
- คำขอท้ายคำฟ้องแพ่ง (Form 05)
- คำขอท้ายคำฟ้องอาญา (Form 06)

XML Schema derived from actual PDF forms in data/A1 and data/B1.
"""
from __future__ import annotations

from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Optional
from xml.dom import minidom

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Complaint data models (matching court form fields)
# ---------------------------------------------------------------------------

class Party(BaseModel):
    """คู่ความ — โจทก์/จำเลย/ผู้ฟ้องคดี/ผู้ถูกฟ้องคดี"""
    prefix: str = ""        # นาย/นาง/นางสาว/บริษัท
    first_name: str = ""
    last_name: str = ""
    id_card: str = ""       # เลขบัตรประชาชน (จะถูก mask)
    address: str = ""
    phone: str = ""
    role: str = ""          # โจทก์/จำเลย/ผู้ฟ้องคดี/ผู้ถูกฟ้องคดี


class Attorney(BaseModel):
    """ทนายความ — จากแบบฟอร์ม 09 ใบแต่งทนายความ"""
    name: str = ""
    license_no: str = ""
    address: str = ""
    phone: str = ""


class EFilingComplaint(BaseModel):
    """ข้อมูลคำฟ้องสำหรับ e-Filing — จำลองจากแบบฟอร์มจริง"""
    # ข้อมูลคดี
    case_type: str = "civil"  # civil/criminal/administrative
    court_name: str = ""
    filing_date: str = ""

    # คู่ความ (Form 04)
    plaintiffs: list[Party] = Field(default_factory=list)
    defendants: list[Party] = Field(default_factory=list)

    # ทนายความ (Form 09)
    attorney: Optional[Attorney] = None

    # เนื้อหาคำฟ้อง (Form 04)
    facts: str = ""              # ข้อเท็จจริง
    legal_grounds: str = ""      # เหตุตามกฎหมาย
    statutes: list[str] = Field(default_factory=list)

    # คำขอท้ายคำฟ้อง (Form 05 แพ่ง / Form 06 อาญา)
    relief_requested: str = ""   # คำขอท้ายคำฟ้อง
    damages_amount: float = 0.0  # จำนวนเงินค่าเสียหาย

    # บัญชีพยาน (Form 15)
    witness_list: list[str] = Field(default_factory=list)

    # เอกสารประกอบ
    attachments: list[str] = Field(default_factory=list)

    # ศาลปกครอง (ปค.1) — เพิ่มเติม
    section_56_elements: str = ""
    jurisdiction_reason: str = ""
    legal_interest: str = ""
    filing_deadline_check: str = ""


# ---------------------------------------------------------------------------
# XML Export
# ---------------------------------------------------------------------------

class EFilingXMLExporter:
    """Export complaint to e-Filing XML format based on actual court forms."""

    def export(self, complaint: EFilingComplaint) -> str:
        """Serialize complaint to e-Filing XML string."""
        if complaint.case_type == "administrative":
            root = self._build_admin_xml(complaint)
        elif complaint.case_type == "criminal":
            root = self._build_criminal_xml(complaint)
        else:
            root = self._build_civil_xml(complaint)

        return self._prettify(root)

    def validate(self, xml_string: str) -> dict:
        """Validate XML structure against e-Filing schema rules.

        Returns {valid: bool, errors: list[str]} with specific field references.
        """
        errors = []
        try:
            root = ET.fromstring(xml_string)

            # Check required top-level elements
            required = ["court", "case_type", "filing_date", "plaintiffs", "defendants"]
            for tag in required:
                el = root.find(f".//{tag}")
                if el is None:
                    errors.append(f"Missing required element: <{tag}>")
                elif tag in ("court", "case_type", "filing_date") and not (el.text or "").strip():
                    errors.append(f"Element <{tag}> cannot be empty")

            # Check complaint_body and facts
            body = root.find(".//complaint_body")
            if body is None:
                errors.append("Missing required element: <complaint_body>")
            else:
                facts = body.find("facts")
                if facts is None or not (facts.text or "").strip():
                    errors.append("Missing or empty <facts> in <complaint_body>")
                legal_grounds = body.find("legal_grounds")
                if legal_grounds is None or not (legal_grounds.text or "").strip():
                    errors.append("Missing or empty <legal_grounds> in <complaint_body>")

            # Check plaintiffs have at least one party
            plaintiffs = root.find(".//plaintiffs")
            if plaintiffs is not None and len(plaintiffs) == 0:
                errors.append("At least one plaintiff is required in <plaintiffs>")

            defendants = root.find(".//defendants")
            if defendants is not None and len(defendants) == 0:
                errors.append("At least one defendant is required in <defendants>")

            # Check party fields
            for party_group in ("plaintiffs", "defendants"):
                group_el = root.find(f".//{party_group}")
                if group_el is not None:
                    for i, party in enumerate(group_el.findall("party")):
                        fn = party.find("first_name")
                        if fn is None or not (fn.text or "").strip():
                            errors.append(f"<{party_group}>/party[{i}] missing first_name")

            # Administrative-specific: check section 56 elements
            form_type = root.get("type", "")
            if form_type == "administrative":
                admin_req = root.find(".//administrative_requirements")
                if admin_req is None:
                    errors.append("Administrative complaint missing <administrative_requirements>")
                else:
                    for field in ("section_56_elements", "jurisdiction_reason", "legal_interest", "filing_deadline_check"):
                        el = admin_req.find(field)
                        if el is None or not (el.text or "").strip():
                            errors.append(f"Administrative requirement <{field}> is missing or empty")

            # Check relief
            relief = root.find(".//relief")
            if relief is None:
                errors.append("Missing required element: <relief>")
            else:
                rr = relief.find("relief_requested")
                if rr is None or not (rr.text or "").strip():
                    errors.append("Missing or empty <relief_requested>")

        except ET.ParseError as e:
            errors.append(f"XML parse error: {e}")

        return {"valid": len(errors) == 0, "errors": errors}

    def round_trip(self, complaint: EFilingComplaint) -> dict:
        """Export to XML then parse back — verify round-trip integrity."""
        xml_str = self.export(complaint)
        parsed = self.parse(xml_str)
        original_facts = complaint.facts.strip()
        parsed_facts = parsed.get("facts", "").strip()
        match = original_facts == parsed_facts
        return {"match": match, "xml_length": len(xml_str), "parsed_fields": len(parsed)}

    def parse(self, xml_string: str) -> dict:
        """Parse e-Filing XML back to dict."""
        try:
            root = ET.fromstring(xml_string)
            result = {}
            for elem in root.iter():
                if elem.text and elem.text.strip():
                    result[elem.tag] = elem.text.strip()
            return result
        except ET.ParseError:
            return {}

    # --- Civil (Form 04 + 05) ---

    def _build_civil_xml(self, c: EFilingComplaint) -> ET.Element:
        root = ET.Element("efiling", version="3.0", form="04", type="civil")
        root.set("generated_by", "LegalGuard AI")
        root.set("generated_at", datetime.now(timezone.utc).isoformat())

        ET.SubElement(root, "court").text = c.court_name
        ET.SubElement(root, "case_type").text = "คดีแพ่ง"
        ET.SubElement(root, "filing_date").text = c.filing_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

        self._add_parties(root, "plaintiffs", c.plaintiffs)
        self._add_parties(root, "defendants", c.defendants)
        if c.attorney:
            self._add_attorney(root, c.attorney)

        body = ET.SubElement(root, "complaint_body")
        ET.SubElement(body, "facts").text = c.facts
        ET.SubElement(body, "legal_grounds").text = c.legal_grounds
        statutes_el = ET.SubElement(body, "statutes")
        for s in c.statutes:
            ET.SubElement(statutes_el, "statute").text = s

        # Form 05 — คำขอท้ายคำฟ้องแพ่ง
        relief = ET.SubElement(root, "relief", form="05")
        ET.SubElement(relief, "relief_requested").text = c.relief_requested
        ET.SubElement(relief, "damages_amount").text = str(c.damages_amount)

        self._add_witnesses(root, c.witness_list)
        self._add_attachments(root, c.attachments)
        self._add_disclaimer(root)

        return root

    # --- Criminal (Form 04 + 06) ---

    def _build_criminal_xml(self, c: EFilingComplaint) -> ET.Element:
        root = ET.Element("efiling", version="3.0", form="04", type="criminal")
        root.set("generated_by", "LegalGuard AI")
        root.set("generated_at", datetime.now(timezone.utc).isoformat())

        ET.SubElement(root, "court").text = c.court_name
        ET.SubElement(root, "case_type").text = "คดีอาญา"
        ET.SubElement(root, "filing_date").text = c.filing_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

        self._add_parties(root, "plaintiffs", c.plaintiffs)
        self._add_parties(root, "defendants", c.defendants)

        body = ET.SubElement(root, "complaint_body")
        ET.SubElement(body, "facts").text = c.facts
        ET.SubElement(body, "legal_grounds").text = c.legal_grounds
        statutes_el = ET.SubElement(body, "statutes")
        for s in c.statutes:
            ET.SubElement(statutes_el, "statute").text = s

        # Form 06 — คำขอท้ายคำฟ้องอาญา
        relief = ET.SubElement(root, "relief", form="06")
        ET.SubElement(relief, "relief_requested").text = c.relief_requested

        self._add_witnesses(root, c.witness_list)
        self._add_attachments(root, c.attachments)
        self._add_disclaimer(root)

        return root

    # --- Administrative (ปค.1) ---

    def _build_admin_xml(self, c: EFilingComplaint) -> ET.Element:
        root = ET.Element("efiling", version="3.0", form="pk1", type="administrative")
        root.set("generated_by", "LegalGuard AI")
        root.set("generated_at", datetime.now(timezone.utc).isoformat())

        ET.SubElement(root, "court").text = c.court_name
        ET.SubElement(root, "case_type").text = "คดีปกครอง"
        ET.SubElement(root, "filing_date").text = c.filing_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

        self._add_parties(root, "plaintiffs", c.plaintiffs)
        self._add_parties(root, "defendants", c.defendants)

        body = ET.SubElement(root, "complaint_body")
        ET.SubElement(body, "facts").text = c.facts
        ET.SubElement(body, "legal_grounds").text = c.legal_grounds

        # ปค.1 specific fields
        admin = ET.SubElement(root, "administrative_requirements")
        ET.SubElement(admin, "section_56_elements").text = c.section_56_elements
        ET.SubElement(admin, "jurisdiction_reason").text = c.jurisdiction_reason
        ET.SubElement(admin, "legal_interest").text = c.legal_interest
        ET.SubElement(admin, "filing_deadline_check").text = c.filing_deadline_check

        relief = ET.SubElement(root, "relief")
        ET.SubElement(relief, "relief_requested").text = c.relief_requested

        self._add_witnesses(root, c.witness_list)
        self._add_attachments(root, c.attachments)
        self._add_disclaimer(root)

        return root

    # --- Helpers ---

    @staticmethod
    def _add_parties(root: ET.Element, tag: str, parties: list[Party]):
        el = ET.SubElement(root, tag)
        for p in parties:
            party = ET.SubElement(el, "party", role=p.role)
            ET.SubElement(party, "prefix").text = p.prefix
            ET.SubElement(party, "first_name").text = p.first_name
            ET.SubElement(party, "last_name").text = p.last_name
            ET.SubElement(party, "address").text = p.address

    @staticmethod
    def _add_attorney(root: ET.Element, att: Attorney):
        el = ET.SubElement(root, "attorney", form="09")
        ET.SubElement(el, "name").text = att.name
        ET.SubElement(el, "license_no").text = att.license_no

    @staticmethod
    def _add_witnesses(root: ET.Element, witnesses: list[str]):
        if witnesses:
            el = ET.SubElement(root, "witness_list", form="15")
            for w in witnesses:
                ET.SubElement(el, "witness").text = w

    @staticmethod
    def _add_attachments(root: ET.Element, attachments: list[str]):
        if attachments:
            el = ET.SubElement(root, "attachments")
            for a in attachments:
                ET.SubElement(el, "attachment").text = a

    @staticmethod
    def _add_disclaimer(root: ET.Element):
        ET.SubElement(root, "disclaimer").text = (
            "เอกสารนี้สร้างโดย LegalGuard AI เพื่อประกอบการตัดสินใจเท่านั้น "
            "กรุณาตรวจสอบความถูกต้องกับทนายความก่อนยื่นต่อศาล"
        )

    @staticmethod
    def _prettify(elem: ET.Element) -> str:
        rough = ET.tostring(elem, encoding="unicode", xml_declaration=True)
        return minidom.parseString(rough).toprettyxml(indent="  ")
