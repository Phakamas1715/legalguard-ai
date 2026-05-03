"""Ingest real court judgments into LegalGuard Knowledge Base.

Usage:
    python3 scripts/ingest_court_judgments.py

Reads structured JSON from data/court_judgments_sample.json and feeds
each judgment through the ingestion pipeline (chunking → PII masking →
embedding → Qdrant + BM25 index).
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from pathlib import Path

# Set working dir to backend so .env is loaded correctly
_backend_dir = str(Path(__file__).resolve().parent.parent / "backend")
os.chdir(_backend_dir)
sys.path.insert(0, _backend_dir)

from app.services.thai_chunker import ThaiChunker
from app.services.embedding_service import EmbeddingService
from app.services.bm25_indexer import BM25Indexer
from app.services.qdrant_loader import QdrantService
from app.services.pii_masking import mask_pii

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "court_judgments_sample.json"


def build_full_text(j: dict) -> str:
    """Build searchable full text from structured judgment data."""
    parts = [
        f"คำพิพากษา {j.get('court', '')}",
        f"คดีหมายเลขดำที่ {j.get('case_no_black', '')}",
        f"คดีหมายเลขแดงที่ {j.get('case_no_red', '')}",
        f"วันที่ {j.get('date', '')}",
        f"ความ{j.get('case_type', 'แพ่ง')}",
        f"เรื่อง {j.get('subject', '')}",
        f"โจทก์: {j.get('plaintiff', '')}",
        f"จำเลย: {j.get('defendant', '')}",
        "",
        f"ข้อเท็จจริง: {j.get('facts', '')}",
        "",
        f"ประเด็น: {j.get('issue', '')}",
        "",
        f"คำพิพากษา: {j.get('ruling', '')}",
    ]
    if j.get("statutes"):
        parts.append(f"\nมาตราที่เกี่ยวข้อง: {', '.join(j['statutes'])}")
    if j.get("judges"):
        parts.append(f"\nผู้พิพากษา: {', '.join(j['judges'])}")
    return "\n".join(parts)


async def main():
    logger.info("Loading judgments from %s", DATA_PATH)
    with open(DATA_PATH, encoding="utf-8") as f:
        judgments = json.load(f)

    logger.info("Found %d judgments to ingest", len(judgments))

    chunker = ThaiChunker()
    embedding_service = EmbeddingService()
    bm25_indexer = BM25Indexer()
    qdrant_service = QdrantService()

    # Ensure Qdrant collection exists before upserting
    qdrant_service.ensure_collection()
    bm25_indexer.ensure_index()

    total_chunks = 0

    for j in judgments:
        case_id = j.get("case_no_black", j.get("id", "unknown"))
        logger.info("Processing: %s — %s", case_id, j.get("subject", ""))

        # 1. Build full text
        full_text = build_full_text(j)

        # 2. PII masking
        masked_text, _, pii_count = mask_pii(full_text)
        if pii_count > 0:
            logger.info("  Masked %d PII items", pii_count)

        # 3. Chunk
        chunks = chunker.chunk(masked_text)
        logger.info("  Created %d chunks", len(chunks))

        # 4. Embed
        chunk_texts = [c.text for c in chunks]
        embeddings = embedding_service.embed_batch(chunk_texts)

        # 5. Build records
        import uuid
        kb_id = str(uuid.uuid4())
        qdrant_points = []
        bm25_docs = []

        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            chunk_id = str(uuid.uuid4())
            payload = {
                "chunk_id": chunk_id,
                "knowledge_base_id": kb_id,
                "source_code": j.get("source_code", "A4.1"),
                "document_type": j.get("document_type", "judgment"),
                "case_no": j.get("case_no_black", ""),
                "court_type": j.get("court_type", "district"),
                "year": j.get("year", 0),
                "statutes": j.get("statutes", []),
                "chunk_index": i,
                "chunk_text": chunk.text,
                "title": f"{j.get('subject', '')} — {j.get('court', '')}",
                "summary": j.get("ruling", "")[:200],
            }
            qdrant_points.append({
                "id": chunk_id,
                "vector": embedding,
                "payload": payload,
            })
            bm25_docs.append({
                "id": chunk_id,
                "text": chunk.text,
                "source_code": j.get("source_code", "A4.1"),
                "court_type": j.get("court_type", "district"),
                "year": j.get("year", 0),
            })

        # 6. Upsert
        qdrant_service.upsert_chunks(qdrant_points)
        bm25_indexer.add_documents(bm25_docs)

        total_chunks += len(chunks)
        logger.info("  ✅ Ingested %s → %d chunks (kb=%s)", case_id, len(chunks), kb_id)

    logger.info("=" * 60)
    logger.info("Ingestion complete: %d judgments → %d total chunks", len(judgments), total_chunks)


if __name__ == "__main__":
    asyncio.run(main())
