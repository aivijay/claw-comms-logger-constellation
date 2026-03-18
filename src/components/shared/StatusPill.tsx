'use client';

import { cn } from '@/lib/utils';

interface StatusPillProps {
  status: 'active' | 'idle' | 'error' | 'offline';
  showDot?: boolean;
  size?: 'sm' | 'md';
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  idle: 'Idle',
  error: 'Error',
  offline: 'Offline',
};

export function StatusPill({ status, showDot = true, size = 'md' }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        status === 'active' && 'bg-green-500/15 text-green-400',
        status === 'idle' && 'bg-amber-500/15 text-amber-400',
        status === 'error' && 'bg-red-500/15 text-red-400',
        status === 'offline' && 'bg-slate-500/15 text-slate-400',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-3 py-1 text-sm'
      )}
    >
      {showDot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            status === 'active' && 'bg-green-400 animate-pulse',
            status === 'idle' && 'bg-amber-400',
            status === 'error' && 'bg-red-400 animate-pulse',
            status === 'offline' && 'bg-slate-400'
          )}
        />
      )}
      {STATUS_LABELS[status]}
    </span>
  );
}