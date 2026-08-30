import pytest
import hmac
import hashlib
import json
from fastapi.testclient import TestClient
from app.main import app
from app.api.webhooks import normalize_razorpay_event, verify_signature
from app.services.graph_service import GraphService

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_stats_endpoint():
    response = client.get("/api/stats")
    assert response.status_code == 200
    data = response.json()
    assert "transaction_count" in data
    assert "customer_count" in data

def test_event_normalization():
    raw_event = {
        "event": "payment.captured",
        "created_at": 1700000000,
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_test123",
                    "amount": 5000
                }
            }
        }
    }
    normalized = normalize_razorpay_event(raw_event)
    assert normalized["event_type"] == "payment.captured"
    assert normalized["entity_type"] == "payment"
    assert normalized["entity_id"] == "pay_test123"
    assert normalized["source"] == "razorpay_webhook"

def test_webhook_signature_verification():
    secret = "test_secret_123"
    payload = b'{"test": "data"}'
    signature = hmac.new(secret.encode('utf-8'), payload, hashlib.sha256).hexdigest()
    
    assert verify_signature(payload, signature, secret) is True
    assert verify_signature(payload, "invalid_sig", secret) is False

def test_graph_construction():
    sample_data = {
        "customers": [{"id": "c1", "status": "active"}],
        "orders": [{"id": "o1", "customer_id": "c1", "coupon_id": None}],
        "payments": [{"id": "p1", "order_id": "o1", "amount": 100}],
        "refunds": [],
        "products": [],
        "devices": [],
        "addresses": [],
        "coupons": [],
        "customer_device": [],
        "customer_address": [],
        "order_product": [],
    }
    svc = GraphService()
    G = svc.build_graph_from_data(sample_data)
    assert G.number_of_nodes() == 3
    assert G.number_of_edges() == 2
