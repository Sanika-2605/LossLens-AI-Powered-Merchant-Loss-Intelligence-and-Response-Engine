import React from 'react';
import { Clock, ShieldAlert, CheckCircle2, AlertTriangle, UserCheck, Eye, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

export interface TimelineItem {
  id?: string;
  timestamp: string;
  type: 'risk_detected' | 'investigation' | 'recommendation' | 'decision' | 'action' | 'outcome';
  title: string;
  description?: string;
  user?: string;
  status?: string;
  riskName?: string;
}

interface TimelineProps {
  items: TimelineItem[];
  compact?: boolean;
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ items, compact = false, className = '' }) => {
  if (!items || items.length === 0) {
    return (
      <div className="text-xs text-slate-500 italic py-4 text-center">
        No decisions recorded yet.
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'risk_detected':
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />;
      case 'investigation':
        return <Eye className="w-3.5 h-3.5 text-blue-600" />;
      case 'recommendation':
        return <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />;
      case 'decision':
      case 'action':
        return <UserCheck className="w-3.5 h-3.5 text-emerald-600" />;
      case 'outcome':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case 'risk_detected':
        return 'bg-amber-50 border-amber-200';
      case 'investigation':
        return 'bg-blue-50 border-blue-200';
      case 'recommendation':
        return 'bg-purple-50 border-purple-200';
      case 'decision':
      case 'action':
      case 'outcome':
        return 'bg-emerald-50 border-emerald-200';
      default:
        return 'bg-slate-100 border-slate-200';
    }
  };

  return (
    <div className={clsx("space-y-4", className)}>
      <div className="relative border-l-2 border-slate-200 ml-3 space-y-4 py-1">
        {items.map((item, idx) => (
          <div key={item.id || idx} className="relative pl-6 group">
            {/* Timeline Dot Icon */}
            <div
              className={clsx(
                "absolute -left-[13px] top-0.5 w-6 h-6 rounded-full border flex items-center justify-center shadow-subtle bg-white",
                getBg(item.type)
              )}
            >
              {getIcon(item.type)}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold gap-1">
              <div className="flex items-center space-x-2">
                <span className="text-slate-900 font-bold">{item.title}</span>
                {item.riskName && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                    {item.riskName}
                  </span>
                )}
              </div>
              <span className="text-slate-400 font-mono text-[11px] font-normal">{item.timestamp}</span>
            </div>

            {item.description && (
              <p className="text-xs text-slate-600 mt-0.5 font-normal leading-relaxed">
                {item.description}
              </p>
            )}

            {item.user && (
              <span className="text-[11px] text-slate-500 mt-1 block">
                Acted by: <span className="font-medium text-slate-700">{item.user}</span>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
