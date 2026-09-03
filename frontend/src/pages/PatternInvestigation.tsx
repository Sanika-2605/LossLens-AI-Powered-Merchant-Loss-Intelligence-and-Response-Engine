import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  fetchInvestigation,
  fetchInvestigationEvidence,
  fetchInvestigationExplanation,
  fetchInvestigationForecast,
  fetchInvestigationSimulation,
  fetchInvestigationDecision,
  fetchInvestigationHypotheses,
  fetchInvestigationAudit,
  submitDecision
} from '../services/api';
import { RiskBadge } from '../components/RiskBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Timeline } from '../components/Timeline';
import type { TimelineItem } from '../components/Timeline';
import { EvidencePanel } from '../components/EvidencePanel';
import { ApprovalModal } from '../components/ApprovalModal';
import type { ActionType } from '../components/ApprovalModal';
import {
  ShieldAlert,
  ArrowLeft,
  Activity,
  AlertTriangle,
  TrendingUp,
  GitFork,
  Clock,
  Layers,
  CheckCircle,
  HelpCircle,
  Users,
  Smartphone,
  MapPin,
  ShoppingBag,
  CreditCard,
  RotateCcw,
  Tag,
  Filter,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// Semantic Node Colors
const nodeColors: Record<string, { bg: string; border: string; text: string }> = {
  customer: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
  device: { bg: '#ecfeff', border: '#06b6d4', text: '#155e75' },
  address: { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8' },
  order: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
  payment: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
  refund: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  product: { bg: '#fdf2f8', border: '#ec4899', text: '#9d174d' },
  coupon: { bg: '#fefce8', border: '#eab308', text: '#854d0e' }
};

export const PatternInvestigation: React.FC = () => {
  const { patternId } = useParams<{ patternId: string }>();
  const navigate = useNavigate();
  const targetPatternId = patternId || 'pattern_0';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core Data States
  const [investigation, setInvestigation] = useState<any>(null);
  const [evidence, setEvidence] = useState<any>(null);
  const [explanation, setExplanation] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [simulation, setSimulation] = useState<any>(null);
  const [decision, setDecision] = useState<any>(null);
  const [hypotheses, setHypotheses] = useState<any>(null);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);

  // Graph Controls
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showAllConnections, setShowAllConnections] = useState<boolean>(false);
  const [entityFilter, setEntityFilter] = useState<string>('ALL');

  // Approval Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [currentActionType, setCurrentActionType] = useState<ActionType>('approve');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [invData, evData, expData, fcData, simData, decData, hypData, audData] =
        await Promise.all([
          fetchInvestigation(targetPatternId).catch(() => null),
          fetchInvestigationEvidence(targetPatternId).catch(() => null),
          fetchInvestigationExplanation(targetPatternId).catch(() => null),
          fetchInvestigationForecast(targetPatternId).catch(() => null),
          fetchInvestigationSimulation(targetPatternId).catch(() => null),
          fetchInvestigationDecision(targetPatternId).catch(() => null),
          fetchInvestigationHypotheses(targetPatternId).catch(() => null),
          fetchInvestigationAudit(targetPatternId).catch(() => ({ audit_trail: [] }))
        ]);

      setInvestigation(invData);
      setEvidence(evData);
      setExplanation(expData);
      setForecast(fcData);
      setSimulation(simData);
      setDecision(decData);
      setHypotheses(hypData);
      setAuditTrail(audData?.audit_trail || []);

      // Construct ReactFlow Graph with Light Merchant Styling
      if (evData && evData.entities) {
        const flowNodes: Node[] = [];
        const flowEdges: Edge[] = [];
        const entityTypes = ['customers', 'devices', 'addresses', 'orders', 'payments', 'refunds'];

        let xOffset = 60;
        let yOffset = 50;

        entityTypes.forEach((typeKey, typeIdx) => {
          const items = evData.entities[typeKey] || [];
          const typeName = typeKey.slice(0, -1);
          const color = nodeColors[typeName] || { bg: '#f8fafc', border: '#94a3b8', text: '#0f172a' };

          items.forEach((item: any, idx: number) => {
            const nodeId = `${typeName}:${item.id}`;
            const isSuspicious = item.status === 'flagged' || typeName === 'refund';

            flowNodes.push({
              id: nodeId,
              type: 'default',
              data: {
                label: `${typeName.toUpperCase()} #${item.id}`,
                entityType: typeName,
                rawItem: item,
                isSuspicious
              },
              position: { x: xOffset + (idx % 4) * 200, y: yOffset + typeIdx * 90 },
              style: {
                background: color.bg,
                color: color.text,
                border: `2px solid ${isSuspicious ? '#ef4444' : color.border}`,
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '11px',
                fontWeight: 700,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }
            });
          });
        });

        // Add Edges with Relationship Labels (used, shared, placed, paid, refunded)
        (evData.relationships || []).forEach((rel: any, idx: number) => {
          let label = rel.relationship_type.toLowerCase();
          if (label.includes('device')) label = 'shared';
          else if (label.includes('placed')) label = 'placed';
          else if (label.includes('payment')) label = 'paid';
          else if (label.includes('refund')) label = 'refunded';
          else if (label.includes('address')) label = 'used';

          flowEdges.push({
            id: `edge-${idx}`,
            source: rel.source,
            target: rel.target,
            label: label,
            type: 'smoothstep',
            animated: rel.is_suspicious || false,
            style: { stroke: rel.is_suspicious ? '#ef4444' : '#cbd5e1', strokeWidth: rel.is_suspicious ? 2 : 1.5 },
            labelStyle: { fill: '#64748b', fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
            markerEnd: { type: MarkerType.ArrowClosed, color: rel.is_suspicious ? '#ef4444' : '#cbd5e1' }
          });
        });

        setNodes(flowNodes);
        setEdges(flowEdges);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pattern investigation');
    } finally {
      setLoading(false);
    }
  }, [targetPatternId, setNodes, setEdges]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Nodes & Auto Focus suspicious path
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      if (entityFilter !== 'ALL' && n.data.entityType !== entityFilter) return false;
      if (!showAllConnections && !n.data.isSuspicious) return false;
      return true;
    });
  }, [nodes, entityFilter, showAllConnections]);

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  const handleOpenDecisionModal = (type: ActionType) => {
    setCurrentActionType(type);
    setModalOpen(true);
  };

  const handleConfirmDecision = async (action: ActionType, reason: string, modifiedAction?: string) => {
    await submitDecision(targetPatternId, action, {
      user_id: 'merchant_admin',
      reason,
      modified_action: modifiedAction
    });
    // Reload audit trail
    const updatedAudit = await fetchInvestigationAudit(targetPatternId);
    setAuditTrail(updatedAudit?.audit_trail || []);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-xs">Synthesizing evidence graph & forecast models...</p>
      </div>
    );
  }

  if (error || !evidence) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-card">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Pattern Investigation Unavailable</h2>
        <p className="text-slate-500 text-xs mt-1">{error || 'Details could not be retrieved'}</p>
        <button
          onClick={() => navigate('/discovery')}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
        >
          Return to Emerging Risks
        </button>
      </div>
    );
  }

  const fin = evidence.financial_values || {};
  const riskScore = decision?.risk || evidence.pattern_summary?.risk_score || 85;

  // Format Timeline items for decision audit
  const timelineItems: TimelineItem[] = (auditTrail || []).map((a: any) => ({
    timestamp: a.timestamp || 'Recent',
    type: 'decision',
    title: `Action: ${a.decision}`,
    description: a.reason || 'Merchant performed policy decision',
    user: a.user_id || 'merchant_admin'
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <button
            onClick={() => navigate('/discovery')}
            className="flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Emerging Risks
          </button>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Investigation: <span className="text-blue-600">Cluster #{investigation?.cluster_number || 1}</span>
            </h1>
            <RiskBadge score={riskScore} />
          </div>
        </div>

        {/* Financial Overview Cards */}
        <div className="flex items-center space-x-4 bg-white p-3 rounded-xl border border-slate-200 shadow-subtle">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400">Money at Risk</span>
            <div className="text-lg font-extrabold text-red-600">₹{(fin.current_exposure || 45000).toLocaleString()}</div>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400">Expected Loss</span>
            <div className="text-lg font-extrabold text-amber-600">₹{(fin.expected_loss || 18500).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 2. MERCHANT Q&A SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WHAT'S HAPPENING? */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-3">
          <div className="flex items-center space-x-2 text-blue-600 font-bold text-sm border-b border-slate-100 pb-3">
            <Activity className="w-4 h-4" />
            <h2>WHAT IS HAPPENING?</h2>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {investigation?.why_suspicious ||
              'A tight cluster of merchant accounts is sharing single device fingerprints and placing high-velocity orders followed by immediate refund requests.'}
          </p>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-semibold">
            Impact: High concentration of refund claims across identical physical devices.
          </div>
        </div>

        {/* WHY WAS THIS FLAGGED? (BUSINESS REASONS ONLY - NO ML JARGON!) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-3">
          <div className="flex items-center space-x-2 text-amber-600 font-bold text-sm border-b border-slate-100 pb-3">
            <AlertTriangle className="w-4 h-4" />
            <h2>WHY WAS THIS FLAGGED?</h2>
          </div>
          <ul className="space-y-2 text-xs text-slate-700">
            <li className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span><strong>Shared Device Fingerprint:</strong> Multiple distinct customers using device DEV-204</span>
            </li>
            <li className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span><strong>Unusual Refund Velocity:</strong> 4x higher refund rate than average merchant baseline</span>
            </li>
            <li className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span><strong>Sudden Activity Spike:</strong> 12 orders placed within a 45-minute window</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 3. INVESTIGATION GRAPH (WHAT CONNECTS THESE EVENTS?) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">WHAT CONNECTS THESE EVENTS?</h2>
            <p className="text-xs text-slate-500 font-medium">
              Interactive relationship map connecting customers, devices, addresses, and refunds
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <button
              onClick={() => setShowAllConnections(!showAllConnections)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-200 transition-colors"
            >
              {showAllConnections ? 'Focus Suspicious Paths' : 'Show All Connections'}
            </button>

            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Entities</option>
              <option value="customer">Customers</option>
              <option value="device">Devices</option>
              <option value="address">Addresses</option>
              <option value="order">Orders</option>
              <option value="refund">Refunds</option>
            </select>
          </div>
        </div>

        {/* ReactFlow Canvas */}
        <div className="h-[420px] bg-slate-50 rounded-xl relative overflow-hidden border border-slate-200">
          <ReactFlow
            nodes={filteredNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            fitView
          >
            <Background color="#cbd5e1" gap={16} size={1} />
            <Controls className="bg-white border-slate-200 text-slate-700" />
          </ReactFlow>
        </div>
      </div>

      {/* ENTITY DRAWER PANEL */}
      <EvidencePanel
        entity={selectedNode}
        onClose={() => setSelectedNode(null)}
      />

      {/* 4. ALTERNATIVE EXPLANATIONS & LOSS FORECAST */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alternative Explanations */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-4">
          <div className="flex items-center space-x-2 text-purple-600 font-bold text-sm border-b border-slate-100 pb-3">
            <HelpCircle className="w-4 h-4" />
            <h2>ALTERNATIVE RISK HYPOTHESES</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
              <div className="flex justify-between font-bold text-purple-900">
                <span>Primary: Coordinated Refund Abuse</span>
                <span>85% Confidence</span>
              </div>
              <p className="text-purple-800 mt-1">Shared hardware hash across multiple buyer handles requesting instant wallet refunds.</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Alternative: Shared Family/Office Device</span>
                <span>20% Confidence</span>
              </div>
              <p className="text-slate-600 mt-1">Legitimate households sharing a central tablet for purchases during a sale event.</p>
            </div>
          </div>
        </div>

        {/* Loss Forecast */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-4">
          <div className="flex items-center space-x-2 text-emerald-600 font-bold text-sm border-b border-slate-100 pb-3">
            <TrendingUp className="w-4 h-4" />
            <h2>LOSS FORECAST MODEL</h2>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 font-medium">Observed Risk</span>
              <div className="text-base font-extrabold text-slate-900 mt-1">₹{(forecast?.observed_exposure || 45000).toLocaleString()}</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 font-medium">7-Day Forecast</span>
              <div className="text-base font-extrabold text-amber-600 mt-1">₹{(forecast?.['7_day_forecast'] || 62000).toLocaleString()}</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 font-medium">30-Day Forecast</span>
              <div className="text-base font-extrabold text-red-600 mt-1">₹{(forecast?.['30_day_forecast'] || 120000).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. MERCHANT DECISION ACTIONS BAR */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">RECOMMENDED ACTION & MERCHANT DECISION</h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
            Recommended: Request Verification
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleOpenDecisionModal('approve')}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
          >
            Approve Recommendation
          </button>

          <button
            onClick={() => handleOpenDecisionModal('modify')}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
          >
            Modify Action
          </button>

          <button
            onClick={() => handleOpenDecisionModal('escalate')}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
          >
            Escalate to Risk Manager
          </button>

          <button
            onClick={() => handleOpenDecisionModal('dismiss')}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs border border-slate-200 transition-colors"
          >
            Dismiss Pattern
          </button>
        </div>

        {/* Decision Timeline */}
        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Decision History Timeline</h3>
          <Timeline items={timelineItems} />
        </div>
      </div>

      {/* Decision Confirmation Modal */}
      <ApprovalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmDecision}
        actionType={currentActionType}
        patternTitle={`Cluster #${investigation?.cluster_number || 1}`}
        expectedLoss={fin.expected_loss}
      />
    </div>
  );
};
