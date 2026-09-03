import React from 'react';

interface SkeletonProps {
  type?: 'card' | 'table' | 'graph' | 'banner';
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({ type = 'card', count = 4 }) => {
  if (type === 'graph') {
    return (
      <div className="h-[420px] w-full bg-slate-100 rounded-xl p-8 flex flex-col justify-between skeleton-shimmer border border-slate-200">
        <div className="flex justify-between items-center">
          <div className="h-6 w-48 bg-slate-200 rounded-md"></div>
          <div className="h-6 w-32 bg-slate-200 rounded-md"></div>
        </div>
        <div className="flex justify-around items-center opacity-60">
          <div className="w-16 h-16 rounded-full bg-slate-300"></div>
          <div className="w-20 h-20 rounded-full bg-slate-300"></div>
          <div className="w-16 h-16 rounded-full bg-slate-300"></div>
        </div>
        <div className="h-4 w-64 bg-slate-200 rounded-md"></div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-xl skeleton-shimmer border border-slate-200 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-32 bg-slate-100 rounded-xl p-5 skeleton-shimmer border border-slate-200 flex flex-col justify-between">
          <div className="h-4 w-24 bg-slate-200 rounded"></div>
          <div className="h-8 w-36 bg-slate-300 rounded"></div>
          <div className="h-3 w-20 bg-slate-200 rounded"></div>
        </div>
      ))}
    </div>
  );
};
