"""Legal Knowledge Graph API endpoints."""
from __future__ import annotations

from __future__ import annotations

from typing import Optional
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.legal_graph import (
    GraphEdge,
    GraphNode,
    KnowledgeGraph,
    LegalGraphDB,
    text_to_graph,
)

router = APIRouter(prefix="/graph", tags=["knowledge-graph"])

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_GRAPH_PERSIST_PATH = _PROJECT_ROOT / "data" / "legal_graph.json"

# Shared graph instance backed by a persisted JSON snapshot for demo/runtime continuity.
_graph = LegalGraphDB(embedding_fn=None, persist_path=_GRAPH_PERSIST_PATH)


class TextToGraphRequest(BaseModel):
    text: str
    embed: bool = False  # skip embedding by default for speed


class SearchRequest(BaseModel):
    query: str
    threshold: float = 0.7
    limit: int = 5
    node_type: Optional[str] = None
    depth: int = 1


class InsertNodeRequest(BaseModel):
    label: str
    node_type: str = ""
    attributes: dict = Field(default_factory=dict)


class InsertEdgeRequest(BaseModel):
    source_id: str
    target_id: str
    label: str = ""
    attributes: dict = Field(default_factory=dict)


@router.post("/text-to-graph")
async def parse_text_to_graph(req: TextToGraphRequest):
    """Parse Thai legal text into a knowledge graph and insert it."""
    kg = _graph.insert_from_text(req.text, embed=req.embed)
    return {
        "nodes": [n.model_dump() for n in kg.nodes],
        "edges": [e.model_dump() for e in kg.edges],
        "stats": _graph.stats(),
    }


@router.post("/search")
async def search_graph(req: SearchRequest):
    """Search the knowledge graph by similarity and return subgraph."""
    kg = _graph.search_subgraph(
        req.query,
        threshold=req.threshold,
        limit=req.limit,
        depth=req.depth,
    )
    return {
        "nodes": [n.model_dump() for n in kg.nodes],
        "edges": [e.model_dump() for e in kg.edges],
        "context": _graph.to_context_string(kg),
    }


@router.post("/node")
async def add_node(req: InsertNodeRequest):
    """Add a single node to the graph."""
    node = GraphNode(label=req.label, node_type=req.node_type, attributes=req.attributes)
    _graph.add_node(node, embed=False)
    return node.model_dump()


@router.post("/edge")
async def add_edge(req: InsertEdgeRequest):
    """Add an edge between two nodes."""
    edge = GraphEdge(
        source_id=req.source_id,
        target_id=req.target_id,
        label=req.label,
        attributes=req.attributes,
    )
    _graph.add_edge(edge)
    return edge.model_dump()


@router.post("/merge")
async def merge_similar(threshold: float = 0.9):
    """Merge similar nodes (dedup by vector similarity)."""
    merged = _graph.merge_by_similarity(threshold=threshold)
    return {"merged_count": merged, "stats": _graph.stats()}


@router.get("/stats")
async def graph_stats():
    """Get graph statistics."""
    return _graph.stats()


@router.get("/export/networkx")
async def export_networkx():
    """Export graph as NetworkX-compatible JSON (node-link format)."""
    import networkx as nx
    G = _graph.to_networkx()
    from networkx.readwrite import json_graph
    data = json_graph.node_link_data(G)
    return data
