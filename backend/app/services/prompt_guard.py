"""Prompt Injection & Jailbreak Detection for LegalGuard AI.

Detects and blocks:
1. Prompt injection — attempts to override system instructions
2. Jailbreak — attempts to bypass safety guardrails
3. Indirect injection — hidden instructions in user-provided documents
4. Role manipulation — attempts to change AI persona/role

Reference: OWASP Top 10 for LLM Applications (2025)
  - LLM01: Prompt Injection
  - LLM02: Insecure Output Handling

Architecture layer: Input Guardrails (Bala Kalavala, 2025)
"""

from __future__ import annotations

import logging
import re
from enum import Enum
from typing import Optional

from pydantic import BaseModel

logger = logging.getLogger(__name__)


class ThreatType(str, Enum):
    SAFE = "safe"
    PROMPT_INJECTION = "prompt_injection"
    JAILBREAK = "jailbreak"
    ROLE_MANIPULATION = "role_manipulation"
    INDIRECT_INJECTION = "indirect_injection"
    HARMFUL_CONTENT = "harmful_content"


class ThreatResult(BaseModel):
    is_safe: bool = True
    threat_type: ThreatType = ThreatType.SAFE
    confidence: float = 0.0
    matched_pattern: str = ""
    blocked: bool = False
    message: str = ""


# ---------------------------------------------------------------------------
# Detection patterns
# ---------------------------------------------------------------------------

# Prompt injection patterns — attempts to override system prompt
_INJECTION_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("ignore_instructions", re.compile(
        r"(?:ignore|disregard|forget|override|bypass|skip)\s+"
        r"(?:all|your|the|previous|above|system)\s+"
        r"(?:instructions|rules|guidelines|prompts|constraints)",
        re.IGNORECASE,
    )),
    ("new_instructions", re.compile(
        r"(?:new|updated|revised|real|actual)\s+"
        r"(?:instructions|rules|system\s*prompt|guidelines)",
        re.IGNORECASE,
    )),
    ("system_prompt_leak", re.compile(
        r"(?:show|reveal|display|print|output|repeat|tell\s+me)\s+"
        r"(?:your|the|system)\s+"
        r"(?:prompt|instructions|rules|guidelines|system\s*message)",
        re.IGNORECASE,
    )),
    ("role_override", re.compile(
        r"(?:you\s+are\s+now|act\s+as|pretend\s+to\s+be|roleplay\s+as|"
        r"from\s+now\s+on\s+you\s+are|switch\s+to|become)\s+",
        re.IGNORECASE,
    )),
    ("delimiter_injection", re.compile(
        r"(?:```|<\|im_start\|>|<\|im_end\|>|\[INST\]|\[/INST\]|"
        r"<<SYS>>|<</SYS>>|Human:|Assistant:|System:)",
        re.IGNORECASE,
    )),
]

# Jailbreak patterns — attempts to bypass safety
_JAILBREAK_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("dan_jailbreak", re.compile(
        r"(?:DAN|Do\s+Anything\s+Now|DUDE|AIM|STAN|KEVIN)",
        re.IGNORECASE,
    )),
    ("hypothetical_bypass", re.compile(
        r"(?:hypothetically|in\s+theory|for\s+educational\s+purposes|"
        r"for\s+research|in\s+a\s+fictional|imagine\s+you\s+are|"
        r"what\s+if\s+you\s+had\s+no\s+restrictions)",
        re.IGNORECASE,
    )),
    ("opposite_day", re.compile(
        r"(?:opposite\s+day|opposite\s+mode|reverse\s+mode|"
        r"evil\s+mode|uncensored\s+mode|developer\s+mode|god\s+mode)",
        re.IGNORECASE,
    )),
]

# Thai-specific harmful patterns
_HARMFUL_THAI_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("illegal_advice", re.compile(
        r"(?:วิธี(?:ฟอกเงิน|หลบหนีคดี|ทำลายหลักฐาน|ข่มขู่พยาน|ติดสินบน|"
        r"ปลอมเอกสาร|หลอกลวงศาล|ซ่อนทรัพย์สิน|หนีภาษี))",
    )),
    ("violence_threat", re.compile(
        r"(?:วิธี(?:ฆ่า|ทำร้าย|ข่มขืน|ลักพาตัว|วางระเบิด|วางยาพิษ))",
    )),
]

# Indirect injection — hidden instructions in documents
_INDIRECT_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("hidden_instruction", re.compile(
        r"(?:<!-- |<hidden>|<script>|\\u200b|\\u200c|\\u200d|"
        r"\[hidden\]|\{system\}|IMPORTANT:\s*ignore)",
        re.IGNORECASE,
    )),
    ("base64_payload", re.compile(
        r"(?:base64|eval\(|exec\(|import\s+os|subprocess|__import__)",
        re.IGNORECASE,
    )),
]


# ---------------------------------------------------------------------------
# Detection engine
# ---------------------------------------------------------------------------


def detect_threat(text: str) -> ThreatResult:
    """Scan text for prompt injection, jailbreak, and harmful content.

    Returns ThreatResult with threat type, confidence, and whether to block.
    """
    if not text or not text.strip():
        return ThreatResult()

    # 1. Prompt injection
    for name, pattern in _INJECTION_PATTERNS:
        match = pattern.search(text)
        if match:
            return ThreatResult(
                is_safe=False,
                threat_type=ThreatType.PROMPT_INJECTION,
                confidence=0.9,
                matched_pattern=name,
                blocked=True,
                message="ตรวจพบความพยายาม prompt injection — คำขอถูกบล็อก",
            )

    # 2. Jailbreak
    for name, pattern in _JAILBREAK_PATTERNS:
        match = pattern.search(text)
        if match:
            return ThreatResult(
                is_safe=False,
                threat_type=ThreatType.JAILBREAK,
                confidence=0.85,
                matched_pattern=name,
                blocked=True,
                message="ตรวจพบความพยายาม jailbreak — คำขอถูกบล็อก",
            )

    # 3. Thai harmful content
    for name, pattern in _HARMFUL_THAI_PATTERNS:
        match = pattern.search(text)
        if match:
            return ThreatResult(
                is_safe=False,
                threat_type=ThreatType.HARMFUL_CONTENT,
                confidence=0.95,
                matched_pattern=name,
                blocked=True,
                message="ระบบไม่สามารถให้ข้อมูลเกี่ยวกับการกระทำที่ผิดกฎหมาย",
            )

    # 4. Indirect injection
    for name, pattern in _INDIRECT_PATTERNS:
        match = pattern.search(text)
        if match:
            return ThreatResult(
                is_safe=False,
                threat_type=ThreatType.INDIRECT_INJECTION,
                confidence=0.8,
                matched_pattern=name,
                blocked=True,
                message="ตรวจพบ hidden instruction ในข้อความ — คำขอถูกบล็อก",
            )

    return ThreatResult()


def sanitize_input(text: str) -> tuple[str, Optional[ThreatResult]]:
    """Scan and sanitize input text.

    Returns (sanitized_text, threat_result).
    If threat detected, sanitized_text is empty and threat_result has details.
    If safe, returns original text and None.
    """
    result = detect_threat(text)
    if result.blocked:
        logger.warning(
            "Threat detected: type=%s pattern=%s confidence=%.2f",
            result.threat_type, result.matched_pattern, result.confidence,
        )
        return "", result
    return text, None
