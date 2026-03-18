import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { execSync } = await import('child_process');
    
    const result = execSync(
      '/home/vijay/.config/nvm/versions/node/v25.6.1/bin/openclaw sessions --all-agents --json 2>/dev/null',
      { encoding: 'utf-8', timeout: 10000 }
    );
    
    const sessionsData = JSON.parse(result);
    const allSessions = sessionsData.sessions || [];
    
    // Get unique agents (most recent session per agentId)
    const agentNames: Record<string, string> = {
      'clawe': 'Clawe',
      'seven': 'Seven',
      'scout': 'Scout',
      'inky': 'Inky',
      'pixel': 'Pixel',
      'buddy': 'Buddy',
      'main': 'Plop',
      'node-developer': 'Node-developer',
    };
    
    const roleFromAgentId = (agentId: string): string => {
      const lower = agentId?.toLowerCase() || '';
      if (lower === 'clawe' || lower === 'main') return 'orchestrator';
      if (lower === 'scout') return 'researcher';
      if (lower === 'inky' || lower === 'pixel') return 'designer';
      if (lower === 'seven' || lower === 'buddy' || lower === 'node-developer') return 'developer';
      return 'other';
    };
    
    // Get most recent session per agent
    const sessionsByAgent = new Map();
    for (const session of allSessions) {
      const agentId = session.agentId || session.key?.split(':')[1];
      if (!sessionsByAgent.has(agentId) || session.updatedAt > sessionsByAgent.get(agentId).updatedAt) {
        sessionsByAgent.set(agentId, session);
      }
    }
    
    const sessions = Array.from(sessionsByAgent.values());
    
    // Determine status based on session age
    const getStatus = (session: any): 'active' | 'idle' | 'offline' => {
      const ageMs = Date.now() - (session.updatedAt || 0);
      if (ageMs < 60000) return 'active';     // < 1 min
      if (ageMs < 300000) return 'idle';       // < 5 min
      return 'offline';
    };
    
    // Map sessions to nodes
    const nodes = sessions.map((session: any) => {
      const agentId = session.agentId || session.key?.split(':')[1] || 'unknown';
      const name = agentNames[agentId?.toLowerCase()] || agentId;
      const role = roleFromAgentId(agentId);
      const status = getStatus(session);
      
      return {
        id: session.sessionId || session.key || agentId,
        name,
        role,
        status,
        modelPrimary: session.model || 'minimax-m2.5:cloud',
        provider: session.modelProvider || 'ollama',
        tokensUsed24h: session.totalTokens || 0,
        costUSD24h: 0,
        errorCount24h: 0,
      };
    });
    
    // Ensure orchestrator exists
    if (!nodes.find(n => n.role === 'orchestrator')) {
      nodes.unshift({
        id: 'orchestrator',
        name: 'Clawe',
        role: 'orchestrator',
        status: 'offline',
        modelPrimary: 'minimax-m2.5:cloud',
        provider: 'minimax',
        tokensUsed24h: 0,
        costUSD24h: 0,
        errorCount24h: 0,
      });
    }
    
    // Find orchestrator ID
    const orchestratorNode = nodes.find(n => n.role === 'orchestrator');
    const orchestratorId = orchestratorNode?.id || 'orchestrator';
    
    // Create edges (only show edges to non-orchestrator nodes)
    const nonOrchNodes = nodes.filter(n => n.role !== 'orchestrator');
    const edges = nonOrchNodes.map((n, i) => {
      const ratePerMin = n.status === 'active' ? 2 : n.status === 'idle' ? 0.3 : 0;
      const strength = n.status === 'active' ? 0.9 : n.status === 'idle' ? 0.4 : 0.1;
      
      return {
        id: `edge-${i + 1}`,
        from: orchestratorId,
        to: n.id,
        type: 'delegation',
        lastEventAt: new Date().toISOString(),
        ratePerMin,
        strength,
      };
    });
    
    return NextResponse.json({
      nodes,
      edges,
      computedAt: new Date().toISOString(),
      isLive: true,
    });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ nodes: [], edges: [] }, { status: 200 });
  }
}