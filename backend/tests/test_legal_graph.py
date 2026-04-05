"""Tests for Legal Knowledge Graph — text_to_graph, LegalGraphDB, NetworkX export."""

from __future__ import annotations

import pytest

from app.services.legal_graph import (
    GraphEdge,
    GraphNode,
    KnowledgeGraph,
    LegalGraphDB,
    text_to_graph,
    _extract_entities,
)


# ---------------------------------------------------------------------------
# Text → Graph parsing
# ---------------------------------------------------------------------------


class TestTextToGraph:
    def test_extracts_persons(self):
        text = "นายสมชาย ใจดี ฟ้อง นายสมหมาย รักดี"
        kg = text_to_graph(text)
        person_nodes = [n for n in kg.nodes if n.node_type == "person"]
        assert len(person_nodes) >= 2

    def test_extracts_statutes(self):
        text = "ตามมาตรา 341 และมาตรา 342 ป.อ."
        kg = text_to_graph(text)
        statute_nodes = [n for n in kg.nodes if n.node_type == "statute"]
        assert len(statute_nodes) >= 2
        labels = [n.label for n in statute_nodes]
        assert any("341" in l for l in labels)
        assert any("342" in l for l in labels)

    def test_extracts_case_numbers(self):
        text = "ตามคำพิพากษาฎีกาที่ 1234/2567"
        kg = text_to_graph(text)
        case_nodes = [n for n in kg.nodes if n.node_type == "case"]
        assert len(case_nodes) >= 1
        assert "1234/2567" in case_nodes[0].label

    def test_extracts_courts(self):
        text = "ศาลฎีกาพิพากษายืนตามศาลอุทธรณ์"
        kg = text_to_graph(text)
        court_nodes = [n for n in kg.nodes if n.node_type == "court"]
        assert len(court_nodes) >= 2

    def test_extracts_crime_concepts(self):
        text = "จำเลยกระทำความผิดฐานฉ้อโกง"
        kg = text_to_graph(text)
        concept_nodes = [n for n in kg.nodes if n.node_type == "concept"]
        assert any("ฉ้อโกง" in n.label for n in concept_nodes)

    def test_extracts_relations(self):
        text = "นายสมชาย ฟ้อง นายสมหมาย ฐานฉ้อโกง ตามมาตรา 341"
        kg = text_to_graph(text)
        assert len(kg.edges) >= 1
        edge_labels = [e.label for e in kg.edges]
        assert "ฟ้อง" in edge_labels or "ฐานความผิด" in edge_labels

    def test_empty_text_returns_empty_graph(self):
        kg = text_to_graph("")
        assert len(kg.nodes) == 0
        assert len(kg.edges) == 0

    def test_complex_legal_text(self):
        text = (
            "โจทก์ฟ้องจำเลยว่า จำเลยกระทำความผิดฐานฉ้อโกง "
            "ตามมาตรา 341 ประมวลกฎหมายอาญา "
            "ศาลชั้นต้นพิพากษาลงโทษจำคุก 2 ปี"
        )
        kg = text_to_graph(text)
        assert len(kg.nodes) >= 3  # persons + concept + statute + court
        assert len(kg.edges) >= 1


# ---------------------------------------------------------------------------
# LegalGraphDB
# ---------------------------------------------------------------------------


class TestLegalGraphDB:
    def _make_db(self) -> LegalGraphDB:
        """Create a graph DB with dummy embedding function."""
        counter = [0]
        def dummy_embed(text: str) -> list:
            counter[0] += 1
            # Simple hash-based pseudo-embedding for testing
            import hashlib
            h = hashlib.md5(text.encode()).hexdigest()
            return [int(c, 16) / 15.0 for c in h]  # 32-dim vector
        return LegalGraphDB(embedding_fn=dummy_embed)

    def test_add_and_get_node(self):
        db = self._make_db()
        node = GraphNode(label="มาตรา 341", node_type="statute")
        db.add_node(node)
        retrieved = db.get_node(node.id)
        assert retrieved is not None
        assert retrieved.label == "มาตรา 341"

    def test_add_and_get_edge(self):
        db = self._make_db()
        n1 = GraphNode(label="โจทก์", node_type="person")
        n2 = GraphNode(label="จำเลย", node_type="person")
        db.add_node(n1)
        db.add_node(n2)
        edge = GraphEdge(source_id=n1.id, target_id=n2.id, label="ฟ้อง")
        db.add_edge(edge)
        edges = db.get_edges(n1.id)
        assert len(edges) == 1
        assert edges[0].label == "ฟ้อง"

    def test_remove_node_removes_edges(self):
        db = self._make_db()
        n1 = GraphNode(label="A", node_type="person")
        n2 = GraphNode(label="B", node_type="person")
        db.add_node(n1)
        db.add_node(n2)
        db.add_edge(GraphEdge(source_id=n1.id, target_id=n2.id, label="knows"))
        db.remove_node(n1.id)
        assert db.get_node(n1.id) is None
        assert len(db.get_edges(n1.id)) == 0

    def test_insert_from_text(self):
        db = self._make_db()
        kg = db.insert_from_text("นายสมชาย ฟ้อง นายสมหมาย ฐานฉ้อโกง ตามมาตรา 341")
        assert len(kg.nodes) >= 2
        stats = db.stats()
        assert stats["total_nodes"] >= 2

    def test_search_returns_similar_nodes(self):
        db = self._make_db()
        db.add_node(GraphNode(label="ฉ้อโกง", node_type="concept"))
        db.add_node(GraphNode(label="ลักทรัพย์", node_type="concept"))
        db.add_node(GraphNode(label="ศาลฎีกา", node_type="court"))
        # With dummy embeddings, search by exact label should find the node
        results = db.search("ฉ้อโกง", threshold=0.0)
        assert len(results) >= 1

    def test_search_subgraph(self):
        db = self._make_db()
        n1 = GraphNode(label="ฉ้อโกง", node_type="concept")
        n2 = GraphNode(label="มาตรา 341", node_type="statute")
        db.add_node(n1)
        db.add_node(n2)
        db.add_edge(GraphEdge(source_id=n1.id, target_id=n2.id, label="อ้างอิง"))
        kg = db.search_subgraph("ฉ้อโกง", threshold=0.0, depth=1)
        assert len(kg.nodes) >= 1

    def test_merge_by_similarity(self):
        db = self._make_db()
        # Same label → same embedding → should merge
        n1 = GraphNode(label="ฉ้อโกง", node_type="concept")
        n2 = GraphNode(label="ฉ้อโกง", node_type="concept")
        db.add_node(n1)
        db.add_node(n2)
        merged = db.merge_by_similarity(threshold=0.99)
        assert merged >= 1
        assert db.stats()["total_nodes"] == 1

    def test_stats(self):
        db = self._make_db()
        db.add_node(GraphNode(label="A", node_type="person"))
        db.add_node(GraphNode(label="B", node_type="statute"))
        stats = db.stats()
        assert stats["total_nodes"] == 2
        assert stats["node_types"]["person"] == 1
        assert stats["node_types"]["statute"] == 1

    def test_to_context_string(self):
        db = self._make_db()
        n1 = GraphNode(label="ฉ้อโกง", node_type="concept")
        n2 = GraphNode(label="มาตรา 341", node_type="statute")
        db.add_node(n1)
        db.add_node(n2)
        db.add_edge(GraphEdge(source_id=n1.id, target_id=n2.id, label="อ้างอิง"))
        context = db.to_context_string()
        assert "ฉ้อโกง" in context
        assert "มาตรา 341" in context
        assert "อ้างอิง" in context


# ---------------------------------------------------------------------------
# NetworkX export/import
# ---------------------------------------------------------------------------


class TestNetworkXIntegration:
    def _make_db(self) -> LegalGraphDB:
        def dummy_embed(text):
            import hashlib
            h = hashlib.md5(text.encode()).hexdigest()
            return [int(c, 16) / 15.0 for c in h]
        return LegalGraphDB(embedding_fn=dummy_embed)

    def test_export_to_networkx(self):
        db = self._make_db()
        n1 = GraphNode(id="1", label="A", node_type="person")
        n2 = GraphNode(id="2", label="B", node_type="person")
        db.add_node(n1)
        db.add_node(n2)
        db.add_edge(GraphEdge(source_id="1", target_id="2", label="knows"))

        G = db.to_networkx()
        assert len(G.nodes) == 2
        assert len(G.edges) == 1
        assert G.nodes["1"]["label"] == "A"

    def test_import_from_networkx(self):
        import networkx as nx
        G = nx.DiGraph()
        G.add_node("x", label="ศาลฎีกา", node_type="court")
        G.add_node("y", label="มาตรา 341", node_type="statute")
        G.add_edge("x", "y", label="อ้างอิง", weight=1.0)

        db = self._make_db()
        db.from_networkx(G)
        assert db.stats()["total_nodes"] == 2
        assert db.stats()["total_edges"] == 1

    def test_roundtrip_networkx(self):
        db = self._make_db()
        n1 = GraphNode(id="a", label="โจทก์", node_type="person")
        n2 = GraphNode(id="b", label="จำเลย", node_type="person")
        db.add_node(n1)
        db.add_node(n2)
        db.add_edge(GraphEdge(source_id="a", target_id="b", label="ฟ้อง"))

        G = db.to_networkx()
        db2 = self._make_db()
        db2.from_networkx(G)

        assert db2.stats()["total_nodes"] == 2
        assert db2.stats()["total_edges"] == 1
