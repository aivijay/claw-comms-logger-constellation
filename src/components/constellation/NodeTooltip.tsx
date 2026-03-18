'use client';

import type { ConstellationNode } from '@/types/constellation';
import { Cpu, Zap } from 'lucide-react';

interface NodeTooltipProps {
  node: ConstellationNode;
  x: number;
  y: number;
}

export default function NodeTooltip({ node, x, y }: NodeTooltipProps) {
  const statusColors: Record<string, string> = {
    active: '#22c55e',
    idle: '#f59e0b',
    error: '#ef4444',
    offline: '#64748b',
  };

  const statusColor = statusColors[node.status] || statusColors.offline;

  return (
    <div
      className="fixed pointer-events-none z-30 px-3 py-2 rounded-lg transition-opacity duration-150"
      style={{
        left: x + 16,
        top: y - 8,
        backgroundColor: '#0f1117ee',
        border: '1px solid #2d3548',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span 
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: statusColor, boxShadow: `0 0 6px ${statusColor}` }}
        />
        <span className="text-sm font-semibold" style={{ color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>
          {node.name}
        </span>
      </div>
      
      <div className="flex items-center gap-3 text-xs" style={{ color: '#64748b' }}>
        <div className="flex items-center gap-1">
          <Cpu className="h-3 w-3" />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' }}>
            {node.modelPrimary?.split(':')[0] || 'N/A'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span 
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: statusColor, boxShadow: `0 0 6px ${statusColor}` }}
          />
          <span>{node.status}</span>
        </div>
      </div>
    </div>
  );
}