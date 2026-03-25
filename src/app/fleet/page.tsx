'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import OrganismCanvas from '@/components/constellation/OrganismCanvas';
import NodeTooltip from '@/components/constellation/NodeTooltip';
import NodeDrawer from '@/components/constellation/NodeDrawer';
import type { ConstellationNode } from '@/types/constellation';
import { Circle, CircleDot, Zap, Cpu, Activity } from 'lucide-react';

const VERSION = '1.0.6';

const queryClient = new QueryClient();

function FleetContent() {
  const {
    data: graph,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['constellation-graph'],
    queryFn: async () => {
      const res = await fetch('/api/agents/graph');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    refetchInterval: 10_000,
  });

  const [hoveredNode, setHoveredNode] = useState<ConstellationNode | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<ConstellationNode | null>(null);

  const handleNodeHover = (node: ConstellationNode | null, x: number, y: number) => {
    setHoveredNode(node);
    setHoverPos({ x, y });
  };

  const handleNodeClick = (node: ConstellationNode) => {
    setSelectedNode(node);
  };

  const handleCloseDrawer = () => {
    setSelectedNode(null);
  };

  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const isLive = graph?.isLive ?? false;

  const activeCount = nodes?.filter((n: any) => n?.status === 'active')?.length ?? 0;
  const totalCount = nodes?.length ?? 0;
  const totalTokens = nodes?.reduce((sum: number, n: any) => sum + (n?.tokensUsed24h ?? 0), 0) ?? 0;
  const totalCost = nodes?.reduce((sum: number, n: any) => sum + (n?.costUSD24h ?? 0), 0) ?? 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3" style={{ 
        borderBottom: '1px solid #2d3548', 
        backgroundColor: '#1a1f36',
      }}>
        
        {/* Left: Title + Stats */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold tracking-tight" style={{ color: '#e2e8f0' }}>
            Fleet
          </h1>
          
          <div className="flex items-center gap-2">
            <StatPill icon={<Cpu size={12} />} label="Agents" value={`${activeCount}/${totalCount}`} />
            <StatPill icon={<Zap size={12} />} label="Tokens" value={formatTokens(totalTokens)} />
            <StatPill icon={<Activity size={12} />} label="Cost" value={`$${totalCost.toFixed(2)}`} />
          </div>
        </div>

        {/* Right: Version + Live indicator */}
        <div className="flex items-center gap-4">
          <div className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: '#2d3548', color: '#94a3b8' }}>
            v{VERSION}
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md" style={{ 
          backgroundColor: isLive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${isLive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          {isLive ? (
            <CircleDot size={10} className="animate-pulse" style={{ color: '#22c55e' }} />
          ) : (
            <Circle size={10} style={{ color: '#ef4444' }} />
          )}
          <span 
            className="text-xs font-medium" 
            style={{ color: isLive ? '#22c55e' : '#ef4444' }}
          >
            {isLive ? 'LIVE' : 'DEMO'}
          </span>
        </div>
        </div>
      </div>

      {/* Warning bar if no data */}
      {isError && (
        <div className="px-4 py-2 text-xs" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderBottom: '1px solid rgba(245, 158, 11, 0.2)' }}>
          Live data unavailable — showing demo data
        </div>
      )}

      {/* Canvas */}
      <div className="relative flex-1 min-h-0">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: '#2d3548', borderTopColor: '#3b82f6' }} />
              <p className="text-sm" style={{ color: '#64748b' }}>Loading fleet...</p>
            </div>
          </div>
        ) : (
          <>
            <OrganismCanvas
              nodes={nodes}
              edges={edges}
              isLive={isLive}
              onNodeClick={handleNodeClick}
            />
            {hoveredNode && !selectedNode && (
              <NodeTooltip node={hoveredNode} x={hoverPos.x} y={hoverPos.y} />
            )}
          </>
        )}

        {/* Legend */}
        <div className="absolute bottom-5 left-5 rounded-lg px-4 py-3.5" style={{ backgroundColor: '#0f1117dd', border: '1px solid #2d3548' }}>
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#64748b', marginBottom: '2px' }}>
              Status
            </span>
            <LegendItem color="#22c55e" label="Active" />
            <LegendItem color="#f59e0b" label="Idle" />
            <LegendItem color="#ef4444" label="Error" />
            <LegendItem color="#64748b" label="Offline" opacity={0.5} />
            <div className="my-2 h-px" style={{ backgroundColor: '#2d3548' }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#64748b', marginBottom: '2px' }}>
              Edges
            </span>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.4)' }} />
              <span className="text-xs" style={{ color: '#64748b' }}>Delegation</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-5 right-5 text-xs italic" style={{ color: 'rgba(100, 116, 139, 0.6)' }}>
          Hover to inspect · Click to drill down
        </div>

        {/* Right sidebar - Agent list */}
        <div className="absolute top-0 right-0 h-full w-56 overflow-y-auto border-l py-4" style={{ backgroundColor: '#0a0a0f', borderColor: '#1e293b' }}>
          <div className="px-4 mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Agents</h3>
          </div>
          <div className="flex flex-col gap-1 px-2">
            {nodes?.map((node: ConstellationNode) => (
              <div 
                key={node.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors duration-150 hover:bg-white/5"
                style={{ 
                  backgroundColor: selectedNode?.id === node.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  border: selectedNode?.id === node.id ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent'
                }}
                onClick={() => handleNodeClick(node)}
              >
                <span 
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ 
                    backgroundColor: node.status === 'active' ? '#22c55e' : node.status === 'idle' ? '#f59e0b' : node.status === 'error' ? '#ef4444' : '#64748b',
                    boxShadow: node.status === 'active' ? '0 0 6px #22c55e' : 'none'
                  }}
                />
                <span className="text-sm truncate" style={{ color: '#e2e8f0' }}>
                  {node.name}
                </span>
              </div>
            ))}
          </div>
          <div className="px-4 mt-4 pt-4 border-t" style={{ borderColor: '#1e293b' }}>
            <div className="text-xs" style={{ color: '#64748b' }}>
              Total: {nodes?.length || 0} agents
            </div>
          </div>
        </div>
      </div>

      <NodeDrawer node={selectedNode} onClose={handleCloseDrawer} />
    </div>
  );
}

export default function FleetPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <FleetContent />
    </QueryClientProvider>
  );
}

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#0f1117', border: '1px solid #2d3548' }}>
      <span style={{ color: '#64748b' }}>{icon}</span>
      <span className="text-xs font-medium" style={{ color: '#64748b' }}>{label}</span>
      <span className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>{value}</span>
    </div>
  );
}

function LegendItem({ color, label, opacity = 1 }: { color: string; label: string; opacity?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color, opacity, boxShadow: `0 0 6px ${color}60` }} />
      <span className="text-xs" style={{ color: '#94a3b8' }}>{label}</span>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}