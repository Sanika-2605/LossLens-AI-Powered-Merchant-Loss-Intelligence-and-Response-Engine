"""
Investigator Tools & Service for LossLens.

Provides reusable backend investigation tools and synthesizes structured evidence into a comprehensive, factual investigation summary.
"""

import os
import json
from typing import Dict, Any, List, Optional
from app.services.evidence_engine import evidence_engine, load_dataset
from app.services.graph_service import graph_service

# ---------------------------------------------------------------------------
# Reusable Backend Investigator Tools
# ---------------------------------------------------------------------------

def get_cluster(pattern_id: str) -> Dict[str, Any]:
    """Retrieve raw cluster details for a pattern."""
    evidence = evidence_engine.get_evidence(pattern_id)
    return evidence.get("pattern_summary", {})

def get_customer_history(customer_id: str) -> Dict[str, Any]:
    """Retrieve full transaction, order, and refund history for a customer."""
    customers = load_dataset("customers")
    orders = load_dataset("orders")
    payments = load_dataset("payments")
    refunds = load_dataset("refunds")

    customer = next((c for c in customers if c.get("id") == customer_id), {"id": customer_id})
    cust_orders = [o for o in orders if o.get("customer_id") == customer_id]
    cust_payments = [p for p in payments if p.get("customer_id") == customer_id]
    cust_refunds = [r for r in refunds if r.get("customer_id") == customer_id]

    return {
        "customer": customer,
        "orders_count": len(cust_orders),
        "payments_count": len(cust_payments),
        "refunds_count": len(cust_refunds),
        "total_spent": round(sum(p.get("amount", 0) for p in cust_payments), 2),
        "total_refunded": round(sum(r.get("amount", 0) for r in cust_refunds), 2),
        "orders": cust_orders,
        "payments": cust_payments,
        "refunds": cust_refunds
    }

def get_transactions(entity_id: str) -> List[Dict[str, Any]]:
    """Retrieve payments linked to customer, order, device, or payment entity."""
    payments = load_dataset("payments")
    if entity_id.startswith("pay_") or entity_id.startswith("p_"):
        return [p for p in payments if p.get("id") == entity_id]
    elif entity_id.startswith("ord_") or entity_id.startswith("o_"):
        return [p for p in payments if p.get("order_id") == entity_id]
    else:
        return [p for p in payments if p.get("customer_id") == entity_id]

def get_shared_entities(entity_id: str) -> Dict[str, Any]:
    """Retrieve shared devices and addresses connected to an entity."""
    graph_service._ensure_graph()
    entity_type = "customer"
    if entity_id.startswith("dev_") or entity_id.startswith("d_"):
        entity_type = "device"
    elif entity_id.startswith("addr_") or entity_id.startswith("a_"):
        entity_type = "address"

    neighbors = graph_service.get_neighbors(f"{entity_type}:{entity_id}", depth=2)
    return {
        "entity_id": entity_id,
        "neighbors": neighbors
    }

def get_timeline(pattern_id: str) -> List[Dict[str, Any]]:
    """Retrieve ordered timeline of activity events for a pattern."""
    evidence = evidence_engine.get_evidence(pattern_id)
    return evidence.get("timeline", [])

def calculate_exposure(pattern_id: str) -> Dict[str, float]:
    """Calculate financial exposure metrics for a pattern."""
    evidence = evidence_engine.get_evidence(pattern_id)
    return evidence.get("financial_values", {})

def get_previous_alerts(entity_id: str) -> List[Dict[str, Any]]:
    """Retrieve historical alert events recorded for an entity."""
    events = load_dataset("events")
    return [e for e in events if e.get("entity_id") == entity_id or e.get("payload", {}).get("customer_id") == entity_id]

# ---------------------------------------------------------------------------
# Investigator Service
# ---------------------------------------------------------------------------

class InvestigatorService:
    def generate_investigation(self, pattern_id: str) -> Dict[str, Any]:
        """
        Synthesize evidence into a factual, structured investigation object.
        """
        evidence = evidence_engine.get_evidence(pattern_id)
        if not evidence:
            return {
                "what_happened": "Pattern not found",
                "why_suspicious": "No evidence retrieved",
                "entity_connections": "None",
                "when_started": "Unknown",
                "growth_rate": 0.0,
                "financial_impact": {},
                "alternative_explanations": [],
                "recommended_action": "MONITOR"
            }

        entities = evidence.get("entities", {})
        cust_count = len(entities.get("customers", []))
        dev_count = len(entities.get("devices", []))
        addr_count = len(entities.get("addresses", []))
        refund_count = len(entities.get("refunds", []))
        payment_count = len(entities.get("payments", []))

        fin = evidence.get("financial_values", {})
        current_exp = fin.get("current_exposure", 0.0)
        potential_exp = fin.get("potential_exposure", 0.0)
        expected_loss = fin.get("expected_loss", 0.0)
        refund_ratio = fin.get("refund_ratio", 0.0)

        timeline = evidence.get("timeline", [])
        when_started = timeline[0]["timestamp"] if timeline else "Unknown"

        loss_vel = evidence.get("pattern_summary", {}).get("loss_velocity", 0.0)

        # Factual summary strings grounded strictly in evidence
        what_happened = (
            f"Pattern {pattern_id} involves {cust_count} customer(s) using {dev_count} device(s) "
            f"and {addr_count} address(es), generating {payment_count} transactions and {refund_count} refund requests."
        )

        why_suspicious = (
            f"Anomalous cluster detected with refund ratio of {round(refund_ratio * 100, 1)}% "
            f"(total refund volume: ${fin.get('total_refund_volume', 0)} across {refund_count} refunds). "
            f"Shared device connections indicate potential multi-account coordination."
        )

        entity_connections = (
            f"{cust_count} customers linked via {dev_count} shared device fingerprint(s) "
            f"and {addr_count} shipping address(es)."
        )

        recommended_action = "MANUAL_REVIEW"
        risk_score = evidence.get("pattern_summary", {}).get("risk_score", 0.0)
        if risk_score > 90:
            recommended_action = "APPROVAL_REQUIRED"
        elif risk_score >= 70:
            recommended_action = "MANUAL_REVIEW"
        elif risk_score >= 50:
            recommended_action = "VERIFY"
        else:
            recommended_action = "MONITOR"

        return {
            "pattern_id": pattern_id,
            "what_happened": what_happened,
            "why_suspicious": why_suspicious,
            "entity_connections": entity_connections,
            "when_started": str(when_started),
            "growth_rate": float(loss_vel),
            "financial_impact": {
                "current_exposure": current_exp,
                "potential_exposure": potential_exp,
                "expected_loss": expected_loss,
                "refund_ratio": refund_ratio
            },
            "alternative_explanations": [
                "Legitimate family or household sharing single device/address",
                "Promotional event causing high transaction and return volume"
            ],
            "recommended_action": recommended_action
        }

investigator_service = InvestigatorService()
