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
  XCircle,
  Edit3,
  Send,
  X,
  FileText,
  DollarSign,
  HelpCircle,
  Lock,
  Search,
  Filter
} from 'lucide-react';

const nodeColors: Record<string, string> = {
  customer: '#3b82f6',
  order: '#10b981',
  payment: '#f59e0b',
  refund: '#ef4444',
  device: '#06b6d4',
  address: '#8b5cf6',
  product: '#ec4899',
  coupon: '#eab308'
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

  // Graph States
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedEntityNode, setSelectedEntityNode] = useState<any | null>(null);
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [relationshipFilter, setRelationshipFilter] = useState<string>('ALL');
  const [highRiskOnly, setHighRiskOnly] = useState<boolean>(false);

  // Decision Modal / Form State
  const [decisionReason, setDecisionReason] = useState<string>('');
  const [modifiedActionInput, setModifiedActionInput] = useState<string>('VERIFY');
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

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

      // Construct React Flow graph from Evidence
      if (evData && evData.entities) {
        const flowNodes: Node[] = [];
        const flowEdges: Edge[] = [];
        const entityTypes = ['customers', 'devices', 'addresses', 'orders', 'payments', 'refunds', 'products', 'coupons'];

        let xOffset = 50;
        let yOffset = 50;

        entityTypes.forEach((typeKey, typeIdx) => {
          const items = evData.entities[typeKey] || [];
          const typeName = typeKey.slice(0, -1); // customer, device, etc.
          items.forEach((item: any, idx: number) => {
            const nodeId = `${typeName}:${item.id}`;
            flowNodes.push({
              id: nodeId,
              type: 'default',
              data: {
                label: `${typeName.toUpperCase()}: ${item.id}`,
                entityType: typeName,
                rawItem: item
              },
              position: { x: xOffset + (idx % 4) * 220, y: yOffset + typeIdx * 110 },
              style: {
                background: '#1e293b',
                color: '#f8fafc',
                border: `2px solid ${nodeColors[typeName] || '#94a3b8'}`,
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }
            });
          });
        });

        // Edges
        (evData.relationships || []).forEach((rel: any, idx: number) => {
          flowEdges.push({
            id: `edge-${idx}`,
            source: rel.source,
            target: rel.target,
            label: rel.relationship_type,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#64748b', strokeWidth: 1.5 },
            labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 500 },
            labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
          });
        });

        setNodes(flowNodes);
        setEdges(flowEdges);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pattern investigation details');
    } finally {
      setLoading(false);
    }
  }, [targetPatternId, setNodes, setEdges]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered React Flow Nodes & Edges
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      if (entityFilter !== 'ALL' && n.data.entityType !== entityFilter) return false;
      return true;
    });
  }, [nodes, entityFilter]);

  const filteredEdges = useMemo(() => {
    return edges.filter((e) => {
      if (relationshipFilter !== 'ALL' && e.label !== relationshipFilter) return false;
      return true;
    });
  }, [edges, relationshipFilter]);

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedEntityNode(node);
  };

  const handleAction = async (actionType: 'approve' | 'reject' | 'modify' | 'escalate' | 'dismiss') => {
    try {
      setSubmittingAction(true);
      setActionSuccessMsg(null);
      await submitDecision(targetPatternId, actionType, {
        user_id: 'merchant_admin',
        reason: decisionReason,
        modified_action: actionType === 'modify' ? modifiedActionInput : undefined
      });
      setActionSuccessMsg(`Decision '${actionType.toUpperCase()}' successfully submitted and recorded in audit log.`);
      setDecisionReason('');
      // Reload audit log
      const updatedAudit = await fetchInvestigationAudit(targetPatternId);
      setAuditTrail(updatedAudit.audit_trail || []);
    } catch (err: any) {
      alert(`Failed to record decision: ${err.message}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium text-sm">Synthesizing evidence & intelligence models...</p>
      </div>
    );
  }

  if (error || !evidence) {
    return (
      <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-xl">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-100">Pattern Investigation Unavailable</h2>
        <p className="text-slate-400 text-sm mt-2">{error || 'Investigation details could not be loaded'}</p>
        <button
          onClick={() => navigate('/discovery')}
          className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-all"
        >
          Return to Loss Discovery
        </button>
      </div>
    );
  }

  const fin = evidence.financial_values || {};
  const riskScore = decision?.risk || evidence.pattern_summary?.risk_score || 0;

  return (
    <div className="space-y-8 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <button
            onClick={() => navigate('/discovery')}
            className="flex items-center text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Loss Discovery
          </button>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Investigation: <span className="text-blue-400">{targetPatternId}</span>
            </h1>
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full ${
                riskScore >= 90
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : riskScore >= 70
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              Risk Score: {riskScore}/100
            </span>
          </div>
        </div>

        {/* Action Status Badge */}
        <div className="flex items-center space-x-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-xs text-slate-400">Required Approval Gate</div>
            <div className="text-sm font-semibold text-slate-200">{decision?.approval_gate || 'POLICY_EVALUATED'}</div>
          </div>
        </div>
      </div>

      {/* SECTION 1: PATTERN SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pattern Risk</div>
          <div className="text-3xl font-extrabold text-white mt-2">{riskScore}</div>
          <div className="text-xs text-slate-500 mt-1">Multi-signal composite score</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Exposure</div>
          <div className="text-2xl font-bold text-amber-400 mt-2">${fin.current_exposure?.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Active order & payment volume</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Potential Exposure</div>
          <div className="text-2xl font-bold text-rose-400 mt-2">${fin.potential_exposure?.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Upper limit across linked entities</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expected Loss</div>
          <div className="text-2xl font-bold text-orange-400 mt-2">${fin.expected_loss?.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">Estimated unrecoverable loss</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Loss Velocity</div>
          <div className="text-2xl font-bold text-blue-400 mt-2">${investigation?.growth_rate || 0}/day</div>
          <div className="text-xs text-slate-500 mt-1">24h growth trajectory</div>
        </div>
      </div>

      {/* SECTION 2: WHY WAS THIS SURFACED? (EXPLAINABILITY & EVIDENCE) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Activity className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Why Was This Surfaced?</h2>
          </div>

          <div className="text-xs text-slate-400">{investigation?.why_suspicious}</div>

          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Risk Contribution Breakdown</div>
            {(explanation?.contributions || []).map((item: any, i: number) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-300">{item.label}</span>
                  <span className="text-blue-400 font-bold">{item.percentage}% ({item.contribution})</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-500"
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  ></div>
                </div>
                <div className="text-[11px] text-slate-500 pl-1">
                  Evidence: {item.evidence?.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Empirical Evidence Mapping</h2>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {Object.values(evidence.risk_evidence_map || {}).map((item: any, i: number) => (
              <div key={i} className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50 space-y-1">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-200 capitalize">{item.risk_component.replace('_', ' ')}</span>
                  <span className="text-amber-400">{item.score} Score</span>
                </div>
                <ul className="list-disc list-inside text-xs text-slate-400 space-y-0.5 pt-1">
                  {(item.supporting_evidence || []).map((evStr: string, idx: number) => (
                    <li key={idx} className="truncate">{evStr}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: INVESTIGATION GRAPH (REACT FLOW) */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <GitFork className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Investigation Entity Graph</h2>
          </div>

          {/* Graph Filters */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center space-x-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 font-medium">Entity Type:</span>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none"
              >
                <option value="ALL" className="bg-slate-900">All Entities</option>
                <option value="customer" className="bg-slate-900">Customer</option>
                <option value="device" className="bg-slate-900">Device</option>
                <option value="address" className="bg-slate-900">Address</option>
                <option value="order" className="bg-slate-900">Order</option>
                <option value="payment" className="bg-slate-900">Payment</option>
                <option value="refund" className="bg-slate-900">Refund</option>
                <option value="product" className="bg-slate-900">Product</option>
                <option value="coupon" className="bg-slate-900">Coupon</option>
              </select>
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="text-slate-400 font-medium">Relationship:</span>
              <select
                value={relationshipFilter}
                onChange={(e) => setRelationshipFilter(e.target.value)}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none"
              >
                <option value="ALL" className="bg-slate-900">All Relationships</option>
                <option value="CUSTOMER_USED_DEVICE" className="bg-slate-900">CUSTOMER_USED_DEVICE</option>
                <option value="CUSTOMER_USED_ADDRESS" className="bg-slate-900">CUSTOMER_USED_ADDRESS</option>
                <option value="CUSTOMER_PLACED_ORDER" className="bg-slate-900">CUSTOMER_PLACED_ORDER</option>
                <option value="ORDER_HAS_PAYMENT" className="bg-slate-900">ORDER_HAS_PAYMENT</option>
                <option value="PAYMENT_HAS_REFUND" className="bg-slate-900">PAYMENT_HAS_REFUND</option>
                <option value="ORDER_CONTAINS_PRODUCT" className="bg-slate-900">ORDER_CONTAINS_PRODUCT</option>
                <option value="ORDER_USED_COUPON" className="bg-slate-900">ORDER_USED_COUPON</option>
              </select>
            </div>
          </div>
        </div>

        {/* React Flow Container */}
        <div className="h-[420px] bg-slate-950 rounded-xl relative overflow-hidden border border-slate-800">
          <ReactFlow
            nodes={filteredNodes}
            edges={filteredEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            fitView
          >
            <Background color="#334155" gap={16} size={1} />
            <Controls className="bg-slate-800 border-slate-700 text-slate-300" />
          </ReactFlow>
        </div>

        {/* Selected Entity Node Evidence Drawer / Details Panel */}
        {selectedEntityNode && (
          <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl relative space-y-2 animate-fadeIn">
            <button
              onClick={() => setSelectedEntityNode(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              Entity Evidence Detail: {selectedEntityNode.data.label}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-400">Entity Type:</span>{' '}
                <span className="font-semibold text-slate-200">{selectedEntityNode.data.entityType}</span>
              </div>
              <div>
                <span className="text-slate-400">Entity ID:</span>{' '}
                <span className="font-mono text-slate-200">{selectedEntityNode.data.rawItem?.id}</span>
              </div>
              <div>
                <span className="text-slate-400">Status / Info:</span>{' '}
                <span className="font-semibold text-amber-400">
                  {selectedEntityNode.data.rawItem?.status || 'Active'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Created:</span>{' '}
                <span className="font-semibold text-slate-300">
                  {selectedEntityNode.data.rawItem?.created_at || 'Recent'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: TIMELINE */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Clock className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Activity Timeline</h2>
        </div>

        <div className="relative border-l-2 border-slate-800 ml-4 space-y-6 py-2">
          {(evidence.timeline || []).slice(0, 8).map((event: any, i: number) => (
            <div key={i} className="relative pl-6">
              <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-blue-500/20 border-2 border-blue-400"></div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold">
                <span className="text-blue-400 font-mono">{event.timestamp}</span>
                <span className="text-slate-400 uppercase text-[11px]">{event.event_type}</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">{event.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5: ALTERNATIVE HYPOTHESES */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <HelpCircle className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-bold text-white">Alternative Hypothesis Engine</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Primary Hypothesis */}
          <div className="bg-blue-950/40 border border-blue-800/60 p-4 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-blue-400 uppercase">Primary Hypothesis</span>
              <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-mono">
                {Math.round((hypotheses?.primary_hypothesis?.confidence || 0.8) * 100)}% Conf.
              </span>
            </div>
            <h3 className="text-sm font-bold text-white">{hypotheses?.primary_hypothesis?.title}</h3>
            <p className="text-xs text-slate-300">{hypotheses?.primary_hypothesis?.description}</p>
            <div className="pt-2 text-[11px] space-y-1">
              <div className="text-emerald-400 font-semibold">Supporting Evidence:</div>
              <ul className="list-disc list-inside text-slate-400">
                {(hypotheses?.primary_hypothesis?.supporting_evidence || []).map((e: string, idx: number) => (
                  <li key={idx} className="truncate">{e}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Alternative Explanations */}
          {(hypotheses?.alternative_hypotheses || []).map((alt: any, i: number) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700/60 p-4 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-400 uppercase">Alternative #{i + 1}</span>
                <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono">
                  {Math.round((alt.confidence || 0.2) * 100)}% Conf.
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">{alt.title}</h3>
              <p className="text-xs text-slate-300">{alt.description}</p>
              <div className="pt-2 text-[11px] space-y-1">
                <div className="text-emerald-400 font-semibold">Supporting:</div>
                <ul className="list-disc list-inside text-slate-400">
                  {(alt.supporting_evidence || []).map((e: string, idx: number) => (
                    <li key={idx} className="truncate">{e}</li>
                  ))}
                </ul>
                <div className="text-rose-400 font-semibold pt-1">Contradicting:</div>
                <ul className="list-disc list-inside text-slate-400">
                  {(alt.contradicting_evidence || []).map((e: string, idx: number) => (
                    <li key={idx} className="truncate">{e}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 6: LOSS FORECAST */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Loss Forecasting Model</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
            <div className="text-xs font-semibold text-slate-400">Observed Exposure</div>
            <div className="text-xl font-bold text-white mt-1">${forecast?.observed_exposure?.toLocaleString()}</div>
          </div>
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
            <div className="text-xs font-semibold text-slate-400">7-Day Loss Forecast</div>
            <div className="text-xl font-bold text-amber-400 mt-1">${forecast?.['7_day_forecast']?.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Range: ${forecast?.uncertainty_range?.['7_day']?.[0]} - ${forecast?.uncertainty_range?.['7_day']?.[1]}
            </div>
          </div>
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700">
            <div className="text-xs font-semibold text-slate-400">30-Day Loss Forecast</div>
            <div className="text-xl font-bold text-rose-400 mt-1">${forecast?.['30_day_forecast']?.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Range: ${forecast?.uncertainty_range?.['30_day']?.[0]} - ${forecast?.uncertainty_range?.['30_day']?.[1]}
            </div>
          </div>
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 flex flex-col justify-center">
            <div className="text-xs font-semibold text-slate-400">Forecast Confidence</div>
            <div className="text-base font-bold text-blue-400 mt-1">{forecast?.confidence || 'MEDIUM'}</div>
            <div className="text-[11px] text-slate-500 mt-1">Based on time-series history</div>
          </div>
        </div>
      </div>

      {/* SECTION 7: COUNTERFACTUAL ACTION SIMULATOR */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">Counterfactual Action Simulator</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="text-xs uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Expected Loss</th>
                <th className="py-3 px-4">Expected Recovery</th>
                <th className="py-3 px-4">Customer Impact</th>
                <th className="py-3 px-4">Ops Cost</th>
                <th className="py-3 px-4 text-right">Net Benefit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(simulation?.simulations || []).map((sim: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-semibold text-white">{sim.label}</td>
                  <td className="py-3 px-4 text-rose-400">${sim.expected_loss}</td>
                  <td className="py-3 px-4 text-emerald-400">${sim.expected_recovered_value}</td>
                  <td className="py-3 px-4 text-amber-400">${sim.legitimate_customer_impact}</td>
                  <td className="py-3 px-4 text-slate-400">${sim.operational_cost}</td>
                  <td className="py-3 px-4 text-right font-bold text-blue-400">${sim.net_benefit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 8: DECISION ENGINE RECOMMENDATION */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-blue-900/60 p-6 rounded-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Policy Engine Recommendation</h2>
          </div>
          <span className="px-3 py-1 bg-blue-600/30 border border-blue-500 text-blue-300 text-xs font-bold rounded-lg uppercase">
            {decision?.recommended_action}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div>
              <span className="text-slate-400 font-medium">Policy Rule Triggered:</span>
              <p className="font-mono text-slate-200 bg-slate-950 p-2 rounded border border-slate-800 mt-1">
                {decision?.policy_rule}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Action Rationale:</span>
              <p className="text-slate-300 mt-1">{decision?.reason}</p>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="font-bold text-slate-200">Decision Hierarchy Priority Evaluation</div>
            <ul className="space-y-1 text-slate-400 font-mono text-[11px]">
              {(decision?.priority_evaluation || []).map((p: string, idx: number) => (
                <li key={idx}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* SECTION 9: MERCHANT DECISION ACTIONS & AUDIT TRAIL */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-6">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">Merchant Approval Decision</h2>
        </div>

        {actionSuccessMsg && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-semibold">
            {actionSuccessMsg}
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-300">
            Decision Rationale / Investigation Notes:
          </label>
          <textarea
            value={decisionReason}
            onChange={(e) => setDecisionReason(e.target.value)}
            placeholder="Add investigation justification or modification reasons..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            rows={2}
          ></textarea>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => handleAction('approve')}
              disabled={submittingAction}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Approve Action</span>
            </button>

            <button
              onClick={() => handleAction('reject')}
              disabled={submittingAction}
              className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject Action</span>
            </button>

            <button
              onClick={() => handleAction('modify')}
              disabled={submittingAction}
              className="flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              <Edit3 className="w-4 h-4" />
              <span>Modify Action</span>
            </button>

            <button
              onClick={() => handleAction('escalate')}
              disabled={submittingAction}
              className="flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Escalate</span>
            </button>

            <button
              onClick={() => handleAction('dismiss')}
              disabled={submittingAction}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              <span>Dismiss</span>
            </button>
          </div>
        </div>

        {/* Audit Trail Table */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Decision Audit Log</div>
          {auditTrail.length === 0 ? (
            <div className="text-xs text-slate-500 italic">No previous decisions recorded for this pattern.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">User</th>
                    <th className="py-2 px-3">Decision</th>
                    <th className="py-2 px-3">Action</th>
                    <th className="py-2 px-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {auditTrail.map((log: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{log.timestamp}</td>
                      <td className="py-2 px-3 font-medium text-slate-300">{log.user_id}</td>
                      <td className="py-2 px-3 font-bold text-blue-400">{log.decision}</td>
                      <td className="py-2 px-3 text-amber-400 font-semibold">{log.modified_action}</td>
                      <td className="py-2 px-3 text-slate-400 italic">{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
