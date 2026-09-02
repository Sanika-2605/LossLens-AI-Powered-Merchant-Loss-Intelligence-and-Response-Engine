"""
Audit Trail Service for LossLens.

Records merchant decisions (Approve, Reject, Modify, Escalate, Dismiss) and maintains an append-only audit trail for investigation lifecycle tracking.
"""

import os
import json
import datetime
from typing import Dict, Any, List

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data/generated"))
AUDIT_LOG_FILE = os.path.join(BASE_DIR, "audit_trail.json")

class AuditService:
    def __init__(self):
        self._ensure_file()

    def _ensure_file(self):
        os.makedirs(os.path.dirname(AUDIT_LOG_FILE), exist_ok=True)
        if not os.path.exists(AUDIT_LOG_FILE):
            with open(AUDIT_LOG_FILE, 'w', encoding='utf-8') as fp:
                json.dump([], fp)

    def _read_logs(self) -> List[Dict[str, Any]]:
        self._ensure_file()
        try:
            with open(AUDIT_LOG_FILE, 'r', encoding='utf-8') as fp:
                return json.load(fp)
        except Exception:
            return []

    def record_decision(
        self,
        pattern_id: str,
        decision: str,
        user_id: str = "merchant_admin",
        previous_recommendation: str = "",
        modified_action: str = "",
        reason: str = ""
    ) -> Dict[str, Any]:
        """
        Record a merchant approval/rejection/modification decision into audit trail.
        """
        record = {
            "audit_id": f"aud_{int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)}",
            "pattern_id": pattern_id,
            "decision": decision,
            "user_id": user_id,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "previous_recommendation": previous_recommendation,
            "modified_action": modified_action or decision,
            "reason": reason
        }

        logs = self._read_logs()
        logs.append(record)
        with open(AUDIT_LOG_FILE, 'w', encoding='utf-8') as fp:
            json.dump(logs, fp, indent=2)

        return record

    def get_audit_trail(self, pattern_id: str = None) -> List[Dict[str, Any]]:
        """
        Retrieve audit trail records.
        """
        logs = self._read_logs()
        if pattern_id:
            return [l for l in logs if l.get("pattern_id") == pattern_id]
        return logs

audit_service = AuditService()
