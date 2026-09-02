"""
Policy Engine for LossLens.

Evaluates pattern risk and context against configurable policy rules and thresholds:
- Risk < 50: MONITOR
- 50 <= Risk < 70: VERIFY
- 70 <= Risk < 90: MANUAL_REVIEW
- Risk >= 90: APPROVAL_REQUIRED

Supports dynamic threshold configuration, action limits, cooldown periods, escalation rules, stopping rules, and human approval requirements.
"""

from typing import Dict, Any, List

# Default configurable policy rules dictionary
DEFAULT_POLICY_CONFIG = {
    "thresholds": {
        "monitor_upper": 50.0,
        "verify_upper": 70.0,
        "manual_review_upper": 90.0
    },
    "action_limits": {
        "max_auto_block_amount": 0.0,  # Never auto block high-impact without approval
        "max_daily_verifications": 100
    },
    "cooldown_period_hours": 24,
    "escalation_rules": [
        "Escalate to fraud manager if potential exposure > $20,000",
        "Escalate if shared device count > 3"
    ],
    "stopping_rules": [
        "Stop automated actions if customer dispute rate > 2%"
    ],
    "human_approval_required_for": ["block", "temporary_hold"]
}

class PolicyEngine:
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or DEFAULT_POLICY_CONFIG

    def update_config(self, new_config: Dict[str, Any]):
        """Update configurable thresholds dynamically."""
        self.config.update(new_config)

    def evaluate_policy(self, risk_score: float, exposure: float = 0.0, shared_devices: int = 0) -> Dict[str, Any]:
        """
        Evaluate policy rule and determine required intervention & approval gate.
        """
        t = self.config["thresholds"]
        
        # Ensure risk score is on 0-100 scale
        score = float(risk_score) if risk_score > 1.0 else float(risk_score * 100.0)

        action = "MONITOR"
        policy_rule = f"Risk Score {round(score, 1)} < {t['monitor_upper']} -> MONITOR"
        required_approval = False
        reason = "Low risk score within acceptable normal transaction threshold."

        if score >= t["manual_review_upper"]:
            action = "APPROVAL_REQUIRED"
            policy_rule = f"Risk Score {round(score, 1)} >= {t['manual_review_upper']} -> APPROVAL_REQUIRED"
            required_approval = True
            reason = "High-risk pattern requiring explicit merchant approval prior to account or payment restriction."
        elif score >= t["verify_upper"]:
            action = "MANUAL_REVIEW"
            policy_rule = f"Risk Score {round(score, 1)} in range [{t['verify_upper']}, {t['manual_review_upper']}) -> MANUAL_REVIEW"
            required_approval = False
            reason = "Elevated risk cluster routed to manual fraud review queue."
        elif score >= t["monitor_upper"]:
            action = "VERIFY"
            policy_rule = f"Risk Score {round(score, 1)} in range [{t['monitor_upper']}, {t['verify_upper']}) -> VERIFY"
            required_approval = False
            reason = "Moderate risk pattern triggering step-up identity or SMS OTP verification."

        # Apply escalation & stopping rules
        escalation_triggered = False
        if exposure > 20000.0 or shared_devices > 3:
            escalation_triggered = True
            reason += " (Escalation triggered due to high exposure or heavy device sharing)."

        return {
            "policy_rule": policy_rule,
            "risk_score": round(score, 1),
            "recommended_action": action,
            "required_approval": required_approval,
            "reason": reason,
            "escalation_triggered": escalation_triggered,
            "cooldown_period_hours": self.config.get("cooldown_period_hours", 24),
            "stopping_rules": self.config.get("stopping_rules", [])
        }

policy_engine = PolicyEngine()
