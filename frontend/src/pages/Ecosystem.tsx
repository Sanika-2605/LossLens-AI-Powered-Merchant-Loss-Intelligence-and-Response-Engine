import React, { useEffect, useState } from 'react';
import { fetchGraphSummary } from '../services/api';
import { Network, GitFork, Layers } from 'lucide-react';

export const Ecosystem: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGraphSummary()
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-slate-400">Loading ecosystem graph topology...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Merchant Ecosystem Topology</h2>
        <p className="text-sm text-slate-400 mt-1">NetworkX Knowledge Graph structural overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#131b29] border border-[#1f293d] p-6 rounded-2xl">
          <div className="flex items-center space-x-3 text-blue-400">
            <Network className="w-5 h-5" />
            <span className="text-sm font-medium text-slate-300">Total Entities (Nodes)</span>
          </div>
          <div className="text-3xl font-bold text-white mt-4">{summary?.nodes?.toLocaleString()}</div>
        </div>

        <div className="bg-[#131b29] border border-[#1f293d] p-6 rounded-2xl">
          <div className="flex items-center space-x-3 text-purple-400">
            <GitFork className="w-5 h-5" />
            <span className="text-sm font-medium text-slate-300">Relationships (Edges)</span>
          </div>
          <div className="text-3xl font-bold text-white mt-4">{summary?.edges?.toLocaleString()}</div>
        </div>

        <div className="bg-[#131b29] border border-[#1f293d] p-6 rounded-2xl">
          <div className="flex items-center space-x-3 text-emerald-400">
            <Layers className="w-5 h-5" />
            <span className="text-sm font-medium text-slate-300">Connected Clusters</span>
          </div>
          <div className="text-3xl font-bold text-white mt-4">{summary?.connected_components?.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Node Distribution */}
        <div className="bg-[#131b29] border border-[#1f293d] p-6 rounded-2xl">
          <h3 className="text-base font-semibold text-white mb-4">Entity Type Distribution</h3>
          <div className="space-y-3">
            {summary?.node_counts_by_type &&
              Object.entries(summary.node_counts_by_type).map(([type, count]: [string, any]) => (
                <div key={type} className="flex items-center justify-between p-3 bg-[#0b0f17] rounded-xl border border-[#1f293d]">
                  <span className="text-sm text-slate-300 font-medium">{type}</span>
                  <span className="text-sm font-bold text-blue-400">{count.toLocaleString()}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Edge Distribution */}
        <div className="bg-[#131b29] border border-[#1f293d] p-6 rounded-2xl">
          <h3 className="text-base font-semibold text-white mb-4">Relationship Types</h3>
          <div className="space-y-3">
            {summary?.edge_counts_by_type &&
              Object.entries(summary.edge_counts_by_type).map(([relation, count]: [string, any]) => (
                <div key={relation} className="flex items-center justify-between p-3 bg-[#0b0f17] rounded-xl border border-[#1f293d]">
                  <span className="text-sm text-slate-300 font-medium">{relation}</span>
                  <span className="text-sm font-bold text-purple-400">{count.toLocaleString()}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
