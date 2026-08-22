import type { IncomingMessage, ServerResponse } from 'http';

// ── Inline prompt optimizer ──────────────────────────────────────────────────

const SITE_KEYWORDS: Record<string, string[]> = {
  hackernews: ['hacker news', 'hn', 'hackernews', 'ycombinator'],
  pubmed: ['pubmed', 'ncbi', 'medical', 'biomedical', 'clinical'],
  arxiv: ['arxiv', 'preprint', 'paper', 'research'],
  coingecko: ['coingecko', 'crypto', 'bitcoin', 'ethereum', 'coin'],
  skyscanner: ['skyscanner', 'flight', 'flights', 'airline'],
  amazon: ['amazon', 'amzn', 'product', 'shopping'],
  github: ['github', 'repo', 'repository', 'trending'],
  reddit: ['reddit', 'subreddit'],
  imdb: ['imdb', 'movie', 'movies', 'film'],
  wikipedia: ['wikipedia', 'wiki'],
};

function optimizePrompt(prompt: string) {
  const lower = prompt.toLowerCase();
  const tokens = lower.split(/\s+/).filter(Boolean);
  let matchedSite: string | null = null;
  for (const [site, keywords] of Object.entries(SITE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) { matchedSite = site; break; }
  }
  const limitMatch = lower.match(/(?:top|first|limit|max)\s+(\d+)/);
  const limit = limitMatch ? parseInt(limitMatch[1], 10) : undefined;
  const action = tokens.find(t => ['search', 'find', 'get', 'list', 'track', 'show', 'pull', 'fetch'].includes(t)) ?? 'search';
  const stopwords = ['please', 'go', 'to', 'and', 'the', 'a', 'an', 'for', 'on', 'in', 'from', 'with', 'of',
    'find', 'get', 'search', 'show', 'pull', 'fetch', 'list', 'track',
    'top', 'first', 'limit', 'max', String(limit),
    ...(matchedSite ? (SITE_KEYWORDS[matchedSite] ?? []) : [])];
  const queryWords = tokens.filter(t => !stopwords.includes(t));
  const optimized = matchedSite
    ? `webcmd ${matchedSite} ${action}${queryWords.length ? ' --query "' + queryWords.join(' ') + '"' : ''}${limit ? ' --limit ' + limit : ''} -f json`
    : `webcmd browser run "${prompt}"`;
  const originalTokens = Math.ceil(prompt.length / 4);
  const optimizedTokens = Math.ceil(optimized.length / 4);
  const saved = originalTokens - optimizedTokens;
  return {
    originalPrompt: prompt, optimizedCommand: optimized, matchedSite,
    strategy: matchedSite ? 'ADAPTER_MATCH' : 'RAW_BROWSER',
    originalEstimatedTokens: originalTokens, optimizedEstimatedTokens: optimizedTokens,
    tokensSaved: saved, percentReduction: originalTokens > 0 ? Math.round((saved / originalTokens) * 100) : 0,
  };
}

// ── Inline suggest ───────────────────────────────────────────────────────────

const CATALOG = [
  { site: 'coingecko', command: 'coin', description: 'Get cryptocurrency price and market data', keywords: ['crypto', 'bitcoin', 'ethereum', 'price', 'coin', 'coingecko', 'market'], example: 'webcmd coingecko coin bitcoin -f json' },
  { site: 'hackernews', command: 'top', description: 'Get top stories from Hacker News', keywords: ['hacker news', 'hn', 'stories', 'tech', 'startup', 'hackernews'], example: 'webcmd hackernews top --limit 10 -f json' },
  { site: 'pubmed', command: 'search', description: 'Search PubMed biomedical literature', keywords: ['pubmed', 'medical', 'research', 'paper', 'clinical', 'biology'], example: 'webcmd pubmed search --query "crispr" -f json' },
  { site: 'arxiv', command: 'search', description: 'Search arXiv preprint papers', keywords: ['arxiv', 'paper', 'preprint', 'ai', 'machine learning'], example: 'webcmd arxiv search --query "transformers" -f json' },
  { site: 'skyscanner', command: 'search', description: 'Search flights on Skyscanner', keywords: ['flight', 'flights', 'airline', 'travel', 'skyscanner'], example: 'webcmd skyscanner search --from DEL --to LHR -f json' },
  { site: 'amazon', command: 'search', description: 'Search products on Amazon', keywords: ['amazon', 'product', 'shopping', 'buy', 'price'], example: 'webcmd amazon search --query "laptop" -f json' },
  { site: 'github', command: 'trending', description: 'Get trending GitHub repositories', keywords: ['github', 'repo', 'repository', 'trending', 'open source'], example: 'webcmd github trending --language typescript -f json' },
  { site: 'reddit', command: 'hot', description: 'Get hot posts from a subreddit', keywords: ['reddit', 'subreddit', 'post', 'community'], example: 'webcmd reddit hot --subreddit technology -f json' },
  { site: 'imdb', command: 'search', description: 'Search movies on IMDb', keywords: ['imdb', 'movie', 'film', 'show', 'tv', 'rating'], example: 'webcmd imdb search --query "inception" -f json' },
  { site: 'wikipedia', command: 'summary', description: 'Get Wikipedia article summaries', keywords: ['wikipedia', 'wiki', 'article', 'encyclopedia'], example: 'webcmd wikipedia summary "AI" -f json' },
];

function suggestCommands(intent: string, limit = 5) {
  const lower = intent.toLowerCase();
  const suggestions: { command: string; site: string; description: string; score: number; strategy: string; exampleInvocation: string }[] = [];
  for (const e of CATALOG) {
    let score = 0;
    for (const kw of e.keywords) { if (lower.includes(kw)) score += kw.includes(' ') ? 70 : 50; }
    if (lower.includes(e.site)) score += 70;
    if (score > 0) suggestions.push({ command: e.command, site: e.site, description: e.description, score, strategy: 'public', exampleInvocation: e.example });
  }
  suggestions.sort((a, b) => b.score - a.score);
  const top = suggestions.slice(0, limit);
  return { suggestions: top, recommendedAction: top.length > 0 ? `Run: \`${top[0].exampleInvocation}\`` : 'No matching adapters found.', confidence: top.length > 0 && top[0].score >= 70 ? 'HIGH' : top.length > 0 ? 'MEDIUM' : 'LOW' };
}

// ── Inline idea generator ────────────────────────────────────────────────────

const IDEAS: Record<string, object[]> = {
  ecommerce: [{ id: 'ecom-price-tracker', title: 'Cross-Platform Price Tracker', summary: 'Monitor product prices across Amazon, eBay, and Walmart.', targetSites: ['amazon.com', 'ebay.com'], strategy: 'PUBLIC', blueprint: { layer0Explore: 'Use webcmd session to inspect product pages.', layer1Sitemap: 'Record price selectors and search endpoints.', layer2Adapter: 'Create webcmd amazon price adapter.', layer3Cli: 'webcmd amazon price --query "keyboard" -f json' }, sampleCommand: 'webcmd amazon search --query "laptop" -f json' }],
  research: [{ id: 'research-synthesizer', title: 'Academic Paper Synthesizer', summary: 'Aggregate papers across PubMed, arXiv, and Scholar.', targetSites: ['pubmed.ncbi.nlm.nih.gov', 'arxiv.org'], strategy: 'PUBLIC', blueprint: { layer0Explore: 'Inspect search results on PubMed and arXiv.', layer1Sitemap: 'Record API endpoints for search.', layer2Adapter: 'Create webcmd pubmed/arxiv search adapters.', layer3Cli: 'webcmd pubmed search --query "crispr" -f json' }, sampleCommand: 'webcmd pubmed search --query "crispr" -f json' }],
  travel: [{ id: 'travel-flights', title: 'Multi-Airline Flight Comparator', summary: 'Compare flights across Skyscanner, Google Flights, and Kayak.', targetSites: ['skyscanner.com'], strategy: 'PUBLIC', blueprint: { layer0Explore: 'Inspect flight search forms.', layer1Sitemap: 'Map search parameters to API endpoints.', layer2Adapter: 'Create webcmd skyscanner search adapter.', layer3Cli: 'webcmd skyscanner search --from DEL --to LHR -f json' }, sampleCommand: 'webcmd skyscanner search --from DEL --to LHR -f json' }],
  career: [{ id: 'career-jobs', title: 'Job Listing Aggregator', summary: 'Aggregate jobs from LinkedIn, Indeed, and Glassdoor.', targetSites: ['linkedin.com', 'indeed.com'], strategy: 'PUBLIC', blueprint: { layer0Explore: 'Inspect job listing pages.', layer1Sitemap: 'Map search/filter parameters.', layer2Adapter: 'Create webcmd linkedin jobs adapter.', layer3Cli: 'webcmd linkedin jobs --query "engineer" -f json' }, sampleCommand: 'webcmd linkedin jobs --query "developer" -f json' }],
  social: [{ id: 'social-trends', title: 'Social Media Trend Monitor', summary: 'Track trending topics across Twitter/X, Reddit, and HN.', targetSites: ['x.com', 'reddit.com', 'news.ycombinator.com'], strategy: 'PUBLIC', blueprint: { layer0Explore: 'Browse trending pages.', layer1Sitemap: 'Record trending/hot feed endpoints.', layer2Adapter: 'Create webcmd reddit hot adapter.', layer3Cli: 'webcmd reddit hot --subreddit technology -f json' }, sampleCommand: 'webcmd hackernews top --limit 10 -f json' }],
  devtools: [{ id: 'devtools-repos', title: 'GitHub Repo Scout', summary: 'Discover trending repos, compare stars/forks, track releases.', targetSites: ['github.com'], strategy: 'PUBLIC', blueprint: { layer0Explore: 'Inspect GitHub trending page.', layer1Sitemap: 'Map GitHub API endpoints.', layer2Adapter: 'Create webcmd github trending adapter.', layer3Cli: 'webcmd github trending --language typescript -f json' }, sampleCommand: 'webcmd github trending --language python -f json' }],
  finance: [{ id: 'finance-crypto', title: 'Real-Time Crypto Dashboard', summary: 'Track crypto prices and market caps on CoinGecko.', targetSites: ['coingecko.com'], strategy: 'PUBLIC', blueprint: { layer0Explore: 'Inspect CoinGecko price pages.', layer1Sitemap: 'Map CoinGecko API endpoints.', layer2Adapter: 'Create webcmd coingecko coin adapter.', layer3Cli: 'webcmd coingecko coin bitcoin -f json' }, sampleCommand: 'webcmd coingecko coin bitcoin -f json' }],
};

function generateIdeas(vertical: string) {
  if (vertical === 'all') return Object.values(IDEAS).flat();
  return IDEAS[vertical] ?? [];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sendJson(res: ServerResponse, data: unknown, status = 200) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
  res.end(body);
}

function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c: Buffer) => { raw += c; });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Bad JSON')); } });
    req.on('error', reject);
  });
}

// ── Vercel handler (works with raw Node.js http types) ───────────────────────

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const pathname = (req.url ?? '/').split('?')[0];
  const method = req.method ?? 'GET';

  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
    return res.end();
  }

  if (pathname === '/health' || pathname === '/api/health') return sendJson(res, { ok: true, version: '0.7.4' });

  if (method === 'POST' && pathname.includes('/prompt/optimize')) {
    const body = await parseBody(req);
    const prompt = String(body.prompt ?? '').trim();
    if (!prompt) return sendJson(res, { error: 'prompt is required' }, 400);
    return sendJson(res, optimizePrompt(prompt));
  }

  if (method === 'POST' && pathname.includes('/suggest')) {
    const body = await parseBody(req);
    const intent = String(body.intent ?? '').trim();
    if (!intent) return sendJson(res, { error: 'intent is required' }, 400);
    return sendJson(res, suggestCommands(intent, Number(body.limit ?? 5)));
  }

  if (method === 'GET' && pathname.includes('/idea/verticals')) return sendJson(res, Object.keys(IDEAS));

  const ideaMatch = pathname.match(/\/idea\/([a-zA-Z]+)$/);
  if (method === 'GET' && ideaMatch) return sendJson(res, generateIdeas(ideaMatch[1]));

  return sendJson(res, { error: 'Not found' }, 404);
}
