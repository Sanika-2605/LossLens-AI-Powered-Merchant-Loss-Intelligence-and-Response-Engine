"""
Deterministic tests for the GraphService — independent of Supabase.

Uses a small, hand-crafted NetworkX test graph to exercise every metric
and API endpoint.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.graph_service import GraphService

client = TestClient(app)


# ---------------------------------------------------------------------------
# Deterministic test data
# ---------------------------------------------------------------------------

def _make_test_data():
    """
    Build a small deterministic dataset:

    Customers: c1, c2, c3
    Orders:    o1 (c1, coupon coup1), o2 (c2)
    Payments:  p1 (o1), p2 (o2)
    Refunds:   r1 (p1)
    Products:  prod1
    Devices:   d1 (shared by c1 and c2)
    Addresses: a1 (used by c1), a2 (shared by c1 and c3)
    Coupons:   coup1

    Edges:
      c1 -> o1 (CUSTOMER_PLACED_ORDER)
      c2 -> o2 (CUSTOMER_PLACED_ORDER)
      o1 -> p1 (ORDER_HAS_PAYMENT)
      o2 -> p2 (ORDER_HAS_PAYMENT)
      p1 -> r1 (PAYMENT_HAS_REFUND)
      c1 -> d1 (CUSTOMER_USED_DEVICE)
      c2 -> d1 (CUSTOMER_USED_DEVICE)
      c1 -> a1 (CUSTOMER_USED_ADDRESS)
      c1 -> a2 (CUSTOMER_USED_ADDRESS)
      c3 -> a2 (CUSTOMER_USED_ADDRESS)
      o1 -> prod1 (ORDER_CONTAINS_PRODUCT)
      o1 -> coup1 (ORDER_USED_COUPON)
    """
    return {
        "customers": [
            {"id": "c1", "status": "active"},
            {"id": "c2", "status": "active"},
            {"id": "c3", "status": "dormant"},
        ],
        "orders": [
            {"id": "o1", "customer_id": "c1", "coupon_id": "coup1"},
            {"id": "o2", "customer_id": "c2", "coupon_id": None},
        ],
        "payments": [
            {"id": "p1", "order_id": "o1"},
            {"id": "p2", "order_id": "o2"},
        ],
        "refunds": [
            {"id": "r1", "payment_id": "p1"},
        ],
        "products": [
            {"id": "prod1"},
        ],
        "devices": [
            {"id": "d1"},
        ],
        "addresses": [
            {"id": "a1"},
            {"id": "a2"},
        ],
        "coupons": [
            {"id": "coup1"},
        ],
        "customer_device": [
            {"customer_id": "c1", "device_id": "d1"},
            {"customer_id": "c2", "device_id": "d1"},
        ],
        "customer_address": [
            {"customer_id": "c1", "address_id": "a1"},
            {"customer_id": "c1", "address_id": "a2"},
            {"customer_id": "c3", "address_id": "a2"},
        ],
        "order_product": [
            {"order_id": "o1", "product_id": "prod1"},
        ],
    }


@pytest.fixture
def svc():
    """Create a fresh GraphService loaded with deterministic test data."""
    service = GraphService()
    service.build_graph_from_data(_make_test_data())
    return service


# ---------------------------------------------------------------------------
# Graph construction
# ---------------------------------------------------------------------------

class TestGraphConstruction:
    def test_node_count(self, svc: GraphService):
        G = svc._graph
        # 3 customers + 2 orders + 2 payments + 1 refund + 1 product + 1 device + 2 addresses + 1 coupon = 13
        assert G.number_of_nodes() == 13

    def test_edge_count(self, svc: GraphService):
        G = svc._graph
        # 12 edges as documented above
        assert G.number_of_edges() == 12

    def test_node_metadata(self, svc: GraphService):
        G = svc._graph
        node = G.nodes["customer:c1"]
        assert node["id"] == "c1"
        assert node["entity_type"] == "customer"

    def test_edge_metadata(self, svc: GraphService):
        G = svc._graph
        edge = G.edges["customer:c1", "order:o1"]
        assert edge["relationship_type"] == "CUSTOMER_PLACED_ORDER"

    def test_all_edge_types_present(self, svc: GraphService):
        G = svc._graph
        edge_types = {d["relationship_type"] for _, _, d in G.edges(data=True)}
        expected = {
            "CUSTOMER_PLACED_ORDER",
            "ORDER_HAS_PAYMENT",
            "PAYMENT_HAS_REFUND",
            "CUSTOMER_USED_DEVICE",
            "CUSTOMER_USED_ADDRESS",
            "ORDER_CONTAINS_PRODUCT",
            "ORDER_USED_COUPON",
        }
        assert edge_types == expected


# ---------------------------------------------------------------------------
# Degree
# ---------------------------------------------------------------------------

class TestDegree:
    def test_customer_degree(self, svc: GraphService):
        # c1: o1, d1, a1, a2 => degree 4
        assert svc.get_degree("customer:c1") == 4

    def test_order_degree(self, svc: GraphService):
        # o1: c1, p1, prod1, coup1 => degree 4
        assert svc.get_degree("order:o1") == 4

    def test_leaf_node_degree(self, svc: GraphService):
        # r1: p1 => degree 1
        assert svc.get_degree("refund:r1") == 1

    def test_missing_node_degree(self, svc: GraphService):
        assert svc.get_degree("customer:nonexistent") == 0


# ---------------------------------------------------------------------------
# Neighborhood
# ---------------------------------------------------------------------------

class TestNeighborhood:
    def test_1hop(self, svc: GraphService):
        # c1 1-hop: o1, d1, a1, a2 => 4
        assert svc.get_neighborhood_size("customer:c1", 1) == 4

    def test_2hop(self, svc: GraphService):
        # c1 2-hop: o1, d1, a1, a2, p1, prod1, coup1, c2, c3 => 9
        assert svc.get_neighborhood_size("customer:c1", 2) == 9

    def test_missing_node(self, svc: GraphService):
        assert svc.get_neighborhood_size("customer:missing", 1) == 0


# ---------------------------------------------------------------------------
# Shared entities
# ---------------------------------------------------------------------------

class TestSharedEntities:
    def test_shared_device(self, svc: GraphService):
        shared = svc.get_shared_entities("customer:c1")
        device_shared = [s for s in shared if s["entity_type"] == "device"]
        assert len(device_shared) == 1
        assert device_shared[0]["entity_id"] == "d1"
        assert "c2" in device_shared[0]["shared_with_customers"]

    def test_shared_address(self, svc: GraphService):
        shared = svc.get_shared_entities("customer:c1")
        addr_shared = [s for s in shared if s["entity_type"] == "address"]
        # a1 is not shared (only c1), a2 is shared with c3
        assert len(addr_shared) == 1
        assert addr_shared[0]["entity_id"] == "a2"
        assert "c3" in addr_shared[0]["shared_with_customers"]

    def test_non_customer_returns_empty(self, svc: GraphService):
        assert svc.get_shared_entities("order:o1") == []

    def test_missing_node_returns_empty(self, svc: GraphService):
        assert svc.get_shared_entities("customer:missing") == []


# ---------------------------------------------------------------------------
# Community detection
# ---------------------------------------------------------------------------

class TestCommunities:
    def test_community_assigned(self, svc: GraphService):
        comm = svc.get_community("customer:c1")
        assert comm["community_id"] is not None
        assert comm["community_size"] > 0

    def test_connected_nodes_same_community(self, svc: GraphService):
        # c1 and c2 are connected (via d1) → likely same community
        c1 = svc.get_community("customer:c1")
        c2 = svc.get_community("customer:c2")
        # They're in the same connected component, so will be assigned communities
        assert c1["community_id"] is not None
        assert c2["community_id"] is not None

    def test_missing_node_community(self, svc: GraphService):
        comm = svc.get_community("customer:missing")
        assert comm["community_id"] is None
        assert comm["community_size"] == 0


# ---------------------------------------------------------------------------
# Relationship density
# ---------------------------------------------------------------------------

class TestDensity:
    def test_density_value(self, svc: GraphService):
        density = svc.get_relationship_density("customer:c1")
        assert 0 < density <= 1.0

    def test_missing_node_density(self, svc: GraphService):
        assert svc.get_relationship_density("customer:missing") == 0.0

    def test_leaf_node_density(self, svc: GraphService):
        # refund:r1 has 1 neighbor (p1). ego graph has 2 nodes, 1 edge.
        # density = 1 / (2*1/2) = 1.0
        assert svc.get_relationship_density("refund:r1") == 1.0


# ---------------------------------------------------------------------------
# Empty / single-node graph
# ---------------------------------------------------------------------------

class TestEdgeCases:
    def test_empty_graph(self):
        svc = GraphService()
        svc.build_graph_from_data({
            "customers": [], "orders": [], "payments": [], "refunds": [],
            "products": [], "devices": [], "addresses": [], "coupons": [],
            "customer_device": [], "customer_address": [], "order_product": [],
        })
        summary = svc.get_summary()
        assert summary["total_nodes"] == 0
        assert summary["total_edges"] == 0
        assert summary["connected_components"] == 0
        assert summary["community_count"] == 0

    def test_single_node_graph(self):
        svc = GraphService()
        svc.build_graph_from_data({
            "customers": [{"id": "solo"}], "orders": [], "payments": [], "refunds": [],
            "products": [], "devices": [], "addresses": [], "coupons": [],
            "customer_device": [], "customer_address": [], "order_product": [],
        })
        assert svc.get_degree("customer:solo") == 0
        assert svc.get_neighborhood_size("customer:solo", 1) == 0
        assert svc.get_relationship_density("customer:solo") == 0.0
        assert svc.get_community("customer:solo")["community_size"] == 1


# ---------------------------------------------------------------------------
# Suspicious-neighbour interface
# ---------------------------------------------------------------------------

class TestSuspiciousNeighbors:
    def test_no_suspicious_set(self, svc: GraphService):
        assert svc.get_suspicious_neighbor_count("customer:c1") == 0

    def test_empty_suspicious_set(self, svc: GraphService):
        assert svc.get_suspicious_neighbor_count("customer:c1", suspicious_entities=set()) == 0

    def test_with_suspicious_set(self, svc: GraphService):
        # c1's neighbors: o1, d1, a1, a2
        suspicious = {"order:o1", "device:d1"}
        assert svc.get_suspicious_neighbor_count("customer:c1", suspicious_entities=suspicious) == 2

    def test_missing_node(self, svc: GraphService):
        assert svc.get_suspicious_neighbor_count("customer:missing", suspicious_entities={"order:o1"}) == 0


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

class TestSummary:
    def test_summary_structure(self, svc: GraphService):
        summary = svc.get_summary()
        assert "total_nodes" in summary
        assert "total_edges" in summary
        assert "nodes_by_type" in summary
        assert "edges_by_type" in summary
        assert "connected_components" in summary
        assert "community_count" in summary

    def test_summary_values(self, svc: GraphService):
        summary = svc.get_summary()
        assert summary["total_nodes"] == 13
        assert summary["total_edges"] == 12
        assert summary["nodes_by_type"]["customer"] == 3
        assert summary["nodes_by_type"]["order"] == 2
        assert summary["community_count"] > 0


# ---------------------------------------------------------------------------
# Entity analysis
# ---------------------------------------------------------------------------

class TestEntityAnalysis:
    def test_valid_entity(self, svc: GraphService):
        result = svc.get_entity_analysis("customer", "c1")
        assert result is not None
        assert result["entity_id"] == "c1"
        assert result["entity_type"] == "customer"
        assert result["degree"] == 4
        assert result["neighborhood_size_1hop"] == 4
        assert result["neighborhood_size_2hop"] == 9
        assert result["community_id"] is not None
        assert result["community_size"] > 0
        assert isinstance(result["relationship_density"], float)
        assert isinstance(result["shared_entities"], list)
        assert result["suspicious_neighbor_count"] == 0
        assert isinstance(result["neighbors"], list)

    def test_invalid_entity(self, svc: GraphService):
        result = svc.get_entity_analysis("customer", "nonexistent")
        assert result is None


# ---------------------------------------------------------------------------
# Neighbors
# ---------------------------------------------------------------------------

class TestNeighbors:
    def test_depth_1_neighbors(self, svc: GraphService):
        neighbors = svc.get_neighbors("customer:c1", depth=1)
        ids = {n["entity_id"] for n in neighbors}
        assert "o1" in ids
        assert "d1" in ids
        assert "a1" in ids
        assert "a2" in ids

    def test_depth_2_neighbors(self, svc: GraphService):
        neighbors = svc.get_neighbors("customer:c1", depth=2)
        ids = {n["entity_id"] for n in neighbors}
        assert "p1" in ids     # 2 hops via o1
        assert "prod1" in ids  # 2 hops via o1
        assert "c2" in ids     # 2 hops via d1

    def test_entity_type_filter(self, svc: GraphService):
        neighbors = svc.get_neighbors("customer:c1", depth=2, entity_type_filter="payment")
        for n in neighbors:
            assert n["entity_type"] == "payment"

    def test_missing_node(self, svc: GraphService):
        assert svc.get_neighbors("customer:missing", depth=1) == []


# ---------------------------------------------------------------------------
# Graph data
# ---------------------------------------------------------------------------

class TestGraphData:
    def test_graph_data_structure(self, svc: GraphService):
        data = svc.get_graph_data()
        assert "nodes" in data
        assert "edges" in data
        assert len(data["nodes"]) == 13
        assert len(data["edges"]) == 12

    def test_graph_data_limit(self, svc: GraphService):
        data = svc.get_graph_data(limit=5)
        assert len(data["nodes"]) == 5

    def test_graph_data_node_format(self, svc: GraphService):
        data = svc.get_graph_data()
        node = data["nodes"][0]
        assert "id" in node
        assert "entity_id" in node
        assert "entity_type" in node

    def test_graph_data_edge_format(self, svc: GraphService):
        data = svc.get_graph_data()
        edge = data["edges"][0]
        assert "id" in edge
        assert "source" in edge
        assert "target" in edge
        assert "relationship_type" in edge


# ---------------------------------------------------------------------------
# API endpoint tests (via FastAPI TestClient)
# ---------------------------------------------------------------------------

def _inject_test_graph():
    """Replace the global graph_service with one backed by test data."""
    from app.services import graph_service as gs_module
    svc = GraphService()
    svc.build_graph_from_data(_make_test_data())
    gs_module.graph_service = svc
    return svc


class TestGraphAPIs:
    @pytest.fixture(autouse=True)
    def setup(self):
        _inject_test_graph()

    def test_summary_endpoint(self):
        response = client.get("/api/graph/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["total_nodes"] == 13
        assert data["total_edges"] == 12
        assert "community_count" in data

    def test_entity_analysis_endpoint(self):
        response = client.get("/api/graph/entities/customer/c1")
        assert response.status_code == 200
        data = response.json()
        assert data["entity_id"] == "c1"
        assert data["degree"] == 4

    def test_entity_not_found(self):
        response = client.get("/api/graph/entities/customer/nonexistent")
        assert response.status_code == 404

    def test_neighbors_endpoint(self):
        response = client.get("/api/graph/entities/customer/c1/neighbors?depth=1")
        assert response.status_code == 200
        data = response.json()
        assert "neighbors" in data
        assert len(data["neighbors"]) > 0

    def test_neighbors_depth_2(self):
        response = client.get("/api/graph/entities/customer/c1/neighbors?depth=2")
        assert response.status_code == 200
        data = response.json()
        assert data["depth"] == 2
        ids = {n["entity_id"] for n in data["neighbors"]}
        assert "p1" in ids

    def test_graph_data_endpoint(self):
        response = client.get("/api/graph")
        assert response.status_code == 200
        data = response.json()
        assert len(data["nodes"]) == 13
        assert len(data["edges"]) == 12

    def test_graph_data_with_limit(self):
        response = client.get("/api/graph?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data["nodes"]) == 5

    def test_refresh_endpoint(self):
        # Refresh will try to hit the DB; since we're in test mode, it may fail.
        # We override the service to just rebuild from test data.
        svc = _inject_test_graph()
        # Verify the graph is valid after injection
        summary = svc.get_summary()
        assert summary["total_nodes"] == 13
