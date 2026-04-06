"""Thai-aware text chunking module for LegalGuard AI.

Uses PyThaiNLP sentence and word tokenization to split Thai legal documents
into overlapping chunks suitable for embedding and RAG retrieval.

Chunk size: 512 tokens max, 64 token overlap (configurable).
"""
from __future__ import annotations

import logging
import re

from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tokenizer with graceful fallback (pycrfsuite may not be available on 3.9)
# ---------------------------------------------------------------------------

def _sent_tokenize(text: str) -> list[str]:
    """Sentence tokenizer with fallback to newline/period splitting."""
    try:
        from pythainlp.tokenize import sent_tokenize
        return sent_tokenize(text, engine="whitespace+newline")
    except Exception:
        pass
    try:
        from pythainlp.tokenize import sent_tokenize
        return sent_tokenize(text, engine="whitespace")
    except Exception:
        pass
    # Fallback: split on newlines and Thai sentence-end patterns
    sentences = re.split(r"(?<=[ๆ།।\.\n])\s+|(?<=\n)\n+", text)
    return [s.strip() for s in sentences if s.strip()]


def _word_tokenize(text: str) -> list[str]:
    """Word tokenizer with fallback to whitespace splitting."""
    try:
        from pythainlp.tokenize import word_tokenize
        return word_tokenize(text, engine="newmm")
    except Exception:
        pass
    return text.split()

class Chunk(BaseModel):
    """A single text chunk with positional metadata."""

    text: str
    token_count: int
    chunk_index: int
    start_char: int  # character offset in original text
    end_char: int  # character offset (exclusive) in original text


class ThaiChunker:
    """Split Thai text into overlapping token-bounded chunks.

    Uses PyThaiNLP ``sent_tokenize`` for sentence segmentation and
    ``word_tokenize`` for token counting.
    """

    def __init__(self, max_tokens: int = 512, overlap_tokens: int = 64) -> None:
        self.max_tokens = max_tokens
        self.overlap_tokens = overlap_tokens

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def chunk(self, text: str) -> list[Chunk]:
        """Split *text* into overlapping chunks.

        Algorithm (from design pseudocode):
        1. Segment text into sentences via PyThaiNLP.
        2. Accumulate sentences until adding the next would exceed
           ``max_tokens``.
        3. Emit a chunk, then keep the last N tokens worth of sentences
           as overlap for the next chunk.
        4. Repeat until all sentences are consumed.
        """
        if not text or not text.strip():
            return []

        sentences = _sent_tokenize(text)
        if not sentences:
            return []

        # Pre-compute token counts for every sentence.
        sentence_tokens: list[int] = [
            len(_word_tokenize(s)) for s in sentences
        ]

        chunks: list[Chunk] = []
        current_sentences: list[str] = []
        current_token_counts: list[int] = []
        current_tokens = 0
        chunk_index = 0

        for sentence, tok_count in zip(sentences, sentence_tokens):
            # If adding this sentence would exceed the limit *and* we
            # already have content, emit the current chunk first.
            if current_tokens + tok_count > self.max_tokens and current_sentences:
                chunk_text = "".join(current_sentences)
                start_char = text.find(chunk_text)
                chunks.append(
                    Chunk(
                        text=chunk_text,
                        token_count=current_tokens,
                        chunk_index=chunk_index,
                        start_char=start_char,
                        end_char=start_char + len(chunk_text),
                    )
                )
                chunk_index += 1

                # Keep last N tokens worth of sentences as overlap.
                overlap_sents, overlap_counts = self._get_overlap(
                    current_sentences, current_token_counts
                )
                current_sentences = overlap_sents
                current_token_counts = overlap_counts
                current_tokens = sum(overlap_counts)

            current_sentences.append(sentence)
            current_token_counts.append(tok_count)
            current_tokens += tok_count

        # Emit the final chunk.
        if current_sentences:
            chunk_text = "".join(current_sentences)
            start_char = text.find(chunk_text)
            chunks.append(
                Chunk(
                    text=chunk_text,
                    token_count=current_tokens,
                    chunk_index=chunk_index,
                    start_char=start_char,
                    end_char=start_char + len(chunk_text),
                )
            )

        return chunks

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_overlap(
        self,
        sentences: list[str],
        token_counts: list[int],
    ) -> tuple[list[str], list[int]]:
        """Return the tail sentences whose total tokens ≤ ``overlap_tokens``."""
        overlap_sents: list[str] = []
        overlap_counts: list[int] = []
        accumulated = 0

        for sent, count in zip(reversed(sentences), reversed(token_counts)):
            if accumulated + count > self.overlap_tokens:
                break
            overlap_sents.insert(0, sent)
            overlap_counts.insert(0, count)
            accumulated += count

        return overlap_sents, overlap_counts
