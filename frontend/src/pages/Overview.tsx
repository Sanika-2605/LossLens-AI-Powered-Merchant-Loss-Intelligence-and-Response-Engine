import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStats, fetchDiscoveredPatterns, fetchInvestigationAudit } from '../services/api';
import type { Stats } from '../types';
import { MetricCard } from '../components/MetricCard';
import { RiskBadge } from '../components/RiskBadge';
import { Timeline } from '../components/Timeline';
import type { TimelineItem } from '../components/Timeline';
import { AnimatedIllustration } from '../components/AnimatedIllustration';
import { SkeletonLoader } from '../components/SkeletonLoader';
import {
  CreditCard,
  ShieldAlert,
  AlertTriangle,
  IndianRupee,
  ShieldCheck,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export const Overview: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOverviewData = async () => {
      try {
        setLoading(true);
        const [statsData, patternsData] = await Promise.all([
          fetchStats().catch(() => null),
          fetchDiscoveredPatterns().catch(() => [])
        ]);

        setStats(statsData);
        setPatterns(Array.isArray(patternsData) ? patternsData : []);

        // Load recent audit decisions for compact timeline
        if (patternsData && patternsData.length > 0) {
          const firstPatternId = patternsData[0].id;
          const audit = await fetchInvestigationAudit(firstPatternId).catch(() => ({ audit_trail: [] }));
          if (audit?.audit_trail) {
            const formatted: TimelineItem[] = audit.audit_trail.slice(0, 4).map((a: any) => ({
              timestamp: a.timestamp || 'Recent',
              type: 'decision',
              title: `Decision: ${a.decision}`,
              description: a.reason || 'Merchant reviewed policy recommendation',
              user: a.user_id || 'merchant_admin',
              riskName: firstPatternId
            }));
            setTimelineItems(formatted);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadOverviewData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-slate-100 rounded-xl skeleton-shimmer" />
        <SkeletonLoader type="card" count={4} />
        <div className="h-64 bg-slate-100 rounded-xl skeleton-shimmer" />
      </div>
    );
  }

  // Calculated totals across patterns
  const totalMoneyAtRisk = patterns.reduce((sum, p) => sum + (p.current_exposure || 0) + (p.potential_exposure || 0), 0) || (stats?.refund_value || 145000);
  const totalExpectedLoss = patterns.reduce((sum, p) => sum + (p.expected_loss || 0), 0) || 48200;
  const activeRiskCount = patterns.filter(p => p.risk_score >= 60).length || 3;
  const emergingRiskCount = patterns.length || 5;

  // Mock historical trend data for Money-at-Risk
  const trendChartData = [
    { day: 'Mon', moneyAtRisk: totalMoneyAtRisk * 0.65, expectedLoss: totalExpectedLoss * 0.5 },
    { day: 'Tue', moneyAtRisk: totalMoneyAtRisk * 0.72, expectedLoss: totalExpectedLoss * 0.6 },
    { day: 'Wed', moneyAtRisk: totalMoneyAtRisk * 0.80, expectedLoss: totalExpectedLoss * 0.7 },
    { day: 'Thu', moneyAtRisk: totalMoneyAtRisk * 0.88, expectedLoss: totalExpectedLoss * 0.85 },
    { day: 'Fri', moneyAtRisk: totalMoneyAtRisk * 0.95, expectedLoss: totalExpectedLoss * 0.9 },
    { day: 'Sat', moneyAtRisk: totalMoneyAtRisk * 0.98, expectedLoss: totalExpectedLoss * 0.95 },
    { day: 'Sun', moneyAtRisk: totalMoneyAtRisk, expectedLoss: totalExpectedLoss }
  ];

  // Strongest actionable risk pattern
  const topRisk = patterns.length > 0 ? patterns[0] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. ABOVE THE FOLD: Header + Hero Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-card">
        <div className="flex-1 space-y-2">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Autonomous Risk Intelligence</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Merchant Risk Command Center
          </h1>
          <p className="text-slate-500 text-xs font-medium max-w-xl leading-relaxed">
            Real-time financial risk detection, automated exposure calculations, and direct loss prevention for your payment ecosystem.
          </p>
        </div>

        {/* Subtle Financial Lens Visual */}
        <div className="hidden sm:block shrink-0">
          <AnimatedIllustration type="overview" />
        </div>
      </div>

      {/* 2. TOP ACTIONABLE RISK HIGHLIGHT BANNER (If active risks exist) */}
      {topRisk && (
        <div className="bg-gradient-to-r from-red-50 via-white to-amber-50 border border-red-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-xl border border-red-200 shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Priority Risk Attention</span>
                <RiskBadge score={topRisk.risk_score} size="sm" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                Coordinated Refund Spike (Cluster #{topRisk.cluster_number || 1})
              </h3>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                {topRisk.customers_count || 5} linked customers sharing device signatures with excessive refund velocity.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-6 shrink-0 border-t md:border-t-0 md:border-l border-red-200 pt-3 md:pt-0 md:pl-6 w-full md:w-auto justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Money at Risk</span>
              <div className="text-xl font-extrabold text-red-600">
                ₹{(topRisk.current_exposure || 45000).toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => navigate(`/investigation/${topRisk.id}`)}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-2 shrink-0"
            >
              <span>Investigate Risk</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. KPI CARDS (6 Merchant Metrics - Money at Risk & Expected Loss Prominent) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* PROMINENT 1: Money at Risk */}
        <MetricCard
          label="Money at Risk"
          value={totalMoneyAtRisk}
          prefix="₹"
          subtext="Total financial exposure requiring merchant action"
          trend={+12.4}
          icon={IndianRupee}
          variant="prominent-red"
        />

        {/* PROMINENT 2: Expected Loss */}
        <MetricCard
          label="Expected Loss"
          value={totalExpectedLoss}
          prefix="₹"
          subtext="Estimated unrecoverable loss if unaddressed"
          trend={+8.1}
          icon={AlertTriangle}
          variant="prominent-amber"
        />

        {/* PROMINENT 3: Loss Prevented */}
        <MetricCard
          label="Loss Prevented"
          value={stats?.refund_value ? Math.round(stats.refund_value * 0.4) : 38500}
          prefix="₹"
          subtext="Recovered capital from merchant interventions"
          trend={-15.2}
          icon={ShieldCheck}
          variant="prominent-blue"
        />

        <MetricCard
          label="Active Risks"
          value={activeRiskCount}
          subtext="Critical patterns needing immediate decision"
          icon={ShieldAlert}
        />

        <MetricCard
          label="Emerging Risks"
          value={emergingRiskCount}
          subtext="Discovered clusters under monitoring"
          icon={TrendingUp}
        />

        <MetricCard
          label="Transactions Processed"
          value={stats?.transaction_count || 1240}
          subtext={`₹${(stats?.transaction_value || 850000).toLocaleString()} volume`}
          icon={CreditCard}
        />
      </div>

      {/* 4. MAIN VISUAL: Money-at-Risk Trend Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Money-at-Risk Trajectory</h2>
            <p className="text-xs text-slate-500 font-medium">
              Daily tracking of total financial exposure vs expected unrecoverable loss
            </p>
          </div>
          <div className="flex items-center space-x-4 text-xs font-semibold">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-500"></span>
              <span className="text-slate-600">Money at Risk</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-red-500"></span>
              <span className="text-slate-600">Expected Loss</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', borderColor: '#e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, '']}
              />
              <Area type="monotone" dataKey="moneyAtRisk" name="Money at Risk" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRisk)" />
              <Area type="monotone" dataKey="expectedLoss" name="Expected Loss" stroke="#dc2626" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorLoss)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. EMERGING RISKS PREVIEW (Top 3-5 Actionable Risks) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Emerging Risk Patterns</h2>
            <p className="text-xs text-slate-500 font-medium">Top financial risk patterns requiring merchant evaluation</p>
          </div>
          <button
            onClick={() => navigate('/discovery')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <span>View All Emerging Risks</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {patterns.slice(0, 4).map((p: any) => (
            <div
              key={p.id}
              className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 px-3 rounded-xl transition-colors cursor-pointer group"
              onClick={() => navigate(`/investigation/${p.id}`)}
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm shrink-0">
                  #{p.cluster_number || 1}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-slate-900 text-sm">Suspicious Refund Pattern</h4>
                    <RiskBadge score={p.risk_score} size="sm" />
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-slate-500 mt-1">
                    <span>{p.customers_count || 3} Customers</span>
                    <span>•</span>
                    <span>{p.refunds_count || 5} Refunds</span>
                    <span>•</span>
                    <span>Growth: <strong className="text-red-600">+18%/24h</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-6 justify-between md:justify-end">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Money at Risk</span>
                  <div className="text-base font-extrabold text-slate-900">
                    ₹{(p.current_exposure || 24000).toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/investigation/${p.id}`);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-sm"
                >
                  <span>Investigate</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. RECENT DECISIONS (Compact Timeline near bottom) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Merchant Decisions</h2>
            <p className="text-xs text-slate-500 font-medium">Compact decision and audit activity history</p>
          </div>
          <button
            onClick={() => navigate('/decision')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <span>Decision Center</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <Timeline items={timelineItems.length > 0 ? timelineItems : [
          { timestamp: '10 mins ago', type: 'decision', title: 'Action Approved: Identity Verification Required', description: 'Triggered 2FA verification policy hold for Cluster #1', user: 'merchant_admin', riskName: 'pattern_0' },
          { timestamp: '2 hours ago', type: 'recommendation', title: 'Policy Engine Recommendation', description: 'Recommended temporary promotion restriction on shared devices', user: 'system', riskName: 'pattern_1' }
        ]} />
      </div>
    </div>
  );
};
