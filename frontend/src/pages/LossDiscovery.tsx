import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, AlertTriangle, ChevronRight, Users, Smartphone, MapPin, IndianRupee, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { triggerPatternDiscovery, fetchDiscoveredPatterns, fetchPatternDetails } from '../services/api';
import clsx from 'clsx';

export const LossDiscovery: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [patternDetails, setPatternDetails] = useState<any | null>(null);
  
  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    try {
      const data = await fetchDiscoveredPatterns();
      if (Array.isArray(data)) {
        setPatterns(data);
      }
    } catch (e) {
      console.log('No patterns yet or error fetching.');
    }
  };

  const handleDiscover = async () => {
    setLoading(true);
    try {
      await triggerPatternDiscovery();
      await loadPatterns();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (pattern: any) => {
    setSelectedPattern(pattern);
    setDetailsLoading(true);
    setPatternDetails(null);
    try {
      const data = await fetchPatternDetails(pattern.id);
      setPatternDetails(data);
    } catch (error) {
      console.error(error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const totalExpectedLoss = patterns.reduce((sum, p) => sum + p.expected_loss, 0);
  const totalExposure = patterns.reduce((sum, p) => sum + p.potential_exposure + p.current_exposure, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between bg-gradient-to-r from-[#131b29] to-[#0b0f17] p-8 rounded-2xl border border-[#1f293d]">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
              <Cpu className="w-8 h-8 text-indigo-400" />
            </div>
            AI/ML Pattern Discovery Engine
          </h1>
          <p className="text-slate-400 mt-2 max-w-2xl text-lg">
            Autonomous multi-modal risk analysis using Isolation Forests (transactions), DBSCAN (behavioral clusters), and NetworkX (device/address communities).
          </p>
        </div>
        <button
          onClick={handleDiscover}
          disabled={loading}
          className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-lg transition-all shadow-xl shadow-indigo-600/30 border border-indigo-400/50"
        >
          <RefreshCw className={clsx("w-6 h-6", loading && "animate-spin")} />
          {loading ? 'Running ML Pipeline...' : 'Discover Patterns'}
        </button>
      </div>

      {patterns.length > 0 && (
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-[#131b29] p-6 rounded-2xl border border-[#1f293d] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><Cpu className="w-24 h-24"/></div>
            <p className="text-slate-400 text-sm font-medium tracking-wider uppercase">Discovered Clusters</p>
            <p className="text-4xl font-bold text-white mt-2">{patterns.length}</p>
          </div>
          <div className="bg-[#131b29] p-6 rounded-2xl border border-[#1f293d] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><AlertTriangle className="w-24 h-24"/></div>
            <p className="text-slate-400 text-sm font-medium tracking-wider uppercase">Avg Risk Score</p>
            <p className="text-4xl font-bold text-orange-400 mt-2">
              {(patterns.reduce((sum, p) => sum + p.risk_score, 0) / patterns.length).toFixed(1)}%
            </p>
          </div>
          <div className="bg-[#131b29] p-6 rounded-2xl border border-[#1f293d] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><IndianRupee className="w-24 h-24"/></div>
            <p className="text-slate-400 text-sm font-medium tracking-wider uppercase">Total Exposure</p>
            <p className="text-4xl font-bold text-rose-400 mt-2">₹{totalExposure.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-red-900/40 to-[#131b29] p-6 rounded-2xl border border-red-500/30 flex flex-col justify-between relative overflow-hidden">
            <p className="text-red-300 text-sm font-medium tracking-wider uppercase">Expected Loss</p>
            <p className="text-4xl font-bold text-red-400 mt-2">₹{totalExpectedLoss.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* List of Patterns */}
      <div className="space-y-4">
        {patterns.map((p) => (
          <div key={p.id} className="bg-[#131b29] rounded-2xl border border-[#1f293d] p-6 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer group" onClick={() => openDetails(p)}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                    <span className="text-xl font-bold text-slate-300">#{p.cluster_number}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Suspicious Cluster</h3>
                  <span className={clsx(
                    "px-3 py-1 text-sm font-bold rounded-lg border",
                    p.risk_score >= 80 ? "bg-red-500/10 text-red-400 border-red-500/20" :
                    p.risk_score >= 50 ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                    "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                  )}>
                    {p.risk_score}% Risk
                  </span>
                </div>
                
                <div className="flex gap-8 mt-6 text-sm text-slate-300">
                  <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg"><Users className="w-4 h-4 text-indigo-400"/> <span className="font-semibold text-white">{p.customers_count}</span> Customers</div>
                  <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg"><Smartphone className="w-4 h-4 text-emerald-400"/> <span className="font-semibold text-white">{p.devices_count}</span> Devices</div>
                  <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg"><MapPin className="w-4 h-4 text-amber-400"/> <span className="font-semibold text-white">{p.addresses_count}</span> Addresses</div>
                  <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg"><RefreshCw className="w-4 h-4 text-rose-400"/> <span className="font-semibold text-white">{p.refunds_count}</span> Refunds</div>
                </div>
                
                <div className="grid grid-cols-4 gap-8 mt-8 pb-2">
                  <div>
                    <p className="text-slate-500 text-xs tracking-wider uppercase mb-1">Current Exposure</p>
                    <p className="text-white font-medium text-lg">₹{p.current_exposure.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs tracking-wider uppercase mb-1">Potential Exposure</p>
                    <p className="text-orange-400 font-medium text-lg">₹{p.potential_exposure.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs tracking-wider uppercase mb-1">Expected Loss</p>
                    <p className="text-red-400 font-bold text-xl">₹{p.expected_loss.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs tracking-wider uppercase mb-1">Loss Velocity</p>
                    <p className="text-rose-400 font-medium text-lg">₹{p.loss_velocity.toLocaleString()}/hr</p>
                  </div>
                </div>
              </div>
              
              <div className="h-full flex items-center gap-3 pt-8">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/investigation/${p.id}`);
                  }}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30 border border-blue-400/50"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Investigate</span>
                </button>
                <button className="p-3 bg-indigo-600/10 text-indigo-400 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all flex items-center gap-2 border border-indigo-500/20">
                  <span className="font-semibold text-xs">Details</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Details Drawer */}
      {selectedPattern && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-[600px] h-full bg-[#0b0f17] border-l border-[#1f293d] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-[#1f293d] flex items-center justify-between bg-[#131b29]">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center border border-red-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                Cluster #{selectedPattern.cluster_number} Details
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(`/investigation/${selectedPattern.id}`)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Full Investigation</span>
                </button>
                <button onClick={() => setSelectedPattern(null)} className="p-2 hover:bg-[#1f293d] rounded-lg text-slate-400 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {detailsLoading ? (
                <div className="flex items-center justify-center h-40">
                  <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
              ) : patternDetails ? (
                <>
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-widest border-b border-[#1f293d] pb-2">Member Customers</h3>
                    <div className="space-y-3">
                      {patternDetails.customers.map((c: any) => (
                        <div key={c.id} className="p-4 bg-[#131b29] border border-[#1f293d] rounded-xl flex justify-between items-center hover:border-slate-700 transition-colors">
                          <span className="text-slate-200 font-medium">{c.name}</span>
                          <span className="text-slate-400 text-sm bg-black/30 px-3 py-1 rounded-md">{c.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-widest border-b border-[#1f293d] pb-2">Anomaly Metrics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(selectedPattern.metrics).map(([k, v]) => (
                        <div key={k} className="p-4 bg-[#131b29] border border-[#1f293d] rounded-xl relative overflow-hidden">
                          <p className="text-xs text-slate-400 capitalize mb-1">{k.replace('_', ' ')}</p>
                          <p className="text-2xl font-bold text-rose-400">{v as React.ReactNode}%</p>
                          <div 
                            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-rose-500 to-orange-500"
                            style={{ width: `${v}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-widest border-b border-[#1f293d] pb-2">Recent Transactions</h3>
                    <div className="space-y-4">
                      {patternDetails.payments.slice(0, 10).map((p: any) => (
                        <div key={p.id} className="p-4 rounded-xl border border-[#1f293d] bg-[#131b29] flex items-center justify-between">
                           <div>
                              <div className="flex items-center gap-3 mb-1">
                                <span className="font-bold text-slate-200 text-lg">₹{p.amount.toLocaleString()}</span>
                                <span className={clsx(
                                  "px-2 py-0.5 text-xs font-bold rounded",
                                  p.status === 'failed' ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                                )}>
                                  {p.status}
                                </span>
                              </div>
                              <p className="text-sm text-slate-400">{new Date(p.created_at).toLocaleString()}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-xs text-slate-500">Method</p>
                              <p className="text-sm text-slate-300 font-medium capitalize">{p.payment_method}</p>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
