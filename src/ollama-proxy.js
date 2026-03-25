/**
 * Ollama Token Tracking Proxy
 * 
 * Sits between OpenClaw and Ollama to extract and aggregate token usage.
 * Run this service, then configure OpenClaw to use it as the Ollama endpoint.
 * 
 * Usage: node src/ollama-proxy.js
 * Default: listens on port 11435, proxies to Ollama on 11434
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const PROXY_PORT = process.env.PROXY_PORT || 11435;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'localhost';
const OLLAMA_PORT = process.env.OLLAMA_PORT || 11434;
const DATA_FILE = path.join(__dirname, 'token-stats.json');

// Token statistics storage
let tokenStats = {
  totalPromptTokens: 0,
  totalEvalTokens: 0,
  totalTokens: 0,
  requests: 0,
  lastUpdated: new Date().toISOString(),
  byAgent: {},      // Aggregated by agent name
  byModel: {},      // Aggregated by model name
  recentRequests: [] // Last 100 individual request stats
};

// Load persisted stats if available
function loadStats() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      const loaded = JSON.parse(data);
      // Merge loaded stats
      tokenStats = { ...tokenStats, ...loaded };
      console.log(`[proxy] Loaded stats from ${DATA_FILE}`);
    }
  } catch (err) {
    console.error('[proxy] Failed to load stats:', err.message);
  }
}

// Persist stats to disk
function saveStats() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(tokenStats, null, 2));
  } catch (err) {
    console.error('[proxy] Failed to save stats:', err.message);
  }
}

// Extract token info from Ollama response
function extractTokens(responseBody) {
  try {
    const data = JSON.parse(responseBody);
    
    // Standard completion response fields
    const promptEvalCount = data.prompt_eval_count || data.prompt_tokens || 0;
    const evalCount = data.eval_count || data.completion_tokens || 0;
    const totalTokens = data.total_duration ? Math.round(data.total_duration / 1e9) : (promptEvalCount + evalCount);
    const model = data.model || 'unknown';
    
    // For streaming responses, we might need to accumulate
    if (data.done && data.prompt_eval_count !== undefined) {
      return {
        promptTokens: promptEvalCount,
        evalTokens: evalCount,
        totalTokens: promptEvalCount + evalCount,
        model,
        duration: data.total_duration,
        contextLength: data.context_length || 0
      };
    }
    
    return null;
  } catch (err) {
    return null;
  }
}

// Extract agent name from request path/body (heuristic)
function extractAgentContext(req) {
  // Try to extract agent info from request
  // OpenClaw sends requests to /api/generate, /api/chat, etc.
  // The session context is in the request body messages
  try {
    const body = req.body || {};
    if (body.model) {
      return { model: body.model };
    }
  } catch (e) {}
  return { model: 'unknown' };
}

// Update stats with new token data
function updateStats(tokenData, agentContext) {
  tokenStats.totalPromptTokens += tokenData.promptTokens;
  tokenStats.totalEvalTokens += tokenData.evalTokens;
  tokenStats.totalTokens += tokenData.totalTokens;
  tokenStats.requests++;
  tokenStats.lastUpdated = new Date().toISOString();
  
  // Update by model
  const model = tokenData.model;
  if (!tokenStats.byModel[model]) {
    tokenStats.byModel[model] = {
      promptTokens: 0,
      evalTokens: 0,
      totalTokens: 0,
      requests: 0
    };
  }
  tokenStats.byModel[model].promptTokens += tokenData.promptTokens;
  tokenStats.byModel[model].evalTokens += tokenData.evalTokens;
  tokenStats.byModel[model].totalTokens += tokenData.totalTokens;
  tokenStats.byModel[model].requests++;
  
  // Update by agent (using model as proxy since we don't have direct agent ID)
  const agentName = agentContext?.agent || model;
  if (!tokenStats.byAgent[agentName]) {
    tokenStats.byAgent[agentName] = {
      promptTokens: 0,
      evalTokens: 0,
      totalTokens: 0,
      requests: 0
    };
  }
  tokenStats.byAgent[agentName].promptTokens += tokenData.promptTokens;
  tokenStats.byAgent[agentName].evalTokens += tokenData.evalTokens;
  tokenStats.byAgent[agentName].totalTokens += tokenData.totalTokens;
  tokenStats.byAgent[agentName].requests++;
  
  // Add to recent requests (keep last 100)
  tokenStats.recentRequests.push({
    ...tokenData,
    timestamp: new Date().toISOString()
  });
  if (tokenStats.recentRequests.length > 100) {
    tokenStats.recentRequests.shift();
  }
  
  saveStats();
}

// Calculate hourly stats (last 60 minutes)
function getHourlyStats() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  // For recent requests, we track them
  // Since we don't have exact timestamps in byAgent/byModel for the last hour,
  // we calculate based on the difference
  const stats = {
    promptTokens: 0,
    evalTokens: 0,
    totalTokens: 0,
    requests: 0,
    byAgent: {},
    byModel: {}
  };
  
  // Get stats from recent requests
  const recentStats = getRecentStats();
  stats.promptTokens = recentStats.promptTokens;
  stats.evalTokens = recentStats.evalTokens;
  stats.totalTokens = recentStats.totalTokens;
  stats.requests = recentStats.requests;
  stats.byAgent = recentStats.byAgent;
  stats.byModel = recentStats.byModel;
  
  return stats;
}

// Get recent stats (last hour based on recentRequests)
function getRecentStats() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const stats = {
    promptTokens: 0,
    evalTokens: 0,
    totalTokens: 0,
    requests: 0,
    byAgent: {},
    byModel: {}
  };
  
  for (const req of tokenStats.recentRequests) {
    const reqTime = new Date(req.timestamp);
    if (reqTime >= oneHourAgo) {
      stats.promptTokens += req.promptTokens;
      stats.evalTokens += req.evalTokens;
      stats.totalTokens += req.totalTokens;
      stats.requests++;
      
      // By model
      if (!stats.byModel[req.model]) {
        stats.byModel[req.model] = { promptTokens: 0, evalTokens: 0, totalTokens: 0, requests: 0 };
      }
      stats.byModel[req.model].promptTokens += req.promptTokens;
      stats.byModel[req.model].evalTokens += req.evalTokens;
      stats.byModel[req.model].totalTokens += req.totalTokens;
      stats.byModel[req.model].requests++;
      
      // By agent (use model as proxy)
      const agentName = req.agent || req.model;
      if (!stats.byAgent[agentName]) {
        stats.byAgent[agentName] = { promptTokens: 0, evalTokens: 0, totalTokens: 0, requests: 0 };
      }
      stats.byAgent[agentName].promptTokens += req.promptTokens;
      stats.byAgent[agentName].evalTokens += req.evalTokens;
      stats.byAgent[agentName].totalTokens += req.totalTokens;
      stats.byAgent[agentName].requests++;
    }
  }
  
  return stats;
}

// Get stats for last 24 hours
function getDailyStats() {
  const stats = {
    promptTokens: 0,
    evalTokens: 0,
    totalTokens: 0,
    requests: 0,
    byAgent: { ...tokenStats.byAgent },
    byModel: { ...tokenStats.byModel }
  };
  
  // For 24h, we use the accumulated byAgent/byModel from all requests
  // Since we started tracking, this is approximately 24h
  for (const model of Object.keys(tokenStats.byModel)) {
    const m = tokenStats.byModel[model];
    stats.promptTokens += m.promptTokens;
    stats.evalTokens += m.evalTokens;
    stats.totalTokens += m.totalTokens;
    stats.requests += m.requests;
  }
  
  return stats;
}

// Proxy request to Ollama
function proxyToOllama(req, res, body) {
  const options = {
    hostname: OLLAMA_HOST,
    port: OLLAMA_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers }
  };
  
  // Remove host header, we'll set a new one
  delete options.headers.host;
  
  const proxyReq = http.request(options, (proxyRes) => {
    let responseBody = '';
    
    proxyRes.on('data', (chunk) => {
      responseBody += chunk;
      res.write(chunk); // Stream back to client
    });
    
    proxyRes.on('end', () => {
      // Extract tokens from response
      const tokenData = extractTokens(responseBody);
      if (tokenData) {
        const agentContext = extractAgentContext(req);
        updateStats(tokenData, agentContext);
        console.log(`[proxy] Tokens: prompt=${tokenData.promptTokens} eval=${tokenData.evalTokens} model=${tokenData.model}`);
      }
      
      // Set status code
      res.statusCode = proxyRes.statusCode;
    });
  });
  
  proxyReq.on('error', (err) => {
    console.error('[proxy] Ollama error:', err.message);
    res.statusCode = 502;
    res.end(JSON.stringify({ error: 'Ollama proxy error', message: err.message }));
  });
  
  if (body) {
    proxyReq.write(body);
  }
  proxyReq.end();
}

// Handle API requests
function handleApiRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PROXY_PORT}`);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }
  
  // Token stats endpoints
  if (url.pathname === '/api/tokens' || url.pathname === '/tokens') {
    res.setHeader('Content-Type', 'application/json');
    
    const period = url.searchParams.get('period') || 'all';
    let stats;
    
    switch (period) {
      case '1h':
      case 'hour':
        stats = getHourlyStats();
        break;
      case '24h':
      case 'day':
        stats = getDailyStats();
        break;
      case 'all':
      default:
        stats = {
          promptTokens: tokenStats.totalPromptTokens,
          evalTokens: tokenStats.totalEvalTokens,
          totalTokens: tokenStats.totalTokens,
          requests: tokenStats.requests,
          lastUpdated: tokenStats.lastUpdated,
          byAgent: tokenStats.byAgent,
          byModel: tokenStats.byModel
        };
    }
    
    res.statusCode = 200;
    res.end(JSON.stringify(stats));
    return;
  }
  
  // Health check
  if (url.pathname === '/health' || url.pathname === '/api/health') {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }
  
  // Stats page (simple HTML)
  if (url.pathname === '/stats') {
    res.setHeader('Content-Type', 'text/html');
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Ollama Token Proxy - Stats</title>
  <style>
    body { font-family: monospace; background: #0d1117; color: #e6edf3; padding: 20px; }
    h1 { color: #58a6ff; }
    .stat { margin: 10px 0; }
    .label { color: #8b949e; }
    .value { color: #f0883e; font-weight: bold; }
    table { border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #30363d; padding: 8px 12px; text-align: left; }
    th { background: #161b22; color: #58a6ff; }
  </style>
</head>
<body>
  <h1>🤖 Ollama Token Proxy</h1>
  <div class="stat"><span class="label">Total Prompt Tokens:</span> <span class="value">${tokenStats.totalPromptTokens.toLocaleString()}</span></div>
  <div class="stat"><span class="label">Total Eval Tokens:</span> <span class="value">${tokenStats.totalEvalTokens.toLocaleString()}</span></div>
  <div class="stat"><span class="label">Total Tokens:</span> <span class="value">${tokenStats.totalTokens.toLocaleString()}</span></div>
  <div class="stat"><span class="label">Total Requests:</span> <span class="value">${tokenStats.requests.toLocaleString()}</span></div>
  <div class="stat"><span class="label">Last Updated:</span> <span class="value">${tokenStats.lastUpdated}</span></div>
  
  <h2>By Model</h2>
  <table>
    <tr><th>Model</th><th>Prompt</th><th>Eval</th><th>Total</th><th>Requests</th></tr>
    ${Object.entries(tokenStats.byModel).map(([m, s]) => 
      `<tr><td>${m}</td><td>${s.promptTokens.toLocaleString()}</td><td>${s.evalTokens.toLocaleString()}</td><td>${s.totalTokens.toLocaleString()}</td><td>${s.requests.toLocaleString()}</td></tr>`
    ).join('')}
  </table>
  
  <h2>By Agent</h2>
  <table>
    <tr><th>Agent</th><th>Prompt</th><th>Eval</th><th>Total</th><th>Requests</th></tr>
    ${Object.entries(tokenStats.byAgent).map(([a, s]) => 
      `<tr><td>${a}</td><td>${s.promptTokens.toLocaleString()}</td><td>${s.evalTokens.toLocaleString()}</td><td>${s.totalTokens.toLocaleString()}</td><td>${s.requests.toLocaleString()}</td></tr>`
    ).join('')}
  </table>
</body>
</html>
    `;
    res.statusCode = 200;
    res.end(html);
    return;
  }
  
  // Not found
  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found' }));
}

// Main server
const server = http.createServer((req, res) => {
  // Handle API endpoints on proxy port
  if (req.url.startsWith('/api/') || req.url.startsWith('/tokens') || 
      req.url.startsWith('/health') || req.url.startsWith('/stats')) {
    handleApiRequest(req, res);
    return;
  }
  
  // For Ollama API requests, read body and proxy
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    proxyToOllama(req, res, body);
  });
});

server.listen(PROXY_PORT, () => {
  console.log(`🤖 Ollama Token Proxy running on port ${PROXY_PORT}`);
  console.log(`   -> Proxies to Ollama at ${OLLAMA_HOST}:${OLLAMA_PORT}`);
  console.log(`   -> Token stats: http://localhost:${PROXY_PORT}/stats`);
  console.log(`   -> API endpoint: http://localhost:${PROXY_PORT}/api/tokens`);
  console.log(`   -> Health check: http://localhost:${PROXY_PORT}/health`);
  console.log('');
  console.log('Configure OpenClaw to use this proxy by setting OLLAMA_URL to:');
  console.log(`   http://localhost:${PROXY_PORT}`);
  loadStats();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[proxy] Shutting down...');
  saveStats();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[proxy] Shutting down...');
  saveStats();
  process.exit(0);
});
