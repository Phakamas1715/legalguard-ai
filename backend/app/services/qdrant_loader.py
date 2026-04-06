"""Qdrant vector database helper service for LegalGuard AI."""
from __future__ import annotations

from __future__ import annotations

import logging
from uuid import uuid4

from pydantic_settings import BaseSettings, SettingsConfigDict
from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PayloadSchemaType,
    PointStruct,
    Range,
    VectorParams,
)

logger = logging.getLogger(__name__)

COLLECTION_NAME = "legalguard_chunks"
VECTOR_SIZE = 1536  # OpenAI text-embedding-3-small


class QdrantSettings(BaseSettings):
    """Qdrant connection settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_prefix="", env_file=".env", extra="ignore")

    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""


class QdrantService:
    """Helper service for Qdrant upsert / search / delete operations."""

    def __init__(self, settings: Optional[QdrantSettings] = None) -> None:
        self._settings = settings or QdrantSettings()
        api_key = self._settings.qdrant_api_key or None
        self._client = QdrantClient(
            url=self._settings.qdrant_url,
            api_key=api_key,
        )

    # -- Collection management ------------------------------------------------

    def ensure_collection(self) -> None:
        """Create the collection if it does not already exist, with payload indexes."""
        try:
            self._client.get_collection(COLLECTION_NAME)
            logger.info("Qdrant collection '%s' already exists.", COLLECTION_NAME)
            return
        except (UnexpectedResponse, Exception):
            pass

        self._client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=VECTOR_SIZE,
                distance=Distance.COSINE,
            ),
        )
        logger.info("Created Qdrant collection '%s'.", COLLECTION_NAME)

        # Create payload indexes for filterable fields
        for field, schema in [
            ("source_code", PayloadSchemaType.KEYWORD),
            ("document_type", PayloadSchemaType.KEYWORD),
            ("court_type", PayloadSchemaType.KEYWORD),
            ("year", PayloadSchemaType.INTEGER),
        ]:
            self._client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name=field,
                field_schema=schema,
            )
        logger.info("Payload indexes created for collection '%s'.", COLLECTION_NAME)

    # -- Upsert ---------------------------------------------------------------

    def upsert_chunks(self, chunks: list[dict]) -> None:
        """Upsert a batch of vectors with payload into the collection.

        Each item in *chunks* must contain:
          - ``vector``: list[float] of length VECTOR_SIZE
          - ``payload``: dict with fields matching the Qdrant payload schema
          - ``id`` (optional): str UUID — generated if absent
        """
        points = [
            PointStruct(
                id=chunk.get("id", str(uuid4())),
                vector=chunk["vector"],
                payload=chunk["payload"],
            )
            for chunk in chunks
        ]
        self._client.upsert(collection_name=COLLECTION_NAME, points=points)
        logger.info("Upserted %d points into '%s'.", len(points), COLLECTION_NAME)

    # -- Search ---------------------------------------------------------------

    def search(
        self,
        query_vector: list[float],
        filters: Optional[dict] = None,
        top_k: int = 10,
    ) -> list[dict]:
        """Perform a vector similarity search with optional payload filters.

        Supported filter keys (all optional):
          - ``source_code``: str — exact match
          - ``document_type``: str — exact match
          - ``court_type``: str — exact match
          - ``year_from``: int — range >=
          - ``year_to``: int — range <=
        """
        qdrant_filter = self._build_filter(filters) if filters else None

        results = self._client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            query_filter=qdrant_filter,
            limit=top_k,
            with_payload=True,
        )

        return [
            {
                "id": str(hit.id),
                "score": hit.score,
                "payload": hit.payload,
            }
            for hit in results
        ]

    # -- Delete ---------------------------------------------------------------

    def delete_by_source(self, source_code: str) -> None:
        """Delete all points matching a given *source_code*."""
        self._client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=Filter(
                must=[FieldCondition(key="source_code", match=MatchValue(value=source_code))]
            ),
        )
        logger.info(
            "Deleted points with source_code='%s' from '%s'.",
            source_code,
            COLLECTION_NAME,
        )

    # -- Internal helpers -----------------------------------------------------

    @staticmethod
    def _build_filter(filters: dict) -> Filter:
        """Translate a plain dict of filter params into a Qdrant Filter."""
        conditions: list[FieldCondition] = []

        for key in ("source_code", "document_type", "court_type"):
            if key in filters:
                conditions.append(
                    FieldCondition(key=key, match=MatchValue(value=filters[key]))
                )

        year_range: dict = {}
        if "year_from" in filters:
            year_range["gte"] = filters["year_from"]
        if "year_to" in filters:
            year_range["lte"] = filters["year_to"]
        if year_range:
            conditions.append(FieldCondition(key="year", range=Range(**year_range)))

        return Filter(must=conditions) if conditions else Filter()
