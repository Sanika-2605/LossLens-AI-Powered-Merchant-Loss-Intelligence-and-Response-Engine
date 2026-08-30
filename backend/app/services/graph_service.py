import os
import json
import networkx as nx
from typing import Dict, Any

_graph_cache = None

def load_local_data():
    data_dir = 'data/generated'
    files = ['customers', 'orders', 'payments', 'refunds', 'products', 'devices', 'addresses', 'coupons', 'customer_device', 'customer_address', 'order_product']
    data = {}
    for f in files:
        p = os.path.join(data_dir, f"{f}.json")
        if os.path.exists(p):
            with open(p, 'r') as fp:
                data[f] = json.load(fp)
        else:
            data[f] = []
    return data

def build_merchant_graph(data_source=None) -> nx.Graph:
    global _graph_cache
    
    if data_source is None:
        data_source = load_local_data()

    G = nx.Graph()

    # Add Nodes
    for c in data_source.get('customers', []):
        G.add_node(f"Customer:{c['id']}", type='Customer', **c)

    for o in data_source.get('orders', []):
        G.add_node(f"Order:{o['id']}", type='Order', **o)

    for p in data_source.get('payments', []):
        G.add_node(f"Payment:{p['id']}", type='Payment', **p)

    for r in data_source.get('refunds', []):
        G.add_node(f"Refund:{r['id']}", type='Refund', **r)

    for pr in data_source.get('products', []):
        G.add_node(f"Product:{pr['id']}", type='Product', **pr)

    for d in data_source.get('devices', []):
        G.add_node(f"Device:{d['id']}", type='Device', **d)

    for a in data_source.get('addresses', []):
        G.add_node(f"Address:{a['id']}", type='Address', **a)

    for cp in data_source.get('coupons', []):
        G.add_node(f"Coupon:{cp['id']}", type='Coupon', **cp)

    # Add Edges
    for o in data_source.get('orders', []):
        if o.get('customer_id'):
            G.add_edge(f"Customer:{o['customer_id']}", f"Order:{o['id']}", relation='PLACED')
        if o.get('coupon_id'):
            G.add_edge(f"Order:{o['id']}", f"Coupon:{o['coupon_id']}", relation='USED_COUPON')

    for p in data_source.get('payments', []):
        if p.get('order_id'):
            G.add_edge(f"Order:{p['order_id']}", f"Payment:{p['id']}", relation='PAYMENT_FOR')

    for r in data_source.get('refunds', []):
        if r.get('payment_id'):
            G.add_edge(f"Payment:{r['payment_id']}", f"Refund:{r['id']}", relation='REFUNDED_BY')

    for cd in data_source.get('customer_device', []):
        G.add_edge(f"Customer:{cd['customer_id']}", f"Device:{cd['device_id']}", relation='USED_DEVICE')

    for ca in data_source.get('customer_address', []):
        G.add_edge(f"Customer:{ca['customer_id']}", f"Address:{ca['address_id']}", relation='ASSOCIATED_ADDRESS')

    for op in data_source.get('order_product', []):
        G.add_edge(f"Order:{op['order_id']}", f"Product:{op['product_id']}", relation='CONTAINS_PRODUCT')

    _graph_cache = G
    return G

def get_graph_summary() -> Dict[str, Any]:
    global _graph_cache
    if _graph_cache is None:
        _graph_cache = build_merchant_graph()
    
    G = _graph_cache
    
    node_counts = {}
    for _, attrs in G.nodes(data=True):
        ntype = attrs.get('type', 'Unknown')
        node_counts[ntype] = node_counts.get(ntype, 0) + 1

    edge_counts = {}
    for _, _, attrs in G.edges(data=True):
        rel = attrs.get('relation', 'UNKNOWN')
        edge_counts[rel] = edge_counts.get(rel, 0) + 1

    return {
        "nodes": G.number_of_nodes(),
        "edges": G.number_of_edges(),
        "node_counts_by_type": node_counts,
        "edge_counts_by_type": edge_counts,
        "connected_components": nx.number_connected_components(G)
    }

def get_entity_subgraph(entity_type: str, entity_id: str, depth: int = 2) -> Dict[str, Any]:
    global _graph_cache
    if _graph_cache is None:
        _graph_cache = build_merchant_graph()
    
    G = _graph_cache
    target_node = f"{entity_type.capitalize()}:{entity_id}"
    
    if target_node not in G:
        return {"nodes": [], "edges": [], "entity": None}

    # Extract ego graph
    subG = nx.ego_graph(G, target_node, radius=depth)

    nodes_data = []
    for node, attrs in subG.nodes(data=True):
        nodes_data.append({"id": node, **attrs})

    edges_data = []
    for u, v, attrs in subG.edges(data=True):
        edges_data.append({"source": u, "target": v, **attrs})

    return {
        "entity": {"id": target_node, **G.nodes[target_node]},
        "nodes": nodes_data,
        "edges": edges_data
    }
