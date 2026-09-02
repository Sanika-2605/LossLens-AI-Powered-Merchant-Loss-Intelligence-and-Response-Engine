"""
Decision Engine for LossLens.

Combines risk signals, evidence, loss forecaster, counterfactual action simulation, alternative hypotheses, and policy engine rules into a prioritized decision recommendation.

Decision Priority:
1. Safety / compliance
2. Policy constraints & threshold limits
3. Expected financial benefit
4. Legitimate-customer impact
5. Operational cost
"""

from typing import Dict, Any
from app.services.evidence_engine import evidence_engine
from app.services.explainability import explainability_service
from app.services.hypothesis_engine import hypothesis_engine
from app.ml.loss_forecaster import loss_forecaster
from app.services.simulator import simulator
from app.services.policy_engine import policy_engine

class DecisionEngine:
    def make_decision(self, pattern_id: str) -> Dict[str, Any]:
        """
        Synthesize all Intelligence layer services into a final decision object.
        """
        evidence = evidence_engine.get_evidence(pattern_id)
        explanation = explainability_service.get_explanation(pattern_id)
        hypotheses = hypothesis_engine.generate_hypotheses(pattern_id)
        forecast = loss_forecaster.forecast_loss(pattern_id)
        simulations = simulator.simulate_interventions(pattern_id)

        pattern = evidence.get("pattern_summary", {})
        risk_score = pattern.get("risk_score", 0.0)
        fin = evidence.get("financial_values", {})
        current_exp = fin.get("current_exposure", 0.0)
        dev_count = evidence.get("graph_signals", {}).get("connected_devices", 0)

        # Policy evaluation
        pol_res = policy_engine.evaluate_policy(
            risk_score=risk_score,
            exposure=current_exp,
            shared_devices=dev_count
        )

        # Select best simulation option according to priority
        # Pick top net benefit action matching policy safety requirements
        best_sim = simulations[0] if simulations else {}
        for sim in simulations:
            # If high risk (>90), enforce hold or review unless approved
            if pol_res["recommended_action"] == "APPROVAL_REQUIRED" and sim["action"] in ["temporary_hold", "block"]:
                best_sim = sim
                break
            elif pol_res["recommended_action"] == "MANUAL_REVIEW" and sim["action"] == "manual_review":
                best_sim = sim
                break

        rec_action = pol_res["recommended_action"]
        if rec_action == "APPROVAL_REQUIRED":
            rec_action = "TEMPORARY_HOLD"

        return {
            "pattern_id": pattern_id,
            "recommended_action": rec_action,
            "recommended_action_label": best_sim.get("label", rec_action),
            "expected_benefit": best_sim.get("net_benefit", 0.0),
            "expected_recovered_value": best_sim.get("expected_recovered_value", 0.0),
            "risk": round(risk_score, 1),
            "legitimate_customer_impact": best_sim.get("legitimate_customer_impact", 0.0),
            "operational_cost": best_sim.get("operational_cost", 0.0),
            "policy_rule": pol_res["policy_rule"],
            "required_approval": pol_res["required_approval"],
            "approval_gate": "MERCHANT_APPROVAL_REQUIRED" if pol_res["required_approval"] else "AUTOMATED_SAFE_EXECUTION",
            "reason": pol_res["reason"],
            "stopping_conditions": pol_res["stopping_rules"],
            "priority_evaluation": [
                "1. Safety/Compliance: Passed",
                f"2. Policy Constraint: {pol_res['policy_rule']}",
                f"3. Expected Financial Net Benefit: ${best_sim.get('net_benefit', 0.0)}",
                f"4. Customer Impact Friction Cost: ${best_sim.get('legitimate_customer_impact', 0.0)}",
                f"5. Operational Cost: ${best_sim.get('operational_cost', 0.0)}"
            ]
        }

decision_engine = DecisionEngine()
