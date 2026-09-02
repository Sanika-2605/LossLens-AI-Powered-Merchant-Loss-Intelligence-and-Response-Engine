"""
Comprehensive Closed-Loop Integration Test Suite for LossLens.

Verifies the complete 10-step end-to-end intelligence loop:
DISCOVER -> INVESTIGATE -> EXPLAIN -> FORECAST -> SIMULATE -> RECOMMEND -> APPROVE -> ACT -> VERIFY -> LEARN
"""

import pytest
from app.services.discovery_service import discovery_service
from app.services.evidence_engine import evidence_engine
from app.services.explainability import explainability_service
from app.services.investigator import investigator_service
from app.services.hypothesis_engine import hypothesis_engine
from app.ml.loss_forecaster import loss_forecaster
from app.services.simulator import simulator
from app.services.policy_engine import policy_engine
from app.services.decision_engine import decision_engine
from app.services.action_service import action_service
from app.services.audit_service import audit_service
from app.services.feedback_service import feedback_service
from app.services.pattern_evolution import pattern_evolution_service
from app.ml.evaluator import evaluator

def test_full_closed_loop():
    # 1. DISCOVER
    disc_res = discovery_service.run_pipeline()
    assert disc_res["status"] == "success"
    patterns = discovery_service.get_patterns()
    assert len(patterns) > 0
    pattern_id = patterns[0]["id"]

    # 2. INVESTIGATE
    evidence = evidence_engine.get_evidence(pattern_id)
    assert "entities" in evidence
    inv = investigator_service.generate_investigation(pattern_id)
    assert inv["what_happened"] != "Pattern not found"

    # 3. EXPLAIN (SHAP + Signals)
    exp = explainability_service.get_explanation(pattern_id)
    assert "contributions" in exp
    assert "shap_status" in exp
    assert len(exp["contributions"]) > 0

    # 4. FORECAST
    fc = loss_forecaster.forecast_loss(pattern_id)
    assert fc["30_day_forecast"] >= fc["7_day_forecast"]

    # 5. SIMULATE
    sims = simulator.simulate_interventions(pattern_id)
    assert len(sims) == 5

    # 6. RECOMMEND
    dec = decision_engine.make_decision(pattern_id)
    assert "recommended_action" in dec

    # 7. APPROVE
    aud_rec = audit_service.record_decision(
        pattern_id=pattern_id,
        decision="APPROVED",
        user_id="test_runner",
        reason="Full loop test approval"
    )
    assert aud_rec["decision"] == "APPROVED"

    # 8. ACT (Policy-controlled test action)
    act_res = action_service.execute_action(pattern_id, "test_workflow_hold", user_id="test_runner")
    assert act_res["status"] == "success"

    # 9. VERIFY (Pattern Evolution Trajectory)
    evo = pattern_evolution_service.get_pattern_evolution(pattern_id)
    assert "post_intervention_activity" in evo

    # 10. LEARN (Merchant Feedback & Evaluator)
    fb_res = feedback_service.record_feedback(pattern_id, "CONFIRMED_ABUSE", notes="Test loop learning")
    assert fb_res["status"] == "success"

    eval_res = evaluator.run_evaluation()
    assert eval_res["statistically_valid"] is True
    assert "precision" in eval_res["metrics"]
    assert "recall" in eval_res["metrics"]
    assert "f1_score" in eval_res["metrics"]
