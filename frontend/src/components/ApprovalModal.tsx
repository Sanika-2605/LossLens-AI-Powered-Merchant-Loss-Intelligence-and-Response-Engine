import React, { useState } from 'react';
import { ShieldAlert, X, CheckCircle2, AlertTriangle, Send, Edit3, XCircle } from 'lucide-react';
import clsx from 'clsx';

export type ActionType = 'approve' | 'reject' | 'modify' | 'escalate' | 'dismiss';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (action: ActionType, reason: string, modifiedAction?: string) => Promise<void>;
  actionType: ActionType;
  patternTitle: string;
  expectedLoss?: number;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  patternTitle,
  expectedLoss
}) => {
  const [reason, setReason] = useState('');
  const [modifiedAction, setModifiedAction] = useState('VERIFICATION');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const getActionConfig = (type: ActionType) => {
    switch (type) {
      case 'approve':
        return {
          title: 'Approve Recommendation',
          btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          icon: CheckCircle2,
          colorClass: 'text-emerald-600',
          desc: 'This will authorize the recommended policy response to mitigate financial loss.'
        };
      case 'reject':
        return {
          title: 'Reject Action',
          btnBg: 'bg-red-600 hover:bg-red-700 text-white',
          icon: XCircle,
          colorClass: 'text-red-600',
          desc: 'Rejecting this policy recommendation allows current transaction behavior to proceed without automated holds.'
        };
      case 'modify':
        return {
          title: 'Modify Action',
          btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
          icon: Edit3,
          colorClass: 'text-amber-600',
          desc: 'Select an alternative enforcement action tailored for this merchant risk pattern.'
        };
      case 'escalate':
        return {
          title: 'Escalate Risk Pattern',
          btnBg: 'bg-purple-600 hover:bg-purple-700 text-white',
          icon: Send,
          colorClass: 'text-purple-600',
          desc: 'Escalates this pattern to senior risk managers and compliance review.'
        };
      case 'dismiss':
        return {
          title: 'Dismiss Pattern',
          btnBg: 'bg-slate-700 hover:bg-slate-800 text-white',
          icon: X,
          colorClass: 'text-slate-600',
          desc: 'Dismisses this risk alert as legitimate merchant/customer activity.'
        };
    }
  };

  const config = getActionConfig(actionType);
  const Icon = config.icon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await onConfirm(actionType, reason, actionType === 'modify' ? modifiedAction : undefined);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-modal max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={clsx("p-2.5 rounded-xl border bg-slate-50", config.colorClass)}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{config.title}</h3>
              <p className="text-xs text-slate-500 font-medium">{patternTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Test Mode Banner */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-blue-900">Razorpay Test Mode Active</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded uppercase">
              Simulated Hold
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">{config.desc}</p>

          {expectedLoss !== undefined && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Money at Risk Affected</span>
              <span className="font-bold text-slate-900 text-sm">₹{expectedLoss.toLocaleString()}</span>
            </div>
          )}

          {actionType === 'modify' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Modified Action:
              </label>
              <select
                value={modifiedAction}
                onChange={(e) => setModifiedAction(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="VERIFICATION">Identity & 2FA Verification Request</option>
                <option value="PROMOTION_RESTRICTION">Restrict Promotional Discounts</option>
                <option value="MANUAL_REVIEW">Flag for Manual Review</option>
                <option value="TEST_HOLD">Execute Temporary Order Hold</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Decision Justification / Notes (Optional):
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide context for audit records..."
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={clsx(
                "px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50",
                config.btnBg
              )}
            >
              {submitting ? 'Recording Decision...' : 'Confirm Decision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
