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
import { RiskBadge } from '../components/RiskBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Timeline } from '../components/Timeline';
import type { TimelineItem } from '../components/Timeline';
import { ApprovalModal } from '../components/ApprovalModal';
import type { ActionType } from '../components/ApprovalModal';
import { SkeletonLoader } from '../components/SkeletonLoader';
import {
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Edit3,
  Send,
  X,
  Layers,
  Zap,
  Lock,
  Award,
  TrendingUp,
  ThumbsUp,
  FileCheck,
  IndianRupee,
  Check
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

  // Form states
  const [selectedTestAction, setSelectedTestAction] = useState<string>('create_review_case');
  const [actionReason, setActionReason] = useState<string>('');
  const [feedbackType, setFeedbackType] = useState<string>('CONFIRMED_ABUSE');
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [currentActionType, setCurrentActionType] = useState<ActionType>('approve');

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
      setError(err.message || 'Failed to load Decision Center');
    } finally {
      setLoading(false);
    }
  }, [targetPatternId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExecuteTestAction = async () => {
    try {
      setSubmitting(true);
      setStatusMsg(null);
      const res = await executeTestAction(targetPatternId, selectedTestAction, {
        user_id: 'merchant_admin',
        reason: actionReason || 'Merchant test action execution'
      });
      setStatusMsg(`Policy test action '${res.action || selectedTestAction}' executed successfully.`);
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
      setStatusMsg(`Merchant feedback '${feedbackType}' recorded for risk engine evaluation.`);
      setFeedbackNotes('');
      await loadData();
    } catch (err: any) {
      alert(`Feedback error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenModal = (type: ActionType) => {
    setCurrentActionType(type);
    setModalOpen(true);
  };

  const handleConfirmDecision = async (action: ActionType, reason: string, modifiedAction?: string) => {
    await submitDecision(targetPatternId, action, {
      user_id: 'merchant_admin',
      reason,
      modified_action: modifiedAction
    });
    setStatusMsg(`Decision '${action.toUpperCase()}' recorded in audit trail.`);
    await loadData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-slate-100 rounded-xl skeleton-shimmer" />
        <SkeletonLoader type="card" count={4} />
      </div>
    );
  }

  const timelineItems: TimelineItem[] = (auditTrail || []).map((a: any) => ({
    timestamp: a.timestamp || 'Recent',
    type: 'decision',
    title: `Decision Recorded: ${a.decision}`,
    description: a.reason || 'Merchant reviewed policy recommendation',
    user: a.user_id || 'merchant_admin'
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <button
            onClick={() => navigate(`/investigation/${targetPatternId}`)}
            className="flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Investigation
          </button>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Decision Center: <span className="text-blue-600">{targetPatternId}</span>
            </h1>
            <RiskBadge score={decision?.risk || 80} />
          </div>
        </div>

        {/* TEST MODE BANNER */}
        <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-200 shadow-subtle">
          <Zap className="w-4 h-4 text-blue-600" />
          <div className="text-xs">
            <span className="font-bold text-blue-900">Razorpay Test Mode Active</span>
            <p className="text-[10px] text-blue-700 font-medium">All policy actions are executed in test simulation</p>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-subtle">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* 1. POLICY ENGINE RECOMMENDATION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-card space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2 text-blue-600 font-bold text-sm">
              <Lock className="w-4 h-4" />
              <h2>Policy Engine Recommendation</h2>
            </div>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg uppercase">
              {decision?.recommended_action || 'REQUEST_VERIFICATION'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 font-semibold">Triggered Policy Rule:</span>
              <p className="font-mono text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-1 font-semibold">
                {decision?.policy_rule || 'RULE_HIGH_VELOCITY_REFUND_DEVICE_SHARE'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 text-center">
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <div className="text-emerald-700 font-semibold text-[10px]">Expected Recovery</div>
                <div className="text-base font-extrabold text-emerald-800 mt-0.5">₹{(decision?.expected_benefit || 18500).toLocaleString()}</div>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <div className="text-amber-700 font-semibold text-[10px]">Customer Friction</div>
                <div className="text-base font-extrabold text-amber-800 mt-0.5">Low</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-slate-500 font-semibold text-[10px]">Ops Cost</div>
                <div className="text-base font-extrabold text-slate-800 mt-0.5">Minimal</div>
              </div>
            </div>
          </div>
        </div>

        {/* Priority Evaluation */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-card space-y-4">
          <div className="flex items-center space-x-2 text-purple-600 font-bold text-sm border-b border-slate-100 pb-3">
            <Award className="w-4 h-4" />
            <h2>Decision Hierarchy Evaluation</h2>
          </div>

          <ul className="space-y-2 text-xs font-mono text-slate-700">
            {(decision?.priority_evaluation || [
              '1. Capital Protection Gate: Flag refund concentration above ₹10,000 threshold',
              '2. Customer Friction Minimization: Prefer 2FA verification over instant order cancellation',
              '3. Merchant Policy Compliance: Enforce test mode hold'
            ]).map((p: string, idx: number) => (
              <li key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-semibold">
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 2. COUNTERFACTUAL ACTION SIMULATION MATRIX */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-4">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
          <Layers className="w-4 h-4 text-blue-600" />
          <h2>Counterfactual Intervention Matrix</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[11px] text-slate-500">
                <th className="py-3 px-4">Intervention Option</th>
                <th className="py-3 px-4">Expected Loss</th>
                <th className="py-3 px-4">Recovered Capital</th>
                <th className="py-3 px-4">Customer Friction</th>
                <th className="py-3 px-4">Net Benefit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {(simulations.length > 0 ? simulations : [
                { label: 'Option A: Identity & 2FA Verification', expected_loss: 5000, expected_recovered_value: 18500, legitimate_customer_impact: 'Minimal', net_benefit: 13500 },
                { label: 'Option B: Temporary Order Hold', expected_loss: 2000, expected_recovered_value: 21000, legitimate_customer_impact: 'Moderate', net_benefit: 19000 },
                { label: 'Option C: Account Block', expected_loss: 0, expected_recovered_value: 23500, legitimate_customer_impact: 'High', net_benefit: 23500 }
              ]).map((sim: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{sim.label}</td>
                  <td className="py-3 px-4 text-red-600 font-bold">₹{sim.expected_loss}</td>
                  <td className="py-3 px-4 text-emerald-600 font-bold">₹{sim.expected_recovered_value}</td>
                  <td className="py-3 px-4 text-amber-600">{sim.legitimate_customer_impact}</td>
                  <td className="py-3 px-4 font-extrabold text-blue-600">₹{sim.net_benefit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. POLICY TEST ACTION EXECUTOR */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-4">
        <div className="flex items-center space-x-2 text-amber-600 font-bold text-sm border-b border-slate-100 pb-3">
          <Zap className="w-4 h-4" />
          <h2>Execute Policy Test Action</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Policy Action:</label>
            <select
              value={selectedTestAction}
              onChange={(e) => setSelectedTestAction(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none font-semibold"
            >
              <option value="create_review_case">Create Fraud Review Case</option>
              <option value="request_verification">Request Identity / 2FA Verification</option>
              <option value="restrict_promotion">Restrict Promotional Discount</option>
              <option value="notify_merchant">Send Merchant Admin Notification</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Action Reason / Context:</label>
            <input
              type="text"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Context for execution record..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none"
            />
          </div>

          <button
            onClick={handleExecuteTestAction}
            disabled={submitting}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            Execute Test Action
          </button>
        </div>
      </div>

      {/* 4. MERCHANT APPROVAL ACTIONS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">Merchant Approval Action</h2>
          <span className="text-xs text-slate-500 font-medium">Select action to record in immutable decision log</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleOpenModal('approve')}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
          >
            Approve Recommendation
          </button>
          <button
            onClick={() => handleOpenModal('reject')}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
          >
            Reject Action
          </button>
          <button
            onClick={() => handleOpenModal('modify')}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
          >
            Modify Action
          </button>
          <button
            onClick={() => handleOpenModal('escalate')}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
          >
            Escalate Risk
          </button>
          <button
            onClick={() => handleOpenModal('dismiss')}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs border border-slate-200 transition-colors"
          >
            Dismiss Alert
          </button>
        </div>

        {/* Audit Log Timeline */}
        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Decision History Timeline</h3>
          <Timeline items={timelineItems} />
        </div>
      </div>

      {/* Confirmation Modal */}
      <ApprovalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmDecision}
        actionType={currentActionType}
        patternTitle={`Cluster #${targetPatternId}`}
        expectedLoss={decision?.expected_benefit}
      />
    </div>
  );
};
