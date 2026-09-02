"""
Feedback Service for LossLens.

Records merchant investigation feedback:
- TRUE_POSITIVE
- FALSE_POSITIVE
- LEGITIMATE
- CONFIRMED_ABUSE

Stores feedback persistently in data/generated/merchant_feedback.json for held-out evaluation.
Does NOT automatically retrain live ML models.
"""

import os
import json
import datetime
from typing import Dict, Any, List

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data/generated"))
FEEDBACK_FILE = os.path.join(BASE_DIR, "merchant_feedback.json")

VALID_FEEDBACK_TYPES = {
    "TRUE_POSITIVE": "Confirmed risk pattern - Correctly surfaced suspicious cluster",
    "FALSE_POSITIVE": "False positive alert - Legitimate customer activity incorrectly flagged",
    "LEGITIMATE": "Verified legitimate merchant customer / promotional buyer",
    "CONFIRMED_ABUSE": "Confirmed fraud or policy abuse - Action taken"
}

class FeedbackService:
    def __init__(self):
        self._ensure_file()

    def _ensure_file(self):
        os.makedirs(os.path.dirname(FEEDBACK_FILE), exist_ok=True)
        if not os.path.exists(FEEDBACK_FILE):
            with open(FEEDBACK_FILE, 'w', encoding='utf-8') as fp:
                json.dump([], fp)

    def record_feedback(
        self,
        pattern_id: str,
        feedback_type: str,
        notes: str = "",
        user_id: str = "merchant_admin"
    ) -> Dict[str, Any]:
        """
        Record merchant feedback.
        """
        if feedback_type not in VALID_FEEDBACK_TYPES:
            return {
                "status": "error",
                "message": f"Invalid feedback type '{feedback_type}'. Allowed: {list(VALID_FEEDBACK_TYPES.keys())}"
            }

        record = {
            "feedback_id": f"fb_{int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)}",
            "pattern_id": pattern_id,
            "feedback_type": feedback_type,
            "description": VALID_FEEDBACK_TYPES[feedback_type],
            "notes": notes,
            "user_id": user_id,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

        try:
            with open(FEEDBACK_FILE, 'r', encoding='utf-8') as fp:
                logs = json.load(fp)
        except Exception:
            logs = []

        logs.append(record)
        with open(FEEDBACK_FILE, 'w', encoding='utf-8') as fp:
            json.dump(logs, fp, indent=2)

        return {
            "status": "success",
            "message": f"Merchant feedback '{feedback_type}' recorded successfully.",
            "record": record
        }

    def get_feedback(self, pattern_id: str = None) -> List[Dict[str, Any]]:
        """
        Retrieve recorded merchant feedback.
        """
        self._ensure_file()
        try:
            with open(FEEDBACK_FILE, 'r', encoding='utf-8') as fp:
                logs = json.load(fp)
            if pattern_id:
                return [l for l in logs if l.get("pattern_id") == pattern_id]
            return logs
        except Exception:
            return []

feedback_service = FeedbackService()
