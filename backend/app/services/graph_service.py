"""
GraphService — NetworkX graph intelligence layer for LossLens.

Builds a reusable, cached NetworkX graph from the Supabase/PostgreSQL database
and exposes structural graph metrics (degree, neighborhoods, communities,
density, shared entities, suspicious neighbours).
"""

import threading
from typing import Any, Dict, List, Optional, Set

import networkx as nx
from networkx.algorithms.community import greedy_modularity_communities
from sqlalchemy import text

from app.database import SessionLocal


# ---------------------------------------------------------------------------
# GraphService singleton
# ---------------------------------------------------------------------------

class GraphService:
    """In-memory cached NetworkX graph backed by Supabase/PostgreSQL."""

    def __init__(self) -> None:
        self._graph: Optional[nx.Graph] = None
        self._communities: Optional[Dict[str, int]] = None  # node -> community_id
        self._community_sizes: Optional[Dict[int, int]] = None  # community_id -> size
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Graph construction
    # ------------------------------------------------------------------

    def _ensure_graph(self) -> nx.Graph:
        """Return the cached graph, building it on first access."""
        if self._graph is None:
            self.refresh()
        return self._graph  # type: ignore[return-value]

    def refresh(self) -> Dict[str, Any]:
        """Reload graph from the current Supabase data and replace the cache."""
        with self._lock:
            G = self._build_graph_from_db()
            self._graph = G
            self._communities = None
            self._community_sizes = None
            self._compute_communities()
        return {"status": "refreshed", "total_nodes": G.number_of_nodes(), "total_edges": G.number_of_edges()}

    def build_graph_from_data(self, data: Dict[str, list]) -> nx.Graph:
        """Build a graph from in-memory dicts (used by tests & fallback)."""
        G = nx.Graph()

        # --- Nodes ---
        for c in data.get("customers", []):
            G.add_node(f"customer:{c['id']}", id=c["id"], entity_type="customer")
        for o in data.get("orders", []):
            G.add_node(f"order:{o['id']}", id=o["id"], entity_type="order")
        for p in data.get("payments", []):
            G.add_node(f"payment:{p['id']}", id=p["id"], entity_type="payment")
        for r in data.get("refunds", []):
            G.add_node(f"refund:{r['id']}", id=r["id"], entity_type="refund")
        for pr in data.get("products", []):
            G.add_node(f"product:{pr['id']}", id=pr["id"], entity_type="product")
        for d in data.get("devices", []):
            G.add_node(f"device:{d['id']}", id=d["id"], entity_type="device")
        for a in data.get("addresses", []):
            G.add_node(f"address:{a['id']}", id=a["id"], entity_type="address")
        for cp in data.get("coupons", []):
            G.add_node(f"coupon:{cp['id']}", id=cp["id"], entity_type="coupon")

        # --- Edges ---
        for o in data.get("orders", []):
            cid = o.get("customer_id")
            if cid and f"customer:{cid}" in G:
                G.add_edge(f"customer:{cid}", f"order:{o['id']}", relationship_type="CUSTOMER_PLACED_ORDER")
            coup = o.get("coupon_id")
            if coup and f"coupon:{coup}" in G:
                G.add_edge(f"order:{o['id']}", f"coupon:{coup}", relationship_type="ORDER_USED_COUPON")

        for p in data.get("payments", []):
            oid = p.get("order_id")
            if oid and f"order:{oid}" in G:
                G.add_edge(f"order:{oid}", f"payment:{p['id']}", relationship_type="ORDER_HAS_PAYMENT")

        for r in data.get("refunds", []):
            pid = r.get("payment_id")
            if pid and f"payment:{pid}" in G:
                G.add_edge(f"payment:{pid}", f"refund:{r['id']}", relationship_type="PAYMENT_HAS_REFUND")

        for cd in data.get("customer_device", []):
            cid, did = cd["customer_id"], cd["device_id"]
            if f"customer:{cid}" in G and f"device:{did}" in G:
                G.add_edge(f"customer:{cid}", f"device:{did}", relationship_type="CUSTOMER_USED_DEVICE")

        for ca in data.get("customer_address", []):
            cid, aid = ca["customer_id"], ca["address_id"]
            if f"customer:{cid}" in G and f"address:{aid}" in G:
                G.add_edge(f"customer:{cid}", f"address:{aid}", relationship_type="CUSTOMER_USED_ADDRESS")

        for op in data.get("order_product", []):
            oid, pid = op["order_id"], op["product_id"]
            if f"order:{oid}" in G and f"product:{pid}" in G:
                G.add_edge(f"order:{oid}", f"product:{pid}", relationship_type="ORDER_CONTAINS_PRODUCT")

        with self._lock:
            self._graph = G
            self._communities = None
            self._community_sizes = None
            self._compute_communities()
        return G

    def _build_graph_from_db(self) -> nx.Graph:
        """Query Supabase/PostgreSQL and build the full graph, with fallback to local JSON datasets."""
        data: Dict[str, list] = {}
        db_success = False

        if SessionLocal is not None:
            try:
                session = SessionLocal()
                try:
                    data["customers"] = [{"id": r[0]} for r in session.execute(text("SELECT id FROM customers")).fetchall()]
                    data["orders"] = [{"id": r[0], "customer_id": r[1], "coupon_id": r[2]} for r in session.execute(text("SELECT id, customer_id, coupon_id FROM orders")).fetchall()]
                    data["payments"] = [{"id": r[0], "order_id": r[1]} for r in session.execute(text("SELECT id, order_id FROM payments")).fetchall()]
                    data["refunds"] = [{"id": r[0], "payment_id": r[1]} for r in session.execute(text("SELECT id, payment_id FROM refunds")).fetchall()]
                    data["products"] = [{"id": r[0]} for r in session.execute(text("SELECT id FROM products")).fetchall()]
                    data["devices"] = [{"id": r[0]} for r in session.execute(text("SELECT id FROM devices")).fetchall()]
                    data["addresses"] = [{"id": r[0]} for r in session.execute(text("SELECT id FROM addresses")).fetchall()]
                    data["coupons"] = [{"id": r[0]} for r in session.execute(text("SELECT id FROM coupons")).fetchall()]
                    data["customer_device"] = [{"customer_id": r[0], "device_id": r[1]} for r in session.execute(text("SELECT customer_id, device_id FROM customer_device")).fetchall()]
                    data["customer_address"] = [{"customer_id": r[0], "address_id": r[1]} for r in session.execute(text("SELECT customer_id, address_id FROM customer_address")).fetchall()]
                    data["order_product"] = [{"order_id": r[0], "product_id": r[1]} for r in session.execute(text("SELECT order_id, product_id FROM order_product")).fetchall()]
                    db_success = True
                finally:
                    session.close()
            except Exception as e:
                db_success = False

        if not db_success:
            import os, json
            data_dir = 'data/generated'
            def load_json(name):
                path = os.path.join(data_dir, f"{name}.json")
                if os.path.exists(path):
                    with open(path, 'r', encoding='utf-8') as fp:
                        return json.load(fp)
                return []
            data["customers"] = load_json("customers")
            data["orders"] = load_json("orders")
            data["payments"] = load_json("payments")
            data["refunds"] = load_json("refunds")
            data["products"] = load_json("products")
            data["devices"] = load_json("devices")
            data["addresses"] = load_json("addresses")
            data["coupons"] = load_json("coupons")
            data["customer_device"] = load_json("customer_device")
            data["customer_address"] = load_json("customer_address")
            data["order_product"] = load_json("order_product")

        # Build graph using the shared builder (no lock — caller holds it)
        G = nx.Graph()

        for c in data.get("customers", []):
            G.add_node(f"customer:{c['id']}", id=c["id"], entity_type="customer")
        for o in data.get("orders", []):
            G.add_node(f"order:{o['id']}", id=o["id"], entity_type="order")
        for p in data.get("payments", []):
            G.add_node(f"payment:{p['id']}", id=p["id"], entity_type="payment")
        for r in data.get("refunds", []):
            G.add_node(f"refund:{r['id']}", id=r["id"], entity_type="refund")
        for pr in data.get("products", []):
            G.add_node(f"product:{pr['id']}", id=pr["id"], entity_type="product")
        for d in data.get("devices", []):
            G.add_node(f"device:{d['id']}", id=d["id"], entity_type="device")
        for a in data.get("addresses", []):
            G.add_node(f"address:{a['id']}", id=a["id"], entity_type="address")
        for cp in data.get("coupons", []):
            G.add_node(f"coupon:{cp['id']}", id=cp["id"], entity_type="coupon")

        for o in data.get("orders", []):
            cid = o.get("customer_id")
            if cid and f"customer:{cid}" in G:
                G.add_edge(f"customer:{cid}", f"order:{o['id']}", relationship_type="CUSTOMER_PLACED_ORDER")
            coup = o.get("coupon_id")
            if coup and f"coupon:{coup}" in G:
                G.add_edge(f"order:{o['id']}", f"coupon:{coup}", relationship_type="ORDER_USED_COUPON")
        for p in data.get("payments", []):
            oid = p.get("order_id")
            if oid and f"order:{oid}" in G:
                G.add_edge(f"order:{oid}", f"payment:{p['id']}", relationship_type="ORDER_HAS_PAYMENT")
        for r in data.get("refunds", []):
            pid = r.get("payment_id")
            if pid and f"payment:{pid}" in G:
                G.add_edge(f"payment:{pid}", f"refund:{r['id']}", relationship_type="PAYMENT_HAS_REFUND")
        for cd in data.get("customer_device", []):
            cid, did = cd["customer_id"], cd["device_id"]
            if f"customer:{cid}" in G and f"device:{did}" in G:
                G.add_edge(f"customer:{cid}", f"device:{did}", relationship_type="CUSTOMER_USED_DEVICE")
        for ca in data.get("customer_address", []):
            cid, aid = ca["customer_id"], ca["address_id"]
            if f"customer:{cid}" in G and f"address:{aid}" in G:
                G.add_edge(f"customer:{cid}", f"address:{aid}", relationship_type="CUSTOMER_USED_ADDRESS")
        for op in data.get("order_product", []):
            oid, pid = op["order_id"], op["product_id"]
            if f"order:{oid}" in G and f"product:{pid}" in G:
                G.add_edge(f"order:{oid}", f"product:{pid}", relationship_type="ORDER_CONTAINS_PRODUCT")

        return G

    # ------------------------------------------------------------------
    # Community detection
    # ------------------------------------------------------------------

    def _compute_communities(self) -> None:
        """Compute communities using greedy modularity on each connected component."""
        G = self._graph
        if G is None or G.number_of_nodes() == 0:
            self._communities = {}
            self._community_sizes = {}
            return

        node_to_community: Dict[str, int] = {}
        community_id_counter = 0

        for component in nx.connected_components(G):
            subgraph = G.subgraph(component)
            if len(component) < 2:
                # Single node gets its own community
                for node in component:
                    node_to_community[node] = community_id_counter
                community_id_counter += 1
                continue

            try:
                communities = greedy_modularity_communities(subgraph)
                for comm in communities:
                    for node in comm:
                        node_to_community[node] = community_id_counter
                    community_id_counter += 1
            except Exception:
                # Fallback: entire component is one community
                for node in component:
                    node_to_community[node] = community_id_counter
                community_id_counter += 1

        self._communities = node_to_community

        # Compute community sizes
        sizes: Dict[int, int] = {}
        for cid in node_to_community.values():
            sizes[cid] = sizes.get(cid, 0) + 1
        self._community_sizes = sizes

    # ------------------------------------------------------------------
    # Graph metrics
    # ------------------------------------------------------------------

    def get_degree(self, node_key: str) -> int:
        """Direct relationship count for a node."""
        G = self._ensure_graph()
        if node_key not in G:
            return 0
        return G.degree(node_key)

    def get_neighborhood_size(self, node_key: str, hops: int = 1) -> int:
        """Count of unique nodes within N hops, excluding the center node."""
        G = self._ensure_graph()
        if node_key not in G:
            return 0
        ego = nx.ego_graph(G, node_key, radius=hops)
        return ego.number_of_nodes() - 1  # exclude center

    def get_community(self, node_key: str) -> Dict[str, Any]:
        """Return community_id and community_size for a node."""
        self._ensure_graph()
        if self._communities is None:
            self._compute_communities()
        cid = self._communities.get(node_key)  # type: ignore[union-attr]
        if cid is None:
            return {"community_id": None, "community_size": 0}
        size = self._community_sizes.get(cid, 0)  # type: ignore[union-attr]
        return {"community_id": cid, "community_size": size}

    def get_relationship_density(self, node_key: str) -> float:
        """Local neighborhood edge density. Returns 0 for empty/single-node cases."""
        G = self._ensure_graph()
        if node_key not in G:
            return 0.0
        ego = nx.ego_graph(G, node_key, radius=1)
        n = ego.number_of_nodes()
        if n <= 1:
            return 0.0
        max_edges = n * (n - 1) / 2
        return round(ego.number_of_edges() / max_edges, 4) if max_edges > 0 else 0.0

    def get_shared_entities(self, node_key: str) -> List[Dict[str, Any]]:
        """
        Find entities shared across multiple customers.

        For a customer node, find devices/addresses/products/coupons that are
        connected to other customers as well.  For non-customer nodes returns [].
        """
        G = self._ensure_graph()
        if node_key not in G:
            return []

        node_data = G.nodes[node_key]
        entity_type = node_data.get("entity_type", "")

        if entity_type != "customer":
            return []

        shared: List[Dict[str, Any]] = []
        shareable_types = {"device", "address", "product", "coupon"}

        for neighbor in G.neighbors(node_key):
            n_data = G.nodes[neighbor]
            n_type = n_data.get("entity_type", "")
            if n_type not in shareable_types:
                continue

            # Find other customers connected to this entity
            other_customers = []
            for nn in G.neighbors(neighbor):
                if nn == node_key:
                    continue
                nn_data = G.nodes[nn]
                # For devices/addresses: directly connected customers
                # For products/coupons: connected via orders, so nn would be an order
                if nn_data.get("entity_type") == "customer":
                    other_customers.append(nn_data.get("id", nn))

            if other_customers:
                shared.append({
                    "entity_type": n_type,
                    "entity_id": n_data.get("id", neighbor),
                    "shared_with_customers": other_customers,
                    "shared_count": len(other_customers),
                })

        return shared

    def get_suspicious_neighbor_count(
        self, node_key: str, suspicious_entities: Optional[Set[str]] = None
    ) -> int:
        """
        Count neighbours that appear in the suspicious set.

        If no suspicious set is provided, returns 0.
        The suspicious_entities set should contain node keys (e.g. "customer:cust_000001").
        """
        if suspicious_entities is None:
            return 0
        G = self._ensure_graph()
        if node_key not in G:
            return 0
        return sum(1 for n in G.neighbors(node_key) if n in suspicious_entities)

    # ------------------------------------------------------------------
    # Neighbors
    # ------------------------------------------------------------------

    def get_neighbors(
        self,
        node_key: str,
        depth: int = 1,
        entity_type_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Return connected entities within depth hops, with relationship info."""
        G = self._ensure_graph()
        if node_key not in G:
            return []

        ego = nx.ego_graph(G, node_key, radius=depth)
        neighbors: List[Dict[str, Any]] = []

        for node in ego.nodes():
            if node == node_key:
                continue
            n_data = G.nodes[node]
            n_type = n_data.get("entity_type", "")

            if entity_type_filter and n_type != entity_type_filter:
                continue

            # Find the relationship type(s) connecting this to the ego center
            # For direct neighbours, use the direct edge; for 2-hop, find the path
            relationship_types = []
            if G.has_edge(node_key, node):
                edge_data = G.edges[node_key, node]
                relationship_types.append(edge_data.get("relationship_type", "UNKNOWN"))
            else:
                # 2-hop: find shortest path and collect edge types along it
                try:
                    path = nx.shortest_path(G, node_key, node)
                    for i in range(len(path) - 1):
                        ed = G.edges[path[i], path[i + 1]]
                        relationship_types.append(ed.get("relationship_type", "UNKNOWN"))
                except nx.NetworkXNoPath:
                    pass

            neighbors.append({
                "entity_id": n_data.get("id", node),
                "entity_type": n_type,
                "node_key": node,
                "relationship_types": relationship_types,
                "hop_distance": nx.shortest_path_length(G, node_key, node) if nx.has_path(G, node_key, node) else depth,
            })

        return neighbors

    # ------------------------------------------------------------------
    # High-level API helpers
    # ------------------------------------------------------------------

    def get_summary(self) -> Dict[str, Any]:
        """Graph summary with counts by type, components, communities."""
        G = self._ensure_graph()

        nodes_by_type: Dict[str, int] = {}
        for _, attrs in G.nodes(data=True):
            t = attrs.get("entity_type", "unknown")
            nodes_by_type[t] = nodes_by_type.get(t, 0) + 1

        edges_by_type: Dict[str, int] = {}
        for _, _, attrs in G.edges(data=True):
            t = attrs.get("relationship_type", "UNKNOWN")
            edges_by_type[t] = edges_by_type.get(t, 0) + 1

        if self._communities is None:
            self._compute_communities()
        community_count = len(self._community_sizes) if self._community_sizes else 0

        return {
            "total_nodes": G.number_of_nodes(),
            "total_edges": G.number_of_edges(),
            "nodes_by_type": nodes_by_type,
            "edges_by_type": edges_by_type,
            "connected_components": nx.number_connected_components(G),
            "community_count": community_count,
        }

    def get_entity_analysis(self, entity_type: str, entity_id: str) -> Optional[Dict[str, Any]]:
        """Full entity analysis with all graph metrics."""
        node_key = f"{entity_type}:{entity_id}"
        G = self._ensure_graph()

        if node_key not in G:
            return None

        community = self.get_community(node_key)
        neighbors = self.get_neighbors(node_key, depth=1)

        return {
            "entity_id": entity_id,
            "entity_type": entity_type,
            "degree": self.get_degree(node_key),
            "neighborhood_size_1hop": self.get_neighborhood_size(node_key, 1),
            "neighborhood_size_2hop": self.get_neighborhood_size(node_key, 2),
            "community_id": community["community_id"],
            "community_size": community["community_size"],
            "relationship_density": self.get_relationship_density(node_key),
            "shared_entities": self.get_shared_entities(node_key),
            "suspicious_neighbor_count": self.get_suspicious_neighbor_count(node_key),
            "neighbors": neighbors,
        }

    def get_graph_data(self, limit: int = 500) -> Dict[str, Any]:
        """
        Return the full graph as React Flow-compatible nodes and edges.

        If the graph has more nodes than `limit`, returns a subgraph
        of the first `limit` nodes and their connecting edges.
        """
        G = self._ensure_graph()

        all_nodes = list(G.nodes(data=True))
        if limit and len(all_nodes) > limit:
            selected_node_keys = {n[0] for n in all_nodes[:limit]}
        else:
            selected_node_keys = {n[0] for n in all_nodes}

        nodes = []
        for node_key, attrs in all_nodes:
            if node_key not in selected_node_keys:
                continue
            nodes.append({
                "id": node_key,
                "entity_id": attrs.get("id", ""),
                "entity_type": attrs.get("entity_type", "unknown"),
            })

        edges = []
        edge_idx = 0
        for u, v, attrs in G.edges(data=True):
            if u in selected_node_keys and v in selected_node_keys:
                edges.append({
                    "id": f"e_{edge_idx}",
                    "source": u,
                    "target": v,
                    "relationship_type": attrs.get("relationship_type", "UNKNOWN"),
                })
                edge_idx += 1

        return {"nodes": nodes, "edges": edges}


# ---------------------------------------------------------------------------
# Module-level singleton instance
# ---------------------------------------------------------------------------

graph_service = GraphService()
