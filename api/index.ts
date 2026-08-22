import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { optimizePrompt } from '../src/commands/prompt.js';
import { suggestCommands } from '../src/commands/suggest.js';
import { generateIdeas, listIdeaVerticals } from '../src/commands/idea.js';

function json(res: ServerResponse, data: unknown, status = 200): void {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(body);
}

function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
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

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
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

  // Root UI
  if (method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '')) {
    try {
      const possiblePaths = [
        path.join(process.cwd(), 'public/index.html'),
        path.join(process.cwd(), 'index.html'),
        path.join(__dirname, '../public/index.html'),
        path.join(__dirname, '../index.html'),
      ];
      let html = '';
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          html = fs.readFileSync(p, 'utf8');
          break;
        }
      }
      if (html) {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(html);
        return;
      }
    } catch {
      // fallback
    }
  }

  // Health
  if (url.pathname === '/health' || url.pathname === '/api/health') {
    json(res, { ok: true, version: '0.7.4' });
    return;
  }

  // POST /api/prompt/optimize
  if (method === 'POST' && url.pathname.endsWith('/prompt/optimize')) {
    try {
      const body = await parseBody(req);
      const prompt = String(body.prompt ?? '').trim();
      if (!prompt) { json(res, { error: 'prompt is required' }, 400); return; }
      json(res, optimizePrompt(prompt));
    } catch (err) {
      json(res, { error: String(err) }, 500);
    }
    return;
  }

  // POST /api/suggest
  if (method === 'POST' && url.pathname.endsWith('/suggest')) {
    try {
      const body = await parseBody(req);
      const intent = String(body.intent ?? '').trim();
      if (!intent) { json(res, { error: 'intent is required' }, 400); return; }
      const limit = Number(body.limit ?? 5);
      json(res, suggestCommands(intent, { limit }));
    } catch (err) {
      json(res, { error: String(err) }, 500);
    }
    return;
  }

  // GET /api/idea/verticals
  if (method === 'GET' && url.pathname.endsWith('/idea/verticals')) {
    try {
      json(res, listIdeaVerticals());
    } catch (err) {
      json(res, { error: String(err) }, 500);
    }
    return;
  }

  // GET /api/idea/:vertical
  const ideaMatch = url.pathname.match(/\/idea\/([a-zA-Z]+)$/);
  if (method === 'GET' && ideaMatch) {
    try {
      json(res, generateIdeas(ideaMatch[1]!));
    } catch (err) {
      json(res, { error: String(err) }, 500);
    }
    return;
  }

  json(res, { error: 'Not found' }, 404);
}
