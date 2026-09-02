"""
Test suite for LossLens Explainable Investigation & Decision Intelligence System.
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
from app.services.audit_service import audit_service

@pytest.fixture(scope="module")
def sample_pattern_id():
    patterns = discovery_service.get_patterns()
    if patterns:
        return patterns[0]["id"]
    return "pattern_0"

def test_evidence_completeness(sample_pattern_id):
    ev = evidence_engine.get_evidence(sample_pattern_id)
    assert "pattern_id" in ev
    assert "entities" in ev
    assert "financial_values" in ev
    assert "timeline" in ev
    assert "risk_evidence_map" in ev

    entities = ev["entities"]
    assert "customers" in entities
    assert "devices" in entities
    assert "addresses" in entities
    assert "orders" in entities
    assert "payments" in entities
    assert "refunds" in entities
    assert "products" in entities
    assert "coupons" in entities

def test_evidence_traceability(sample_pattern_id):
    ev = evidence_engine.get_evidence(sample_pattern_id)
    risk_map = ev["risk_evidence_map"]
    assert "refund_risk" in risk_map
    assert "graph_risk" in risk_map
    assert "supporting_evidence" in risk_map["refund_risk"]
    assert "supporting_evidence" in risk_map["graph_risk"]

def test_explainability(sample_pattern_id):
    exp = explainability_service.get_explanation(sample_pattern_id)
    assert "risk_score" in exp
    assert "contributions" in exp
    assert len(exp["contributions"]) > 0
    for c in exp["contributions"]:
        assert "signal" in c
        assert "contribution" in c
        assert "evidence" in c

def test_investigator_summary(sample_pattern_id):
    inv = investigator_service.generate_investigation(sample_pattern_id)
    assert "what_happened" in inv
    assert "why_suspicious" in inv
    assert "entity_connections" in inv
    assert "when_started" in inv
    assert "growth_rate" in inv
    assert "financial_impact" in inv
    assert "recommended_action" in inv

def test_hypothesis_generation(sample_pattern_id):
    hyp = hypothesis_engine.generate_hypotheses(sample_pattern_id)
    assert "primary_hypothesis" in hyp
    assert "alternative_hypotheses" in hyp
    
    primary = hyp["primary_hypothesis"]
    assert "confidence" in primary
    assert 0.0 <= primary["confidence"] <= 1.0
    assert "supporting_evidence" in primary
    assert "contradicting_evidence" in primary

def test_loss_forecaster(sample_pattern_id):
    fc = loss_forecaster.forecast_loss(sample_pattern_id)
    assert "current_exposure" in fc
    assert "observed_exposure" in fc
    assert "7_day_forecast" in fc
    assert "30_day_forecast" in fc
    assert "uncertainty_range" in fc
    assert fc["30_day_forecast"] >= fc["7_day_forecast"]

def test_loss_forecaster_insufficient_data():
    fc = loss_forecaster.forecast_loss("non_existent_pattern_999")
    assert fc["insufficient_data"] is True
    assert fc["confidence"] == "LOW"

def test_counterfactual_simulation(sample_pattern_id):
    sims = simulator.simulate_interventions(sample_pattern_id)
    assert len(sims) == 5
    actions = [s["action"] for s in sims]
    assert "no_action" in actions
    assert "manual_review" in actions
    assert "temporary_hold" in actions
    for s in sims:
        assert "expected_loss" in s
        assert "expected_recovered_value" in s
        assert "net_benefit" in s

def test_policy_engine_boundary_cases():
    # Boundary test case 49 -> MONITOR
    res_49 = policy_engine.evaluate_policy(risk_score=49.0)
    assert res_49["recommended_action"] == "MONITOR"
    assert res_49["required_approval"] is False

    # Boundary test case 50 -> VERIFY
    res_50 = policy_engine.evaluate_policy(risk_score=50.0)
    assert res_50["recommended_action"] == "VERIFY"
    assert res_50["required_approval"] is False

    # Boundary test case 70 -> MANUAL_REVIEW
    res_70 = policy_engine.evaluate_policy(risk_score=70.0)
    assert res_70["recommended_action"] == "MANUAL_REVIEW"
    assert res_70["required_approval"] is False

    # Boundary test case 90 -> APPROVAL_REQUIRED
    res_90 = policy_engine.evaluate_policy(risk_score=90.0)
    assert res_90["recommended_action"] == "APPROVAL_REQUIRED"
    assert res_90["required_approval"] is True

    # Boundary test case 91 -> APPROVAL_REQUIRED
    res_91 = policy_engine.evaluate_policy(risk_score=91.0)
    assert res_91["recommended_action"] == "APPROVAL_REQUIRED"
    assert res_91["required_approval"] is True

def test_decision_engine(sample_pattern_id):
    dec = decision_engine.make_decision(sample_pattern_id)
    assert "recommended_action" in dec
    assert "expected_benefit" in dec
    assert "risk" in dec
    assert "legitimate_customer_impact" in dec
    assert "operational_cost" in dec
    assert "required_approval" in dec
    assert "priority_evaluation" in dec

def test_audit_service_recording(sample_pattern_id):
    rec = audit_service.record_decision(
        pattern_id=sample_pattern_id,
        decision="APPROVED",
        user_id="test_analyst",
        previous_recommendation="MANUAL_REVIEW",
        modified_action="TEMPORARY_HOLD",
        reason="Verified high risk refund velocity"
    )
    assert rec["pattern_id"] == sample_pattern_id
    assert rec["decision"] == "APPROVED"
    assert rec["user_id"] == "test_analyst"

    logs = audit_service.get_audit_trail(sample_pattern_id)
    assert len(logs) > 0
    assert any(l["audit_id"] == rec["audit_id"] for l in logs)
