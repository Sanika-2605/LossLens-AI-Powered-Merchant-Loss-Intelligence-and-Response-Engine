import React from 'react';
import clsx from 'clsx';

interface RiskBadgeProps {
  score?: number;
  level?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';
  className?: string;
  size?: 'sm' | 'md';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  score,
  level,
  className = '',
  size = 'md'
}) => {
  let resolvedLevel = level;
  if (score !== undefined) {
    if (score >= 80) resolvedLevel = 'CRITICAL';
    else if (score >= 60) resolvedLevel = 'HIGH';
    else if (score >= 40) resolvedLevel = 'MEDIUM';
    else if (score >= 20) resolvedLevel = 'LOW';
    else resolvedLevel = 'SAFE';
  }

  const styles = {
    CRITICAL: 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-100',
    HIGH: 'bg-red-50 text-red-600 border-red-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    LOW: 'bg-blue-50 text-blue-700 border-blue-200',
    SAFE: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  };

  const labels = {
    CRITICAL: 'Critical Risk',
    HIGH: 'High Risk',
    MEDIUM: 'Warning',
    LOW: 'Low Risk',
    SAFE: 'Verified Safe'
  };

  const targetLevel = resolvedLevel || 'LOW';

  return (
    <span
      className={clsx(
        "inline-flex items-center font-semibold rounded-md border",
        size === 'sm' ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        styles[targetLevel],
        className
      )}
    >
      <span
        className={clsx(
          "w-1.5 h-1.5 rounded-full mr-1.5",
          targetLevel === 'CRITICAL' && "bg-red-600 animate-pulse",
          targetLevel === 'HIGH' && "bg-red-500",
          targetLevel === 'MEDIUM' && "bg-amber-500",
          targetLevel === 'LOW' && "bg-blue-500",
          targetLevel === 'SAFE' && "bg-emerald-500"
        )}
      />
      {score !== undefined ? `${score}% ${labels[targetLevel]}` : labels[targetLevel]}
    </span>
  );
};
