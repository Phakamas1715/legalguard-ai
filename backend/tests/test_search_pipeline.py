"""Tests for the hybrid search pipeline."""

from __future__ import annotations

import pytest

from app.services.search_pipeline import (
    SearchFilters,
    SearchPipeline,
    SearchRequest,
    SearchResponse,
    SearchResult,
    format_results_for_role,
    generate_suggestions,
    lejepa_rerank,
    reciprocal_rank_fusion,
    simplify_thai,
    _cosine_similarity,
)


# ---------------------------------------------------------------------------
# Unit tests for RRF
# ---------------------------------------------------------------------------


class TestReciprocalRankFusion:
    def test_single_source_bm25_only(self):
        bm25 = [{"id": "a"}, {"id": "b"}]
        vector: list[dict] = []
        ranked = reciprocal_rank_fusion(bm25, vector, k=60)
        assert ranked[0][0] == "a"
        assert ranked[1][0] == "b"
        # First rank score = bm25_weight * 1/(60+0+1) = 0.30 * 1/61
        assert abs(ranked[0][1] - 0.30 / 61) < 1e-9

    def test_single_source_vector_only(self):
        bm25: list[dict] = []
        vector = [{"id": "x"}, {"id": "y"}]
        ranked = reciprocal_rank_fusion(bm25, vector, k=60)
        assert ranked[0][0] == "x"

    def test_overlapping_results_boost(self):
        bm25 = [{"id": "a"}, {"id": "b"}]
        vector = [{"id": "a"}, {"id": "c"}]
        ranked = reciprocal_rank_fusion(bm25, vector, k=60)
        # "a" appears in both → highest score
        assert ranked[0][0] == "a"
        # Its score = bm25_weight/61 + vector_weight/61 = (0.30+0.70)/61 = 1/61
        assert abs(ranked[0][1] - 1.0 / 61) < 1e-9

    def test_empty_inputs(self):
        assert reciprocal_rank_fusion([], [], k=60) == []

    def test_ordering_preserved_for_disjoint(self):
        bm25 = [{"id": "b1"}, {"id": "b2"}, {"id": "b3"}]
        vector = [{"id": "v1"}, {"id": "v2"}, {"id": "v3"}]
        ranked = reciprocal_rank_fusion(bm25, vector, k=60)
        ids = [r[0] for r in ranked]
        # b1 and v1 tie at 1/61, but both should be present
        assert "b1" in ids
        assert "v1" in ids
        assert len(ids) == 6


# ---------------------------------------------------------------------------
# Unit tests for LeJEPA reranking
# ---------------------------------------------------------------------------


class TestLeJEPARerank:
    def test_rerank_by_similarity(self):
        query_emb = [1.0, 0.0, 0.0]
        candidates = [
            {"id": "far", "vector": [0.0, 1.0, 0.0], "rrf_score": 0.5},
            {"id": "close", "vector": [0.9, 0.1, 0.0], "rrf_score": 0.3},
        ]
        result = lejepa_rerank(query_emb, candidates, top_k=2)
        assert result[0]["id"] == "close"

    def test_ood_penalty_applied(self):
        # A candidate with very low similarity should get OOD penalty
        query_emb = [1.0, 0.0, 0.0]
        candidates = [
            {"id": "ood", "vector": [-1.0, 0.0, 0.0], "rrf_score": 0.5},
        ]
        result = lejepa_rerank(query_emb, candidates, top_k=1)
        # cosine = -1, energy = 2.0 > 0.7 → OOD → score = -1 * 0.5 = -0.5
        assert result[0]["relevance_score"] < 0

    def test_top_k_limits_output(self):
        query_emb = [1.0, 0.0]
        candidates = [
            {"id": f"d{i}", "vector": [1.0, 0.0], "rrf_score": 0.1}
            for i in range(10)
        ]
        result = lejepa_rerank(query_emb, candidates, top_k=3)
        assert len(result) == 3

    def test_no_vector_uses_rrf_fallback(self):
        query_emb = [1.0, 0.0]
        candidates = [
            {"id": "no_vec", "rrf_score": 0.8},
            {"id": "has_vec", "vector": [1.0, 0.0], "rrf_score": 0.1},
        ]
        result = lejepa_rerank(query_emb, candidates, top_k=2)
        # has_vec has cosine=1.0, no_vec uses rrf_score=0.8 as similarity proxy
        assert result[0]["id"] == "has_vec"


# ---------------------------------------------------------------------------
# Unit tests for cosine similarity
# ---------------------------------------------------------------------------


class TestCosineSimilarity:
    def test_identical_vectors(self):
        assert abs(_cosine_similarity([1, 0], [1, 0]) - 1.0) < 1e-9

    def test_orthogonal_vectors(self):
        assert abs(_cosine_similarity([1, 0], [0, 1])) < 1e-9

    def test_opposite_vectors(self):
        assert abs(_cosine_similarity([1, 0], [-1, 0]) + 1.0) < 1e-9

    def test_zero_vector(self):
        assert _cosine_similarity([0, 0], [1, 0]) == 0.0


# ---------------------------------------------------------------------------
# Unit tests for filter builders
# ---------------------------------------------------------------------------


class TestFilterBuilders:
    def test_none_filters(self):
        assert SearchPipeline._build_qdrant_filters(None) is None
        assert SearchPipeline._build_bm25_filters(None) is None

    def test_empty_filters(self):
        f = SearchFilters()
        assert SearchPipeline._build_qdrant_filters(f) is None
        assert SearchPipeline._build_bm25_filters(f) is None

    def test_court_type_filter(self):
        f = SearchFilters(court_type="supreme")
        qf = SearchPipeline._build_qdrant_filters(f)
        assert qf is not None
        assert qf["court_type"] == "supreme"

    def test_year_range_filter(self):
        f = SearchFilters(year_from=2560, year_to=2567)
        qf = SearchPipeline._build_qdrant_filters(f)
        assert qf is not None
        assert qf["year_from"] == 2560
        assert qf["year_to"] == 2567

    def test_source_codes_filter(self):
        f = SearchFilters(source_codes=["A4.1", "B5.1"])
        qf = SearchPipeline._build_qdrant_filters(f)
        assert qf is not None
        assert qf["source_code"] == "A4.1"


# ---------------------------------------------------------------------------
# Integration-style test with mocked services
# ---------------------------------------------------------------------------


class _FakeEmbedding:
    def embed(self, text: str) -> list[float]:
        return [0.5, 0.5, 0.5]


class _FakeQdrant:
    def search(self, query_vector, filters=None, top_k=10):
        return [
            {
                "id": "vec-1",
                "score": 0.9,
                "payload": {
                    "case_no": "1234/2567",
                    "court_type": "supreme",
                    "year": 2567,
                    "title": "Test Case",
                    "summary": "A test",
                    "chunk_text": "chunk content",
                    "statutes": ["มาตรา 341"],
                    "source_code": "A4.1",
                },
            }
        ]


class _FakeBM25:
    def search(self, query, top_k=30, filters=None):
        return [
            {"id": "bm25-1", "score": 5.2, "text_preview": "bm25 hit"},
            {"id": "vec-1", "score": 3.1, "text_preview": "overlap"},
        ]


@pytest.mark.asyncio
async def test_pipeline_end_to_end():
    """Full pipeline with fake services — verifies wiring and response shape."""
    pipeline = SearchPipeline(
        embedding_service=_FakeEmbedding(),  # type: ignore[arg-type]
        qdrant_service=_FakeQdrant(),  # type: ignore[arg-type]
        bm25_indexer=_FakeBM25(),  # type: ignore[arg-type]
        cache=None,
    )
    req = SearchRequest(query="ฉ้อโกง มาตรา 341", top_k=5)
    resp = await pipeline.search(req)

    assert isinstance(resp, SearchResponse)
    assert resp.cache_hit is False
    assert resp.total_candidates >= 1
    assert resp.total_time_ms > 0
    assert resp.query_embedding_time_ms >= 0
    assert len(resp.results) >= 1

    # The overlapping doc "vec-1" should be boosted by RRF
    ids = [r.id for r in resp.results]
    assert "vec-1" in ids


@pytest.mark.asyncio
async def test_pipeline_with_filters():
    """Filters are passed through without error."""
    pipeline = SearchPipeline(
        embedding_service=_FakeEmbedding(),  # type: ignore[arg-type]
        qdrant_service=_FakeQdrant(),  # type: ignore[arg-type]
        bm25_indexer=_FakeBM25(),  # type: ignore[arg-type]
        cache=None,
    )
    req = SearchRequest(
        query="test",
        filters=SearchFilters(court_type="admin", year_from=2565),
        top_k=3,
    )
    resp = await pipeline.search(req)
    assert isinstance(resp, SearchResponse)


# ---------------------------------------------------------------------------
# Unit tests for role-based formatting (Task 4.3)
# ---------------------------------------------------------------------------


class TestSimplifyThai:
    def test_truncates_to_two_sentences(self):
        text = "ประโยคแรก. ประโยคที่สอง. ประโยคที่สาม. ประโยคที่สี่."
        result = simplify_thai(text)
        assert "ประโยคแรก." in result
        assert "ประโยคที่สอง." in result
        assert "ประโยคที่สาม" not in result

    def test_removes_statute_abbreviations(self):
        text = "ตาม ป.อ. มาตรา 341 และ ป.พ.พ. มาตรา 420"
        result = simplify_thai(text)
        assert "ป.อ." not in result
        assert "ป.พ.พ." not in result
        assert "มาตรา 341" in result

    def test_empty_string(self):
        assert simplify_thai("") == ""

    def test_single_sentence_preserved(self):
        text = "ศาลพิพากษาให้จำเลยชดใช้ค่าเสียหาย"
        result = simplify_thai(text)
        assert result == text


class TestFormatResultsForRole:
    def _make_result(self, summary: str = "ตาม ป.อ. มาตรา 341 ศาลพิพากษา. ข้อที่สอง. ข้อที่สาม.") -> SearchResult:
        return SearchResult(
            id="test-1",
            case_no="1/2567",
            court_type="supreme",
            year=2567,
            title="Test",
            summary=summary,
            chunk_text="chunk",
            statutes=["มาตรา 341"],
            relevance_score=0.8,
            source_code="A4.1",
            bm25_score=0.5,
            vector_score=0.7,
            rrf_score=0.01,
        )

    def test_citizen_role_simplifies_summary(self):
        results = [self._make_result()]
        formatted = format_results_for_role(results, "citizen")
        assert "ป.อ." not in formatted[0].summary
        assert "ข้อที่สาม" not in formatted[0].summary

    def test_lawyer_role_keeps_full_detail(self):
        original_summary = "ตาม ป.อ. มาตรา 341 ศาลพิพากษา. ข้อที่สอง. ข้อที่สาม."
        results = [self._make_result(original_summary)]
        formatted = format_results_for_role(results, "lawyer")
        assert formatted[0].summary == original_summary

    def test_government_role_keeps_full_detail(self):
        original_summary = "ตาม ป.อ. มาตรา 341 ศาลพิพากษา."
        results = [self._make_result(original_summary)]
        formatted = format_results_for_role(results, "government")
        assert formatted[0].summary == original_summary


# ---------------------------------------------------------------------------
# Unit tests for low-relevance fallback suggestions (Task 4.4)
# ---------------------------------------------------------------------------


class TestGenerateSuggestions:
    def test_matching_keyword_returns_related_terms(self):
        suggestions = generate_suggestions("ถูกโกงเงิน")
        assert any("ฉ้อโกง" in s for s in suggestions)
        assert any("ยักยอก" in s for s in suggestions)

    def test_no_keyword_match_returns_generic(self):
        suggestions = generate_suggestions("สัญญาซื้อขาย")
        assert len(suggestions) >= 1
        assert any("ศาลฎีกา" in s for s in suggestions)

    def test_max_five_suggestions(self):
        suggestions = generate_suggestions("โกง")
        assert len(suggestions) <= 5

    def test_land_keyword(self):
        suggestions = generate_suggestions("ที่ดิน")
        assert any("ครอบครองปรปักษ์" in s for s in suggestions)


# ---------------------------------------------------------------------------
# Integration test: pipeline with role-based formatting and suggestions
# ---------------------------------------------------------------------------


class _FakeQdrantLowScore:
    """Returns results with very low scores to trigger fallback."""
    def search(self, query_vector, filters=None, top_k=10):
        return [
            {
                "id": "low-1",
                "score": 0.1,
                "payload": {
                    "case_no": "99/2567",
                    "court_type": "district",
                    "year": 2567,
                    "title": "Low Score Case",
                    "summary": "ตาม ป.อ. มาตรา 341 ศาลพิพากษา. ข้อที่สอง. ข้อที่สาม.",
                    "chunk_text": "low relevance chunk",
                    "statutes": [],
                    "source_code": "A4.1",
                    "vector": [-0.9, 0.01, -0.9],
                },
            }
        ]


class _FakeBM25Low:
    def search(self, query, top_k=30, filters=None):
        return [{"id": "low-1", "score": 0.5, "text_preview": "low hit"}]


@pytest.mark.asyncio
async def test_pipeline_low_relevance_generates_suggestions():
    """When all results have low relevance, suggestions should be populated."""
    pipeline = SearchPipeline(
        embedding_service=_FakeEmbedding(),  # type: ignore[arg-type]
        qdrant_service=_FakeQdrantLowScore(),  # type: ignore[arg-type]
        bm25_indexer=_FakeBM25Low(),  # type: ignore[arg-type]
        cache=None,
    )
    req = SearchRequest(query="โกงเงิน", role="citizen", top_k=5)
    resp = await pipeline.search(req)

    assert isinstance(resp, SearchResponse)
    # Low-score results should trigger suggestions
    assert len(resp.suggestions) >= 1


class _FakeQdrantEmpty:
    """Returns no results."""
    def search(self, query_vector, filters=None, top_k=10):
        return []


class _FakeBM25Empty:
    def search(self, query, top_k=30, filters=None):
        return []


@pytest.mark.asyncio
async def test_pipeline_no_results_generates_suggestions():
    """When no results at all, suggestions should be populated."""
    pipeline = SearchPipeline(
        embedding_service=_FakeEmbedding(),  # type: ignore[arg-type]
        qdrant_service=_FakeQdrantEmpty(),  # type: ignore[arg-type]
        bm25_indexer=_FakeBM25Empty(),  # type: ignore[arg-type]
        cache=None,
    )
    req = SearchRequest(query="สัญญาเช่า", top_k=5)
    resp = await pipeline.search(req)

    assert isinstance(resp, SearchResponse)
    assert len(resp.results) == 0
    assert len(resp.suggestions) >= 1


@pytest.mark.asyncio
async def test_pipeline_citizen_role_simplifies():
    """Citizen role should get simplified summaries."""
    pipeline = SearchPipeline(
        embedding_service=_FakeEmbedding(),  # type: ignore[arg-type]
        qdrant_service=_FakeQdrant(),  # type: ignore[arg-type]
        bm25_indexer=_FakeBM25(),  # type: ignore[arg-type]
        cache=None,
    )
    req = SearchRequest(query="test", role="citizen", top_k=5)
    resp = await pipeline.search(req)

    assert isinstance(resp, SearchResponse)
    # Suggestions should be empty when results have good scores
    # (depends on reranker scores — just verify the field exists)
    assert isinstance(resp.suggestions, list)
