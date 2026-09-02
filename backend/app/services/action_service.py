"""
Action Service for LossLens.

Executes policy-controlled test actions:
- create_review_case
- request_verification
- restrict_promotion
- notify_merchant
- test_workflow_hold

Enforces policy safety gates and records complete immutable audit records.
NO REAL FINANCIAL OR PAYMENT MOVEMENTS ARE EXECUTED.
"""

from typing import Dict, Any, List
import datetime
from app.services.policy_engine import policy_engine
from app.services.evidence_engine import evidence_engine
from app.services.audit_service import audit_service

ALLOWED_TEST_ACTIONS = {
    "create_review_case": "Created manual fraud review case in merchant dashboard",
    "request_verification": "Triggered simulated 2FA / Identity verification request",
    "restrict_promotion": "Applied test promotional restriction to affected cluster accounts",
    "notify_merchant": "Sent high-priority risk alert notification to merchant admin",
    "test_workflow_hold": "Executed simulated workflow hold on pending cluster fulfillment"
}

class ActionService:
    def execute_action(
        self,
        pattern_id: str,
        action_name: str,
        user_id: str = "merchant_admin",
        reason: str = ""
    ) -> Dict[str, Any]:
        """
        Execute a policy-controlled test action and persist an extended audit trail record.
        """
        if action_name not in ALLOWED_TEST_ACTIONS:
            return {
                "status": "error",
                "message": f"Action '{action_name}' is not an authorized test action. Allowed: {list(ALLOWED_TEST_ACTIONS.keys())}"
            }

        evidence = evidence_engine.get_evidence(pattern_id)
        pattern = evidence.get("pattern_summary", {})
        risk_score = pattern.get("risk_score", 0.0)

        # Policy evaluation
        pol_eval = policy_engine.evaluate_policy(risk_score=risk_score)
        
        # Check approval requirement if risk >= 90
        if pol_eval.get("required_approval", False) and not reason:
            return {
                "status": "approval_required",
                "message": f"Policy rule '{pol_eval['policy_rule']}' requires explicit merchant approval & reason.",
                "policy_evaluation": pol_eval
            }

        action_desc = ALLOWED_TEST_ACTIONS[action_name]
        fin = evidence.get("financial_values", {})
        cust_count = evidence.get("graph_signals", {}).get("connected_customers", 0)

        evidence_summary = (
            f"{cust_count} customer(s), Exposure: ${fin.get('current_exposure', 0)}, "
            f"Refund Ratio: {round(fin.get('refund_ratio', 0) * 100, 1)}%"
        )

        # Record in extended audit trail
        audit_record = audit_service.record_decision(
            pattern_id=pattern_id,
            decision="ACTION_EXECUTED",
            user_id=user_id,
            previous_recommendation=pol_eval.get("recommended_action", "MONITOR"),
            modified_action=action_name,
            reason=reason or f"Test action '{action_name}' initiated by merchant."
        )

        # Attach additional metadata fields required by Priority 1
        audit_record.update({
            "evidence_summary": evidence_summary,
            "risk_score": round(risk_score, 1),
            "model_version": "LossLens-v2.1-Hybrid-ML",
            "recommendation": pol_eval.get("recommended_action", "MONITOR"),
            "action_executed": action_name,
            "action_description": action_desc,
            "outcome": "SUCCESS_TEST_SIMULATION_EXECUTED",
            "is_real_financial_action": False
        })

        return {
            "status": "success",
            "action": action_name,
            "description": action_desc,
            "audit_record": audit_record
        }

action_service = ActionService()
