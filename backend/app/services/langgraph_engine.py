"""LangGraph Multi-Agent Engine for Smart Court AI.

Replaces the simulated agentOrchestrator.ts with a real LangGraph StateGraph
that routes queries through Manager → Researcher/Drafter → Reviewer → Compliance.

Agent nodes are simple state-updating functions; actual LLM calls will be added later.
"""

from __future__ import annotations

import logging
from typing import TypedDict

from langgraph.graph import END, StateGraph

from app.services.llm_service import call_llm
from app.services.pii_masking import mask_pii
from app.services.responsible_ai import (
    CircuitBreaker,
    CommitRevealProtocol,
    apply_confidence_bound,
    calculate_honesty_score,
    confidence_badge,
    detect_bias_convergence,
    enforce_risk_tier,
    generate_ethical_disclaimer,
    partition_knowledge,
)
from app.services.search_pipeline import SearchPipeline, SearchRequest

# Module-level SearchPipeline singleton (lazy-initialised on first use)
_pipeline: SearchPipeline | None = None


def _get_pipeline() -> SearchPipeline:
    global _pipeline
    if _pipeline is None:
        from app.services.bm25_indexer import BM25Indexer
        from app.services.embedding_service import EmbeddingService
        from app.services.qdrant_loader import QdrantService
        _pipeline = SearchPipeline(
            embedding_service=EmbeddingService(),
            qdrant_service=QdrantService(),
            bm25_indexer=BM25Indexer(),
        )
    return _pipeline

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAX_ITERATIONS = 5

INTENT_KEYWORDS: dict[str, list[str]] = {
    "SEARCH": ["ค้นหา", "สืบค้น", "คำพิพากษา", "คดี", "มาตรา", "แนวคำ"],
    "DRAFT_COMPLAINT": ["ร่างคำฟ้อง", "ยื่นฟ้อง", "คำฟ้อง", "ฟ้อง"],
    "DRAFT_JUDGMENT": ["ร่างคำพิพากษา", "ยกร่าง", "คำพิพากษา"],
    "PREDICT": ["พยากรณ์", "ทำนาย", "โอกาส", "ผลคดี"],
    "CHAT": [],  # default fallback
}

VALID_INTENTS = {"SEARCH", "DRAFT_COMPLAINT", "DRAFT_JUDGMENT", "PREDICT", "CHAT"}

VALID_ROLES = {"citizen", "lawyer", "government"}


# ---------------------------------------------------------------------------
# Agent State
# ---------------------------------------------------------------------------


class AgentState(TypedDict):
    """Shared state flowing through the LangGraph agent graph."""

    query: str
    user_role: str  # citizen | lawyer | government
    intent: str  # SEARCH | DRAFT_COMPLAINT | DRAFT_JUDGMENT | PREDICT | CHAT
    search_results: list[dict]
    retrieved_context: str
    draft_output: str
    compliance_status: dict
    citations: list[dict]
    confidence: float
    messages: list[dict]
    iteration_count: int
    final_response: str
    routing_path: list[str]


# ---------------------------------------------------------------------------
# Intent classification
# ---------------------------------------------------------------------------


def classify_intent(query: str) -> str:
    """Classify user intent from the query text using keyword matching.

    Checks more specific intents first (DRAFT_COMPLAINT, DRAFT_JUDGMENT,
    PREDICT) before falling back to the broader SEARCH intent, then CHAT.
    """
    # Priority order: most specific first
    priority_order = ["DRAFT_COMPLAINT", "DRAFT_JUDGMENT", "PREDICT", "SEARCH", "CHAT"]
    for intent in priority_order:
        keywords = INTENT_KEYWORDS[intent]
        if any(kw in query for kw in keywords):
            return intent
    return "CHAT"


# ---------------------------------------------------------------------------
# Routing helper
# ---------------------------------------------------------------------------


def route_by_intent(state: AgentState) -> str:
    """Return the intent string so the conditional edge can pick the next node."""
    return state["intent"]


# ---------------------------------------------------------------------------
# Agent Nodes
# ---------------------------------------------------------------------------


def manager_node(state: AgentState) -> dict:
    """Classify intent from query and record routing path."""
    intent = classify_intent(state["query"])
    routing_path = list(state.get("routing_path") or [])
    routing_path.append("manager")
    return {
        "intent": intent,
        "routing_path": routing_path,
        "iteration_count": state.get("iteration_count", 0) + 1,
    }


async def researcher_node(state: AgentState) -> dict:
    """Call SearchPipeline.search() to retrieve relevant legal documents."""
    routing_path = list(state.get("routing_path") or [])
    routing_path.append("researcher")

    search_results: list[dict] = []
    retrieved_context = ""

    try:
        pipeline = _get_pipeline()
        req = SearchRequest(query=state["query"], role=state.get("user_role", "citizen"), top_k=5)
        resp = await pipeline.search(req)
        search_results = [r.model_dump() for r in resp.results]
        retrieved_context = "\n".join(
            f"{i+1}. {r.get('title','')} [{', '.join(r.get('statutes',[]))}]\n{r.get('summary', r.get('chunk_text',''))}"
            for i, r in enumerate(search_results[:3])
        )
    except Exception:
        logger.exception("researcher_node: SearchPipeline.search() failed")
        retrieved_context = f"[Researcher] ไม่สามารถค้นหาข้อมูลได้: {state['query']}"

    return {
        "search_results": search_results,
        "retrieved_context": retrieved_context,
        "routing_path": routing_path,
    }


def reviewer_node(state: AgentState) -> dict:
    """Verify citations exist in search results.

    Partitions citations into verified (case_no found in search_results)
    and unverified sets.
    """
    routing_path = list(state.get("routing_path") or [])
    routing_path.append("reviewer")

    citations = list(state.get("citations") or [])
    search_results = state.get("search_results") or []

    # Build set of known case numbers from search results
    known_case_nos = {r.get("case_no", "") for r in search_results}

    verified: list[dict] = []
    unverified: list[dict] = []
    for cite in citations:
        case_no = cite.get("case_no", "")
        if case_no and case_no in known_case_nos:
            verified.append({**cite, "verified": True})
        else:
            unverified.append({**cite, "verified": False, "warning": "citation not found in search results"})

    all_citations = verified + unverified
    confidence = state.get("confidence", 0.0)
    if citations and unverified:
        # Lower confidence when unverified citations exist
        ratio = len(verified) / len(citations) if citations else 1.0
        confidence = min(confidence, ratio)

    return {
        "citations": all_citations,
        "confidence": confidence,
        "routing_path": routing_path,
    }


def compliance_node(state: AgentState) -> dict:
    """Apply PII masking and check role-based access.

    Sets ``compliance_status`` with masking results and access decision.
    Produces ``final_response`` from the best available content.
    """
    routing_path = list(state.get("routing_path") or [])
    routing_path.append("compliance")

    user_role = state.get("user_role", "citizen")

    # PII masking on the output text
    raw_text = state.get("draft_output") or state.get("retrieved_context") or ""
    masked_text, pii_spans, pii_count = mask_pii(raw_text)

    # Role-based access check
    intent = state.get("intent", "CHAT")
    access_allowed = True
    access_reason = "ok"

    # Government-only intents
    if intent == "DRAFT_JUDGMENT" and user_role != "government":
        access_allowed = False
        access_reason = "DRAFT_JUDGMENT requires government role"

    compliance_status = {
        "pii_masked": pii_count > 0,
        "pii_count": pii_count,
        "access_allowed": access_allowed,
        "access_reason": access_reason,
        "role": user_role,
    }

    final_response = masked_text if access_allowed else f"[ACCESS DENIED] {access_reason}"

    return {
        "compliance_status": compliance_status,
        "final_response": final_response,
        "routing_path": routing_path,
    }


async def drafter_node(state: AgentState) -> dict:
    """Call LLM to generate draft complaint or judgment based on RAG context."""
    routing_path = list(state.get("routing_path") or [])
    routing_path.append("drafter")

    intent = state.get("intent", "CHAT")
    query = state.get("query", "")
    context = state.get("retrieved_context") or ""

    if intent == "DRAFT_COMPLAINT":
        system = "คุณเป็นผู้ช่วย AI ช่วยร่างคำฟ้อง อ้างอิงกฎหมายจากข้อมูลที่ให้มา ⚠️ ร่างเบื้องต้นเท่านั้น ต้องตรวจสอบโดยทนายความก่อนยื่น"
    elif intent == "DRAFT_JUDGMENT":
        system = "คุณเป็นผู้ช่วย AI ช่วยยกร่างคำพิพากษา อ้างอิงมาตรากฎหมายจากข้อมูลที่ให้มา ⚠️ ร่างเบื้องต้นเท่านั้น ต้องตรวจสอบโดยตุลาการ"
    else:
        system = "คุณเป็นผู้ช่วย AI ด้านกฎหมายไทย ตอบโดยอ้างอิงข้อมูลที่ให้มา"

    messages = [{"role": "user", "content": f"ข้อมูลอ้างอิง:\n{context}\n\nคำขอ: {query}"}]

    draft = ""
    try:
        draft = await call_llm(messages, system=system)
    except Exception:
        logger.exception("drafter_node: LLM call failed")

    if not draft:
        draft = (
            f"[ร่างเบื้องต้น — LLM ไม่พร้อมใช้งาน]\n"
            f"ข้อเท็จจริง: {query}\n"
            f"บริบทที่พบ:\n{context}\n"
            f"(กรุณาตรวจสอบโดยผู้เชี่ยวชาญก่อนใช้จริง)"
        )

    return {
        "draft_output": draft,
        "routing_path": routing_path,
    }


# ---------------------------------------------------------------------------
# Graph Definition
# ---------------------------------------------------------------------------


def build_agent_graph() -> StateGraph:
    """Build and compile the LangGraph multi-agent StateGraph.

    Flow:
        manager → (conditional by intent) → researcher | drafter
        researcher → reviewer → compliance → END
        drafter → reviewer → compliance → END
    """
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("manager", manager_node)
    graph.add_node("researcher", researcher_node)
    graph.add_node("reviewer", reviewer_node)
    graph.add_node("compliance", compliance_node)
    graph.add_node("drafter", drafter_node)

    # Entry point
    graph.set_entry_point("manager")

    # Conditional routing from manager based on intent
    graph.add_conditional_edges(
        "manager",
        route_by_intent,
        {
            "SEARCH": "researcher",
            "DRAFT_COMPLAINT": "drafter",
            "DRAFT_JUDGMENT": "drafter",
            "PREDICT": "researcher",
            "CHAT": "researcher",
        },
    )

    # Linear edges
    graph.add_edge("researcher", "reviewer")
    graph.add_edge("reviewer", "compliance")
    graph.add_edge("drafter", "reviewer")
    graph.add_edge("compliance", END)

    return graph


def compile_agent_graph():
    """Build and compile the graph, returning a runnable."""
    return build_agent_graph().compile()


# ---------------------------------------------------------------------------
# LegalAgentEngine — main entry point
# ---------------------------------------------------------------------------


class LegalAgentEngine:
    """Main entry point for the multi-agent system."""

    def __init__(self) -> None:
        self.graph = compile_agent_graph()

    async def run(self, query: str, role: str = "citizen") -> dict:
        """Execute the agent graph for a given query and user role.

        Returns the final ``AgentState`` dict.
        """
        if role not in VALID_ROLES:
            role = "citizen"

        initial_state: AgentState = {
            "query": query,
            "user_role": role,
            "intent": "",
            "search_results": [],
            "retrieved_context": "",
            "draft_output": "",
            "compliance_status": {},
            "citations": [],
            "confidence": 1.0,
            "messages": [],
            "iteration_count": 0,
            "final_response": "",
            "routing_path": [],
        }

        result = await self.graph.ainvoke(initial_state)
        return dict(result)
