import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { fetchEntityGraph } from '../services/api';
import { Search, Info, Share2 } from 'lucide-react';

const nodeColors: Record<string, string> = {
  Customer: '#3b82f6', // blue
  Order: '#10b981',    // green
  Payment: '#f59e0b',  // amber
  Refund: '#ef4444',   // red
  Device: '#06b6d4',   // cyan
  Address: '#8b5cf6',  // purple
  Product: '#ec4899',  // pink
  Coupon: '#eab308'    // yellow
};

export const GraphExplorer: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [searchType, setSearchType] = useState('customer');
  const [searchId, setSearchId] = useState('cust_000001');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadGraph = async (type: string, id: string) => {
    setLoading(true);
    try {
      const data = await fetchEntityGraph(type, id);
      if (data && data.nodes) {
        // Layout nodes in radial/grid positioning
        const totalNodes = data.nodes.length;
        const radius = Math.max(150, totalNodes * 20);

        const flowNodes: Node[] = data.nodes.map((n: any, idx: number) => {
          const angle = (idx / totalNodes) * 2 * Math.PI;
          const isCenter = n.id === data.entity?.id;
          const x = isCenter ? 0 : Math.cos(angle) * radius;
          const y = isCenter ? 0 : Math.sin(angle) * radius;

          const nType = n.type || 'Entity';
          const bgColor = nodeColors[nType] || '#64748b';

          return {
            id: n.id,
            position: { x: x + 400, y: y + 300 },
            data: { label: `${nType}\n${n.id}`, raw: n },
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

        const flowEdges: Edge[] = data.edges.map((e: any, idx: number) => ({
          id: `e_${idx}`,
          source: e.source,
          target: e.target,
          label: e.relation,
          style: { stroke: '#475569', strokeWidth: 1.5 },
          labelStyle: { fill: '#94a3b8', fontSize: 9 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' }
        }));

        setNodes(flowNodes);
        setEdges(flowEdges);
        setSelectedNode(data.entity);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph(searchType, searchId);
  }, []);

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.data && node.data.raw) {
      setSelectedNode(node.data.raw);
    }
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
            <option value="device">Device</option>
          </select>

          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Entity ID (e.g. cust_000001)"
            className="bg-[#131b29] border border-[#1f293d] text-xs text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500 w-48"
          />

          <button
            onClick={() => loadGraph(searchType, searchId)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-xl font-medium transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>Inspect Graph</span>
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

        {/* Selected Entity Inspector Panel */}
        <div className="w-80 bg-[#131b29] border border-[#1f293d] p-6 rounded-2xl overflow-y-auto">
          <div className="flex items-center space-x-2 text-slate-300 font-semibold mb-4 border-b border-[#1f293d] pb-3">
            <Info className="w-4 h-4 text-blue-400" />
            <span>Entity Inspector</span>
          </div>

          {selectedNode ? (
            <div className="space-y-4 text-xs">
              <div className="bg-[#0b0f17] p-3 rounded-xl border border-[#1f293d]">
                <span className="text-slate-500 font-medium">Entity Key</span>
                <p className="text-sm font-mono text-blue-400 font-bold mt-1">{selectedNode.id}</p>
              </div>

              {Object.entries(selectedNode).map(([k, v]) => {
                if (k === 'id') return null;
                return (
                  <div key={k} className="bg-[#0b0f17] p-3 rounded-xl border border-[#1f293d]">
                    <span className="text-slate-500 capitalize font-medium">{k}</span>
                    <p className="text-slate-200 mt-1 font-mono break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic">Click on any graph node to view detailed attributes</div>
          )}
        </div>
      </div>
    </div>
  );
};
