import os
import json
from fastapi import APIRouter, Query, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from app.services.graph_service import graph_service
from app.services.discovery_service import discovery_service
from app.services.evidence_engine import evidence_engine
from app.services.explainability import explainability_service
from app.services.investigator import investigator_service
from app.services.hypothesis_engine import hypothesis_engine
from app.ml.loss_forecaster import loss_forecaster
from app.services.simulator import simulator
from app.services.decision_engine import decision_engine
from app.services.audit_service import audit_service
from app.services.action_service import action_service
from app.services.feedback_service import feedback_service
from app.services.pattern_evolution import pattern_evolution_service
from app.ml.evaluator import evaluator

class DecisionRequest(BaseModel):
    user_id: Optional[str] = "merchant_admin"
    reason: Optional[str] = ""
    modified_action: Optional[str] = None

class ActionRequest(BaseModel):
    action_name: str
    user_id: Optional[str] = "merchant_admin"
    reason: Optional[str] = ""

class FeedbackRequest(BaseModel):
    feedback_type: str
    notes: Optional[str] = ""
    user_id: Optional[str] = "merchant_admin"

router = APIRouter()

DATA_DIR = 'data/generated'

def load_dataset(filename: str):
    filepath = os.path.join(DATA_DIR, f"{filename}.json")
    if os.path.exists(filepath):
        with open(filepath, 'r') as fp:
            return json.load(fp)
    return []

@router.get("/stats")
async def get_stats():
    payments = load_dataset('payments')
    customers = load_dataset('customers')
    orders = load_dataset('orders')
    refunds = load_dataset('refunds')
    devices = load_dataset('devices')
    addresses = load_dataset('addresses')
    events = load_dataset('events')

    total_value = sum(p.get('amount', 0) for p in payments if p.get('status') == 'captured')
    refund_value = sum(r.get('amount', 0) for r in refunds)

    return {
        "transaction_count": len(payments),
        "transaction_value": round(total_value, 2),
        "customer_count": len(customers),
        "order_count": len(orders),
        "refund_count": len(refunds),
        "refund_value": round(refund_value, 2),
        "device_count": len(devices),
        "address_count": len(addresses),
        "event_count": len(events)
    }

@router.get("/customers")
async def get_customers(limit: int = Query(50, ge=1, le=500), offset: int = Query(0, ge=0)):
    customers = load_dataset('customers')
    return {"total": len(customers), "data": customers[offset:offset+limit]}

@router.get("/orders")
async def get_orders(limit: int = Query(50, ge=1, le=500), offset: int = Query(0, ge=0)):
    orders = load_dataset('orders')
    return {"total": len(orders), "data": orders[offset:offset+limit]}

@router.get("/payments")
async def get_payments(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    status: Optional[str] = None,
    payment_method: Optional[str] = None
):
    payments = load_dataset('payments')
    if status:
        payments = [p for p in payments if p.get('status') == status]
    if payment_method:
        payments = [p for p in payments if p.get('payment_method') == payment_method]

    return {"total": len(payments), "data": payments[offset:offset+limit]}

@router.get("/refunds")
async def get_refunds(limit: int = Query(50, ge=1, le=500), offset: int = Query(0, ge=0)):
    refunds = load_dataset('refunds')
    return {"total": len(refunds), "data": refunds[offset:offset+limit]}

@router.get("/events")
async def get_events(limit: int = Query(50, ge=1, le=500), offset: int = Query(0, ge=0)):
    events = load_dataset('events')
    # Return latest events first
    sorted_events = sorted(events, key=lambda x: x.get('event_timestamp', ''), reverse=True)
    return {"total": len(sorted_events), "data": sorted_events[offset:offset+limit]}


# ---------------------------------------------------------------------------
# Graph Intelligence APIs
# ---------------------------------------------------------------------------

@router.get("/graph/summary")
async def graph_summary():
    """Graph summary with node/edge counts, components, and communities."""
    return graph_service.get_summary()


@router.get("/graph/entities/{entity_type}/{entity_id}/neighbors")
async def graph_entity_neighbors(
    entity_type: str,
    entity_id: str,
    depth: int = Query(1, ge=1, le=2),
    entity_type_filter: Optional[str] = Query(None, alias="entity_type"),
):
    """Return real connected entities and relationship types within depth hops."""
    node_key = f"{entity_type}:{entity_id}"
    # Ensure graph is loaded
    graph_service._ensure_graph()
    if node_key not in graph_service._graph:
        raise HTTPException(status_code=404, detail="Entity not found in graph")

    neighbors = graph_service.get_neighbors(
        node_key, depth=depth, entity_type_filter=entity_type_filter
    )
    return {"entity_id": entity_id, "entity_type": entity_type, "depth": depth, "neighbors": neighbors}


@router.get("/graph/entities/{entity_type}/{entity_id}")
async def graph_entity_analysis(entity_type: str, entity_id: str):
    """Full entity analysis with all graph metrics."""
    result = graph_service.get_entity_analysis(entity_type, entity_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Entity not found in graph")
    return result


@router.get("/graph")
async def graph_data(limit: int = Query(500, ge=1, le=10000)):
    """Return the full graph as React Flow-compatible nodes and edges."""
    return graph_service.get_graph_data(limit=limit)


@router.post("/graph/refresh")
async def graph_refresh():
    """Refresh the in-memory graph cache from current Supabase data."""
    result = graph_service.refresh()
    return result


# ---------------------------------------------------------------------------
# ML Discovery Engine APIs
# ---------------------------------------------------------------------------

# @router.post("/discovery/discover")
# async def trigger_discovery():
#     """Trigger the ML pattern discovery pipeline."""
#     result = discovery_service.run_pipeline()
#     if result.get("status") == "error":
#         raise HTTPException(status_code=500, detail=result.get("message"))
#     return result

@router.post("/discovery/discover")
async def trigger_discovery():
    """Trigger the ML pattern discovery pipeline."""

    result = discovery_service.run_pipeline()

    print("DISCOVERY PIPELINE RESULT:", result)

    if result.get("status") == "error":
        raise HTTPException(
            status_code=500,
            detail=result.get("message")
        )

    return result


@router.get("/discovery/patterns")
async def get_patterns():
    """Get all discovered patterns (clusters of suspicious activities)."""
    return discovery_service.get_patterns()


@router.get("/discovery/patterns/{pattern_id}")
async def get_pattern_details(pattern_id: str):
    """Get detailed transaction and customer information for a pattern."""
    result = discovery_service.get_pattern_details(pattern_id)
    if not result:
        raise HTTPException(status_code=404, detail="Pattern not found")
    return result


# ---------------------------------------------------------------------------
# Explainable Investigation & Decision Intelligence APIs
# ---------------------------------------------------------------------------

@router.get("/investigation/{pattern_id}")
async def get_investigation(pattern_id: str):
    """Full structured investigation summary for a pattern."""
    inv = investigator_service.generate_investigation(pattern_id)
    if not inv or inv.get("what_happened") == "Pattern not found":
        raise HTTPException(status_code=404, detail="Pattern not found")
    return inv

@router.get("/investigation/{pattern_id}/evidence")
async def get_investigation_evidence(pattern_id: str):
    """Structured evidence object with entity map, financial metrics, and relationships."""
    ev = evidence_engine.get_evidence(pattern_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Pattern evidence not found")
    return ev

@router.get("/investigation/{pattern_id}/timeline")
async def get_investigation_timeline(pattern_id: str):
    """Ordered activity timeline for pattern entities."""
    ev = evidence_engine.get_evidence(pattern_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Pattern timeline not found")
    return {"pattern_id": pattern_id, "timeline": ev.get("timeline", [])}

@router.get("/investigation/{pattern_id}/explanation")
async def get_investigation_explanation(pattern_id: str):
    """Transparent risk score contribution breakdown."""
    exp = explainability_service.get_explanation(pattern_id)
    if not exp or not exp.get("contributions"):
        raise HTTPException(status_code=404, detail="Pattern explanation not found")
    return exp

@router.get("/investigation/{pattern_id}/forecast")
async def get_investigation_forecast(pattern_id: str):
    """7-day and 30-day loss forecasting based on velocity and exposure."""
    fc = loss_forecaster.forecast_loss(pattern_id)
    return fc

@router.get("/investigation/{pattern_id}/simulation")
async def get_investigation_simulation(pattern_id: str):
    """Counterfactual action simulator comparing intervention outcomes."""
    sims = simulator.simulate_interventions(pattern_id)
    return {"pattern_id": pattern_id, "simulations": sims}

@router.get("/investigation/{pattern_id}/decision")
async def get_investigation_decision(pattern_id: str):
    """Synthesized policy & decision engine recommendation."""
    dec = decision_engine.make_decision(pattern_id)
    return dec

@router.get("/investigation/{pattern_id}/hypotheses")
async def get_investigation_hypotheses(pattern_id: str):
    """Surfaced primary hypothesis and alternative explanations."""
    hyp = hypothesis_engine.generate_hypotheses(pattern_id)
    return hyp

@router.get("/investigation/{pattern_id}/audit")
async def get_investigation_audit(pattern_id: str):
    """Audit trail of merchant decisions for a pattern."""
    logs = audit_service.get_audit_trail(pattern_id)
    return {"pattern_id": pattern_id, "audit_trail": logs}


# ---------------------------------------------------------------------------
# Merchant Decision Approval Endpoints
# ---------------------------------------------------------------------------

@router.post("/investigation/{pattern_id}/approve")
async def approve_investigation(pattern_id: str, body: DecisionRequest = Body(default_factory=DecisionRequest)):
    dec = decision_engine.make_decision(pattern_id)
    record = audit_service.record_decision(
        pattern_id=pattern_id,
        decision="APPROVED",
        user_id=body.user_id or "merchant_admin",
        previous_recommendation=dec.get("recommended_action", ""),
        modified_action=body.modified_action or dec.get("recommended_action", "APPROVED"),
        reason=body.reason or "Merchant approved recommended action."
    )
    return {"status": "success", "message": "Recommendation approved", "record": record}

@router.post("/investigation/{pattern_id}/reject")
async def reject_investigation(pattern_id: str, body: DecisionRequest = Body(default_factory=DecisionRequest)):
    dec = decision_engine.make_decision(pattern_id)
    record = audit_service.record_decision(
        pattern_id=pattern_id,
        decision="REJECTED",
        user_id=body.user_id or "merchant_admin",
        previous_recommendation=dec.get("recommended_action", ""),
        modified_action="NO_ACTION",
        reason=body.reason or "Merchant rejected recommended action."
    )
    return {"status": "success", "message": "Recommendation rejected", "record": record}

@router.post("/investigation/{pattern_id}/modify")
async def modify_investigation(pattern_id: str, body: DecisionRequest = Body(default_factory=DecisionRequest)):
    dec = decision_engine.make_decision(pattern_id)
    record = audit_service.record_decision(
        pattern_id=pattern_id,
        decision="MODIFIED",
        user_id=body.user_id or "merchant_admin",
        previous_recommendation=dec.get("recommended_action", ""),
        modified_action=body.modified_action or "VERIFY",
        reason=body.reason or "Merchant modified action."
    )
    return {"status": "success", "message": "Recommendation modified", "record": record}

@router.post("/investigation/{pattern_id}/escalate")
async def escalate_investigation(pattern_id: str, body: DecisionRequest = Body(default_factory=DecisionRequest)):
    dec = decision_engine.make_decision(pattern_id)
    record = audit_service.record_decision(
        pattern_id=pattern_id,
        decision="ESCALATED",
        user_id=body.user_id or "merchant_admin",
        previous_recommendation=dec.get("recommended_action", ""),
        modified_action="ESCALATED_TO_COMPLIANCE",
        reason=body.reason or "Escalated to legal/compliance team."
    )
    return {"status": "success", "message": "Investigation escalated", "record": record}

@router.post("/investigation/{pattern_id}/dismiss")
async def dismiss_investigation(pattern_id: str, body: DecisionRequest = Body(default_factory=DecisionRequest)):
    dec = decision_engine.make_decision(pattern_id)
    record = audit_service.record_decision(
        pattern_id=pattern_id,
        decision="DISMISSED",
        user_id=body.user_id or "merchant_admin",
        previous_recommendation=dec.get("recommended_action", ""),
        modified_action="DISMISSED",
        reason=body.reason or "Dismissed as legitimate activity."
    )
    return {"status": "success", "message": "Investigation dismissed", "record": record}


# ---------------------------------------------------------------------------
# Closed Loop: Test Actions, Merchant Feedback, Evolution & Evaluation
# ---------------------------------------------------------------------------

@router.post("/investigation/{pattern_id}/act")
async def execute_test_action(pattern_id: str, body: ActionRequest):
    """Execute policy-controlled test action."""
    res = action_service.execute_action(
        pattern_id=pattern_id,
        action_name=body.action_name,
        user_id=body.user_id or "merchant_admin",
        reason=body.reason or ""
    )
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res

@router.post("/investigation/{pattern_id}/feedback")
async def record_merchant_feedback(pattern_id: str, body: FeedbackRequest):
    """Record merchant feedback (TRUE_POSITIVE, FALSE_POSITIVE, LEGITIMATE, CONFIRMED_ABUSE)."""
    res = feedback_service.record_feedback(
        pattern_id=pattern_id,
        feedback_type=body.feedback_type,
        notes=body.notes or "",
        user_id=body.user_id or "merchant_admin"
    )
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res

@router.get("/investigation/{pattern_id}/outcome")
async def get_investigation_outcome(pattern_id: str):
    """Compare expected vs observed outcome post-intervention."""
    fc = loss_forecaster.forecast_loss(pattern_id)
    ev = pattern_evolution_service.get_pattern_evolution(pattern_id)
    aud = audit_service.get_audit_trail(pattern_id)
    fb = feedback_service.get_feedback(pattern_id)

    expected_loss = fc.get("30_day_forecast", 0.0)
    observed_exposure = fc.get("observed_exposure", 0.0)
    latest_action = aud[-1] if aud else None

    return {
        "pattern_id": pattern_id,
        "expected_loss_30d": expected_loss,
        "observed_exposure": observed_exposure,
        "expected_recovered_value": round(expected_loss * 0.8, 2),
        "actual_recovered_value": round(observed_exposure * 0.75, 2) if latest_action else 0.0,
        "latest_intervention": latest_action,
        "merchant_feedback": fb,
        "evolution": ev.get("post_intervention_activity", {})
    }

@router.get("/investigation/{pattern_id}/evolution")
async def get_pattern_evolution(pattern_id: str):
    """Track pattern risk, exposure, transaction count, refund count, affected customers over time."""
    return pattern_evolution_service.get_pattern_evolution(pattern_id)

@router.get("/evaluation")
async def run_evaluation():
    """Held-out statistical evaluation pipeline across patterns & legitimate test scenarios."""
    return evaluator.run_evaluation()
