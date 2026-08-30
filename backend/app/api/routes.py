import os
import json
from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from app.services.graph_service import graph_service

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
