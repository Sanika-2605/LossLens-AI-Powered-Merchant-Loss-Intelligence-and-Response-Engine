import React, { useEffect, useState } from 'react';
import { fetchStats } from '../services/api';
import type { Stats } from '../types';
import { Users, ShoppingBag, CreditCard, RotateCcw, Smartphone, MapPin, Activity, TrendingUp, AlertTriangle } from 'lucide-react';

export const Overview: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then((data) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-slate-400">Loading system telemetry...</div>;
  }

  const statCards = [
    { label: 'Transactions', value: stats?.transaction_count.toLocaleString(), sub: `₹${stats?.transaction_value.toLocaleString()}`, icon: CreditCard, color: 'text-blue-400' },
    { label: 'Customers', value: stats?.customer_count.toLocaleString(), sub: 'Registered Entities', icon: Users, color: 'text-purple-400' },
    { label: 'Orders', value: stats?.order_count.toLocaleString(), sub: 'Total Placed', icon: ShoppingBag, color: 'text-emerald-400' },
    { label: 'Refunds', value: stats?.refund_count.toLocaleString(), sub: `₹${stats?.refund_value.toLocaleString()}`, icon: RotateCcw, color: 'text-amber-400' },
    { label: 'Devices Linked', value: stats?.device_count.toLocaleString(), sub: 'Fingerprint Hashes', icon: Smartphone, color: 'text-cyan-400' },
    { label: 'Addresses Linked', value: stats?.address_count.toLocaleString(), sub: 'Unique Locations', icon: MapPin, color: 'text-indigo-400' },
    { label: 'Events Processed', value: stats?.event_count.toLocaleString(), sub: 'Normalized Telemetry', icon: Activity, color: 'text-pink-400' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Merchant Telemetry Overview</h2>
        <p className="text-sm text-slate-400 mt-1">Real-time database metrics connected to Supabase & Knowledge Graph</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="bg-[#131b29] border border-[#1f293d] p-5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-white">{card.value}</div>
              <div className="text-xs text-slate-400 mt-1">{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Loss Intelligence Placeholder Section */}
      <div className="border border-[#1f293d] bg-[#131b29]/40 rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Loss Intelligence (Future Pipeline Ready)</h3>
            <p className="text-xs text-slate-400">ML / AI Modules will populate parameters upon activation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#0b0f17] border border-[#1f293d] p-4 rounded-xl opacity-60">
            <span className="text-xs text-slate-500 font-medium">Emerging Patterns</span>
            <p className="text-sm font-medium text-slate-400 mt-2">Awaiting Intelligence Engine...</p>
          </div>
          <div className="bg-[#0b0f17] border border-[#1f293d] p-4 rounded-xl opacity-60">
            <span className="text-xs text-slate-500 font-medium">Risk Matrix</span>
            <p className="text-sm font-medium text-slate-400 mt-2">Awaiting Intelligence Engine...</p>
          </div>
          <div className="bg-[#0b0f17] border border-[#1f293d] p-4 rounded-xl opacity-60">
            <span className="text-xs text-slate-500 font-medium">Financial Exposure</span>
            <p className="text-sm font-medium text-slate-400 mt-2">Awaiting Intelligence Engine...</p>
          </div>
          <div className="bg-[#0b0f17] border border-[#1f293d] p-4 rounded-xl opacity-60">
            <span className="text-xs text-slate-500 font-medium">Expected Loss</span>
            <p className="text-sm font-medium text-slate-400 mt-2">Awaiting Intelligence Engine...</p>
          </div>
        </div>
      </div>
    </div>
  );
};
