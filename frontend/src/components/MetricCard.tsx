import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

interface MetricCardProps {
  label: string;
  value: number | string;
  prefix?: string;
  subtext?: string;
  trend?: number; // percentage growth e.g. +12.5 or -4.2
  trendLabel?: string;
  icon: React.ElementType;
  variant?: 'normal' | 'prominent-amber' | 'prominent-red' | 'prominent-blue';
  tooltip?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  prefix = '',
  subtext,
  trend,
  trendLabel = 'vs last 7d',
  icon: Icon,
  variant = 'normal'
}) => {
  const [displayValue, setDisplayValue] = useState<string | number>(typeof value === 'number' ? 0 : value);

  // Animated Count-Up effect for numbers
  useEffect(() => {
    if (typeof value !== 'number') {
      setDisplayValue(value);
      return;
    }

    const duration = 800; // ms
    const steps = 25;
    const stepTime = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const currentVal = Math.round(value * progress);
      setDisplayValue(currentVal.toLocaleString());

      if (currentStep >= steps) {
        clearInterval(timer);
        setDisplayValue(value.toLocaleString());
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  const isProminent = variant !== 'normal';

  return (
    <div
      className={clsx(
        "relative p-5 rounded-xl border transition-all duration-200 hover:shadow-card-hover group flex flex-col justify-between",
        variant === 'prominent-red' && "bg-gradient-to-br from-red-50 to-white border-red-200 shadow-sm ring-1 ring-red-100",
        variant === 'prominent-amber' && "bg-gradient-to-br from-amber-50 to-white border-amber-200 shadow-sm ring-1 ring-amber-100",
        variant === 'prominent-blue' && "bg-gradient-to-br from-blue-50 to-white border-blue-200 shadow-sm ring-1 ring-blue-100",
        variant === 'normal' && "bg-white border-slate-200 shadow-subtle hover:border-slate-300"
      )}
    >
      <div>
        <div className="flex items-center justify-between">
          <span
            className={clsx(
              "text-xs font-semibold tracking-wide uppercase",
              isProminent ? "text-slate-700 font-bold" : "text-slate-500"
            )}
          >
            {label}
          </span>
          <div
            className={clsx(
              "p-2 rounded-lg border",
              variant === 'prominent-red' && "bg-red-100 text-red-600 border-red-200",
              variant === 'prominent-amber' && "bg-amber-100 text-amber-600 border-amber-200",
              variant === 'prominent-blue' && "bg-blue-100 text-blue-600 border-blue-200",
              variant === 'normal' && "bg-slate-100 text-slate-600 border-slate-200"
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3">
          <div
            className={clsx(
              "font-bold tracking-tight text-slate-900",
              isProminent ? "text-3xl" : "text-2xl"
            )}
          >
            {prefix}{displayValue}
          </div>

          {subtext && (
            <p className="text-xs text-slate-500 mt-1 font-medium">{subtext}</p>
          )}
        </div>
      </div>

      {trend !== undefined && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <div
            className={clsx(
              "flex items-center font-semibold gap-1",
              trend > 0 ? "text-red-600" : trend < 0 ? "text-emerald-600" : "text-slate-500"
            )}
          >
            {trend > 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : trend < 0 ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : (
              <Minus className="w-3.5 h-3.5" />
            )}
            <span>
              {trend > 0 ? `+${trend}%` : `${trend}%`}
            </span>
          </div>
          <span className="text-slate-400 font-normal">{trendLabel}</span>
        </div>
      )}
    </div>
  );
};
