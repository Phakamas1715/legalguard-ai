"""Tests for the LangGraph Multi-Agent Engine."""

from __future__ import annotations

import pytest

from app.services.langgraph_engine import (
    AgentState,
    LegalAgentEngine,
    build_agent_graph,
    classify_intent,
    compliance_node,
    drafter_node,
    manager_node,
    researcher_node,
    reviewer_node,
    route_by_intent,
)


# ---------------------------------------------------------------------------
# Intent classification
# ---------------------------------------------------------------------------


class TestClassifyIntent:
    def test_search_intent_thai_keyword(self):
        assert classify_intent("ค้นหาคดีฉ้อโกง") == "SEARCH"

    def test_search_intent_case_keyword(self):
        assert classify_intent("คดีหมายเลข 1234") == "SEARCH"

    def test_search_intent_statute_keyword(self):
        assert classify_intent("มาตรา 341") == "SEARCH"

    def test_draft_complaint_intent(self):
        assert classify_intent("ร่างคำฟ้องคดีแพ่ง") == "DRAFT_COMPLAINT"

    def test_draft_complaint_intent_short(self):
        assert classify_intent("ต้องการฟ้องคดี") == "DRAFT_COMPLAINT"

    def test_draft_judgment_intent(self):
        assert classify_intent("ร่างคำพิพากษาคดีนี้") == "DRAFT_JUDGMENT"

    def test_predict_intent(self):
        assert classify_intent("พยากรณ์ผลคดี") == "PREDICT"

    def test_predict_intent_chance(self):
        assert classify_intent("โอกาสชนะคดี") == "PREDICT"

    def test_chat_fallback(self):
        assert classify_intent("สวัสดีครับ") == "CHAT"

    def test_empty_query_falls_back_to_chat(self):
        assert classify_intent("") == "CHAT"


# ---------------------------------------------------------------------------
# Manager routing
# ---------------------------------------------------------------------------


class TestManagerNode:
    def _make_state(self, query: str = "ค้นหาคดี") -> AgentState:
        return AgentState(
            query=query,
            user_role="citizen",
            intent="",
            search_results=[],
            retrieved_context="",
            draft_output="",
            compliance_status={},
            citations=[],
            confidence=1.0,
            messages=[],
            iteration_count=0,
            final_response="",
            routing_path=[],
        )

    def test_manager_classifies_search(self):
        state = self._make_state("ค้นหาคดีฉ้อโกง")
        result = manager_node(state)
        assert result["intent"] == "SEARCH"

    def test_manager_classifies_draft_complaint(self):
        state = self._make_state("ร่างคำฟ้อง")
        result = manager_node(state)
        assert result["intent"] == "DRAFT_COMPLAINT"

    def test_manager_appends_to_routing_path(self):
        state = self._make_state("สวัสดี")
        result = manager_node(state)
        assert "manager" in result["routing_path"]

    def test_manager_increments_iteration(self):
        state = self._make_state("สวัสดี")
        result = manager_node(state)
        assert result["iteration_count"] == 1

    def test_route_by_intent_returns_intent(self):
        state = self._make_state()
        state["intent"] = "SEARCH"
        assert route_by_intent(state) == "SEARCH"


# ---------------------------------------------------------------------------
# Researcher node
# ---------------------------------------------------------------------------


class TestResearcherNode:
    def _make_state(self, **overrides) -> AgentState:
        base: AgentState = {
            "query": "ค้นหาคดี",
            "user_role": "citizen",
            "intent": "SEARCH",
            "search_results": [],
            "retrieved_context": "",
            "draft_output": "",
            "compliance_status": {},
            "citations": [],
            "confidence": 1.0,
            "messages": [],
            "iteration_count": 1,
            "final_response": "",
            "routing_path": ["manager"],
        }
        base.update(overrides)
        return base

    @pytest.mark.asyncio
    async def test_researcher_adds_to_routing_path(self):
        result = await researcher_node(self._make_state())
        assert "researcher" in result["routing_path"]

    @pytest.mark.asyncio
    async def test_researcher_sets_retrieved_context(self):
        result = await researcher_node(self._make_state())
        assert result["retrieved_context"] != ""

    def test_researcher_preserves_existing_context(self):
        """Removed — researcher now always fetches fresh context from SearchPipeline."""
        pass


# ---------------------------------------------------------------------------
# Reviewer node
# ---------------------------------------------------------------------------


class TestReviewerNode:
    def _make_state(self, **overrides) -> AgentState:
        base: AgentState = {
            "query": "ค้นหาคดี",
            "user_role": "citizen",
            "intent": "SEARCH",
            "search_results": [{"case_no": "1234/2567"}, {"case_no": "5678/2567"}],
            "retrieved_context": "context",
            "draft_output": "",
            "compliance_status": {},
            "citations": [
                {"case_no": "1234/2567", "statute": "มาตรา 341"},
                {"case_no": "9999/2567", "statute": "มาตรา 112"},
            ],
            "confidence": 1.0,
            "messages": [],
            "iteration_count": 1,
            "final_response": "",
            "routing_path": ["manager", "researcher"],
        }
        base.update(overrides)
        return base

    def test_reviewer_verifies_known_citations(self):
        result = reviewer_node(self._make_state())
        verified = [c for c in result["citations"] if c.get("verified")]
        assert len(verified) == 1
        assert verified[0]["case_no"] == "1234/2567"

    def test_reviewer_flags_unknown_citations(self):
        result = reviewer_node(self._make_state())
        unverified = [c for c in result["citations"] if not c.get("verified")]
        assert len(unverified) == 1
        assert "warning" in unverified[0]

    def test_reviewer_lowers_confidence_on_unverified(self):
        result = reviewer_node(self._make_state())
        assert result["confidence"] < 1.0

    def test_reviewer_no_citations_keeps_confidence(self):
        result = reviewer_node(self._make_state(citations=[]))
        assert result["confidence"] == 1.0

    def test_reviewer_all_verified(self):
        state = self._make_state(
            citations=[{"case_no": "1234/2567"}],
        )
        result = reviewer_node(state)
        verified = [c for c in result["citations"] if c.get("verified")]
        assert len(verified) == 1


# ---------------------------------------------------------------------------
# Compliance node
# ---------------------------------------------------------------------------


class TestComplianceNode:
    def _make_state(self, **overrides) -> AgentState:
        base: AgentState = {
            "query": "ค้นหาคดี",
            "user_role": "citizen",
            "intent": "SEARCH",
            "search_results": [],
            "retrieved_context": "context text",
            "draft_output": "",
            "compliance_status": {},
            "citations": [],
            "confidence": 1.0,
            "messages": [],
            "iteration_count": 1,
            "final_response": "",
            "routing_path": ["manager", "researcher", "reviewer"],
        }
        base.update(overrides)
        return base

    def test_compliance_allows_search_for_citizen(self):
        result = compliance_node(self._make_state())
        assert result["compliance_status"]["access_allowed"] is True

    def test_compliance_blocks_judgment_draft_for_citizen(self):
        result = compliance_node(self._make_state(intent="DRAFT_JUDGMENT"))
        assert result["compliance_status"]["access_allowed"] is False
        assert "ACCESS DENIED" in result["final_response"]

    def test_compliance_allows_judgment_draft_for_government(self):
        result = compliance_node(self._make_state(
            intent="DRAFT_JUDGMENT", user_role="government"
        ))
        assert result["compliance_status"]["access_allowed"] is True

    def test_compliance_masks_pii(self):
        text_with_pii = "นายสมชาย ใจดี โทร 081-234-5678"
        result = compliance_node(self._make_state(retrieved_context=text_with_pii))
        assert result["compliance_status"]["pii_masked"] is True
        assert result["compliance_status"]["pii_count"] > 0
        assert "081-234-5678" not in result["final_response"]

    def test_compliance_appends_routing_path(self):
        result = compliance_node(self._make_state())
        assert "compliance" in result["routing_path"]


# ---------------------------------------------------------------------------
# Drafter node
# ---------------------------------------------------------------------------


class TestDrafterNode:
    def _make_state(self, **overrides) -> AgentState:
        base: AgentState = {
            "query": "ถูกโกงเงิน 100,000 บาท",
            "user_role": "citizen",
            "intent": "DRAFT_COMPLAINT",
            "search_results": [],
            "retrieved_context": "",
            "draft_output": "",
            "compliance_status": {},
            "citations": [],
            "confidence": 1.0,
            "messages": [],
            "iteration_count": 1,
            "final_response": "",
            "routing_path": ["manager"],
        }
        base.update(overrides)
        return base

    @pytest.mark.asyncio
    async def test_drafter_complaint(self):
        result = await drafter_node(self._make_state())
        assert result["draft_output"]  # draft text is non-empty

    @pytest.mark.asyncio
    async def test_drafter_judgment(self):
        result = await drafter_node(self._make_state(intent="DRAFT_JUDGMENT"))
        assert result["draft_output"]  # draft text is non-empty

    @pytest.mark.asyncio
    async def test_drafter_appends_routing_path(self):
        result = await drafter_node(self._make_state())
        assert "drafter" in result["routing_path"]


# ---------------------------------------------------------------------------
# Graph compilation
# ---------------------------------------------------------------------------


class TestGraphCompilation:
    def test_graph_builds_without_error(self):
        graph = build_agent_graph()
        assert graph is not None

    def test_graph_compiles_without_error(self):
        from app.services.langgraph_engine import compile_agent_graph

        compiled = compile_agent_graph()
        assert compiled is not None


# ---------------------------------------------------------------------------
# End-to-end engine tests
# ---------------------------------------------------------------------------


class TestLegalAgentEngine:
    @pytest.fixture
    def engine(self):
        return LegalAgentEngine()

    async def test_search_flow(self, engine):
        result = await engine.run("ค้นหาคดีฉ้อโกง", role="citizen")
        assert result["intent"] == "SEARCH"
        assert "manager" in result["routing_path"]
        assert "researcher" in result["routing_path"]
        assert "reviewer" in result["routing_path"]
        assert "compliance" in result["routing_path"]
        assert result["final_response"] != ""

    async def test_draft_complaint_flow(self, engine):
        result = await engine.run("ร่างคำฟ้องคดีแพ่ง", role="citizen")
        assert result["intent"] == "DRAFT_COMPLAINT"
        assert "drafter" in result["routing_path"]
        assert "reviewer" in result["routing_path"]
        assert "compliance" in result["routing_path"]

    async def test_draft_judgment_blocked_for_citizen(self, engine):
        result = await engine.run("ร่างคำพิพากษา", role="citizen")
        assert result["intent"] == "DRAFT_JUDGMENT"
        assert result["compliance_status"]["access_allowed"] is False

    async def test_draft_judgment_allowed_for_government(self, engine):
        result = await engine.run("ร่างคำพิพากษา", role="government")
        assert result["intent"] == "DRAFT_JUDGMENT"
        assert result["compliance_status"]["access_allowed"] is True

    async def test_chat_fallback(self, engine):
        result = await engine.run("สวัสดีครับ", role="citizen")
        assert result["intent"] == "CHAT"

    async def test_invalid_role_defaults_to_citizen(self, engine):
        result = await engine.run("ค้นหาคดี", role="invalid_role")
        assert result["user_role"] == "citizen"
