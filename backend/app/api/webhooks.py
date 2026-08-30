import hmac
import hashlib
import json
import os
import datetime
from fastapi import APIRouter, Request, HTTPException, Header, status
from app.config import settings

router = APIRouter()

EVENTS_LOG_FILE = 'data/generated/events.json'

def append_local_event(event_dict):
    events = []
    if os.path.exists(EVENTS_LOG_FILE):
        try:
            with open(EVENTS_LOG_FILE, 'r') as fp:
                events = json.load(fp)
        except Exception:
            events = []
    events.append(event_dict)
    with open(EVENTS_LOG_FILE, 'w') as fp:
        json.dump(events, fp, indent=2)

def verify_signature(payload_body: bytes, signature: str, secret: str) -> bool:
    if not secret:
        return True  # Fallback for testing when secret is not configured
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload_body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected_signature, signature)

def normalize_razorpay_event(raw_event: dict) -> dict:
    event_name = raw_event.get('event', 'unknown.event')
    payload = raw_event.get('payload', {})
    
    entity_type = 'unknown'
    entity_id = 'unknown'
    
    if 'payment' in payload:
        entity_type = 'payment'
        entity_id = payload['payment']['entity'].get('id', 'unknown')
    elif 'order' in payload:
        entity_type = 'order'
        entity_id = payload['order']['entity'].get('id', 'unknown')
    elif 'refund' in payload:
        entity_type = 'refund'
        entity_id = payload['refund']['entity'].get('id', 'unknown')

    return {
        "id": f"evt_rzp_{raw_event.get('created_at', int(datetime.datetime.utcnow().timestamp()))}",
        "event_type": event_name,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "event_timestamp": datetime.datetime.fromtimestamp(
            raw_event.get('created_at', datetime.datetime.utcnow().timestamp())
        ).isoformat(),
        "source": "razorpay_webhook",
        "payload": raw_event
    }

@router.post("/webhooks/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None)
):
    body = await request.body()
    
    # Signature Verification
    if settings.RAZORPAY_WEBHOOK_SECRET and x_razorpay_signature:
        if not verify_signature(body, x_razorpay_signature, settings.RAZORPAY_WEBHOOK_SECRET):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Razorpay Webhook Signature"
            )

    try:
        raw_event = json.loads(body.decode('utf-8'))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON body"
        )

    normalized = normalize_razorpay_event(raw_event)
    
    # Store normalized event
    append_local_event(normalized)

    return {"status": "success", "event_id": normalized["id"]}
