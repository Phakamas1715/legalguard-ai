"""Runtime access policy service for data classification and role visibility."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


LFRole = str
DataClassification = str


@dataclass(frozen=True)
class ClassificationMeta:
    label: str
    detail: str


ROLE_ORDER: List[LFRole] = ["anonymous", "citizen", "lawyer", "government", "judge", "system_admin"]
ROLE_LABELS: Dict[LFRole, str] = {
    "anonymous": "Anonymous",
    "citizen": "Citizen",
    "lawyer": "Lawyer",
    "government": "Government",
    "judge": "Judge",
    "system_admin": "System Admin",
}

CLASSIFICATION_ORDER: List[DataClassification] = ["public", "internal", "restricted", "sealed", "youth", "pii", "audit"]
CLASSIFICATION_META: Dict[DataClassification, ClassificationMeta] = {
    "public": ClassificationMeta(label="สาธารณะ", detail="ข้อมูลเปิดเผยต่อสาธารณะ ใช้เพื่อการสืบค้นทั่วไป"),
    "internal": ClassificationMeta(label="ภายใน", detail="ใช้ภายในหน่วยงานและเจ้าหน้าที่ที่ได้รับอนุญาต"),
    "restricted": ClassificationMeta(label="จำกัดสิทธิ์", detail="ข้อมูลอ่อนไหวที่ต้องใช้สิทธิ์ตามบทบาท"),
    "sealed": ClassificationMeta(label="ปิดคดี", detail="สำนวนหรือเอกสารที่ศาลสั่งปิด จำกัดเฉพาะผู้เกี่ยวข้อง"),
    "youth": ClassificationMeta(label="เยาวชน", detail="ข้อมูลคดีเยาวชนที่ต้องควบคุมเข้มงวดเป็นพิเศษ"),
    "pii": ClassificationMeta(label="PII / PDPA", detail="ข้อมูลส่วนบุคคลที่ต้องปกปิดหรืออนุญาตเฉพาะกรณี"),
    "audit": ClassificationMeta(label="Audit Trail", detail="หลักฐานการใช้งานระบบที่ต้องเก็บถาวรและตรวจสอบย้อนหลังได้"),
}

ROLE_POLICIES: Dict[LFRole, dict] = {
    "anonymous": {
        "classifications": {"public": True, "internal": False, "restricted": False, "sealed": False, "youth": False, "pii": False, "audit": False},
        "quality": 20,
    },
    "citizen": {
        "classifications": {"public": True, "internal": False, "restricted": False, "sealed": False, "youth": False, "pii": False, "audit": False},
        "quality": 50,
    },
    "lawyer": {
        "classifications": {"public": True, "internal": True, "restricted": False, "sealed": False, "youth": False, "pii": False, "audit": False},
        "quality": 65,
        "features": {
            "search": True,
            "analyze": True,
            "predict": True,
            "precedent_compare": True,
            "case_brief": True,
            "prompt_templates": True,
            "document_draft": True,
            "document_upload": True,
            "export_pdf": True,
            "judgment_draft": False,
            "case_ruling": False,
        },
    },
    "government": {
        "classifications": {"public": True, "internal": True, "restricted": True, "sealed": False, "youth": False, "pii": False, "audit": True},
        "quality": 75,
    },
    "judge": {
        "classifications": {"public": True, "internal": True, "restricted": True, "sealed": True, "youth": True, "pii": True, "audit": True},
        "quality": 95,
    },
    "system_admin": {
        "classifications": {"public": True, "internal": True, "restricted": True, "sealed": True, "youth": True, "pii": True, "audit": True},
        "quality": 100,
    },
}


class AccessPolicyService:
    """Provides a runtime-authoritative data access matrix for dashboards."""

    def get_matrix(self) -> dict:
        matrix = []
        for classification in CLASSIFICATION_ORDER:
            meta = CLASSIFICATION_META[classification]
            matrix.append(
                {
                    "classification": classification,
                    "label": meta.label,
                    "detail": meta.detail,
                    "roles": [
                        {
                            "role": role,
                            "label": ROLE_LABELS[role],
                            "allowed": ROLE_POLICIES[role]["classifications"].get(classification, False),
                            "quality": ROLE_POLICIES[role]["quality"],
                        }
                        for role in ROLE_ORDER
                    ],
                }
            )

        return {
            "source": "backend_runtime_policy",
            "role_order": ROLE_ORDER,
            "role_labels": ROLE_LABELS,
            "classifications": matrix,
            "quality_by_role": [
                {
                    "role": role,
                    "label": ROLE_LABELS[role],
                    "quality": ROLE_POLICIES[role]["quality"],
                }
                for role in ROLE_ORDER
            ],
        }
