import React from 'react';
import { X, ShieldAlert, ArrowRight, Smartphone, MapPin, Users, ShoppingBag, CreditCard, RotateCcw, Tag } from 'lucide-react';
import clsx from 'clsx';

interface EvidencePanelProps {
  entity: any | null;
  onClose: () => void;
  onViewAllEvidence?: () => void;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  entity,
  onClose,
  onViewAllEvidence
}) => {
  if (!entity) return null;

  const raw = entity.data?.rawItem || {};
  const entityType = entity.data?.entityType || 'entity';
  const entityId = raw.id || entity.id;

  const getEntityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'customer':
        return <Users className="w-5 h-5 text-blue-600" />;
      case 'device':
        return <Smartphone className="w-5 h-5 text-cyan-600" />;
      case 'address':
        return <MapPin className="w-5 h-5 text-purple-600" />;
      case 'order':
        return <ShoppingBag className="w-5 h-5 text-emerald-600" />;
      case 'payment':
        return <CreditCard className="w-5 h-5 text-amber-600" />;
      case 'refund':
        return <RotateCcw className="w-5 h-5 text-red-600" />;
      default:
        return <Tag className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-[420px] bg-white border-l border-slate-200 shadow-modal flex flex-col animate-in slide-in-from-right duration-250">
      {/* Drawer Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-subtle">
            {getEntityIcon(entityType)}
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
              {entityType} Entity Analysis
            </div>
            <h3 className="font-bold text-slate-900 text-base font-mono">{entityId}</h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Why it matters banner */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
          <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Why This Entity Matters</span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed font-medium">
            {entityType.toLowerCase() === 'device' && 'Multiple distinct merchant customer accounts share this single device fingerprint.'}
            {entityType.toLowerCase() === 'customer' && 'Exhibits high refund velocity across short time windows after initial orders.'}
            {entityType.toLowerCase() === 'address' && 'Linked to multiple high-frequency orders with mismatched payment names.'}
            {entityType.toLowerCase() === 'refund' && 'Linked to repetitive chargeback or promotional voucher claims.'}
            {['order', 'payment', 'product', 'coupon'].includes(entityType.toLowerCase()) && 'Part of connected cluster flagged for anomalous refund concentration.'}
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Connected Relationships
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 font-medium">Connected Users</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{raw.connected_customers || 1}</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 font-medium">Associated Orders</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{raw.orders_count || 1}</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 font-medium">Refund Requests</span>
              <div className="text-lg font-bold text-red-600 mt-0.5">{raw.refunds_count || 1}</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 font-medium">Risk Status</span>
              <div className="text-xs font-bold text-amber-600 mt-1 uppercase">Flagged</div>
            </div>
          </div>
        </div>

        {/* Entity Attributes */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Entity Specifications
          </h4>
          <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200 text-xs">
            <div className="p-3 flex justify-between">
              <span className="text-slate-500">Identifier</span>
              <span className="font-mono font-semibold text-slate-900">{entityId}</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-slate-500">First Seen</span>
              <span className="font-medium text-slate-800">{raw.created_at ? new Date(raw.created_at).toLocaleDateString() : 'Recent'}</span>
            </div>
            {raw.email && (
              <div className="p-3 flex justify-between">
                <span className="text-slate-500">Email</span>
                <span className="font-medium text-slate-800">{raw.email}</span>
              </div>
            )}
            {raw.amount && (
              <div className="p-3 flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-bold text-slate-900">₹{raw.amount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
        <span className="text-xs text-slate-500">LossLens Intelligence</span>
        {onViewAllEvidence && (
          <button
            onClick={onViewAllEvidence}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors shadow-sm"
          >
            <span>View Full Evidence</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
