"""
Counterfactual Action Simulator for LossLens.

Simulates expected risk, recovery, customer friction, and net benefit for potential interventions:
- NO_ACTION
- VERIFICATION
- MANUAL_REVIEW
- TEMPORARY_HOLD
- BLOCK

Values represent simulated expected outcomes based on historical/configurable baseline parameters.
"""

from typing import Dict, Any, List
from app.services.evidence_engine import evidence_engine
from app.ml.loss_forecaster import loss_forecaster

class CounterfactualSimulator:
    def simulate_interventions(self, pattern_id: str) -> List[Dict[str, Any]]:
        """
        Simulate outcome matrix across all possible merchant actions.
        """
        forecast = loss_forecaster.forecast_loss(pattern_id)
        base_loss = forecast.get("30_day_forecast", 1000.0)
        evidence = evidence_engine.get_evidence(pattern_id)
        fin = evidence.get("financial_values", {})
        curr_exp = fin.get("current_exposure", base_loss)

        # Baseline parameters per action type
        # recovery_pct, customer_impact_cost, ops_cost
        interventions = [
            {
                "action": "no_action",
                "label": "No Intervention (Allow)",
                "recovery_pct": 0.0,
                "customer_impact_cost": 0.0,
                "ops_cost": 0.0,
                "description": "Allow all transactions without additional checks."
            },
            {
                "action": "verification",
                "label": "Step-up Verification (2FA / ID)",
                "recovery_pct": 0.45,
                "customer_impact_cost": min(curr_exp * 0.05, 150.0),
                "ops_cost": 25.0,
                "description": "Require SMS OTP or identity verification for high-risk checkout."
            },
            {
                "action": "manual_review",
                "label": "Manual Fraud Queue Review",
                "recovery_pct": 0.80,
                "customer_impact_cost": min(curr_exp * 0.08, 250.0),
                "ops_cost": 75.0,
                "description": "Route cluster transactions to human fraud analysts."
            },
            {
                "action": "temporary_hold",
                "label": "Temporary Account / Order Hold",
                "recovery_pct": 0.90,
                "customer_impact_cost": min(curr_exp * 0.15, 500.0),
                "ops_cost": 40.0,
                "description": "Pause payouts and order fulfillments pending investigation."
            },
            {
                "action": "block",
                "label": "Immediate Entity Restrict / Block",
                "recovery_pct": 0.98,
                "customer_impact_cost": min(curr_exp * 0.30, 1000.0),
                "ops_cost": 15.0,
                "description": "Blacklist shared devices and suspend connected customer accounts."
            }
        ]

        simulations = []
        for item in interventions:
            rec_pct = item["recovery_pct"]
            expected_loss = round(base_loss * (1.0 - rec_pct), 2)
            expected_recovered = round(base_loss * rec_pct, 2)
            cust_impact = round(item["customer_impact_cost"], 2)
            ops_cost = round(item["ops_cost"], 2)

            # Net benefit = Expected Recovered Value - Legitimate Customer Impact - Operational Cost
            net_benefit = round(expected_recovered - cust_impact - ops_cost, 2)

            simulations.append({
                "action": item["action"],
                "label": item["label"],
                "expected_loss": expected_loss,
                "expected_recovered_value": expected_recovered,
                "legitimate_customer_impact": cust_impact,
                "operational_cost": ops_cost,
                "net_benefit": net_benefit,
                "description": item["description"],
                "is_simulated": True
            })

        return sorted(simulations, key=lambda x: x["net_benefit"], reverse=True)

simulator = CounterfactualSimulator()
