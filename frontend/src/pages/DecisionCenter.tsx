import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchInvestigationDecision,
  fetchInvestigationSimulation,
  fetchInvestigationAudit,
  fetchInvestigationOutcome,
  fetchPatternEvolution,
  submitDecision,
  executeTestAction,
  submitMerchantFeedback
} from '../services/api';
import {
  ShieldAlert,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Edit3,
  Send,
  X,
  Layers,
  Activity,
  Award,
  Lock,
  Zap,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  AlertOctagon,
  FileCheck
} from 'lucide-react';

export const DecisionCenter: React.FC = () => {
  const { patternId } = useParams<{ patternId: string }>();
  const navigate = useNavigate();
  const targetPatternId = patternId || 'pattern_0';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [decision, setDecision] = useState<any>(null);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [outcome, setOutcome] = useState<any>(null);
  const [evolution, setEvolution] = useState<any>(null);

  // Input states
  const [decisionReason, setDecisionReason] = useState<string>('');
  const [selectedTestAction, setSelectedTestAction] = useState<string>('create_review_case');
  const [actionReason, setActionReason] = useState<string>('');
  const [feedbackType, setFeedbackType] = useState<string>('CONFIRMED_ABUSE');
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [decData, simData, audData, outData, evoData] = await Promise.all([
        fetchInvestigationDecision(targetPatternId).catch(() => null),
        fetchInvestigationSimulation(targetPatternId).catch(() => ({ simulations: [] })),
        fetchInvestigationAudit(targetPatternId).catch(() => ({ audit_trail: [] })),
        fetchInvestigationOutcome(targetPatternId).catch(() => null),
        fetchPatternEvolution(targetPatternId).catch(() => null)
      ]);

      setDecision(decData);
      setSimulations(simData?.simulations || []);
      setAuditTrail(audData?.audit_trail || []);
      setOutcome(outData);
      setEvolution(evoData);
    } catch (err: any) {
      setError(err.message || 'Failed to load Decision Center data');
    } fontally: {
      setLoading(false);
    }
  }, [targetPatternId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMerchantDecision = async (actionType: 'approve' | 'reject' | 'modify' | 'escalate' | 'dismiss') => {
    try {
      setSubmitting(true);
      setStatusMsg(null);
      await submitDecision(targetPatternId, actionType, {
        user_id: 'merchant_admin',
        reason: decisionReason
      });
      setStatusMsg(`Decision '${actionType.toUpperCase()}' recorded in audit log.`);
      setDecisionReason('');
      await loadData();
    } catch (err: any) {
      alert(`Decision error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteTestAction = async () => {
    try {
      setSubmitting(true);
      setStatusMsg(null);
      const res = await executeTestAction(targetPatternId, selectedTestAction, {
        user_id: 'merchant_admin',
        reason: actionReason || 'Merchant test action execution'
      });
      setStatusMsg(`Policy test action '${res.action}' executed successfully.`);
      setActionReason('');
      await loadData();
    } catch (err: any) {
      alert(`Test action error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    try {
      setSubmitting(true);
      setStatusMsg(null);
      await submitMerchantFeedback(targetPatternId, feedbackType, {
        user_id: 'merchant_admin',
        notes: feedbackNotes
      });
      setStatusMsg(`Merchant feedback '${feedbackType}' recorded for model evaluation.`);
      setFeedbackNotes('');
      await loadData();
    } catch (err: any) {
      alert(`Feedback error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium">Evaluating policy rules & simulations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <button
            onClick={() => navigate(`/investigation/${targetPatternId}`)}
            className="flex items-center text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Pattern Investigation
          </button>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Decision Center: <span className="text-blue-400">{targetPatternId}</span>
            </h1>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/40 text-xs font-bold rounded-full">
              Risk: {decision?.risk || 0}/100
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-xs text-slate-400">Approval Requirement</div>
            <div className="text-sm font-semibold text-slate-200">{decision?.approval_gate || 'EVALUATED'}</div>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold">
          {statusMsg}
        </div>
      )}

      {/* SECTION 1: POLICY RECOMMENDATION & PRIORITY HIERARCHY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-blue-900/60 p-6 rounded-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Lock className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Policy Engine Recommendation</h2>
            </div>
            <span className="px-3 py-1 bg-blue-600/30 border border-blue-500 text-blue-300 text-xs font-bold rounded-lg uppercase">
              {decision?.recommended_action}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Policy Rule Triggered:</span>
              <p className="font-mono text-slate-200 bg-slate-950 p-2.5 rounded border border-slate-800 mt-1">
                {decision?.policy_rule}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 text-center">
              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                <div className="text-slate-400 text-[11px]">Expected Benefit</div>
                <div className="text-base font-bold text-emerald-400 mt-0.5">${decision?.expected_benefit}</div>
              </div>
              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                <div className="text-slate-400 text-[11px]">Customer Impact</div>
                <div className="text-base font-bold text-amber-400 mt-0.5">${decision?.legitimate_customer_impact}</div>
              </div>
              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                <div className="text-slate-400 text-[11px]">Ops Cost</div>
                <div className="text-base font-bold text-slate-300 mt-0.5">${decision?.operational_cost}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Award className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Decision Hierarchy Evaluation</h2>
          </div>

          <ul className="space-y-2 text-xs font-mono text-slate-300">
            {(decision?.priority_evaluation || []).map((p: string, idx: number) => (
              <li key={idx} className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* SECTION 2: COUNTERFACTUAL SIMULATION MATRIX */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">Counterfactual Action Simulation Matrix</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="text-xs uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Intervention</th>
                <th className="py-3 px-4">Expected Loss</th>
                <th className="py-3 px-4">Recovery</th>
                <th className="py-3 px-4">Customer Friction</th>
                <th className="py-3 px-4">Ops Cost</th>
                <th className="py-3 px-4 text-right">Net Benefit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {simulations.map((sim: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-semibold text-white">{sim.label}</td>
                  <td className="py-3 px-4 text-rose-400">${sim.expected_loss}</td>
                  <td className="py-3 px-4 text-emerald-400">${sim.expected_recovered_value}</td>
                  <td className="py-3 px-4 text-amber-400">${sim.legitimate_customer_impact}</td>
                  <td className="py-3 px-4 text-slate-400">${sim.operational_cost}</td>
                  <td className="py-3 px-4 text-right font-bold text-blue-400">${sim.net_benefit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: POLICY TEST ACTIONS EXECUTION BAR */}
      <div className="bg-slate-900/80 border border-amber-900/40 p-6 rounded-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Zap className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Execute Policy-Controlled Test Action</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Test Action:</label>
            <select
              value={selectedTestAction}
              onChange={(e) => setSelectedTestAction(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="create_review_case">Create Fraud Review Case</option>
              <option value="request_verification">Request Identity / 2FA Verification</option>
              <option value="restrict_promotion">Restrict Promotional Discount</option>
              <option value="notify_merchant">Send Merchant Admin Notification</option>
              <option value="test_workflow_hold">Execute Test Workflow Hold</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Action Reason / Justification:</label>
            <input
              type="text"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Reason for executing action..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none"
            />
          </div>

          <button
            onClick={handleExecuteTestAction}
            disabled={submitting}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
          >
            Execute Policy Test Action
          </button>
        </div>
      </div>

      {/* SECTION 4: MERCHANT APPROVAL ACTIONS */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Merchant Approval Decision</h2>
        </div>

        <div className="space-y-3">
          <textarea
            value={decisionReason}
            onChange={(e) => setDecisionReason(e.target.value)}
            placeholder="Enter decision rationale or notes..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none"
            rows={2}
          ></textarea>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleMerchantDecision('approve')}
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              Approve Recommendation
            </button>
            <button
              onClick={() => handleMerchantDecision('reject')}
              disabled={submitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              Reject Action
            </button>
            <button
              onClick={() => handleMerchantDecision('modify')}
              disabled={submitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              Modify Action
            </button>
            <button
              onClick={() => handleMerchantDecision('escalate')}
              disabled={submitting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              Escalate to Compliance
            </button>
            <button
              onClick={() => handleMerchantDecision('dismiss')}
              disabled={submitting}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              Dismiss Pattern
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 5: OUTCOME VERIFICATION & PATTERN EVOLUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <FileCheck className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Outcome Verification (Expected vs Actual)</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
              <div className="text-slate-400">Expected 30d Loss</div>
              <div className="text-base font-bold text-rose-400 mt-1">${outcome?.expected_loss_30d}</div>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
              <div className="text-slate-400">Observed Exposure</div>
              <div className="text-base font-bold text-amber-400 mt-1">${outcome?.observed_exposure}</div>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
              <div className="text-slate-400">Expected Recovery</div>
              <div className="text-base font-bold text-emerald-400 mt-1">${outcome?.expected_recovered_value}</div>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
              <div className="text-slate-400">Actual Recovered</div>
              <div className="text-base font-bold text-cyan-400 mt-1">${outcome?.actual_recovered_value}</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Pattern Trajectory Evolution</h2>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
              <span className="text-slate-400">Trajectory Status:</span>
              <span className="font-bold text-emerald-400">{evolution?.post_intervention_activity?.trajectory_status || 'MONITORING'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
              <span className="text-slate-400">Affected Customers:</span>
              <span className="font-semibold text-slate-200">{evolution?.affected_customers}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
              <span className="text-slate-400">Post-Intervention Transactions:</span>
              <span className="font-semibold text-slate-200">{evolution?.post_intervention_activity?.post_intervention_transactions}</span>
            </div>
            <p className="text-slate-300 italic pt-1">
              {evolution?.post_intervention_activity?.impact_summary}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 6: MERCHANT FEEDBACK & AUDIT LOG */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-6">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <ThumbsUp className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-bold text-white">Merchant Feedback & Learnings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Feedback Type:</label>
            <select
              value={feedbackType}
              onChange={(e) => setFeedbackType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="CONFIRMED_ABUSE">CONFIRMED_ABUSE (True Fraud Pattern)</option>
              <option value="TRUE_POSITIVE">TRUE_POSITIVE (Accurate Suspicious Flag)</option>
              <option value="FALSE_POSITIVE">FALSE_POSITIVE (Incorrectly Flagged)</option>
              <option value="LEGITIMATE">LEGITIMATE (Normal Customer Activity)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Feedback Notes:</label>
            <input
              type="text"
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              placeholder="Feedback context..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none"
            />
          </div>

          <button
            onClick={handleFeedbackSubmit}
            disabled={submitting}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
          >
            Record Feedback
          </button>
        </div>

        {/* Audit Log Table */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Immutable Decision & Action Audit Log</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3">User</th>
                  <th className="py-2 px-3">Decision</th>
                  <th className="py-2 px-3">Action</th>
                  <th className="py-2 px-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {auditTrail.map((log: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{log.timestamp}</td>
                    <td className="py-2 px-3 font-medium text-slate-300">{log.user_id}</td>
                    <td className="py-2 px-3 font-bold text-blue-400">{log.decision}</td>
                    <td className="py-2 px-3 text-amber-400 font-semibold">{log.modified_action}</td>
                    <td className="py-2 px-3 text-slate-400 italic">{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
