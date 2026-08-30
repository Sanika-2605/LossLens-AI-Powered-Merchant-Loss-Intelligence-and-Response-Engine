from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class CustomerBase(BaseModel):
    id: str
    external_id: str
    status: str

class CustomerOut(CustomerBase):
    created_at: datetime
    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    id: str
    customer_id: str
    order_reference: str
    total_amount: float
    currency: str
    status: str
    coupon_id: Optional[str] = None

class OrderOut(OrderBase):
    created_at: datetime
    class Config:
        from_attributes = True

class PaymentBase(BaseModel):
    id: str
    order_id: str
    customer_id: str
    amount: float
    currency: str
    status: str
    payment_method: str
    provider: str
    provider_payment_id: str
    metadata_json: Optional[Dict[str, Any]] = None

class PaymentOut(PaymentBase):
    created_at: datetime
    class Config:
        from_attributes = True

class RefundBase(BaseModel):
    id: str
    payment_id: str
    order_id: str
    customer_id: str
    amount: float
    status: str
    reason: str

class RefundOut(RefundBase):
    created_at: datetime
    class Config:
        from_attributes = True

class EventBase(BaseModel):
    id: str
    event_type: str
    entity_type: str
    entity_id: str
    source: str
    payload: Optional[Dict[str, Any]] = None

class EventOut(EventBase):
    event_timestamp: datetime
    class Config:
        from_attributes = True

class GraphSummary(BaseModel):
    nodes: int
    edges: int
    node_counts_by_type: Dict[str, int]
    edge_counts_by_type: Dict[str, int]
    connected_components: int
