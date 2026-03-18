'use client';

import type { ConstellationNode } from '@/types/constellation';
import { StatusPill } from '@/components/shared/StatusPill';
import { formatRelativeTime, formatCost, formatTokens } from '@/lib/utils';
import { X } from 'lucide-react';

interface NodeDrawerProps {
  node: ConstellationNode | null;
  onClose: () => void;
}

export function NodeDrawer({ node, onClose }: NodeDrawerProps) {
  if (!node) return null;

  return (
    <div className={`node-drawer ${node ? 'open' : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">{node.name}</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-surface-hover rounded transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider">Status</label>
          <div className="mt-1">
            <StatusPill status={node.status} />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider">Role</label>
          <p className="text-white capitalize mt-1">{node.role}</p>
        </div>

        {node.lastSeenAt && (
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">Last Seen</label>
            <p className="text-white mt-1">{formatRelativeTime(node.lastSeenAt)}</p>
          </div>
        )}

        {node.modelPrimary && (
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">Model</label>
            <p className="text-white mt-1 font-mono text-sm">{node.modelPrimary}</p>
          </div>
        )}

        {node.provider && (
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">Provider</label>
            <p className="text-white mt-1 capitalize">{node.provider}</p>
          </div>
        )}

        <div className="border-t border-border-default pt-4">
          <label className="text-xs text-slate-500 uppercase tracking-wider">24h Stats</label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-2xl font-bold text-white">{formatTokens(node.tokensUsed24h || 0)}</p>
              <p className="text-xs text-slate-500">Tokens</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{formatCost(node.costUSD24h || 0)}</p>
              <p className="text-xs text-slate-500">Cost</p>
            </div>
          </div>
        </div>

        {node.recentTaskCount !== undefined && (
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider">Recent Tasks</label>
            <p className="text-white mt-1 text-2xl font-bold">{node.recentTaskCount}</p>
          </div>
        )}

        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider">Agent ID</label>
          <p className="text-slate-400 mt-1 font-mono text-xs break-all">{node.id}</p>
        </div>
      </div>
    </div>
  );
}
export default NodeDrawer;
