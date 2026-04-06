"""Legal Knowledge Graph — Graph Memory for LangGraph Agents.

Inspired by personal-graph (https://github.com/Technoculture/personal-graph).
Provides:
- Graph Memory for LangGraph agents (store context as knowledge graph)
- Text → Graph conversion (Thai legal text → nodes + edges)
- Similarity-based dedup (merge similar nodes)
- NetworkX export for GNN analysis

Uses existing LegalGuard infrastructure: embeddings, PII masking, LLM.
"""
from __future__ import annotations

from __future__ import annotations

import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

import networkx as nx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class GraphNode(BaseModel):
    """A node in the legal knowledge graph."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str = ""
    node_type: str = ""  # person, statute, case, court, concept, event
    attributes: Dict[str, Any] = Field(default_factory=dict)
    embedding: List[float] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class GraphEdge(BaseModel):
    """An edge (relationship) in the legal knowledge graph."""
    source_id: str
    target_id: str
    label: str = ""  # ฟ้อง, อ้างอิง, เกี่ยวข้อง, ฐาน, etc.
    attributes: Dict[str, Any] = Field(default_factory=dict)
    weight: float = 1.0


class KnowledgeGraph(BaseModel):
    """A subgraph containing nodes and edges."""
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Thai Legal Text → Graph Parser
# ---------------------------------------------------------------------------

# Thai legal entity patterns for rule-based extraction
_STATUTE_KEYWORDS = [
    "มาตรา", "พ.ร.บ.", "ป.อ.", "ป.พ.พ.", "ป.วิ.อ.", "ป.วิ.พ.",
    "พ.ร.ก.", "พ.ร.ฎ.", "กฎกระทรวง", "ระเบียบ", "ประกาศ",
]

_CASE_PATTERNS = [
    "ฎ.", "ฎีกา", "คดี", "คำพิพากษา", "คำสั่ง",
]

_PERSON_PREFIXES = [
    "นาย", "นาง", "นางสาว", "น.ส.", "ด.ช.", "ด.ญ.",
    "โจทก์", "จำเลย", "ผู้เสียหาย", "ผู้ต้องหา", "พยาน",
    "ทนายโจทก์", "ทนายจำเลย", "ผู้พิพากษา",
]

_COURT_NAMES = [
    "ศาลฎีกา", "ศาลอุทธรณ์", "ศาลชั้นต้น", "ศาลแพ่ง", "ศาลอาญา",
    "ศาลปกครองกลาง", "ศาลปกครองสูงสุด", "ศาลแรงงาน",
    "ศาลเยาวชน", "ศาลล้มละลาย", "ศาลทรัพย์สินทางปัญญา",
]

_CRIME_KEYWORDS = [
    "ฉ้อโกง", "ลักทรัพย์", "ยักยอก", "ปลอมเอกสาร", "หมิ่นประมาท",
    "ทำร้ายร่างกาย", "ฆ่า", "ข่มขืน", "บุกรุก", "วิ่งราวทรัพย์",
    "รับของโจร", "กรรโชก", "ชิงทรัพย์", "ผิดสัญญา", "ละเมิด",
    "เลิกจ้างไม่เป็นธรรม", "ค่าชดเชย", "หย่า", "ครอบครองปรปักษ์",
]

_RELATION_KEYWORDS = {
    "ฟ้อง": "ฟ้อง",
    "ยื่นฟ้อง": "ฟ้อง",
    "ฐาน": "ฐานความผิด",
    "อ้างอิง": "อ้างอิง",
    "ตาม": "อ้างอิง",
    "เกี่ยวข้อง": "เกี่ยวข้อง",
    "พิพากษา": "พิพากษา",
    "ตัดสิน": "พิพากษา",
    "ลงโทษ": "ลงโทษ",
    "จำคุก": "ลงโทษ",
    "ปรับ": "ลงโทษ",
    "รับฟ้อง": "รับฟ้อง",
    "ยกฟ้อง": "ยกฟ้อง",
}


def _extract_entities(text: str) -> List[GraphNode]:
    """Extract legal entities from Thai text using rule-based patterns."""
    nodes: List[GraphNode] = []
    seen_labels: set = set()

    # Extract statutes (มาตรา xxx)
    import re
    for kw in _STATUTE_KEYWORDS:
        pattern = re.escape(kw) + r"\s*(\d+(?:/\d+)?)"
        for match in re.finditer(pattern, text):
            label = f"{kw} {match.group(1)}"
            if label not in seen_labels:
                seen_labels.add(label)
                nodes.append(GraphNode(
                    label=label,
                    node_type="statute",
                    attributes={"keyword": kw, "number": match.group(1)},
                ))

    # Extract case numbers (ฎ.xxxx/xxxx)
    case_pattern = r"(?:ฎ\.|ฎีกา(?:ที่)?)\s*(\d+/\d+)"
    for match in re.finditer(case_pattern, text):
        label = f"ฎ.{match.group(1)}"
        if label not in seen_labels:
            seen_labels.add(label)
            nodes.append(GraphNode(
                label=label,
                node_type="case",
                attributes={"case_no": match.group(1)},
            ))

    # Extract persons (นาย/นาง/โจทก์/จำเลย + name)
    for prefix in _PERSON_PREFIXES:
        # Match prefix + 1-2 Thai/English words (name + surname), non-greedy
        pattern = re.escape(prefix) + r"\s*([\u0e01-\u0e39\u0e40-\u0e4cA-Za-z]{2,20}(?:\s+[\u0e01-\u0e39\u0e40-\u0e4cA-Za-z]{2,20})?)"
        for match in re.finditer(pattern, text):
            name = match.group(0).strip()
            if len(name) > 3 and name not in seen_labels:
                seen_labels.add(name)
                nodes.append(GraphNode(
                    label=name,
                    node_type="person",
                    attributes={"prefix": prefix, "role": _classify_person_role(prefix)},
                ))

    # Extract courts
    for court in _COURT_NAMES:
        if court in text and court not in seen_labels:
            seen_labels.add(court)
            nodes.append(GraphNode(
                label=court,
                node_type="court",
                attributes={"court_name": court},
            ))

    # Extract crime/legal concepts
    for crime in _CRIME_KEYWORDS:
        if crime in text and crime not in seen_labels:
            seen_labels.add(crime)
            nodes.append(GraphNode(
                label=crime,
                node_type="concept",
                attributes={"concept_type": "crime" if crime in _CRIME_KEYWORDS[:15] else "civil"},
            ))

    return nodes


def _classify_person_role(prefix: str) -> str:
    """Classify person role from Thai prefix."""
    if prefix in ("โจทก์", "ทนายโจทก์"):
        return "plaintiff"
    elif prefix in ("จำเลย", "ทนายจำเลย", "ผู้ต้องหา"):
        return "defendant"
    elif prefix == "ผู้เสียหาย":
        return "victim"
    elif prefix == "พยาน":
        return "witness"
    elif prefix == "ผู้พิพากษา":
        return "judge"
    return "party"


def _extract_relations(text: str, nodes: List[GraphNode]) -> List[GraphEdge]:
    """Extract relationships between entities from Thai text."""
    edges: List[GraphEdge] = []
    node_labels = {n.label: n.id for n in nodes}

    # Simple co-occurrence + keyword-based relation extraction
    for keyword, relation_type in _RELATION_KEYWORDS.items():
        if keyword not in text:
            continue

        # Find nodes that appear near this keyword
        persons = [n for n in nodes if n.node_type == "person"]
        statutes = [n for n in nodes if n.node_type == "statute"]
        concepts = [n for n in nodes if n.node_type == "concept"]
        courts = [n for n in nodes if n.node_type == "court"]

        if relation_type == "ฟ้อง" and len(persons) >= 2:
            edges.append(GraphEdge(
                source_id=persons[0].id,
                target_id=persons[1].id,
                label="ฟ้อง",
                attributes={"relation": "ฟ้อง"},
            ))

        if relation_type == "ฐานความผิด" and persons and concepts:
            for concept in concepts:
                edges.append(GraphEdge(
                    source_id=persons[-1].id if len(persons) > 1 else persons[0].id,
                    target_id=concept.id,
                    label="ฐานความผิด",
                    attributes={"relation": "ฐานความผิด"},
                ))

        if relation_type == "อ้างอิง" and statutes:
            for statute in statutes:
                # Link concepts or persons to statutes
                source = concepts[0] if concepts else (persons[0] if persons else None)
                if source:
                    edges.append(GraphEdge(
                        source_id=source.id,
                        target_id=statute.id,
                        label="อ้างอิง",
                        attributes={"relation": "อ้างอิง"},
                    ))

        if relation_type in ("พิพากษา", "รับฟ้อง", "ยกฟ้อง") and courts:
            for court in courts:
                target = persons[-1] if persons else (concepts[0] if concepts else None)
                if target:
                    edges.append(GraphEdge(
                        source_id=court.id,
                        target_id=target.id,
                        label=relation_type,
                        attributes={"relation": relation_type},
                    ))

    return edges


def text_to_graph(text: str) -> KnowledgeGraph:
    """Convert Thai legal text to a knowledge graph (rule-based).

    Example:
        "นายสมชายฟ้องนายสมหมายฐานฉ้อโกง ตามมาตรา 341"
        → nodes: [สมชาย(person), สมหมาย(person), ฉ้อโกง(concept), มาตรา 341(statute)]
        → edges: [สมชาย→สมหมาย(ฟ้อง), สมหมาย→ฉ้อโกง(ฐานความผิด), ฉ้อโกง→มาตรา 341(อ้างอิง)]
    """
    nodes = _extract_entities(text)
    edges = _extract_relations(text, nodes)

    # Deduplicate edges
    seen_edges: set = set()
    unique_edges: List[GraphEdge] = []
    for e in edges:
        key = (e.source_id, e.target_id, e.label)
        if key not in seen_edges:
            seen_edges.add(key)
            unique_edges.append(e)

    return KnowledgeGraph(nodes=nodes, edges=unique_edges)


# ---------------------------------------------------------------------------
# Legal Graph DB — Graph Memory Store
# ---------------------------------------------------------------------------


def _cosine_sim(a: List[float], b: List[float]) -> float:
    """Cosine similarity between two vectors."""
    import math
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


class LegalGraphDB:
    """In-memory Legal Knowledge Graph with vector similarity search.

    Inspired by personal-graph's GraphDB. Provides:
    - Node/edge CRUD with embeddings
    - Similarity search (vector-based)
    - Text → Graph insertion
    - Merge by similarity (dedup)
    - NetworkX export for GNN analysis
    - Subgraph retrieval for LangGraph agent context
    """

    def __init__(self, embedding_fn=None):
        """Initialize graph store.

        Args:
            embedding_fn: Optional callable(text) -> list[float].
                          If None, uses EmbeddingService.
        """
        self._nodes: Dict[str, GraphNode] = {}
        self._edges: List[GraphEdge] = []
        self._embedding_fn = embedding_fn

    def _embed(self, text: str) -> List[float]:
        """Generate embedding for text."""
        if self._embedding_fn:
            return self._embedding_fn(text)
        try:
            from app.services.embedding_service import EmbeddingService
            svc = EmbeddingService()
            return svc.embed(text)
        except Exception:
            return []

    # -- Node operations ------------------------------------------------------

    def add_node(self, node: GraphNode, *, embed: bool = True) -> GraphNode:
        """Add a node to the graph. Generates embedding if embed=True."""
        if embed and not node.embedding:
            node.embedding = self._embed(node.label)
        self._nodes[node.id] = node
        return node

    def get_node(self, node_id: str) -> Optional[GraphNode]:
        return self._nodes.get(node_id)

    def remove_node(self, node_id: str) -> None:
        self._nodes.pop(node_id, None)
        self._edges = [e for e in self._edges if e.source_id != node_id and e.target_id != node_id]

    def all_nodes(self) -> List[GraphNode]:
        return list(self._nodes.values())

    # -- Edge operations ------------------------------------------------------

    def add_edge(self, edge: GraphEdge) -> GraphEdge:
        """Add an edge between two existing nodes."""
        if edge.source_id in self._nodes and edge.target_id in self._nodes:
            self._edges.append(edge)
        return edge

    def get_edges(self, node_id: str) -> List[GraphEdge]:
        """Get all edges connected to a node."""
        return [e for e in self._edges if e.source_id == node_id or e.target_id == node_id]

    def get_outgoing(self, node_id: str) -> List[GraphEdge]:
        return [e for e in self._edges if e.source_id == node_id]

    def get_incoming(self, node_id: str) -> List[GraphEdge]:
        return [e for e in self._edges if e.target_id == node_id]

    # -- Graph insertion from text --------------------------------------------

    def insert_from_text(self, text: str, *, embed: bool = True) -> KnowledgeGraph:
        """Parse Thai legal text and insert nodes + edges into the graph."""
        kg = text_to_graph(text)
        for node in kg.nodes:
            self.add_node(node, embed=embed)
        for edge in kg.edges:
            self.add_edge(edge)
        return kg

    def insert_graph(self, kg: KnowledgeGraph, *, embed: bool = True) -> None:
        """Insert a pre-built KnowledgeGraph."""
        for node in kg.nodes:
            self.add_node(node, embed=embed)
        for edge in kg.edges:
            self.add_edge(edge)

    # -- Similarity search ----------------------------------------------------

    def search(
        self,
        query: str,
        *,
        threshold: float = 0.7,
        limit: int = 5,
        node_type: Optional[str] = None,
    ) -> List[Tuple[GraphNode, float]]:
        """Search nodes by vector similarity to query text."""
        query_embedding = self._embed(query)
        if not query_embedding:
            return []

        scored: List[Tuple[GraphNode, float]] = []
        for node in self._nodes.values():
            if node_type and node.node_type != node_type:
                continue
            if not node.embedding:
                continue
            sim = _cosine_sim(query_embedding, node.embedding)
            if sim >= threshold:
                scored.append((node, sim))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:limit]

    def search_subgraph(
        self,
        query: str,
        *,
        threshold: float = 0.7,
        limit: int = 5,
        depth: int = 1,
    ) -> KnowledgeGraph:
        """Search for relevant nodes and return their subgraph (nodes + connected edges).

        This is the main method for LangGraph agent context retrieval.
        """
        matches = self.search(query, threshold=threshold, limit=limit)
        if not matches:
            return KnowledgeGraph()

        # Collect matched node IDs + neighbors up to depth
        node_ids: set = set()
        for node, _ in matches:
            node_ids.add(node.id)

        # BFS to expand neighbors
        for _ in range(depth):
            new_ids: set = set()
            for nid in node_ids:
                for edge in self._edges:
                    if edge.source_id == nid:
                        new_ids.add(edge.target_id)
                    if edge.target_id == nid:
                        new_ids.add(edge.source_id)
            node_ids |= new_ids

        # Build subgraph
        nodes = [self._nodes[nid] for nid in node_ids if nid in self._nodes]
        edges = [e for e in self._edges if e.source_id in node_ids and e.target_id in node_ids]

        return KnowledgeGraph(nodes=nodes, edges=edges)

    # -- Merge by similarity (dedup) ------------------------------------------

    def merge_by_similarity(self, *, threshold: float = 0.9) -> int:
        """Merge nodes that are highly similar. Returns count of merged nodes."""
        merged_count = 0
        node_list = list(self._nodes.values())

        to_remove: set = set()
        for i, node_a in enumerate(node_list):
            if node_a.id in to_remove:
                continue
            for j in range(i + 1, len(node_list)):
                node_b = node_list[j]
                if node_b.id in to_remove:
                    continue
                if node_a.node_type != node_b.node_type:
                    continue
                if not node_a.embedding or not node_b.embedding:
                    continue

                sim = _cosine_sim(node_a.embedding, node_b.embedding)
                if sim >= threshold:
                    # Merge B into A: redirect edges, combine attributes
                    for edge in self._edges:
                        if edge.source_id == node_b.id:
                            edge.source_id = node_a.id
                        if edge.target_id == node_b.id:
                            edge.target_id = node_a.id

                    # Merge attributes
                    node_a.attributes.update(node_b.attributes)
                    if node_b.label not in node_a.label:
                        node_a.label += f" / {node_b.label}"

                    to_remove.add(node_b.id)
                    merged_count += 1

        for nid in to_remove:
            self._nodes.pop(nid, None)

        # Deduplicate edges after merge
        seen: set = set()
        unique_edges: List[GraphEdge] = []
        for e in self._edges:
            key = (e.source_id, e.target_id, e.label)
            if key not in seen and e.source_id != e.target_id:
                seen.add(key)
                unique_edges.append(e)
        self._edges = unique_edges

        return merged_count

    # -- NetworkX export/import -----------------------------------------------

    def to_networkx(self) -> nx.DiGraph:
        """Export graph to NetworkX DiGraph for GNN analysis."""
        G = nx.DiGraph()

        for node in self._nodes.values():
            G.add_node(
                node.id,
                label=node.label,
                node_type=node.node_type,
                **node.attributes,
            )

        for edge in self._edges:
            G.add_edge(
                edge.source_id,
                edge.target_id,
                label=edge.label,
                weight=edge.weight,
                **edge.attributes,
            )

        return G

    def from_networkx(self, G: nx.DiGraph) -> None:
        """Import graph from NetworkX DiGraph."""
        for node_id, data in G.nodes(data=True):
            label = data.pop("label", str(node_id))
            node_type = data.pop("node_type", "")
            self.add_node(GraphNode(
                id=str(node_id),
                label=label,
                node_type=node_type,
                attributes=data,
            ), embed=False)

        for source, target, data in G.edges(data=True):
            label = data.pop("label", "")
            weight = data.pop("weight", 1.0)
            self.add_edge(GraphEdge(
                source_id=str(source),
                target_id=str(target),
                label=label,
                weight=weight,
                attributes=data,
            ))

    # -- Stats ----------------------------------------------------------------

    def stats(self) -> Dict[str, Any]:
        """Return graph statistics."""
        type_counts: Dict[str, int] = {}
        for node in self._nodes.values():
            type_counts[node.node_type] = type_counts.get(node.node_type, 0) + 1

        edge_types: Dict[str, int] = {}
        for edge in self._edges:
            edge_types[edge.label] = edge_types.get(edge.label, 0) + 1

        return {
            "total_nodes": len(self._nodes),
            "total_edges": len(self._edges),
            "node_types": type_counts,
            "edge_types": edge_types,
        }

    def to_context_string(self, kg: Optional[KnowledgeGraph] = None) -> str:
        """Convert a knowledge graph to a context string for LLM prompts."""
        if kg is None:
            kg = KnowledgeGraph(nodes=list(self._nodes.values()), edges=self._edges)

        parts: List[str] = []
        parts.append("=== Knowledge Graph Context ===")

        if kg.nodes:
            parts.append("\nEntities:")
            for node in kg.nodes:
                attrs = json.dumps(node.attributes, ensure_ascii=False) if node.attributes else ""
                parts.append(f"  - [{node.node_type}] {node.label} {attrs}")

        if kg.edges:
            parts.append("\nRelationships:")
            for edge in kg.edges:
                src = self._nodes.get(edge.source_id)
                tgt = self._nodes.get(edge.target_id)
                src_label = src.label if src else edge.source_id
                tgt_label = tgt.label if tgt else edge.target_id
                parts.append(f"  - {src_label} --[{edge.label}]--> {tgt_label}")

        return "\n".join(parts)
