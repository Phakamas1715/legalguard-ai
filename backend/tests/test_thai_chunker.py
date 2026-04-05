"""Tests for the Thai-aware text chunking module."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from app.services.thai_chunker import Chunk, ThaiChunker


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def chunker() -> ThaiChunker:
    return ThaiChunker(max_tokens=512, overlap_tokens=64)


@pytest.fixture
def small_chunker() -> ThaiChunker:
    """Chunker with small limits for easier testing."""
    return ThaiChunker(max_tokens=10, overlap_tokens=3)


# ---------------------------------------------------------------------------
# Chunk model tests
# ---------------------------------------------------------------------------


class TestChunkModel:
    def test_fields(self):
        c = Chunk(text="hello", token_count=1, chunk_index=0, start_char=0, end_char=5)
        assert c.text == "hello"
        assert c.token_count == 1
        assert c.chunk_index == 0
        assert c.start_char == 0
        assert c.end_char == 5


# ---------------------------------------------------------------------------
# Edge cases — empty / whitespace
# ---------------------------------------------------------------------------


class TestEmptyInput:
    def test_empty_string(self, chunker: ThaiChunker):
        assert chunker.chunk("") == []

    def test_whitespace_only(self, chunker: ThaiChunker):
        assert chunker.chunk("   ") == []

    def test_none_like_empty(self, chunker: ThaiChunker):
        # Passing empty string explicitly
        assert chunker.chunk("") == []


# ---------------------------------------------------------------------------
# Single sentence / short text
# ---------------------------------------------------------------------------


class TestSingleSentence:
    @patch("app.services.thai_chunker.sent_tokenize", return_value=["สวัสดีครับ"])
    @patch("app.services.thai_chunker.word_tokenize", return_value=["สวัสดี", "ครับ"])
    def test_single_sentence_returns_one_chunk(self, _wt, _st, chunker: ThaiChunker):
        result = chunker.chunk("สวัสดีครับ")
        assert len(result) == 1
        assert result[0].text == "สวัสดีครับ"
        assert result[0].token_count == 2
        assert result[0].chunk_index == 0

    @patch("app.services.thai_chunker.sent_tokenize", return_value=["A very long sentence."])
    @patch("app.services.thai_chunker.word_tokenize", return_value=["tok"] * 600)
    def test_single_sentence_exceeding_max_tokens_still_returned(self, _wt, _st):
        """A single sentence longer than max_tokens is returned as-is (don't split mid-sentence)."""
        chunker = ThaiChunker(max_tokens=512, overlap_tokens=64)
        result = chunker.chunk("A very long sentence.")
        assert len(result) == 1
        assert result[0].token_count == 600


# ---------------------------------------------------------------------------
# Multiple chunks with overlap
# ---------------------------------------------------------------------------


class TestMultipleChunks:
    def test_chunks_respect_max_tokens(self, small_chunker: ThaiChunker):
        """With max_tokens=10, sentences that exceed the limit produce multiple chunks."""
        text = "ประโยคที่หนึ่ง ประโยคที่สอง ประโยคที่สาม"
        sentences = ["ประโยคที่หนึ่ง ", "ประโยคที่สอง ", "ประโยคที่สาม"]
        # Each sentence has 6 tokens → first sentence fits (6 ≤ 10),
        # second would overflow (6+6=12 > 10) → emit chunk, overlap, continue.
        word_counts = {
            "ประโยคที่หนึ่ง ": ["ประโยค", "ที่", "หนึ่ง", " ", "x1", "x2"],
            "ประโยคที่สอง ": ["ประโยค", "ที่", "สอง", " ", "y1", "y2"],
            "ประโยคที่สาม": ["ประโยค", "ที่", "สาม", "z1", "z2", "z3"],
        }

        with (
            patch("app.services.thai_chunker.sent_tokenize", return_value=sentences),
            patch(
                "app.services.thai_chunker.word_tokenize",
                side_effect=lambda s: word_counts.get(s, list(s)),
            ),
        ):
            result = small_chunker.chunk(text)
            assert len(result) >= 2
            # All chunk indices are sequential
            for i, c in enumerate(result):
                assert c.chunk_index == i

    def test_chunk_indices_are_sequential(self, chunker: ThaiChunker):
        """Chunk indices should be 0, 1, 2, ..."""
        sentences = [f"Sentence {i}. " for i in range(20)]
        # Each sentence → 3 tokens; 20 sentences → 60 tokens total, fits in one chunk at 512
        with (
            patch("app.services.thai_chunker.sent_tokenize", return_value=sentences),
            patch("app.services.thai_chunker.word_tokenize", return_value=["a", "b", "c"]),
        ):
            result = chunker.chunk("".join(sentences))
            for i, c in enumerate(result):
                assert c.chunk_index == i


# ---------------------------------------------------------------------------
# Character offsets
# ---------------------------------------------------------------------------


class TestCharacterOffsets:
    @patch("app.services.thai_chunker.sent_tokenize", return_value=["Hello world."])
    @patch("app.services.thai_chunker.word_tokenize", return_value=["Hello", " ", "world", "."])
    def test_start_end_char_match_text(self, _wt, _st, chunker: ThaiChunker):
        text = "Hello world."
        result = chunker.chunk(text)
        assert len(result) == 1
        c = result[0]
        assert text[c.start_char : c.end_char] == c.text


# ---------------------------------------------------------------------------
# Mixed content (Thai + English)
# ---------------------------------------------------------------------------


class TestMixedContent:
    @patch(
        "app.services.thai_chunker.sent_tokenize",
        return_value=["This is English. ", "นี่คือภาษาไทย"],
    )
    @patch("app.services.thai_chunker.word_tokenize", return_value=["tok1", "tok2", "tok3"])
    def test_mixed_thai_english(self, _wt, _st, chunker: ThaiChunker):
        text = "This is English. นี่คือภาษาไทย"
        result = chunker.chunk(text)
        assert len(result) >= 1
        # All text should be covered
        combined = "".join(c.text for c in result)
        # Due to overlap, combined may be longer, but first chunk should start from beginning
        assert result[0].start_char == 0


# ---------------------------------------------------------------------------
# Overlap behaviour
# ---------------------------------------------------------------------------


class TestOverlap:
    def test_overlap_sentences_appear_in_next_chunk(self):
        """When chunks split, the overlap sentences should appear at the start of the next chunk."""
        chunker = ThaiChunker(max_tokens=6, overlap_tokens=3)
        sentences = ["AB", "CD", "EF", "GH"]
        # Each sentence → 3 tokens. max=6 means 2 sentences per chunk.
        # overlap=3 means last sentence carries over.
        word_map = {
            "AB": ["a", "b", "c"],
            "CD": ["d", "e", "f"],
            "EF": ["g", "h", "i"],
            "GH": ["j", "k", "l"],
        }
        text = "ABCDEFGH"

        with (
            patch("app.services.thai_chunker.sent_tokenize", return_value=sentences),
            patch(
                "app.services.thai_chunker.word_tokenize",
                side_effect=lambda s: word_map.get(s, list(s)),
            ),
        ):
            result = chunker.chunk(text)
            assert len(result) >= 2
            # Second chunk should start with the overlap sentence from first chunk
            # The last sentence of chunk 0 ("CD") should appear at start of chunk 1
            assert "CD" in result[1].text


# ---------------------------------------------------------------------------
# ThaiChunker defaults
# ---------------------------------------------------------------------------


class TestDefaults:
    def test_default_params(self):
        c = ThaiChunker()
        assert c.max_tokens == 512
        assert c.overlap_tokens == 64

    def test_custom_params(self):
        c = ThaiChunker(max_tokens=256, overlap_tokens=32)
        assert c.max_tokens == 256
        assert c.overlap_tokens == 32
