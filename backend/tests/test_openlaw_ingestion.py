"""Tests for OpenLaw ingestion service contract alignment."""

from __future__ import annotations

import pytest

from app.services.openlaw_ingestion import OpenLawIngestionService
from app.services.thai_chunker import Chunk


class _FakeClient:
    def search_judgments(self, query: str, limit: int):
        return [
            {
                "judgment_id": "openlaw-1",
                "title": "คดีทดสอบ",
                "content": "นายสมชายฟ้องคดีตัวอย่าง",
                "court_type": "supreme",
                "year": 2568,
                "province": "กรุงเทพมหานคร",
                "statutes": ["มาตรา 341"],
                "citation": "ฎ.1234/2568",
                "case_no": "ฎ.1234/2568",
            }
        ]

    def normalize_document(self, doc):
        return doc


class _FakeChunker:
    def chunk(self, text: str):
        return [
            Chunk(text=text, token_count=4, chunk_index=0, start_char=0, end_char=len(text)),
            Chunk(text=f"{text} เพิ่มเติม", token_count=6, chunk_index=1, start_char=0, end_char=len(text) + 10),
        ]


class _FakeEmbeddingService:
    def embed_batch(self, texts):
        return [[0.1, 0.2, 0.3] for _ in texts]


class _FakeQdrant:
    def __init__(self):
        self.collection_ensured = False
        self.points = []

    def ensure_collection(self):
        self.collection_ensured = True

    def upsert_chunks(self, chunks):
        self.points = chunks


class _FakeBM25:
    def __init__(self):
        self.index_ensured = False
        self.documents = []

    def ensure_index(self):
        self.index_ensured = True

    def add_documents(self, documents):
        self.documents = documents
        return len(documents)


@pytest.mark.asyncio
async def test_openlaw_ingest_uses_batch_storage_contracts():
    qdrant = _FakeQdrant()
    bm25 = _FakeBM25()
    svc = OpenLawIngestionService(
        openlaw_client=_FakeClient(),
        qdrant_service=qdrant,
        bm25_indexer=bm25,
        chunker=_FakeChunker(),
        embedding_service=_FakeEmbeddingService(),
    )

    result = await svc.ingest(query="ฉ้อโกง", limit=1)

    assert result.fetched_documents == 1
    assert result.ingested_chunks == 2
    assert qdrant.collection_ensured is True
    assert bm25.index_ensured is True
    assert len(qdrant.points) == 2
    assert len(bm25.documents) == 2
    assert all("payload" in point for point in qdrant.points)
    assert all("text" in document for document in bm25.documents)
