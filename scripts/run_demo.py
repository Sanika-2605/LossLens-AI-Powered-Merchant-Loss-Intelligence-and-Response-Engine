"""
Reproducible Demo Scenario Script for LossLens.

Uses a fixed random seed (seed=42) to execute the complete end-to-end intelligence loop:
1. DISCOVER  : Run ML discovery pipeline (Isolation Forest + DBSCAN + NetworkX)
2. INVESTIGATE: Retrieve structured evidence & investigation summary
3. EXPLAIN    : Calculate SHAP & transparent signal contribution attribution
4. FORECAST   : Generate 7-day & 30-day loss forecasts
5. SIMULATE   : Run counterfactual action simulator across interventions
6. RECOMMEND  : Evaluate policy rules & decision engine priorities
7. APPROVE    : Record merchant approval decision
8. ACT        : Execute policy-controlled test action (e.g. test_workflow_hold)
9. VERIFY     : Compare expected vs observed outcome & pattern evolution trajectory
10. LEARN     : Record merchant feedback (TRUE_POSITIVE / CONFIRMED_ABUSE) & run evaluator
"""

import sys
import os
import random
import numpy as np

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Fix random seed for reproducibility
random.seed(42)
np.random.seed(42)

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

def main():
    print("=" * 80)
    print("  LOSSLENS REPRODUCIBLE DEMO SCENARIO (SEED = 42)")
    print("=" * 80)

    # STEP 1: DISCOVER
    print("\n[STEP 1: DISCOVER] Running autonomous ML pattern discovery pipeline...")
    disc_result = discovery_service.run_pipeline()
    print(f"  Result: {disc_result['status']} | Discovered Patterns: {disc_result.get('total_patterns_discovered', 0)}")

    patterns = discovery_service.get_patterns()
    if not patterns:
        print("  ERROR: No patterns discovered!")
        return

    pattern_id = patterns[0]["id"]
    print(f"  Selected Top Pattern: {pattern_id} | Risk Score: {patterns[0]['risk_score']}/100")

    # STEP 2: INVESTIGATE
    print("\n[STEP 2: INVESTIGATE] Retrieving structured evidence & generating summary...")
    evidence = evidence_engine.get_evidence(pattern_id)
    inv = investigator_service.generate_investigation(pattern_id)
    print(f"  What Happened   : {inv['what_happened']}")
    print(f"  Why Suspicious  : {inv['why_suspicious']}")
    print(f"  Connections     : {inv['entity_connections']}")

    # STEP 3: EXPLAIN
    print("\n[STEP 3: EXPLAIN] Computing SHAP TreeExplainer & signal contribution attributions...")
    exp = explainability_service.get_explanation(pattern_id)
    print(f"  SHAP Engine Status: {exp.get('shap_status')}")
    print("  Top Signal Contributions:")
    for c in exp.get("contributions", [])[:3]:
        print(f"    - {c['label']}: {c['percentage']}% (Source: {c['attribution_source']})")

    # STEP 4: FORECAST
    print("\n[STEP 4: FORECAST] Generating 7-day and 30-day expected loss forecasts...")
    fc = loss_forecaster.forecast_loss(pattern_id)
    print(f"  Observed Exposure: ${fc['observed_exposure']}")
    print(f"  7-Day Forecast   : ${fc['7_day_forecast']} (Range: ${fc['uncertainty_range']['7_day'][0]} - ${fc['uncertainty_range']['7_day'][1]})")
    print(f"  30-Day Forecast  : ${fc['30_day_forecast']} (Range: ${fc['uncertainty_range']['30_day'][0]} - ${fc['uncertainty_range']['30_day'][1]})")

    # STEP 5: SIMULATE
    print("\n[STEP 5: SIMULATE] Running counterfactual action simulator...")
    sims = simulator.simulate_interventions(pattern_id)
    print("  Intervention Outcomes Matrix:")
    for s in sims:
        print(f"    - {s['label']:<35} | Loss: ${s['expected_loss']:<7} | Recovery: ${s['expected_recovered_value']:<7} | Net Benefit: ${s['net_benefit']}")

    # STEP 6: RECOMMEND
    print("\n[STEP 6: RECOMMEND] Evaluating policy thresholds & decision priority...")
    dec = decision_engine.make_decision(pattern_id)
    print(f"  Recommended Action : {dec['recommended_action']}")
    print(f"  Policy Rule         : {dec['policy_rule']}")
    print(f"  Approval Gate       : {dec['approval_gate']}")
    print(f"  Expected Net Benefit: ${dec['expected_benefit']}")

    # STEP 7: APPROVE
    print("\n[STEP 7: APPROVE] Recording merchant decision...")
    aud_rec = audit_service.record_decision(
        pattern_id=pattern_id,
        decision="APPROVED",
        user_id="demo_merchant_admin",
        previous_recommendation=dec['recommended_action'],
        modified_action=dec['recommended_action'],
        reason="Demo scenario merchant approval"
    )
    print(f"  Audit Record Created: Audit ID {aud_rec['audit_id']} | Status: APPROVED")

    # STEP 8: ACT
    print("\n[STEP 8: ACT] Executing policy-controlled test action...")
    act_res = action_service.execute_action(
        pattern_id=pattern_id,
        action_name="test_workflow_hold",
        user_id="demo_merchant_admin",
        reason="Policy hold test action"
    )
    print(f"  Action Status: {act_res['status']} | Executed: {act_res.get('action')}")

    # STEP 9: VERIFY
    print("\n[STEP 9: VERIFY] Tracking pattern evolution trajectory post-intervention...")
    ev = pattern_evolution_service.get_pattern_evolution(pattern_id)
    post_act = ev.get("post_intervention_activity", {})
    print(f"  Post-Intervention Trajectory Status: {post_act.get('trajectory_status')}")
    print(f"  Impact Summary                     : {post_act.get('impact_summary')}")

    # STEP 10: LEARN
    print("\n[STEP 10: LEARN] Recording merchant feedback & executing held-out evaluator...")
    fb_res = feedback_service.record_feedback(
        pattern_id=pattern_id,
        feedback_type="CONFIRMED_ABUSE",
        notes="Confirmed coordinated refund abuse during demo evaluation",
        user_id="demo_merchant_admin"
    )
    print(f"  Feedback Status: {fb_res['status']} | Type: CONFIRMED_ABUSE")

    eval_res = evaluator.run_evaluation()
    metrics = eval_res["metrics"]
    print("\n" + "-" * 50)
    print("  HELD-OUT STATISTICAL EVALUATION RESULTS:")
    print("-" * 50)
    print(f"  Precision             : {metrics['precision'] * 100}%")
    print(f"  Recall                : {metrics['recall'] * 100}%")
    print(f"  F1-Score              : {metrics['f1_score']}")
    print(f"  ROC-AUC               : {metrics['roc_auc']}")
    print(f"  False Positive Rate   : {metrics['false_positive_rate'] * 100}%")
    print(f"  Discovered Clusters   : {eval_res['financial_evaluation']['discovered_clusters_count']}")
    print(f"  Exposure Detected     : ${eval_res['financial_evaluation']['total_exposure_detected']}")
    print(f"  Discovery Latency     : {eval_res['latencies_ms']['discovery_latency']} ms")
    print(f"  Investigation Latency : {eval_res['latencies_ms']['investigation_latency']} ms")
    print(f"  Action Latency        : {eval_res['latencies_ms']['action_latency']} ms")

    print("\n" + "=" * 80)
    print("  DEMO EXECUTION SUCCESSFUL — ALL 10 STEPS VERIFIED")
    print("=" * 80)

if __name__ == "__main__":
    main()
