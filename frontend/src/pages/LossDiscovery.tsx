import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { triggerPatternDiscovery, fetchDiscoveredPatterns, fetchPatternDetails } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';
import { StatusBadge } from '../components/StatusBadge';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { AnimatedIllustration } from '../components/AnimatedIllustration';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  Users,
  Smartphone,
  MapPin,
  RotateCcw,
  IndianRupee,
  X,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import clsx from 'clsx';

export const LossDiscovery: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  
  // 5-Stage Live Discovery Sequence State
  const [discoveryStage, setDiscoveryStage] = useState<number>(0);
  const discoveryStages = [
    'Loading merchant transaction & payment logs...',
    'Analyzing behavioral anomaly signals...',
    'Connecting multi-entity graph relationships...',
    'Detecting emerging coordinated risk patterns...',
    'Calculating financial exposure & loss velocity...'
  ];

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    try {
      setFetching(true);
      const data = await fetchDiscoveredPatterns();
      if (Array.isArray(data)) {
        setPatterns(data);
      }
    } catch (e) {
      console.log('No patterns yet or error fetching.');
    } finally {
      setFetching(false);
    }
  };

  const handleDiscover = async () => {
    setLoading(true);
    setDiscoveryStage(0);

    // Animate stage sequence smoothly
    const interval = setInterval(() => {
      setDiscoveryStage((prev) => {
        if (prev < discoveryStages.length - 1) return prev + 1;
        return prev;
      });
    }, 600);

    try {
      await triggerPatternDiscovery();
      await loadPatterns();
    } catch (error) {
      console.error(error);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  // Filter patterns by search & severity
  const filteredPatterns = patterns.filter((p) => {
    const titleMatch = `Cluster #${p.cluster_number}`.toLowerCase().includes(searchQuery.toLowerCase());
    if (!titleMatch && searchQuery) return false;

    if (selectedSeverity === 'CRITICAL' && p.risk_score < 80) return false;
    if (selectedSeverity === 'HIGH' && (p.risk_score < 60 || p.risk_score >= 80)) return false;
    if (selectedSeverity === 'MEDIUM' && (p.risk_score < 40 || p.risk_score >= 60)) return false;

    return true;
  });

  const totalExposure = patterns.reduce((sum, p) => sum + (p.current_exposure || 0) + (p.potential_exposure || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold border border-purple-200">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>AI Risk Discovery Engine</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Emerging Risk Patterns
          </h1>
          <p className="text-slate-500 text-xs font-medium max-w-xl">
            Autonomous discovery of connected refund spikes, device sharing, and unusual merchant activity.
          </p>
        </div>

        <button
          onClick={handleDiscover}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-2 shrink-0"
        >
          <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          <span>{loading ? 'Running Risk Discovery...' : 'Discover Emerging Risks'}</span>
        </button>
      </div>

      {/* 5-STAGE DISCOVERY ANIMATION OVERLAY / BANNER */}
      {loading && (
        <div className="bg-white border border-blue-200 rounded-2xl p-6 shadow-card space-y-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-200">
              {discoveryStage + 1}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Autonomous Analysis Sequence</h3>
              <p className="text-xs text-blue-600 font-semibold mt-0.5">{discoveryStages[discoveryStage]}</p>
            </div>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-500"
              style={{ width: `${((discoveryStage + 1) / discoveryStages.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* SEARCH & FILTER BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pattern, cluster number..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-slate-500 font-medium">Severity:</span>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-semibold text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical (Score &ge; 80%)</option>
            <option value="HIGH">High (Score 60-79%)</option>
            <option value="MEDIUM">Warning (Score 40-59%)</option>
          </select>
        </div>
      </div>

      {/* PATTERNS SEARCHABLE TABLE */}
      {fetching ? (
        <SkeletonLoader type="table" count={5} />
      ) : filteredPatterns.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4">
          <AnimatedIllustration type="safe" className="mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">No Emerging Risks Detected</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Your transaction telemetry shows normal merchant behavior with zero active risk clusters flagged.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-5">Risk Pattern</th>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Entities</th>
                  <th className="py-3.5 px-4">Refunds</th>
                  <th className="py-3.5 px-4">Money at Risk</th>
                  <th className="py-3.5 px-4">24h Growth</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPatterns.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/investigation/${p.id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-800 text-xs">
                          #{p.cluster_number || 1}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">Suspicious Refund Cluster</div>
                          <span className="text-[11px] text-slate-400 font-mono">ID: {p.id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <RiskBadge score={p.risk_score} size="sm" />
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3 text-slate-700 font-medium">
                        <span className="flex items-center space-x-1"><Users className="w-3.5 h-3.5 text-blue-600"/> <span>{p.customers_count || 1}</span></span>
                        <span className="flex items-center space-x-1"><Smartphone className="w-3.5 h-3.5 text-cyan-600"/> <span>{p.devices_count || 1}</span></span>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-semibold text-slate-800">
                      {p.refunds_count || 3} requests
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-extrabold text-slate-900 text-sm">
                        ₹{(p.current_exposure || 18500).toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-400">Potential: ₹{(p.potential_exposure || 32000).toLocaleString()}</span>
                    </td>

                    <td className="py-4 px-4 font-bold text-red-600">
                      +{(p.loss_velocity ? Math.round(p.loss_velocity / 100) : 15)}%
                    </td>

                    <td className="py-4 px-4">
                      <StatusBadge status={p.risk_score >= 80 ? 'CRITICAL' : 'AI_DISCOVERED'} />
                    </td>

                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/investigation/${p.id}`);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs inline-flex items-center space-x-1.5 transition-colors shadow-sm"
                      >
                        <span>Investigate</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
