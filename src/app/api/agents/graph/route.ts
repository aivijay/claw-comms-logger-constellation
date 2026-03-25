import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { execSync } = await import('child_process');
    
    let result = execSync(
      '/home/vijay/.config/nvm/versions/node/v25.6.1/bin/openclaw sessions --all-agents --json 2>/dev/null',
      { encoding: 'utf-8', timeout: 10000 }
    );
    
    // Extract complete JSON from command output, ignoring any plugin logs prepended/appended
    // Plugin logs go to stdout, not stderr, so 2>/dev/null doesn't suppress them
    const firstBrace = result.indexOf('{');
    const lastBrace = result.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || firstBrace > lastBrace) {
      return NextResponse.json({ nodes: [], edges: [] }, { status: 200 });
    }
    result = result.substring(firstBrace, lastBrace + 1);
    
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
    
    // Mock token data generator - returns realistic-looking values
    const mockTokens = (base: number) => ({
      input: Math.floor(base * 0.3),
      output: Math.floor(base * 0.7),
      total: base,
    });
    
    // Generate mock tokens for demo (will be replaced with real data later)
    const generateMockAgentTokens = (agentId: string, role: string) => {
      const multipliers: Record<string, number> = {
        orchestrator: 45000,
        developer: 35000,
        researcher: 28000,
        designer: 22000,
        other: 15000,
      };
      const base = multipliers[role] || 15000;
      // Add some variance per agent
      const agentVariance = agentId.length * 1000;
      return {
        tokensUsed24h: mockTokens(base + agentVariance),
        costUSD24h: 0,
        errorCount24h: 0,
      };
    };
    
    // Map sessions to nodes
    const nodes = sessions.map((session: any) => {
      const agentId = session.agentId || session.key?.split(':')[1] || 'unknown';
      const name = agentNames[agentId?.toLowerCase()] || agentId;
      const role = roleFromAgentId(agentId);
      const status = getStatus(session);
      const agentTokens = generateMockAgentTokens(agentId, role);
      
      return {
        id: session.sessionId || session.key || agentId,
        name,
        role,
        status,
        modelPrimary: session.model || 'minimax-m2.5:cloud',
        provider: session.modelProvider || 'ollama',
        tokensUsed24h: agentTokens.tokensUsed24h.total,
        tokensUsed1h: Math.floor(agentTokens.tokensUsed24h.total / 12),
        inputTokens24h: agentTokens.tokensUsed24h.input,
        outputTokens24h: agentTokens.tokensUsed24h.output,
        inputTokens1h: Math.floor(agentTokens.tokensUsed24h.input / 12),
        outputTokens1h: Math.floor(agentTokens.tokensUsed24h.output / 12),
        costUSD24h: agentTokens.costUSD24h,
        errorCount24h: agentTokens.errorCount24h,
      };
    });
    
    // Ensure orchestrator exists
    if (!nodes.find(n => n.role === 'orchestrator')) {
      const mockTokens = (base: number) => ({
        input: Math.floor(base * 0.3),
        output: Math.floor(base * 0.7),
        total: base,
      });
      const orchestratorTokens = mockTokens(45000);
      nodes.unshift({
        id: 'orchestrator',
        name: 'Clawe',
        role: 'orchestrator',
        status: 'offline',
        modelPrimary: 'minimax-m2.5:cloud',
        provider: 'minimax',
        tokensUsed24h: orchestratorTokens.total,
        tokensUsed1h: Math.floor(orchestratorTokens.total / 12),
        inputTokens24h: orchestratorTokens.input,
        outputTokens24h: orchestratorTokens.output,
        inputTokens1h: Math.floor(orchestratorTokens.input / 12),
        outputTokens1h: Math.floor(orchestratorTokens.output / 12),
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
    
    // Calculate aggregate token stats for the menu bar
    const aggregateTokens = (key: 'tokensUsed24h' | 'tokensUsed1h') => 
      nodes.reduce((sum: number, n: any) => sum + (n[key] || 0), 0);
    
    const aggregateInputTokens = (key: 'inputTokens24h' | 'inputTokens1h') =>
      nodes.reduce((sum: number, n: any) => sum + (n[key] || 0), 0);
    
    const aggregateOutputTokens = (key: 'outputTokens24h' | 'outputTokens1h') =>
      nodes.reduce((sum: number, n: any) => sum + (n[key] || 0), 0);
    
    const tokenStats = {
      currentHour: {
        inputTokens: aggregateInputTokens('inputTokens1h'),
        outputTokens: aggregateOutputTokens('outputTokens1h'),
        totalTokens: aggregateTokens('tokensUsed1h'),
      },
      last24Hours: {
        inputTokens: aggregateInputTokens('inputTokens24h'),
        outputTokens: aggregateOutputTokens('outputTokens24h'),
        totalTokens: aggregateTokens('tokensUsed24h'),
      },
    };
    
    return NextResponse.json({
      nodes,
      edges,
      tokenStats,
      computedAt: new Date().toISOString(),
      isLive: true,
    });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ nodes: [], edges: [] }, { status: 200 });
  }
}