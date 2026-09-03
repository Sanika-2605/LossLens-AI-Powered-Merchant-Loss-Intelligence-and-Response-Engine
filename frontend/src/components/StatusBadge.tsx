import React from 'react';
import clsx from 'clsx';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalized = status.toUpperCase().replace(/\s+/g, '_');

  let style = 'bg-slate-100 text-slate-700 border-slate-200';

  if (['APPROVED', 'SAFE', 'VERIFIED', 'RESOLVED'].includes(normalized)) {
    style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (['REJECTED', 'DISMISSED', 'BLOCKED'].includes(normalized)) {
    style = 'bg-red-50 text-red-700 border-red-200';
  } else if (['MODIFIED', 'REVIEW', 'HOLD', 'WARNING', 'SUSPICIOUS'].includes(normalized)) {
    style = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (['ACTIVE', 'PENDING', 'INFO', 'INVESTIGATING'].includes(normalized)) {
    style = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (['AI_DISCOVERED', 'AI_INSIGHT', 'CLUSTERED'].includes(normalized)) {
    style = 'bg-purple-50 text-purple-700 border-purple-200';
  }

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize",
        style,
        className
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
};
