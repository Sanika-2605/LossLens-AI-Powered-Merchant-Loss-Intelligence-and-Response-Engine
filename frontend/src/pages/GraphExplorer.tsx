import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { fetchEntityAnalysis, fetchGraphData, refreshGraph } from '../services/api';
import { Search, Info, Share2, RefreshCw, Loader2 } from 'lucide-react';

const nodeColors: Record<string, string> = {
  customer: '#3b82f6', // blue
  order: '#10b981',    // green
  payment: '#f59e0b',  // amber
  refund: '#ef4444',   // red
  device: '#06b6d4',   // cyan
  address: '#8b5cf6',  // purple
  product: '#ec4899',  // pink
  coupon: '#eab308'    // yellow
};

interface EntityAnalysis {
  entity_id: string;
  entity_type: string;
  degree: number;
  neighborhood_size_1hop: number;
  neighborhood_size_2hop: number;
  community_id: number | null;
  community_size: number;
  relationship_density: number;
  shared_entities: Array<{
    entity_type: string;
    entity_id: string;
    shared_with_customers: string[];
    shared_count: number;
  }>;
  suspicious_neighbor_count: number;
  neighbors: Array<{
    entity_id: string;
    entity_type: string;
    node_key: string;
    relationship_types: string[];
    hop_distance: number;
  }>;
}

export const GraphExplorer: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [searchType, setSearchType] = useState('customer');
  const [searchId, setSearchId] = useState('cust_000001');
  const [selectedAnalysis, setSelectedAnalysis] = useState<EntityAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  /** Load the full graph and render it with React Flow */
  const loadFullGraph = async () => {
    setLoading(true);
    try {
      const data = await fetchGraphData(500);
      if (data && data.nodes) {
        const totalNodes = data.nodes.length;
        const radius = Math.max(150, totalNodes * 2);

        const flowNodes = data.nodes.map((n: any, idx: number) => {
          const angle = (idx / totalNodes) * 2 * Math.PI;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const nType = n.entity_type || 'unknown';
          const bgColor = nodeColors[nType] || '#64748b';

          return {
            id: n.id,
            position: { x: x + 400, y: y + 300 },
            data: { label: `${nType}\n${n.entity_id}`, raw: n },
            style: {
              background: '#131b29',
              color: '#fff',
              border: `2px solid ${bgColor}`,
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '11px',
              fontWeight: 600,
              boxShadow: 'none'
            }
          };
        });

        const flowEdges = data.edges.map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.relationship_type,
          style: { stroke: '#475569', strokeWidth: 1.5 },
          labelStyle: { fill: '#94a3b8', fontSize: 9 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' }
        }));

        setNodes(flowNodes);
        setEdges(flowEdges);
      }
    } catch (err) {
      console.error('Failed to load graph:', err);
    } finally {
      setLoading(false);
    }
  };

  /** Search for a specific entity and show its ego graph */
  const loadEntityGraph = async (type: string, id: string) => {
    setLoading(true);
    try {
      const analysis = await fetchEntityAnalysis(type, id);
      if (analysis) {
        setSelectedAnalysis(analysis);

        // Build nodes from the entity and its neighbors
        const centerNode = {
          id: `${type}:${id}`,
          entity_id: id,
          entity_type: type,
        };

        const allNodes = [centerNode, ...(analysis.neighbors || []).map((n: any) => ({
          id: n.node_key,
          entity_id: n.entity_id,
          entity_type: n.entity_type,
        }))];

        const totalNodes = allNodes.length;
        const radius = Math.max(150, totalNodes * 20);

        const flowNodes = allNodes.map((n: any, idx: number) => {
          const angle = (idx / totalNodes) * 2 * Math.PI;
          const isCenter = idx === 0;
          const x = isCenter ? 0 : Math.cos(angle) * radius;
          const y = isCenter ? 0 : Math.sin(angle) * radius;
          const nType = n.entity_type || 'unknown';
          const bgColor = nodeColors[nType] || '#64748b';

          return {
            id: n.id,
            position: { x: x + 400, y: y + 300 },
            data: { label: `${nType}\n${n.entity_id}`, raw: n },
            style: {
              background: '#131b29',
              color: '#fff',
              border: `2px solid ${bgColor}`,
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '11px',
              fontWeight: 600,
              boxShadow: isCenter ? `0 0 15px ${bgColor}` : 'none'
            }
          };
        });

        // Build edges from neighbor relationship types
        const flowEdges = (analysis.neighbors || [])
          .filter((n: any) => n.hop_distance === 1)
          .map((n: any, idx: number) => ({
            id: `e_${idx}`,
            source: `${type}:${id}`,
            target: n.node_key,
            label: n.relationship_types?.[0] || '',
            style: { stroke: '#475569', strokeWidth: 1.5 },
            labelStyle: { fill: '#94a3b8', fontSize: 9 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' }
          }));

        setNodes(flowNodes);
        setEdges(flowEdges);
      }
    } catch (err) {
      console.error('Entity not found:', err);
      setSelectedAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  /** Click a node to fetch its backend-computed analysis */
  const onNodeClick = useCallback(async (_: any, node: any) => {
    if (!node.data?.raw) return;
    const raw = node.data.raw;
    const entityType = raw.entity_type;
    const entityId = raw.entity_id;
    if (!entityType || !entityId) return;

    setLoadingAnalysis(true);
    try {
      const analysis = await fetchEntityAnalysis(entityType, entityId);
      setSelectedAnalysis(analysis);
    } catch (err) {
      console.error('Failed to fetch analysis:', err);
    } finally {
      setLoadingAnalysis(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshGraph();
      await loadFullGraph();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEntityGraph(searchType, searchId);
  }, []);

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-140px)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Entity Knowledge Graph Explorer</h2>
          <p className="text-sm text-slate-400 mt-1">Interactive NetworkX neighborhood inspector</p>
        </div>

        {/* Search controls */}
        <div className="flex items-center space-x-3">
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="bg-[#131b29] border border-[#1f293d] text-xs text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500"
          >
            <option value="customer">Customer</option>
            <option value="order">Order</option>
            <option value="payment">Payment</option>
            <option value="refund">Refund</option>
            <option value="device">Device</option>
            <option value="address">Address</option>
            <option value="product">Product</option>
            <option value="coupon">Coupon</option>
          </select>

          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Entity ID (e.g. cust_000001)"
            className="bg-[#131b29] border border-[#1f293d] text-xs text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500 w-48"
          />

          <button
            onClick={() => loadEntityGraph(searchType, searchId)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-xl font-medium transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>Inspect Graph</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 bg-[#1f293d] hover:bg-[#2a3650] text-slate-300 text-xs px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Canvas & Details Split */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        <div className="flex-1 bg-[#131b29] border border-[#1f293d] rounded-2xl overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 bg-[#0b0f17]/70 z-10 flex items-center justify-center text-slate-300 text-sm">
              Loading Knowledge Graph...
            </div>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
          >
            <Background color="#1f293d" gap={16} />
            <Controls style={{ background: '#0b0f17', border: '1px solid #1f293d', color: '#fff' }} />
          </ReactFlow>
        </div>

        {/* Entity Inspector Panel — backend-computed metrics */}
        <div className="w-80 bg-[#131b29] border border-[#1f293d] p-6 rounded-2xl overflow-y-auto">
          <div className="flex items-center space-x-2 text-slate-300 font-semibold mb-4 border-b border-[#1f293d] pb-3">
            <Info className="w-4 h-4 text-blue-400" />
            <span>Entity Inspector</span>
            {loadingAnalysis && <Loader2 className="w-3 h-3 animate-spin text-blue-400 ml-auto" />}
          </div>

          {selectedAnalysis ? (
            <div className="space-y-3 text-xs">
              {/* Entity Key */}
              <div className="bg-[#0b0f17] p-3 rounded-xl border border-[#1f293d]">
                <span className="text-slate-500 font-medium">Entity</span>
                <p className="text-sm font-mono text-blue-400 font-bold mt-1">
                  {selectedAnalysis.entity_type}:{selectedAnalysis.entity_id}
                </p>
              </div>

              {/* Degree */}
              <div className="bg-[#0b0f17] p-3 rounded-xl border border-[#1f293d]">
                <span className="text-slate-500 font-medium">Degree</span>
                <p className="text-slate-200 mt-1 font-mono text-lg font-bold">{selectedAnalysis.degree}</p>
              </div>

              {/* Neighborhoods */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0b0f17] p-3 rounded-xl border border-[#1f293d]">
                  <span className="text-slate-500 font-medium text-[10px]">1-Hop Neighborhood</span>
                  <p className="text-slate-200 mt-1 font-mono font-bold">{selectedAnalysis.neighborhood_size_1hop}</p>
                </div>
                <div className="bg-[#0b0f17] p-3 rounded-xl border border-[#1f293d]">
                  <span className="text-slate-500 font-medium text-[10px]">2-Hop Neighborhood</span>
                  <p className="text-slate-200 mt-1 font-mono font-bold">{selectedAnalysis.neighborhood_size_2hop}</p>
                </div>
              </div>

              {/* Community */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0b0f17] p-3 rounded-xl border border-[#1f293d]">
                  <span className="text-slate-500 font-medium text-[10px]">Community ID</span>
                  <p className="text-slate-200 mt-1 font-mono font-bold">
                    {selectedAnalysis.community_id !== null ? selectedAnalysis.community_id : '—'}
                  </p>
                </div>
                <div className="bg-[#0b0f17] p-3 rounded-xl border border-[#1f293d]">
                  <span className="text-slate-500 font-medium text-[10px]">Community Size</span>
                  <p className="text-slate-200 mt-1 font-mono font-bold">{selectedAnalysis.community_size}</p>
                </div>
              </div>

              {/* Density */}
              <div className="bg-[#0b0f17] p-3 rounded-xl border border-[#1f293d]">
                <span className="text-slate-500 font-medium">Relationship Density</span>
                <p className="text-slate-200 mt-1 font-mono font-bold">{selectedAnalysis.relationship_density}</p>
              </div>

              {/* Suspicious Neighbours */}
              <div className="bg-[#0b0f17] p-3 rounded-xl border border-[#1f293d]">
                <span className="text-slate-500 font-medium">Suspicious Neighbours</span>
                <p className="text-slate-200 mt-1 font-mono font-bold">{selectedAnalysis.suspicious_neighbor_count}</p>
              </div>

              {/* Shared Entities */}
              {selectedAnalysis.shared_entities.length > 0 && (
                <div className="bg-[#0b0f17] p-3 rounded-xl border border-[#1f293d]">
                  <span className="text-slate-500 font-medium">Shared Entities</span>
                  <div className="mt-2 space-y-2">
                    {selectedAnalysis.shared_entities.map((se, idx) => (
                      <div key={idx} className="bg-[#131b29] p-2 rounded-lg border border-[#1f293d]">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-400 font-mono text-[10px]">{se.entity_type}:{se.entity_id}</span>
                          <span className="text-amber-400 font-mono text-[10px]">+{se.shared_count} customers</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Neighbors summary */}
              {selectedAnalysis.neighbors.length > 0 && (
                <div className="bg-[#0b0f17] p-3 rounded-xl border border-[#1f293d]">
                  <span className="text-slate-500 font-medium">
                    Direct Neighbors ({selectedAnalysis.neighbors.length})
                  </span>
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                    {selectedAnalysis.neighbors.slice(0, 20).map((n, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-300 font-mono truncate max-w-[140px]">{n.entity_type}:{n.entity_id}</span>
                        <span className="text-slate-500 truncate max-w-[100px]">{n.relationship_types?.[0]}</span>
                      </div>
                    ))}
                    {selectedAnalysis.neighbors.length > 20 && (
                      <div className="text-slate-500 text-[10px] italic">
                        ...and {selectedAnalysis.neighbors.length - 20} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic">Click on any graph node to view detailed attributes</div>
          )}
        </div>
      </div>
    </div>
  );
};
