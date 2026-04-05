"""BM25 keyword search indexer for LegalGuard AI.

Uses Tantivy (Rust-based) for high-performance BM25 indexing when available,
with an in-memory Python fallback using collections.Counter-based TF-IDF
approximation for environments where tantivy is not installed.

Thai text is pre-tokenized with PyThaiNLP ``word_tokenize`` and joined with
spaces so that Tantivy's default whitespace tokenizer handles Thai correctly.
"""

from __future__ import annotations

import logging
import math
import shutil
from collections import Counter
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# PyThaiNLP tokenization helper
# ---------------------------------------------------------------------------

def _thai_tokenize(text: str) -> str:
    """Tokenize Thai text with PyThaiNLP and return space-separated tokens."""
    from pythainlp.tokenize import word_tokenize

    tokens = word_tokenize(text)
    return " ".join(tokens)


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

class BM25Settings(BaseSettings):
    """Configuration for the BM25 index."""

    model_config = SettingsConfigDict(env_prefix="", env_file=".env", extra="ignore")

    bm25_index_path: str = "./bm25_index"


# ---------------------------------------------------------------------------
# Try importing tantivy
# ---------------------------------------------------------------------------

try:
    import tantivy  # type: ignore[import-untyped]

    _HAS_TANTIVY = True
except ImportError:
    _HAS_TANTIVY = False
    logger.info("tantivy not available — using in-memory BM25 fallback.")


# ---------------------------------------------------------------------------
# In-memory BM25 fallback
# ---------------------------------------------------------------------------

class _InMemoryBM25:
    """Simple in-memory BM25 approximation using TF-IDF with Counter."""

    def __init__(self) -> None:
        self._docs: dict[str, dict] = {}  # id -> full doc dict
        self._token_counts: dict[str, Counter[str]] = {}  # id -> token counter
        self._df: Counter[str] = Counter()  # document frequency per term

    # -- index management ---------------------------------------------------

    def add_documents(self, documents: list[dict]) -> int:
        added = 0
        for doc in documents:
            doc_id = doc["id"]
            tokenized = _thai_tokenize(doc.get("text", ""))
            tokens = tokenized.split()
            tf = Counter(tokens)

            # Update DF for new terms (remove old counts if replacing)
            if doc_id in self._token_counts:
                for term in self._token_counts[doc_id]:
                    self._df[term] -= 1
            for term in tf:
                self._df[term] += 1

            self._docs[doc_id] = doc
            self._token_counts[doc_id] = tf
            added += 1
        return added

    def search(self, query: str, top_k: int = 30, filters: dict | None = None) -> list[dict]:
        if not query or not query.strip():
            return []

        tokenized = _thai_tokenize(query)
        query_tokens = tokenized.split()
        if not query_tokens:
            return []

        n = len(self._docs)
        if n == 0:
            return []

        scores: list[tuple[str, float]] = []
        k1, b = 1.5, 0.75
        avg_dl = sum(sum(tc.values()) for tc in self._token_counts.values()) / n if n else 1

        for doc_id, tf in self._token_counts.items():
            doc = self._docs[doc_id]
            if not self._matches_filters(doc, filters):
                continue
            dl = sum(tf.values())
            score = 0.0
            for term in query_tokens:
                if term not in tf:
                    continue
                df = self._df.get(term, 0)
                idf = math.log((n - df + 0.5) / (df + 0.5) + 1)
                tf_val = tf[term]
                score += idf * (tf_val * (k1 + 1)) / (tf_val + k1 * (1 - b + b * dl / avg_dl))
            if score > 0:
                scores.append((doc_id, score))

        scores.sort(key=lambda x: x[1], reverse=True)
        results = []
        for doc_id, score in scores[:top_k]:
            doc = self._docs[doc_id]
            text = doc.get("text", "")
            results.append({
                "id": doc_id,
                "score": score,
                "text_preview": text[:200],
            })
        return results

    def delete_by_source(self, source_code: str) -> int:
        to_delete = [
            did for did, doc in self._docs.items()
            if doc.get("source_code") == source_code
        ]
        for did in to_delete:
            for term in self._token_counts[did]:
                self._df[term] -= 1
            del self._token_counts[did]
            del self._docs[did]
        return len(to_delete)

    def get_doc_count(self) -> int:
        return len(self._docs)

    # -- helpers ------------------------------------------------------------

    @staticmethod
    def _matches_filters(doc: dict, filters: dict | None) -> bool:
        if not filters:
            return True
        for key, value in filters.items():
            if value is not None and doc.get(key) != value:
                return False
        return True


# ---------------------------------------------------------------------------
# Tantivy-backed BM25 index
# ---------------------------------------------------------------------------

class _TantivyBM25:
    """BM25 index backed by Tantivy."""

    def __init__(self, index_path: str) -> None:
        self._index_path = Path(index_path)
        self._index: tantivy.Index | None = None  # type: ignore[name-defined]
        self._schema: tantivy.Schema | None = None  # type: ignore[name-defined]

    def ensure_index(self) -> None:
        self._index_path.mkdir(parents=True, exist_ok=True)
        schema_builder = tantivy.SchemaBuilder()  # type: ignore[name-defined]
        schema_builder.add_text_field("id", stored=True, tokenizer_name="raw")
        schema_builder.add_text_field("text", stored=True)
        schema_builder.add_text_field("source_code", stored=True, tokenizer_name="raw")
        schema_builder.add_text_field("court_type", stored=True, tokenizer_name="raw")
        schema_builder.add_integer_field("year", stored=True, indexed=True)
        self._schema = schema_builder.build()

        try:
            self._index = tantivy.Index(self._schema, path=str(self._index_path))  # type: ignore[name-defined]
        except Exception:
            logger.warning("Corrupted index at %s — recreating.", self._index_path)
            shutil.rmtree(self._index_path, ignore_errors=True)
            self._index_path.mkdir(parents=True, exist_ok=True)
            self._index = tantivy.Index(self._schema, path=str(self._index_path))  # type: ignore[name-defined]

    def add_documents(self, documents: list[dict]) -> int:
        assert self._index is not None
        writer = self._index.writer()
        added = 0
        for doc in documents:
            tokenized_text = _thai_tokenize(doc.get("text", ""))
            writer.add_document(tantivy.Document(  # type: ignore[name-defined]
                id=doc["id"],
                text=tokenized_text,
                source_code=doc.get("source_code", ""),
                court_type=doc.get("court_type", "") or "",
                year=doc.get("year", 0) or 0,
            ))
            added += 1
        writer.commit()
        self._index.reload()
        return added

    def search(self, query: str, top_k: int = 30, filters: dict | None = None) -> list[dict]:
        if not query or not query.strip():
            return []
        assert self._index is not None

        tokenized_query = _thai_tokenize(query)
        searcher = self._index.searcher()
        parsed_query = self._index.parse_query(tokenized_query, ["text"])
        results = searcher.search(parsed_query, limit=top_k).hits

        out: list[dict] = []
        for score, doc_addr in results:
            doc = searcher.doc(doc_addr)
            # Apply filters client-side for simplicity
            if filters:
                if filters.get("source_code") and doc.get("source_code") != [filters["source_code"]]:
                    continue
                if filters.get("court_type") and doc.get("court_type") != [filters["court_type"]]:
                    continue
            text_val = doc.get("text", [""])[0] if isinstance(doc.get("text"), list) else doc.get("text", "")
            id_val = doc.get("id", [""])[0] if isinstance(doc.get("id"), list) else doc.get("id", "")
            out.append({
                "id": id_val,
                "score": score,
                "text_preview": str(text_val)[:200],
            })
        return out

    def delete_by_source(self, source_code: str) -> int:
        assert self._index is not None
        writer = self._index.writer()
        # Tantivy delete by term
        count_before = self.get_doc_count()
        writer.delete_documents("source_code", source_code)
        writer.commit()
        self._index.reload()
        count_after = self.get_doc_count()
        return count_before - count_after

    def get_doc_count(self) -> int:
        assert self._index is not None
        searcher = self._index.searcher()
        return searcher.num_docs


# ---------------------------------------------------------------------------
# Public BM25Indexer — delegates to Tantivy or in-memory fallback
# ---------------------------------------------------------------------------

class BM25Indexer:
    """BM25 keyword search index with PyThaiNLP tokenization.

    Uses Tantivy when available, otherwise falls back to an in-memory
    Counter-based BM25 approximation.
    """

    def __init__(self, settings: BM25Settings | None = None) -> None:
        self._settings = settings or BM25Settings()
        if _HAS_TANTIVY:
            self._backend: _TantivyBM25 | _InMemoryBM25 = _TantivyBM25(
                self._settings.bm25_index_path,
            )
        else:
            self._backend = _InMemoryBM25()

    def ensure_index(self) -> None:
        """Create index directory and schema if not exists."""
        if isinstance(self._backend, _TantivyBM25):
            self._backend.ensure_index()
        # In-memory backend needs no setup.

    def add_documents(self, documents: list[dict]) -> int:
        """Add documents to the BM25 index. Return count added.

        Each document dict should have:
          - ``id``: str
          - ``text``: str
          - ``source_code``: str
          - ``court_type``: str | None
          - ``year``: int | None
        """
        return self._backend.add_documents(documents)

    def search(
        self,
        query: str,
        top_k: int = 30,
        filters: dict | None = None,
    ) -> list[dict]:
        """BM25 keyword search.

        Returns list of ``{id, score, text_preview}`` sorted by score desc.
        """
        return self._backend.search(query, top_k=top_k, filters=filters)

    def delete_by_source(self, source_code: str) -> int:
        """Delete all documents matching *source_code*. Return count deleted."""
        return self._backend.delete_by_source(source_code)

    def get_doc_count(self) -> int:
        """Return total document count in the index."""
        return self._backend.get_doc_count()
