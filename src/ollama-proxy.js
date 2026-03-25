/**
 * Ollama Token Tracking Proxy
 * 
 * Sits between OpenClaw and Ollama to extract and aggregate token usage.
 * Run: node src/ollama-proxy.js
 * Default: listens on port 11435, proxies to Ollama on 11434
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const PROXY_PORT = process.env.PROXY_PORT || 11435;
const OLLAMA_HOST = 'localhost';
const OLLAMA_PORT = 11434;
const DATA_FILE = path.join(__dirname, 'token-stats.json');

// Token statistics storage
let tokenStats = {
  totalPromptTokens: 0,
  totalEvalTokens: 0,
  totalTokens: 0,
  requests: 0,
  lastUpdated: new Date().toISOString(),
  byAgent: {},
  byModel: {},
  recentRequests: []
};

// Load persisted stats if available
function loadStats() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      const loaded = JSON.parse(data);
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

// Extract token info from Ollama response body
function extractTokens(responseBody) {
  try {
    const data = JSON.parse(responseBody);
    
    // Standard completion response fields
    const promptTokens = data.usage?.prompt_tokens || data.prompt_eval_count || 0;
    const evalTokens = data.usage?.completion_tokens || data.eval_count || 0;
    const model = data.model || 'unknown';
    
    if (promptTokens > 0 || evalTokens > 0) {
      return {
        promptTokens,
        evalTokens,
        totalTokens: promptTokens + evalTokens,
        model
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

// Update stats with new token data
function updateStats(tokenData) {
  tokenStats.totalPromptTokens += tokenData.promptTokens;
  tokenStats.totalEvalTokens += tokenData.evalTokens;
  tokenStats.totalTokens += tokenData.totalTokens;
  tokenStats.requests++;
  tokenStats.lastUpdated = new Date().toISOString();
  
  // Update by model
  const model = tokenData.model;
  if (!tokenStats.byModel[model]) {
    tokenStats.byModel[model] = { promptTokens: 0, evalTokens: 0, totalTokens: 0, requests: 0 };
  }
  tokenStats.byModel[model].promptTokens += tokenData.promptTokens;
  tokenStats.byModel[model].evalTokens += tokenData.evalTokens;
  tokenStats.byModel[model].totalTokens += tokenData.totalTokens;
  tokenStats.byModel[model].requests++;
  
  // Keep recent requests (last 100)
  tokenStats.recentRequests.push({
    ...tokenData,
    timestamp: new Date().toISOString()
  });
  if (tokenStats.recentRequests.length > 100) {
    tokenStats.recentRequests.shift();
  }
  
  saveStats();
  
  console.log(`[proxy] Tokens: prompt=${tokenData.promptTokens} eval=${tokenData.evalTokens} model=${tokenData.model}`);
}

// Get stats for time period
function getStats(period = 'all') {
  const now = Date.now();
  const oneHourMs = 60 * 60 * 1000;
  const oneDayMs = 24 * oneHourMs;
  
  if (period === '1h' || period === 'hour') {
    const cutoff = new Date(now - oneHourMs).toISOString();
    const filtered = tokenStats.recentRequests.filter(r => r.timestamp >= cutoff);
    return aggregateStats(filtered);
  }
  
  if (period === '24h' || period === 'day') {
    const cutoff = new Date(now - oneDayMs).toISOString();
    const filtered = tokenStats.recentRequests.filter(r => r.timestamp >= cutoff);
    return aggregateStats(filtered);
  }
  
  // All time
  return {
    promptTokens: tokenStats.totalPromptTokens,
    evalTokens: tokenStats.totalEvalTokens,
    totalTokens: tokenStats.totalTokens,
    requests: tokenStats.requests,
    lastUpdated: tokenStats.lastUpdated,
    byAgent: tokenStats.byAgent,
    byModel: tokenStats.byModel
  };
}

function aggregateStats(requests) {
  const stats = {
    promptTokens: 0,
    evalTokens: 0,
    totalTokens: 0,
    requests: requests.length,
    byAgent: {},
    byModel: {}
  };
  
  for (const req of requests) {
    stats.promptTokens += req.promptTokens;
    stats.evalTokens += req.evalTokens;
    stats.totalTokens += req.totalTokens;
    
    const model = req.model || 'unknown';
    if (!stats.byModel[model]) {
      stats.byModel[model] = { promptTokens: 0, evalTokens: 0, totalTokens: 0, requests: 0 };
    }
    stats.byModel[model].promptTokens += req.promptTokens;
    stats.byModel[model].evalTokens += req.evalTokens;
    stats.byModel[model].totalTokens += req.totalTokens;
    stats.byModel[model].requests++;
  }
  
  return stats;
}

// Proxy request to Ollama
function proxyRequest(req, res, body) {
  const options = {
    hostname: OLLAMA_HOST,
    port: OLLAMA_PORT,
    path: req.url,
    method: req.method,
    headers: {}
  };
  
  // Copy headers except host
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.toLowerCase() !== 'host') {
      options.headers[key] = value;
    }
  }
  
  const proxyReq = http.request(options, (proxyRes) => {
    // Collect response body to extract tokens (works for both streaming and non-streaming)
    const contentType = proxyRes.headers['content-type'] || '';
    const isJson = contentType.includes('application/json');
    
    if (isJson) {
      let body = '';
      proxyRes.on('data', chunk => body += chunk);
      proxyRes.on('end', () => {
        // Extract tokens from response
        const tokenData = extractTokens(body);
        if (tokenData) {
          updateStats(tokenData);
        }
        
        // Forward response to client
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        res.end(body);
      });
    } else {
      // Pass through non-JSON responses
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  });
  
  proxyReq.on('error', (err) => {
    console.error('[proxy] Ollama error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad gateway', message: err.message }));
  });
  
  if (body) {
    proxyReq.write(body);
  }
  proxyReq.end();
}

// Handle API requests (non-Ollama endpoints)
function handleApiRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PROXY_PORT}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Token stats endpoint
  if (url.pathname === '/api/tokens' || url.pathname === '/tokens') {
    const period = url.searchParams.get('period') || 'all';
    const stats = getStats(period);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats));
    return;
  }
  
  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: Math.floor(process.uptime()) }));
    return;
  }
  
  // Stats dashboard
  if (url.pathname === '/stats') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getStatsHtml());
    return;
  }
  
  // Not found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

function getStatsHtml() {
  const s = tokenStats;
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Ollama Token Proxy</title>
  <style>
    body { font-family: monospace; background: #0d1117; color: #e6edf3; padding: 20px; }
    h1 { color: #58a6ff; }
    .stat { margin: 10px 0; }
    .label { color: #8b949e; display: inline-block; width: 200px; }
    .value { color: #f0883e; font-weight: bold; }
    table { border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #30363d; padding: 8px 12px; text-align: left; }
    th { background: #161b22; color: #58a6ff; }
  </style>
</head>
<body>
  <h1>Ollama Token Proxy</h1>
  <div class="stat"><span class="label">Total Prompt Tokens:</span> <span class="value">${s.totalPromptTokens.toLocaleString()}</span></div>
  <div class="stat"><span class="label">Total Eval Tokens:</span> <span class="value">${s.totalEvalTokens.toLocaleString()}</span></div>
  <div class="stat"><span class="label">Total Tokens:</span> <span class="value">${s.totalTokens.toLocaleString()}</span></div>
  <div class="stat"><span class="label">Total Requests:</span> <span class="value">${s.requests.toLocaleString()}</span></div>
  <div class="stat"><span class="label">Last Updated:</span> <span class="value">${s.lastUpdated}</span></div>
  
  <h2>By Model</h2>
  <table>
    <tr><th>Model</th><th>Prompt</th><th>Eval</th><th>Total</th><th>Requests</th></tr>
    ${Object.entries(s.byModel).map(([m, data]) => 
      `<tr><td>${m}</td><td>${data.promptTokens.toLocaleString()}</td><td>${data.evalTokens.toLocaleString()}</td><td>${data.totalTokens.toLocaleString()}</td><td>${data.requests.toLocaleString()}</td></tr>`
    ).join('')}
  </table>
  
  <h2>Recent Requests (${s.recentRequests.length})</h2>
  <table>
    <tr><th>Time</th><th>Model</th><th>Prompt</th><th>Eval</th><th>Total</th></tr>
    ${s.recentRequests.slice(-20).reverse().map(r => 
      `<tr><td>${new Date(r.timestamp).toLocaleTimeString()}</td><td>${r.model}</td><td>${r.promptTokens}</td><td>${r.evalTokens}</td><td>${r.totalTokens}</td></tr>`
    ).join('')}
  </table>
</body>
</html>
  `;
}

// Main server
const server = http.createServer((req, res) => {
  // Handle API endpoints
  if (req.url.startsWith('/api/') || req.url.startsWith('/tokens') || 
      req.url.startsWith('/health') || req.url.startsWith('/stats')) {
    handleApiRequest(req, res);
    return;
  }
  
  // For all other requests (Ollama API), proxy to Ollama
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    proxyRequest(req, res, body);
  });
});

server.listen(PROXY_PORT, () => {
  console.log(`Ollama Token Proxy running on port ${PROXY_PORT}`);
  console.log(`  -> Proxies to Ollama at ${OLLAMA_HOST}:${OLLAMA_PORT}`);
  console.log(`  -> Token stats: http://localhost:${PROXY_PORT}/stats`);
  console.log(`  -> API: http://localhost:${PROXY_PORT}/api/tokens`);
  loadStats();
});

process.on('SIGINT', () => { console.log('\nShutting down...'); saveStats(); process.exit(0); });
process.on('SIGTERM', () => { console.log('\nShutting down...'); saveStats(); process.exit(0); });
