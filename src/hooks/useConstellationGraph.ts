'use client';

import { useState, useEffect } from 'react';
import type { ConstellationGraph, ConstellationNode, ConstellationEdge } from '@/types/constellation';

// Mock data for the constellation visualization
const MOCK_NODES: ConstellationNode[] = [
  {
    id: 'agent:main',
    name: 'Main',
    role: 'orchestrator',
    modelPrimary: 'minimax-m2.5:cloud',
    status: 'active',
    lastSeenAt: new Date().toISOString(),
    tokensUsed24h: 1250000,
    costUSD24h: 2.45,
    provider: 'ollama',
    recentTaskCount: 47,
  },
  {
    id: 'agent:seven',
    name: 'Seven',
    role: 'developer',
    modelPrimary: 'minimax-m2.5:cloud',
    status: 'active',
    lastSeenAt: new Date().toISOString(),
    tokensUsed24h: 450000,
    costUSD24h: 0.89,
    provider: 'ollama',
    recentTaskCount: 23,
  },
  {
    id: 'agent:inky',
    name: 'Inky',
    role: 'other',
    modelPrimary: 'minimax-m2.5:cloud',
    status: 'active',
    lastSeenAt: new Date().toISOString(),
    tokensUsed24h: 320000,
    costUSD24h: 0.64,
    provider: 'ollama',
    recentTaskCount: 18,
  },
  {
    id: 'agent:pixel',
    name: 'Pixel',
    role: 'designer',
    modelPrimary: 'minimax-m2.5:cloud',
    status: 'active',
    lastSeenAt: new Date().toISOString(),
    tokensUsed24h: 280000,
    costUSD24h: 0.56,
    provider: 'ollama',
    recentTaskCount: 15,
  },
  {
    id: 'agent:scout',
    name: 'Scout',
    role: 'researcher',
    modelPrimary: 'minimax-m2.5:cloud',
    status: 'active',
    lastSeenAt: new Date().toISOString(),
    tokensUsed24h: 410000,
    costUSD24h: 0.82,
    provider: 'ollama',
    recentTaskCount: 21,
  },
  {
    id: 'agent:buddy',
    name: 'Buddy',
    role: 'other',
    modelPrimary: 'minimax-m2.5:cloud',
    status: 'idle',
    lastSeenAt: new Date(Date.now() - 300000).toISOString(),
    tokensUsed24h: 120000,
    costUSD24h: 0.24,
    provider: 'ollama',
    recentTaskCount: 8,
  },
  {
    id: 'agent:clawe',
    name: 'Clawe',
    role: 'orchestrator',
    modelPrimary: 'minimax-m2.5:cloud',
    status: 'active',
    lastSeenAt: new Date().toISOString(),
    tokensUsed24h: 680000,
    costUSD24h: 1.36,
    provider: 'ollama',
    recentTaskCount: 34,
  },
];

const MOCK_EDGES: ConstellationEdge[] = [
  { id: 'e1', from: 'agent:main', to: 'agent:seven', type: 'message', strength: 0.9, lastEventAt: new Date().toISOString() },
  { id: 'e2', from: 'agent:main', to: 'agent:clawe', type: 'message', strength: 0.8, lastEventAt: new Date().toISOString() },
  { id: 'e3', from: 'agent:seven', to: 'agent:inky', type: 'message', strength: 0.7, lastEventAt: new Date().toISOString() },
  { id: 'e4', from: 'agent:inky', to: 'agent:pixel', type: 'message', strength: 0.6, lastEventAt: new Date().toISOString() },
  { id: 'e5', from: 'agent:pixel', to: 'agent:scout', type: 'message', strength: 0.5, lastEventAt: new Date().toISOString() },
  { id: 'e6', from: 'agent:scout', to: 'agent:buddy', type: 'message', strength: 0.4, lastEventAt: new Date().toISOString() },
  { id: 'e7', from: 'agent:buddy', to: 'agent:clawe', type: 'message', strength: 0.3, lastEventAt: new Date().toISOString() },
  { id: 'e8', from: 'agent:clawe', to: 'agent:main', type: 'message', strength: 0.85, lastEventAt: new Date().toISOString() },
  { id: 'e9', from: 'agent:seven', to: 'agent:buddy', type: 'message', strength: 0.5, lastEventAt: new Date().toISOString() },
  { id: 'e10', from: 'agent:main', to: 'agent:inky', type: 'message', strength: 0.6, lastEventAt: new Date().toISOString() },
];

export function useConstellationGraph(): {
  graph: ConstellationGraph;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [graph, setGraph] = useState<ConstellationGraph>({
    nodes: [],
    edges: [],
    computedAt: '',
    isLive: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGraph = async () => {
    setIsLoading(true);
    try {
      // Simulate API call with mock data
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const mockGraph: ConstellationGraph = {
        nodes: MOCK_NODES,
        edges: MOCK_EDGES,
        computedAt: new Date().toISOString(),
        isLive: true,
      };
      
      setGraph(mockGraph);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch graph'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
    
    // Poll every 5 seconds for live updates
    const interval = setInterval(fetchGraph, 5000);
    return () => clearInterval(interval);
  }, []);

  return { graph, isLoading, error, refetch: fetchGraph };
}

export function getFallbackGraph(): ConstellationGraph {
  return {
    nodes: MOCK_NODES,
    edges: MOCK_EDGES,
    computedAt: new Date().toISOString(),
    isLive: false,
  };
}