'use client';
import { useState, useEffect, useCallback } from 'react';
import type { ConstellationGraph } from '@/types/constellation';

const FALLBACK_GRAPH: ConstellationGraph = {
  nodes: [
    { id: 'orchestrator', name: 'Clawe', role: 'orchestrator', status: 'active', modelPrimary: 'minimax-m2.5:cloud', provider: 'minimax', tokensUsed24h: 125000, costUSD24h: 2.34, errorCount24h: 0 },
    { id: 'seven', name: 'Seven', role: 'developer', status: 'active', modelPrimary: 'minimax-m2.5:cloud', provider: 'minimax', tokensUsed24h: 45000, costUSD24h: 0.89, errorCount24h: 0 },
    { id: 'scout', name: 'Scout', role: 'researcher', status: 'idle', modelPrimary: 'minimax-m2.5:cloud', provider: 'minimax', tokensUsed24h: 12000, costUSD24h: 0.12, errorCount24h: 0 },
    { id: 'inky', name: 'Inky', role: 'designer', status: 'idle', modelPrimary: 'minimax-m2.5:cloud', provider: 'minimax', tokensUsed24h: 8500, costUSD24h: 0.21, errorCount24h: 0 },
    { id: 'pixel', name: 'Pixel', role: 'designer', status: 'active', modelPrimary: 'minimax-m2.5:cloud', provider: 'minimax', tokensUsed24h: 78000, costUSD24h: 1.56, errorCount24h: 0 },
    { id: 'buddy', name: 'Buddy', role: 'developer', status: 'offline', modelPrimary: 'minimax-m2.5:cloud', provider: 'minimax', tokensUsed24h: 0, costUSD24h: 0, errorCount24h: 0 },
  ],
  edges: [
    { id: 'e1', from: 'orchestrator', to: 'seven', type: 'delegation', strength: 0.8, ratePerMin: 2 },
    { id: 'e2', from: 'orchestrator', to: 'scout', type: 'delegation', strength: 0.5, ratePerMin: 0.5 },
    { id: 'e3', from: 'orchestrator', to: 'inky', type: 'delegation', strength: 0.6, ratePerMin: 1 },
    { id: 'e4', from: 'orchestrator', to: 'pixel', type: 'delegation', strength: 0.4, ratePerMin: 0.3 },
    { id: 'e5', from: 'orchestrator', to: 'buddy', type: 'delegation', strength: 0.3, ratePerMin: 0.1 },
  ],
  computedAt: new Date().toISOString(),
  isLive: false,
};

export function useConstellationGraph() {
  const [data, setData] = useState<ConstellationGraph | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetchGraph = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/graph');
      if (!res.ok) {
        // Use fallback with demo data
        setData({ ...FALLBACK_GRAPH, isLive: false });
        setIsError(true);
        return;
      }
      const json = await res.json();
      if (!json.nodes || json.nodes.length === 0) {
        setData({ ...FALLBACK_GRAPH, isLive: false });
        setIsError(true);
        return;
      }
      setData(json);
      setIsError(false);
    } catch (err) {
      console.error('Failed to fetch graph:', err);
      setData({ ...FALLBACK_GRAPH, isLive: false });
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
    const interval = setInterval(fetchGraph, 30_000);
    return () => clearInterval(interval);
  }, [fetchGraph]);

  return { data, isLoading, isError };
}