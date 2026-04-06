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

        llm_messages = [{"role": "user", "content": f"ข้อมูลอ้างอิง:\n{rag_context}\n\nคำถาม: {user_message}"}]
        llm_reply = await call_llm(llm_messages)
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
        """Search the knowledge base using the search pipeline."""
        try:
            search_req = SearchRequest(query=query, role=role, top_k=5)
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
        """Build a response from retrieved context.

        For citizen role: use simplified language.
        Placeholder — will be replaced by Bedrock Claude generation later.
        """
        parts: list[str] = []

        if role == "citizen":
            parts.append("จากข้อมูลที่พบในระบบ:\n")
        else:
            parts.append("ผลการค้นหาจากฐานข้อมูล:\n")

        for i, r in enumerate(results[:3], 1):
            summary = r.summary or r.chunk_text
            if role == "citizen":
                # Simplify: use chunk_text directly, keep it short
                summary = (summary[:200] + "...") if len(summary) > 200 else summary

            source_ref = ""
            if r.case_no:
                source_ref += f" (คดี {r.case_no})"
            if r.statutes:
                source_ref += f" [{', '.join(r.statutes)}]"
            if r.source_code:
                source_ref += f" [แหล่งข้อมูล: {r.source_code}]"

            parts.append(f"{i}. {summary}{source_ref}\n")

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
