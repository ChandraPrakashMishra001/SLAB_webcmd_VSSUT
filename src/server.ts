/**
 * Webcmd Web Dashboard Server
 *
 * A lightweight Node.js HTTP server that exposes webcmd's prompt optimization,
 * auto-suggestion, and idea generation as a JSON REST API so they can be used
 * from any browser — no CLI required.
 *
 * Routes:
 *   POST /api/prompt/optimize   { prompt: string }
 *   POST /api/suggest           { intent: string, limit?: number }
 *   GET  /api/idea/:vertical
 *   GET  /api/idea/verticals
 *   GET  /                      → serves public/index.html
 *   GET  /health                → { ok: true }
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '../../public');
const PORT = Number(process.env.PORT ?? 3456);

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(res: http.ServerResponse, data: unknown, status = 200): void {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(body);
}

function parseBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function serveStatic(res: http.ServerResponse, filePath: string): void {
  const ext = path.extname(filePath);
  const types: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  };
  const mimeType = types[ext] ?? 'text/plain';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(data);
  });
}

// ── Router ────────────────────────────────────────────────────────────────────

async function router(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const method = req.method ?? 'GET';

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    res.end();
    return;
  }

  // ── Health ──────────────────────────────────────────────────────────────
  if (url.pathname === '/health') {
    json(res, { ok: true, version: '0.7.4' });
    return;
  }

  // ── POST /api/prompt/optimize ───────────────────────────────────────────
  if (method === 'POST' && url.pathname === '/api/prompt/optimize') {
    try {
      const body = await parseBody(req);
      const prompt = String(body.prompt ?? '').trim();
      if (!prompt) { json(res, { error: 'prompt is required' }, 400); return; }
      const { optimizePrompt } = await import('./commands/prompt.js');
      const result = optimizePrompt(prompt);
      json(res, result);
    } catch (err) {
      json(res, { error: String(err) }, 500);
    }
    return;
  }

  // ── POST /api/suggest ───────────────────────────────────────────────────
  if (method === 'POST' && url.pathname === '/api/suggest') {
    try {
      const body = await parseBody(req);
      const intent = String(body.intent ?? '').trim();
      if (!intent) { json(res, { error: 'intent is required' }, 400); return; }
      const limit = Number(body.limit ?? 5);
      const { suggestCommands } = await import('./commands/suggest.js');
      const result = suggestCommands(intent, { limit });
      json(res, result);
    } catch (err) {
      json(res, { error: String(err) }, 500);
    }
    return;
  }

  // ── GET /api/idea/verticals ─────────────────────────────────────────────
  if (method === 'GET' && url.pathname === '/api/idea/verticals') {
    try {
      const { listIdeaVerticals } = await import('./commands/idea.js');
      json(res, listIdeaVerticals());
    } catch (err) {
      json(res, { error: String(err) }, 500);
    }
    return;
  }

  // ── GET /api/idea/:vertical ─────────────────────────────────────────────
  const ideaMatch = url.pathname.match(/^\/api\/idea\/([a-zA-Z]+)$/);
  if (method === 'GET' && ideaMatch) {
    try {
      const vertical = ideaMatch[1]!;
      const { generateIdeas } = await import('./commands/idea.js');
      json(res, generateIdeas(vertical));
    } catch (err) {
      json(res, { error: String(err) }, 500);
    }
    return;
  }

  // ── Static files ────────────────────────────────────────────────────────
  if (method === 'GET') {
    const filePath = url.pathname === '/'
      ? path.join(PUBLIC_DIR, 'index.html')
      : path.join(PUBLIC_DIR, url.pathname.replace(/^\//, ''));
    serveStatic(res, filePath);
    return;
  }

  json(res, { error: 'Not found' }, 404);
}

// ── Start ─────────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  router(req, res).catch((err) => {
    console.error('Unhandled error:', err);
    res.writeHead(500); res.end('Internal Server Error');
  });
});

server.listen(PORT, () => {
  console.log(`\n  🌐 Webcmd Dashboard → http://localhost:${PORT}`);
  console.log(`  📡 API              → http://localhost:${PORT}/api`);
  console.log('\n  Press Ctrl+C to stop.\n');
});
