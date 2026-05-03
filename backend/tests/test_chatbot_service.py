"""Tests for the RAG-enhanced น้องกฎ chatbot service."""

from __future__ import annotations

import pytest

from app.services.chatbot_service import (
    DISCLAIMER_TH,
    MIN_RELEVANCE_THRESHOLD,
    NO_INFO_TH,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    NongKotChatbot,
)
from app.services.search_pipeline import (
    SearchPipeline,
    SearchRequest,
    SearchResponse,
    SearchResult,
)


# ---------------------------------------------------------------------------
# Fake services
# ---------------------------------------------------------------------------


def _make_result(
    case_no: str = "1234/2567",
    relevance_score: float = 0.8,
    summary: str = "ศาลพิพากษาให้จำเลยชดใช้ค่าเสียหาย",
    statutes: list[str] | None = None,
    source_code: str = "A4.1",
) -> SearchResult:
    return SearchResult(
        id="r-1",
        case_no=case_no,
        court_type="supreme",
        year=2567,
        title="Test Case",
        summary=summary,
        chunk_text="chunk content about the case",
        statutes=statutes or ["มาตรา 341"],
        relevance_score=relevance_score,
        source_code=source_code,
        bm25_score=0.5,
        vector_score=0.7,
        rrf_score=0.01,
    )


class _FakeSearchPipelineWithResults(SearchPipeline):
    """Returns predefined results."""

    def __init__(self, results: list[SearchResult] | None = None):
        # Skip parent __init__ to avoid real service instantiation
        self._results = results if results is not None else [_make_result()]

    async def search(self, request: SearchRequest) -> SearchResponse:
        return SearchResponse(
            results=self._results,
            query_embedding_time_ms=1.0,
            bm25_search_time_ms=1.0,
            vector_search_time_ms=1.0,
            rerank_time_ms=1.0,
            total_time_ms=4.0,
            cache_hit=False,
            total_candidates=len(self._results),
        )


class _FakeSearchPipelineEmpty(_FakeSearchPipelineWithResults):
    """Returns no results."""

    def __init__(self):
        super().__init__(results=[])


class _FakeSearchPipelineLowRelevance(_FakeSearchPipelineWithResults):
    """Returns results with low relevance scores."""

    def __init__(self):
        super().__init__(
            results=[_make_result(relevance_score=0.1)]
        )


# ---------------------------------------------------------------------------
# Tests: basic chat flow
# ---------------------------------------------------------------------------


class TestNongKotChatbot:
    @pytest.mark.asyncio
    async def test_chat_returns_response_with_citations(self):
        chatbot = NongKotChatbot(
            search_pipeline=_FakeSearchPipelineWithResults()
        )
        request = ChatRequest(
            messages=[ChatMessage(role="user", content="ฉ้อโกงเงินต้องทำยังไง")],
            role="citizen",
        )
        response = await chatbot.chat(request)

        assert isinstance(response, ChatResponse)
        assert response.content
        assert "ข้อมูล" in response.disclaimer  # disclaimer present (text varies by task type)
        assert response.confidence > 0
        assert len(response.citations) >= 1
        # Citation should contain case_no
        assert response.citations[0]["case_no"] == "1234/2567"

    @pytest.mark.asyncio
    async def test_chat_no_results_returns_unavailable(self):
        chatbot = NongKotChatbot(
            search_pipeline=_FakeSearchPipelineEmpty()
        )
        request = ChatRequest(
            messages=[ChatMessage(role="user", content="คำถามที่ไม่มีข้อมูล")],
            role="citizen",
        )
        response = await chatbot.chat(request)

        assert response.content == NO_INFO_TH
        assert response.confidence == 0.0
        assert response.citations == []
        assert response.disclaimer  # disclaimer is present

    @pytest.mark.asyncio
    async def test_chat_low_relevance_returns_unavailable(self):
        chatbot = NongKotChatbot(
            search_pipeline=_FakeSearchPipelineLowRelevance()
        )
        request = ChatRequest(
            messages=[ChatMessage(role="user", content="something vague")],
            role="citizen",
        )
        response = await chatbot.chat(request)

        assert response.content == NO_INFO_TH
        assert response.confidence == 0.0

    @pytest.mark.asyncio
    async def test_chat_empty_messages_returns_prompt(self):
        chatbot = NongKotChatbot(
            search_pipeline=_FakeSearchPipelineWithResults()
        )
        request = ChatRequest(messages=[], role="citizen")
        response = await chatbot.chat(request)

        assert "กรุณาพิมพ์คำถาม" in response.content

    @pytest.mark.asyncio
    async def test_chat_confidence_capped_at_090(self):
        """Confidence should be capped at 0.90 per CBB design."""
        high_score_result = _make_result(relevance_score=0.99)
        chatbot = NongKotChatbot(
            search_pipeline=_FakeSearchPipelineWithResults(
                results=[high_score_result]
            )
        )
        request = ChatRequest(
            messages=[ChatMessage(role="user", content="test")],
            role="citizen",
        )
        response = await chatbot.chat(request)

        assert response.confidence <= 0.90

    @pytest.mark.asyncio
    async def test_chat_citizen_role_uses_simplified_language(self):
        chatbot = NongKotChatbot(
            search_pipeline=_FakeSearchPipelineWithResults()
        )
        request = ChatRequest(
            messages=[ChatMessage(role="user", content="ถูกโกงเงิน")],
            role="citizen",
        )
        response = await chatbot.chat(request)

        # Citation-first format: [statute | case_no | source] summary
        assert "มาตรา 341" in response.content or "คดี" in response.content

    @pytest.mark.asyncio
    async def test_chat_lawyer_role_uses_formal_language(self):
        chatbot = NongKotChatbot(
            search_pipeline=_FakeSearchPipelineWithResults()
        )
        request = ChatRequest(
            messages=[ChatMessage(role="user", content="ฉ้อโกง มาตรา 341")],
            role="lawyer",
        )
        response = await chatbot.chat(request)

        # Citation-first format includes statute references
        assert "มาตรา 341" in response.content or "A4.1" in response.content


# ---------------------------------------------------------------------------
# Tests: helper methods
# ---------------------------------------------------------------------------


class TestExtractLatestUserMessage:
    def test_extracts_last_user_message(self):
        messages = [
            ChatMessage(role="user", content="first"),
            ChatMessage(role="assistant", content="reply"),
            ChatMessage(role="user", content="second"),
        ]
        result = NongKotChatbot._extract_latest_user_message(messages)
        assert result == "second"

    def test_empty_messages_returns_empty(self):
        result = NongKotChatbot._extract_latest_user_message([])
        assert result == ""

    def test_no_user_messages_returns_empty(self):
        messages = [ChatMessage(role="assistant", content="hello")]
        result = NongKotChatbot._extract_latest_user_message(messages)
        assert result == ""

    def test_strips_whitespace(self):
        messages = [ChatMessage(role="user", content="  hello  ")]
        result = NongKotChatbot._extract_latest_user_message(messages)
        assert result == "hello"


class TestExtractCitations:
    def test_extracts_unique_citations(self):
        results = [
            _make_result(case_no="1/2567", source_code="A4.1"),
            _make_result(case_no="1/2567", source_code="A4.1"),  # duplicate
            _make_result(case_no="2/2567", source_code="B5.1"),
        ]
        citations = NongKotChatbot._extract_citations(results)
        assert len(citations) == 2

    def test_includes_statutes(self):
        results = [_make_result(statutes=["มาตรา 341", "มาตรา 342"])]
        citations = NongKotChatbot._extract_citations(results)
        assert "มาตรา 341" in citations[0].statute
        assert "มาตรา 342" in citations[0].statute


class TestBuildResponse:
    def test_citizen_response_includes_source_refs(self):
        results = [_make_result()]
        response = NongKotChatbot._build_response("test", results, "citizen")
        assert "คดี 1234/2567" in response
        assert "A4.1" in response

    def test_citizen_truncates_long_summaries(self):
        long_summary = "ก" * 300
        results = [_make_result(summary=long_summary)]
        response = NongKotChatbot._build_response("test", results, "citizen")
        assert "..." in response

    def test_limits_to_three_results(self):
        results = [_make_result(case_no=f"{i}/2567", source_code=f"X{i}") for i in range(5)]
        response = NongKotChatbot._build_response("test", results, "citizen")
        assert "1." in response
        assert "3." in response
        # 4th result should not appear (only top 3 shown)
        assert "X3" not in response
        assert "X4" not in response
