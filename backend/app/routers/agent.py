"""Agentic RAG Router — all queries flow through LangGraph Multi-Agent System.

Flow:
  User Query → Manager Agent → (route by intent)
    ├── SEARCH/CHAT/PREDICT → Researcher → Reviewer → Compliance → Response
    └── DRAFT_COMPLAINT/JUDGMENT → Drafter → Reviewer → Compliance → Response

This is the Agentic RAG entry point. Every query passes through the full
agent graph with citation verification, PII masking, and role-based access.
"""
from __future__ import annotations

from __future__ import annotations

import logging

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.langgraph_engine import LegalAgentEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["agentic-rag"])

_engine: Optional[LegalAgentEngine] = None


def _get_engine() -> LegalAgentEngine:
    global _engine
    if _engine is None:
        _engine = LegalAgentEngine()
    return _engine


class AgentRequest(BaseModel):
    query: str
    role: str = "citizen"  # citizen | lawyer | government | judge | admin_judge | admin


class AgentResponse(BaseModel):
    response: str = ""
    intent: str = ""
    confidence: float = 0.0
    citations: list[dict] = Field(default_factory=list)
    routing_path: list[str] = Field(default_factory=list)
    compliance_status: dict = Field(default_factory=dict)
    disclaimer: str = ""


@router.post("/query", response_model=AgentResponse)
async def agent_query(req: AgentRequest) -> AgentResponse:
    """Send a query through the full LangGraph Multi-Agent pipeline.

    Flow: Manager → (Researcher|Drafter) → Reviewer → Compliance → Response

    This is the Agentic RAG endpoint — every query passes through all agents
    with citation verification, PII masking, and role-based access control.
    """
    engine = _get_engine()

    try:
        result = await engine.run(query=req.query, role=req.role)

        return AgentResponse(
            response=result.get("final_response", ""),
            intent=result.get("intent", ""),
            confidence=result.get("confidence", 0.0),
            citations=result.get("citations", []),
            routing_path=result.get("routing_path", []),
            compliance_status=result.get("compliance_status", {}),
            disclaimer="⚠️ ข้อมูลเบื้องต้นจาก AI เพื่อช่วยงานสนับสนุนเท่านั้น "
                       "ต้องตรวจสอบและใช้อำนาจดุลยพินิจด้วยตนเอง",
        )
    except Exception as exc:
        logger.exception("Agent query failed: %s", exc)
        return AgentResponse(
            response=f"เกิดข้อผิดพลาด: {exc}",
            intent="ERROR",
            disclaimer="⚠️ ระบบพบปัญหา กรุณาลองใหม่",
        )


@router.get("/status")
async def agent_status():
    """Check agent system status."""
    engine = _get_engine()
    return {
        "status": "ready",
        "agents": ["manager", "researcher", "reviewer", "compliance", "drafter"],
        "graph_compiled": engine.graph is not None,
    }
