"""Unit tests for the BM25 indexer service."""

from app.services.bm25_indexer import BM25Indexer, BM25Settings, _InMemoryBM25, _thai_tokenize


def _make_indexer() -> BM25Indexer:
    """Create an in-memory BM25Indexer for testing."""
    # Force in-memory backend by directly injecting it
    indexer = BM25Indexer.__new__(BM25Indexer)
    indexer._settings = BM25Settings()
    indexer._backend = _InMemoryBM25()
    return indexer


def _sample_docs() -> list[dict]:
    return [
        {
            "id": "doc1",
            "text": "คดีฉ้อโกง ตามประมวลกฎหมายอาญา มาตรา 341",
            "source_code": "A4.1",
            "court_type": "supreme",
            "year": 2568,
        },
        {
            "id": "doc2",
            "text": "คดีผู้บริโภค สัญญาซื้อขาย สินค้าชำรุดบกพร่อง",
            "source_code": "A4.2",
            "court_type": "appeal",
            "year": 2567,
        },
        {
            "id": "doc3",
            "text": "คดีปกครอง ฟ้องหน่วยงานรัฐ มาตรา 9",
            "source_code": "B5.1",
            "court_type": "admin",
            "year": 2568,
        },
    ]


class TestBM25IndexerBasic:
    def test_empty_index_doc_count(self) -> None:
        indexer = _make_indexer()
        assert indexer.get_doc_count() == 0

    def test_add_documents_returns_count(self) -> None:
        indexer = _make_indexer()
        count = indexer.add_documents(_sample_docs())
        assert count == 3
        assert indexer.get_doc_count() == 3

    def test_search_empty_query_returns_empty(self) -> None:
        indexer = _make_indexer()
        indexer.add_documents(_sample_docs())
        assert indexer.search("") == []
        assert indexer.search("   ") == []

    def test_search_returns_results_sorted_by_score(self) -> None:
        indexer = _make_indexer()
        indexer.add_documents(_sample_docs())
        results = indexer.search("คดีฉ้อโกง มาตรา 341")
        assert len(results) > 0
        # Results should be sorted descending by score
        scores = [r["score"] for r in results]
        assert scores == sorted(scores, reverse=True)
        # Top result should be doc1 (best match)
        assert results[0]["id"] == "doc1"

    def test_search_result_structure(self) -> None:
        indexer = _make_indexer()
        indexer.add_documents(_sample_docs())
        results = indexer.search("คดี")
        assert len(results) > 0
        for r in results:
            assert "id" in r
            assert "score" in r
            assert "text_preview" in r

    def test_search_with_top_k(self) -> None:
        indexer = _make_indexer()
        indexer.add_documents(_sample_docs())
        results = indexer.search("คดี", top_k=1)
        assert len(results) == 1


class TestBM25IndexerFilters:
    def test_filter_by_source_code(self) -> None:
        indexer = _make_indexer()
        indexer.add_documents(_sample_docs())
        results = indexer.search("คดี", filters={"source_code": "B5.1"})
        assert all(r["id"] == "doc3" for r in results)

    def test_filter_by_court_type(self) -> None:
        indexer = _make_indexer()
        indexer.add_documents(_sample_docs())
        results = indexer.search("คดี", filters={"court_type": "supreme"})
        assert all(r["id"] == "doc1" for r in results)


class TestBM25IndexerDeleteAndCount:
    def test_delete_by_source(self) -> None:
        indexer = _make_indexer()
        indexer.add_documents(_sample_docs())
        assert indexer.get_doc_count() == 3
        deleted = indexer.delete_by_source("A4.1")
        assert deleted == 1
        assert indexer.get_doc_count() == 2

    def test_delete_nonexistent_source(self) -> None:
        indexer = _make_indexer()
        indexer.add_documents(_sample_docs())
        deleted = indexer.delete_by_source("NONEXISTENT")
        assert deleted == 0
        assert indexer.get_doc_count() == 3

    def test_search_after_delete(self) -> None:
        indexer = _make_indexer()
        indexer.add_documents(_sample_docs())
        indexer.delete_by_source("A4.1")
        results = indexer.search("ฉ้อโกง มาตรา 341")
        # doc1 was deleted, should not appear
        assert all(r["id"] != "doc1" for r in results)


class TestBM25IndexerEnsureIndex:
    def test_ensure_index_no_error(self) -> None:
        indexer = _make_indexer()
        # In-memory backend — ensure_index is a no-op
        indexer.ensure_index()

    def test_add_empty_list(self) -> None:
        indexer = _make_indexer()
        count = indexer.add_documents([])
        assert count == 0
        assert indexer.get_doc_count() == 0


class TestBM25IndexerEdgeCases:
    def test_search_on_empty_index(self) -> None:
        indexer = _make_indexer()
        results = indexer.search("test query")
        assert results == []

    def test_document_with_none_optional_fields(self) -> None:
        indexer = _make_indexer()
        docs = [
            {
                "id": "doc_none",
                "text": "เอกสารทดสอบ",
                "source_code": "A1.1",
                "court_type": None,
                "year": None,
            }
        ]
        count = indexer.add_documents(docs)
        assert count == 1
        assert indexer.get_doc_count() == 1

    def test_text_preview_truncated(self) -> None:
        indexer = _make_indexer()
        long_text = "ทดสอบ " * 500  # very long text
        docs = [{"id": "long", "text": long_text, "source_code": "A1.1", "court_type": None, "year": None}]
        indexer.add_documents(docs)
        results = indexer.search("ทดสอบ")
        assert len(results) == 1
        assert len(results[0]["text_preview"]) <= 200

    def test_thai_tokenize_falls_back_when_primary_engines_fail(self, monkeypatch) -> None:
        import pythainlp.tokenize

        original = pythainlp.tokenize.word_tokenize

        def fake_word_tokenize(text: str, **kwargs):
            engine = kwargs.get("engine")
            if engine in {"newmm", "longest"}:
                raise ModuleNotFoundError("No module named 'pycrfsuite'")
            return original(text, **kwargs)

        monkeypatch.setattr(pythainlp.tokenize, "word_tokenize", fake_word_tokenize)

        tokenized = _thai_tokenize("นายสมชายฟ้องคดีฉ้อโกงมาตรา341")
        assert "มาตรา" in tokenized
        assert "341" in tokenized
