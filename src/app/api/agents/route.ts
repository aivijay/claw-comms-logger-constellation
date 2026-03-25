import { NextResponse } from 'next/server';

// Fetch real agent data from OpenClaw CLI
export async function GET() {
  try {
    const { execSync } = await import('child_process');
    
    const result = execSync('/home/vijay/.config/nvm/versions/node/v25.6.1/bin/openclaw sessions --all-agents --active 60 --json 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 10000,
    });
    
    const sessionsData = JSON.parse(result);
    const sessions = sessionsData.sessions || [];
    
    if (sessions.length === 0) {
      return NextResponse.json({
        nodes: [
          { id: 'orchestrator', name: 'Clawe', role: 'orchestrator', status: 'idle', modelPrimary: 'minimax-m2.5:cloud', provider: 'minimax', tokensUsed24h: 0, costUSD24h: 0, errorCount24h: 0 },
        ],
        edges: [],
        computedAt: new Date().toISOString(),
        isLive: true,
      });
    }
    
    // Map sessions to constellation nodes
    const nodes = sessions.map((s: any) => {
      const key = s.key || '';
      const name = key.replace('agent:', '').replace(':main', '').replace(':subagent', '').replace(/:[a-f0-9-]+$/, '');
      const isOrchestrator = key.includes('clawe:main') || key === 'agent:main:main';
      const isActive = s.abortedLastRun === false && s.ageMs < 120_000; // Active if not aborted and updated in last 2 min
      
      return {
        id: s.sessionId || key,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        role: isOrchestrator ? 'orchestrator' : 
              name.includes('develop') || name.includes('seven') || name.includes('node-developer') ? 'developer' :
              name.includes('scout') ? 'researcher' :
              name.includes('pixel') || name.includes('inky') ? 'designer' : 
              name.includes('buddy') ? 'developer' : 'other',
        status: isActive ? 'active' : 'idle',
        modelPrimary: s.model || 'minimax-m2.5:cloud',
        provider: 'minimax',
        tokensUsed24h: s.totalTokens || 0,
        costUSD24h: 0,
        errorCount24h: 0,
        lastActivity: s.updatedAt,
      };
    });
    
    // If no orchestrator found, add Clawe
    if (!nodes.find((n: { role: string }) => n.role === 'orchestrator')) {
      nodes.unshift({
        id: 'clawe-orchestrator',
        name: 'Clawe',
        role: 'orchestrator',
        status: 'idle',
        modelPrimary: 'minimax-m2.5:cloud',
        provider: 'minimax',
        tokensUsed24h: 0,
        costUSD24h: 0,
        errorCount24h: 0,
      });
    }
    
    // Add known agents that might be offline (not in sessions)
    const knownAgents = ['scout', 'inky', 'pixel', 'buddy'];
    const existingNames = nodes.map((n: any) => n.name.toLowerCase());
    knownAgents.forEach(agent => {
      if (!existingNames.includes(agent)) {
        nodes.push({
          id: `offline-${agent}`,
          name: agent.charAt(0).toUpperCase() + agent.slice(1),
          role: agent === 'scout' ? 'researcher' : 
                agent === 'pixel' || agent === 'inky' ? 'designer' : 'developer',
          status: 'offline',
          modelPrimary: 'minimax-m2.5:cloud',
          provider: 'minimax',
          tokensUsed24h: 0,
          costUSD24h: 0,
          errorCount24h: 0,
        });
      }
    });
    
    // Create edges from orchestrator to others
    const orchestrator = nodes.find((n: any) => n.role === 'orchestrator');
    const edges = orchestrator 
      ? nodes
          .filter((n: any) => n.id !== orchestrator.id)
          .map((n: any, i: number) => ({
            id: `e${i + 1}`,
            from: orchestrator.id,
            to: n.id,
            type: 'delegation',
            strength: 0.5 + Math.random() * 0.3,
            ratePerMin: n.status === 'active' ? Math.random() * 2 : 0,
          }))
      : [];
    
    // Add some sample message edges
    const activeNodes = nodes.filter((n: any) => n.status === 'active' && n.role !== 'orchestrator');
    if (activeNodes.length >= 2) {
      edges.push({
        id: 'msg1',
        from: activeNodes[0].id,
        to: activeNodes[1].id,
        type: 'message',
        strength: 0.3,
        ratePerMin: 0.2,
      });
    }
    
    return NextResponse.json({
      nodes,
      edges,
      computedAt: new Date().toISOString(),
      isLive: true,
    });
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    
    // Return fallback data on error
    return NextResponse.json({
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
    });
  }
}