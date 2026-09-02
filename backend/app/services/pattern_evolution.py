"""
Pattern Evolution Service for LossLens.

Tracks trajectory of discovered patterns over time:
- risk score evolution
- exposure shifts
- transaction count
- refund count
- affected customers
- intervention point (timestamp & action)
- post-intervention activity change

Uses strictly REAL evidence data extracted from pattern timeline & audit records.
"""

from typing import Dict, Any, List
from app.services.evidence_engine import evidence_engine
from app.services.audit_service import audit_service

class PatternEvolutionService:
    def get_pattern_evolution(self, pattern_id: str) -> Dict[str, Any]:
        """
        Retrieve longitudinal evolution metrics for a pattern pre- and post-intervention.
        """
        evidence = evidence_engine.get_evidence(pattern_id)
        if not evidence or "pattern_summary" not in evidence:
            return {"pattern_id": pattern_id, "evolution": {}}

        pattern = evidence["pattern_summary"]
        fin = evidence.get("financial_values", {})
        entities = evidence.get("entities", {})
        timeline = evidence.get("timeline", [])

        # Retrieve audit trail for intervention point
        audits = audit_service.get_audit_trail(pattern_id)
        intervention_audit = audits[-1] if audits else None

        intervention_point = None
        if intervention_audit:
            intervention_point = {
                "timestamp": intervention_audit.get("timestamp"),
                "action": intervention_audit.get("modified_action") or intervention_audit.get("decision"),
                "user_id": intervention_audit.get("user_id"),
                "reason": intervention_audit.get("reason")
            }

        # Analyze activity pre- vs post- intervention timestamp
        pre_tx_count = len(entities.get("payments", []))
        pre_refund_count = len(entities.get("refunds", []))
        affected_customers = len(entities.get("customers", []))

        # Real post-intervention metrics derived from latest audit & timeline events
        post_tx_count = 0
        post_refund_count = 0

        if intervention_point and timeline:
            int_ts = str(intervention_point["timestamp"])
            for ev in timeline:
                if str(ev.get("timestamp", "")) > int_ts:
                    if ev.get("event_type") == "PAYMENT_PROCESSED":
                        post_tx_count += 1
                    elif ev.get("event_type") == "REFUND_ISSUED":
                        post_refund_count += 1

        activity_delta_pct = 0.0
        if pre_tx_count > 0 and intervention_point:
            activity_delta_pct = round(((post_tx_count - pre_tx_count) / pre_tx_count) * 100.0, 1)

        trajectory_status = "DECREASED" if post_refund_count == 0 and intervention_point else "MONITORING"

        return {
            "pattern_id": pattern_id,
            "risk_score": pattern.get("risk_score", 0.0),
            "current_exposure": fin.get("current_exposure", 0.0),
            "potential_exposure": fin.get("potential_exposure", 0.0),
            "transaction_count": pre_tx_count,
            "refund_count": pre_refund_count,
            "affected_customers": affected_customers,
            "intervention_point": intervention_point,
            "post_intervention_activity": {
                "post_intervention_transactions": post_tx_count,
                "post_intervention_refunds": post_refund_count,
                "activity_change_pct": activity_delta_pct,
                "trajectory_status": trajectory_status,
                "impact_summary": f"Post-intervention activity {trajectory_status.lower()} following {intervention_point['action'] if intervention_point else 'no intervention'}."
            }
        }

pattern_evolution_service = PatternEvolutionService()
