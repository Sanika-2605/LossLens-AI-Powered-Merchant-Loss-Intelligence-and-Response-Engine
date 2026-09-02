"""
Evidence Engine for LossLens.

Extracts real, structured evidence for discovered loss patterns across:
- transactions (payments)
- customers
- devices
- addresses
- products
- orders
- payments
- refunds
- coupons
- timestamps
- behavioural & graph changes

Every risk component maps directly to underlying empirical evidence.
"""

import os
import json
from typing import Dict, Any, List
from app.services.discovery_service import discovery_service
from app.services.graph_service import graph_service

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data/generated"))

def load_dataset(filename: str) -> list:
    candidates = [
        os.path.join(BASE_DIR, f"{filename}.json"),
        os.path.join("data", "generated", f"{filename}.json"),
        os.path.join("..", "data", "generated", f"{filename}.json")
    ]
    for filepath in candidates:
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as fp:
                return json.load(fp)
    return []

class EvidenceEngine:
    def __init__(self):
        pass

    def get_evidence(self, pattern_id: str) -> Dict[str, Any]:
        """
        Retrieve structured evidence for a pattern.
        """
        details = discovery_service.get_pattern_details(pattern_id)
        if not details or "pattern" not in details:
            return {}

        pattern = details["pattern"]
        customer_ids = set(pattern.get("customer_ids", []))

        # Load raw entities
        all_customers = load_dataset("customers")
        all_orders = load_dataset("orders")
        all_payments = load_dataset("payments")
        all_refunds = load_dataset("refunds")
        all_devices = load_dataset("devices")
        all_addresses = load_dataset("addresses")
        all_products = load_dataset("products")
        all_coupons = load_dataset("coupons")
        cust_dev = load_dataset("customer_device")
        cust_addr = load_dataset("customer_address")
        ord_prod = load_dataset("order_product")

        # Filter entities associated with pattern customers
        customers = [c for c in all_customers if c.get("id") in customer_ids]
        orders = [o for o in all_orders if o.get("customer_id") in customer_ids]
        order_ids = set(o.get("id") for o in orders)

        payments = [p for p in all_payments if p.get("customer_id") in customer_ids or p.get("order_id") in order_ids]
        payment_ids = set(p.get("id") for p in payments)

        refunds = [r for r in all_refunds if r.get("customer_id") in customer_ids or r.get("payment_id") in payment_ids or r.get("order_id") in order_ids]

        # Connected devices & addresses
        device_ids = set(cd["device_id"] for cd in cust_dev if cd["customer_id"] in customer_ids)
        devices = [d for d in all_devices if d.get("id") in device_ids]

        address_ids = set(ca["address_id"] for ca in cust_addr if ca["customer_id"] in customer_ids)
        addresses = [a for a in all_addresses if a.get("id") in address_ids]

        # Connected products & coupons
        product_ids = set(op["product_id"] for op in ord_prod if op["order_id"] in order_ids)
        products = [pr for pr in all_products if pr.get("id") in product_ids]

        coupon_ids = set(o.get("coupon_id") for o in orders if o.get("coupon_id"))
        coupons = [cp for cp in all_coupons if cp.get("id") in coupon_ids]

        # Build graph relationships
        graph_service._ensure_graph()
        G = graph_service._graph
        relationships = []
        pattern_node_keys = set()
        for cid in customer_ids:
            pattern_node_keys.add(f"customer:{cid}")
        for oid in order_ids:
            pattern_node_keys.add(f"order:{oid}")
        for pid in payment_ids:
            pattern_node_keys.add(f"payment:{pid}")
        for did in device_ids:
            pattern_node_keys.add(f"device:{did}")
        for aid in address_ids:
            pattern_node_keys.add(f"address:{aid}")

        if G is not None:
            for u, v, data in G.edges(data=True):
                if u in pattern_node_keys or v in pattern_node_keys:
                    relationships.append({
                        "source": u,
                        "target": v,
                        "relationship_type": data.get("relationship_type", "CONNECTED_TO")
                    })

        # Financial values calculations
        total_payment_vol = sum(p.get("amount", 0.0) for p in payments)
        total_refund_vol = sum(r.get("amount", 0.0) for r in refunds)
        refund_ratio = (total_refund_vol / total_payment_vol) if total_payment_vol > 0 else 0.0
        avg_order_val = (total_payment_vol / len(payments)) if len(payments) > 0 else 0.0

        # Timeline assembly
        timeline_events = []
        for c in customers:
            if c.get("created_at"):
                timeline_events.append({
                    "timestamp": c["created_at"],
                    "event_type": "CUSTOMER_CREATED",
                    "entity_id": c["id"],
                    "description": f"Customer {c['id']} registered"
                })
        for o in orders:
            if o.get("created_at"):
                timeline_events.append({
                    "timestamp": o["created_at"],
                    "event_type": "ORDER_PLACED",
                    "entity_id": o["id"],
                    "description": f"Order {o['id']} placed for amount {o.get('total_amount')}"
                })
        for p in payments:
            if p.get("created_at"):
                timeline_events.append({
                    "timestamp": p["created_at"],
                    "event_type": "PAYMENT_PROCESSED",
                    "entity_id": p["id"],
                    "description": f"Payment {p['id']} processed ({p.get('status')}) for amount {p.get('amount')}"
                })
        for r in refunds:
            if r.get("created_at"):
                timeline_events.append({
                    "timestamp": r["created_at"],
                    "event_type": "REFUND_ISSUED",
                    "entity_id": r["id"],
                    "description": f"Refund {r['id']} requested for amount {r.get('amount')}"
                })

        timeline_events = sorted(timeline_events, key=lambda x: str(x.get("timestamp", "")))

        # Temporal signals
        timestamps = [str(ev["timestamp"]) for ev in timeline_events if ev.get("timestamp")]
        first_seen = timestamps[0] if timestamps else None
        latest_seen = timestamps[-1] if timestamps else None

        # Build risk evidence mapping
        risk_evidence_map = {
            "transaction_risk": {
                "risk_component": "transaction_risk",
                "score": pattern.get("metrics", {}).get("transaction_anomaly", 0.0),
                "supporting_evidence": [f"Payment ID {p['id']} amount {p.get('amount')}" for p in payments[:5]],
                "evidence_count": len(payments)
            },
            "refund_risk": {
                "risk_component": "refund_risk",
                "score": round(refund_ratio * 100, 2),
                "supporting_evidence": [f"Refund ID {r['id']} amount {r.get('amount')}" for r in refunds[:5]],
                "evidence_count": len(refunds),
                "refund_ratio": round(refund_ratio, 4)
            },
            "graph_risk": {
                "risk_component": "graph_risk",
                "score": pattern.get("metrics", {}).get("graph_anomaly", 0.0),
                "supporting_evidence": [f"Shared device ID {d['id']}" for d in devices] + [f"Shared address ID {a['id']}" for a in addresses],
                "evidence_count": len(devices) + len(addresses)
            },
            "temporal_risk": {
                "risk_component": "temporal_risk",
                "score": pattern.get("metrics", {}).get("temporal_anomaly", 0.0),
                "supporting_evidence": [f"Activity timeline spans {first_seen} to {latest_seen}"],
                "evidence_count": len(timeline_events)
            }
        }

        return {
            "pattern_id": pattern_id,
            "pattern_summary": pattern,
            "entities": {
                "customers": customers,
                "devices": devices,
                "addresses": addresses,
                "orders": orders,
                "payments": payments,
                "refunds": refunds,
                "products": products,
                "coupons": coupons
            },
            "relationships": relationships,
            "transactions": payments,
            "financial_values": {
                "current_exposure": pattern.get("current_exposure", total_payment_vol),
                "potential_exposure": pattern.get("potential_exposure", total_payment_vol * 1.5),
                "expected_loss": pattern.get("expected_loss", total_refund_vol),
                "total_payment_volume": round(total_payment_vol, 2),
                "total_refund_volume": round(total_refund_vol, 2),
                "refund_ratio": round(refund_ratio, 4),
                "avg_order_value": round(avg_order_val, 2)
            },
            "timeline": timeline_events,
            "behavioural_signals": {
                "shared_device_count": len(devices),
                "shared_address_count": len(addresses),
                "refund_burst_detected": len(refunds) > 3 or refund_ratio > 0.3,
                "high_velocity_detected": pattern.get("loss_velocity", 0.0) > 10.0,
                "unusual_coupon_usage": len(coupons) > 0
            },
            "graph_signals": {
                "connected_customers": len(customers),
                "connected_devices": len(devices),
                "connected_addresses": len(addresses),
                "total_relationships": len(relationships)
            },
            "temporal_signals": {
                "first_seen": first_seen,
                "latest_seen": latest_seen,
                "total_events": len(timeline_events)
            },
            "risk_evidence_map": risk_evidence_map
        }

evidence_engine = EvidenceEngine()
