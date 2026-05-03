"""RAG-enhanced น้องซื่อสัตย์ chatbot service.

Retrieves relevant context from Knowledge Base using SearchPipeline,
then generates a response via LLM (Grok → Anthropic fallback).
API keys are read from server-side env vars only.
"""
from __future__ import annotations

from __future__ import annotations

import logging
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.services.audit_service import AuditService
from app.services.llm_service import call_llm
from app.services.pii_masking import mask_pii
from app.services.responsible_ai import (
    CircuitBreaker,
    apply_confidence_bound,
    calculate_honesty_score,
    confidence_badge,
    enforce_risk_tier,
    generate_ethical_disclaimer,
)
from app.services.search_pipeline import SearchPipeline, SearchRequest, SearchResult

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

DISCLAIMER_TH = "ข้อมูลเบื้องต้นเท่านั้น กรุณาปรึกษาทนายความสำหรับกรณีจริง"
NO_INFO_TH = "ไม่พบข้อมูลที่เกี่ยวข้อง กรุณาปรึกษาทนายความ"
MIN_RELEVANCE_THRESHOLD = 0.3

# ---------------------------------------------------------------------------
# FAQ routing — bypass LLM for common questions (saves ~1000 tokens/call)
# ---------------------------------------------------------------------------
_FAQ_RULES: dict[str, str] = {
    "ยื่นฟ้องยังไง": (
        "ขั้นตอนยื่นฟ้อง:\n"
        "1. เตรียมเอกสาร: บัตรประชาชน, หลักฐานความเสียหาย, ชื่อ-ที่อยู่จำเลย\n"
        "2. ร่างคำฟ้อง (ใช้ระบบช่วยร่างคำฟ้องของเราได้)\n"
        "3. ยื่นผ่าน e-Filing หรือไปศาลด้วยตนเอง\n"
        "4. ชำระค่าธรรมเนียม\n"
        "⚖️ ข้อมูลเบื้องต้นเท่านั้น กรุณาปรึกษาทนายความสำหรับกรณีจริง"
    ),
    "ค่าธรรมเนียมศาล": (
        "ค่าธรรมเนียมศาล:\n"
        "- คดีแพ่ง: 2% ของทุนทรัพย์ (ไม่เกิน 200,000 บาท)\n"
        "- คดีอาญา: ไม่มีค่าธรรมเนียม (อัยการฟ้อง) / 2% (ราษฎรฟ้อง)\n"
        "- คดีผู้บริโภค: ไม่มีค่าธรรมเนียม\n"
        "⚖️ ข้อมูลเบื้องต้นเท่านั้น กรุณาปรึกษาทนายความสำหรับกรณีจริง"
    ),
    "e-filing คืออะไร": (
        "e-Filing คือระบบยื่นคำฟ้องออนไลน์ของศาลยุติธรรม:\n"
        "- เข้าใช้งานที่ efiling.coj.go.th\n"
        "- ยืนยันตัวตนด้วย ThaID หรือบัตรประชาชน\n"
        "- ยื่นได้ 24 ชั่วโมง ไม่ต้องไปศาล\n"
        "- ชำระค่าธรรมเนียมผ่าน KTB\n"
        "⚖️ ข้อมูลเบื้องต้นเท่านั้น กรุณาปรึกษาทนายความสำหรับกรณีจริง"
    ),
    "อายุความ": (
        "อายุความที่พบบ่อย:\n"
        "- คดีอาญาทั่วไป: 10 ปี / คดีลหุโทษ: 1 ปี\n"
        "- หมิ่นประมาท: 3 เดือน นับแต่รู้เรื่องและรู้ตัวผู้กระทำ\n"
        "- ละเมิด: 1 ปี นับแต่รู้ถึงการละเมิดและรู้ตัวผู้ทำละเมิด\n"
        "- ผิดสัญญา: 10 ปี (ทั่วไป)\n"
        "⚖️ ข้อมูลเบื้องต้นเท่านั้น กรุณาปรึกษาทนายความสำหรับกรณีจริง"
    ),
}


def _match_faq(message: str) -> str | None:
    """Match user message to FAQ rules using keyword overlap.

    Returns the FAQ answer if matched, None otherwise.
    This saves ~1000 tokens per call by skipping RAG + LLM entirely.
    """
    msg_lower = message.strip().lower()
    for keyword, answer in _FAQ_RULES.items():
        # Simple keyword containment — fast and effective for common questions
        if keyword in msg_lower:
            return answer
    return None


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    role: str = "citizen"  # user role: citizen | lawyer | government


class Citation(BaseModel):
    case_no: str = ""
    statute: str = ""
    source_code: str = ""


class ChatResponse(BaseModel):
    content: str
    citations: list[dict] = Field(default_factory=list)
    confidence: float = 0.0
    disclaimer: str = DISCLAIMER_TH
    honesty_score: float = 0.0
    risk_level: str = "R2"
    badge: dict = Field(default_factory=dict)
    circuit_breaker: dict = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Chatbot
# ---------------------------------------------------------------------------


class NongKotChatbot:
    """RAG-enhanced น้องซื่อสัตย์ chatbot."""

    def __init__(
        self,
        search_pipeline: Optional[SearchPipeline] = None,
        audit_service: Optional[AuditService] = None,
    ) -> None:
        self.search_pipeline = search_pipeline or SearchPipeline()
        self.audit_service = audit_service or AuditService()

    async def chat(self, request: ChatRequest) -> ChatResponse:
        # 0. Prompt injection detection
        from app.services.prompt_guard import sanitize_input

        raw_message = self._extract_latest_user_message(request.messages)
        clean_message, threat = sanitize_input(raw_message)
        if threat and threat.blocked:
            return ChatResponse(
                content=threat.message,
                citations=[],
                confidence=0.0,
                disclaimer="⚠️ คำขอถูกบล็อกเพื่อความปลอดภัย",
            )

        # 1. Extract latest user message
        user_message = clean_message
        if not user_message:
            return ChatResponse(
                content="กรุณาพิมพ์คำถามของคุณ",
                citations=[],
                confidence=0.0,
                disclaimer=DISCLAIMER_TH,
            )

        # 1.5 FAQ routing — bypass RAG + LLM for common questions
        faq_answer = _match_faq(user_message)
        if faq_answer:
            self._log_chat(user_message, faq_answer, confidence=0.95)
            return ChatResponse(
                content=faq_answer,
                citations=[],
                confidence=0.95,
                disclaimer=DISCLAIMER_TH,
                honesty_score=0.95,
                risk_level="R0",
                badge=confidence_badge(0.95),
                circuit_breaker={"alerts": [], "should_block": False, "should_warn": False},
            )

        # 2. Search Knowledge Base for relevant context
        search_results = await self._search_knowledge_base(user_message, request.role)

        # 3. Check if we have relevant results
        relevant_results = [
            r for r in search_results if r.relevance_score >= MIN_RELEVANCE_THRESHOLD
        ]

        if not relevant_results:
            # No relevant info found — recommend consulting a lawyer
            self._log_chat(user_message, NO_INFO_TH, confidence=0.0)
            return ChatResponse(
                content=NO_INFO_TH,
                citations=[],
                confidence=0.0,
                disclaimer=DISCLAIMER_TH,
            )

        # 4. Build RAG context + call LLM
        citations = self._extract_citations(relevant_results)
        rag_context = self._build_response(user_message, relevant_results, request.role)

        # Token optimization: send only compact context + question to LLM
        # - No chat history (stateless per turn — saves ~500 tokens)
        # - Compact context format (citation-first bullets)
        llm_messages = [{"role": "user", "content": f"ข้อมูลอ้างอิง:\n{rag_context}\n\nคำถาม: {user_message}\n\nตอบกระชับ ไม่เกิน 300 คำ อ้างมาตราจริง"}]
        llm_reply = await call_llm(llm_messages, max_tokens=512)
        response_text = llm_reply if llm_reply else rag_context

        # 5. Apply PII masking to response
        masked_response, _, pii_count = mask_pii(response_text)

        # 6. Compute confidence from average relevance
        confidence = sum(r.relevance_score for r in relevant_results) / len(
            relevant_results
        )

        # 7. Apply Responsible AI — Risk Tier + CBB + Honesty Score
        risk_result = enforce_risk_tier("chatbot_response", confidence)
        confidence = apply_confidence_bound(confidence, "chatbot_response")
        disclaimer = generate_ethical_disclaimer("chatbot_response", confidence)

        response_dict = {
            "content": masked_response,
            "citations": [c.model_dump() for c in citations],
            "confidence": confidence,
            "disclaimer": disclaimer,
            "pii_clean": pii_count == 0,
        }
        state_dict = {
            "confidence_cap": 0.90,
            "uncertainty_ratio": 0.0,
        }
        h_score = calculate_honesty_score(response_dict, state_dict)
        badge = confidence_badge(h_score)

        # 8. Circuit Breaker check
        cb = CircuitBreaker()
        cb_result = cb.check(response_dict, {"honesty_score": h_score, "pii_leaked": pii_count})

        if cb_result["should_block"]:
            masked_response = "⚠️ ระบบตรวจพบปัญหา — กรุณาปรึกษาทนายความโดยตรง"
            confidence = 0.0

        # 9. Log to audit
        self._log_chat(user_message, masked_response, confidence=confidence)

        return ChatResponse(
            content=masked_response,
            citations=[c.model_dump() for c in citations],
            confidence=round(confidence, 4),
            disclaimer=disclaimer,
            honesty_score=h_score,
            risk_level=risk_result.risk_level,
            badge=badge,
            circuit_breaker=cb_result,
        )

    # -- helpers --------------------------------------------------------------

    @staticmethod
    def _extract_latest_user_message(messages: list[ChatMessage]) -> str:
        """Return the content of the last user message, or empty string."""
        for msg in reversed(messages):
            if msg.role == "user":
                return msg.content.strip()
        return ""

    async def _search_knowledge_base(
        self, query: str, role: str = "citizen"
    ) -> list[SearchResult]:
        """Search the knowledge base using the search pipeline.

        Token optimization: retrieve only top 3 instead of 5.
        _build_response already uses results[:3], so fetching 5 wastes
        embedding + reranking cost on 2 chunks that are never sent to the LLM.
        """
        try:
            search_req = SearchRequest(query=query, role=role, top_k=3)
            response = await self.search_pipeline.search(search_req)
            return response.results
        except Exception:
            logger.exception("Knowledge base search failed")
            return []

    async def get_rag_context(self, user_message: str, role: str = "citizen") -> str:
        """Return RAG context string for the user message.

        Used by the streaming endpoint so both /chat and /chat/stream
        go through the same retrieval pipeline.
        Returns an empty string when no relevant results are found.
        """
        search_results = await self._search_knowledge_base(user_message, role)
        relevant = [r for r in search_results if r.relevance_score >= MIN_RELEVANCE_THRESHOLD]
        if not relevant:
            return ""
        return self._build_response(user_message, relevant, role)

    @staticmethod
    def _extract_citations(results: list[SearchResult]) -> list[Citation]:
        """Extract unique citations from search results."""
        seen: set[str] = set()
        citations: list[Citation] = []
        for r in results:
            key = f"{r.case_no}|{r.source_code}"
            if key in seen:
                continue
            seen.add(key)
            statutes_str = ", ".join(r.statutes) if r.statutes else ""
            citations.append(
                Citation(
                    case_no=r.case_no,
                    statute=statutes_str,
                    source_code=r.source_code,
                )
            )
        return citations

    @staticmethod
    def _build_response(
        query: str,
        results: list[SearchResult],
        role: str,
    ) -> str:
        """Build citation-first structured context for LLM.

        Token optimization strategy:
        - Send bullet-point citations instead of long prose
        - Citizen: max 120 chars/chunk (was 200)
        - Lawyer/gov: include statutes + case_no only, skip full text
        - Always structured as numbered bullets for minimal token usage
        """
        parts: list[str] = []

        for i, r in enumerate(results[:3], 1):
            # Citation-first: statute + case_no always first
            cite_parts: list[str] = []
            if r.statutes:
                cite_parts.append(", ".join(r.statutes))
            if r.case_no:
                cite_parts.append(f"คดี {r.case_no}")
            if r.source_code:
                cite_parts.append(r.source_code)
            citation = " | ".join(cite_parts) if cite_parts else ""

            # Compact summary — shorter for citizen, statute-focused for others
            text = r.summary or r.chunk_text
            if role == "citizen":
                text = (text[:120] + "...") if len(text) > 120 else text
            else:
                text = (text[:180] + "...") if len(text) > 180 else text

            if citation:
                parts.append(f"{i}. [{citation}] {text}")
            else:
                parts.append(f"{i}. {text}")

        return "\n".join(parts)

    def _log_chat(
        self, query: str, response: str, confidence: float
    ) -> None:
        """Log chat turn to audit service."""
        try:
            self.audit_service.log_entry(
                query=query,
                action="chat",
                result_count=1,
                confidence=confidence,
                metadata={"response_preview": response[:200]},
            )
        except Exception:
            logger.exception("Failed to log chat to audit")
