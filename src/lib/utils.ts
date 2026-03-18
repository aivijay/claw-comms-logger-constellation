import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCost(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

export function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'unknown';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return 'just now';
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
    case 'online':
    case 'healthy':
    case 'done':
    case 'completed':
      return 'text-status-green';
    case 'idle':
    case 'degraded':
    case 'in-progress':
    case 'running':
    case 'partial':
      return 'text-status-amber';
    case 'error':
    case 'down':
    case 'blocked':
    case 'failed':
    case 'critical':
      return 'text-status-red';
    default:
      return 'text-text-muted';
  }
}

export function getStatusBgColor(status: string): string {
  switch (status) {
    case 'active':
    case 'online':
    case 'healthy':
    case 'done':
    case 'completed':
      return 'bg-status-green';
    case 'idle':
    case 'degraded':
    case 'in-progress':
    case 'running':
    case 'partial':
      return 'bg-status-amber';
    case 'error':
    case 'down':
    case 'blocked':
    case 'failed':
    case 'critical':
      return 'bg-status-red';
    default:
      return 'bg-text-muted';
  }
}