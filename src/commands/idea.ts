/**
 * Browser Agent Idea Generator & SLAB Hackathon Brainstorming Engine.
 *
 * Generates high-impact, real-world browser agent concepts with complete
 * 4-layer SLAB architectural blueprints (Layer 0 Explore → Layer 1 Learn → Layer 2 Synthesize → Layer 3 Deterministic Automation).
 */

import { ArgumentError } from '../errors.js';

export interface SlabBlueprint {
  layer0Explore: string;
  layer1Sitemap: string;
  layer2Adapter: string;
  layer3Cli: string;
}

export interface AgentIdea {
  id: string;
  title: string;
  vertical: 'research' | 'ecommerce' | 'travel' | 'career' | 'social' | 'devtools' | 'finance';
  summary: string;
  targetSites: string[];
  strategy: 'PUBLIC' | 'COOKIE' | 'INTERCEPT' | 'UI';
  blueprint: SlabBlueprint;
  samplePrompt: string;
  sampleCommand: string;
}

export const IDEA_VERTICALS = [
  'research',
  'ecommerce',
  'travel',
  'career',
  'social',
  'devtools',
  'finance',
  'all',
] as const;

export type IdeaVertical = (typeof IDEA_VERTICALS)[number];

const AGENT_IDEAS: AgentIdea[] = [
  {
    id: 'research-cross-synthesis',
    title: 'Cross-Disciplinary Academic Paper Synthesizer',
    vertical: 'research',
    summary: 'Aggregates research papers across PubMed, arXiv, and Google Scholar, clusters findings by methodology, and extracts key claims with citations.',
    targetSites: ['pubmed.ncbi.nlm.nih.gov', 'arxiv.org', 'scholar.google.com'],
    strategy: 'PUBLIC',
    blueprint: {
      layer0Explore: 'Use `webcmd session create` to inspect search results and pagination selectors on PubMed and arXiv.',
      layer1Sitemap: 'Record `endpoints.json` for arXiv export API and PubMed e-utilities, plus fallback DOM selectors for abstracts.',
      layer2Adapter: 'Create `webcmd pubmed search` and `webcmd arxiv search` with columns `[title, authors, year, abstract, url, pdfUrl]`.',
      layer3Cli: 'Deterministic CLI command: `webcmd pubmed search --query "crispr gene drive" --limit 10 -f json`.',
    },
    samplePrompt: 'Research recent publications on CRISPR gene editing mechanisms on PubMed and arXiv, comparing clinical trial outcomes.',
    sampleCommand: 'webcmd pubmed search --query "crispr" --limit 10 -f json',
  },
  {
    id: 'ecommerce-price-arbitrage',
    title: 'Multi-Store Quick-Commerce Price & Stock Arbitrage Monitor',
    vertical: 'ecommerce',
    summary: 'Monitors real-time inventory, discounts, and delivery time across Blinkit, Zepto, and Amazon Fresh for instant grocery arbitrage.',
    targetSites: ['blinkit.com', 'zeptonow.com', 'amazon.in'],
    strategy: 'PUBLIC',
    blueprint: {
      layer0Explore: 'Explore local storefronts via `webcmd browser snapshot` to isolate location pin codes and store inventory grids.',
      layer1Sitemap: 'Record location header signatures and product card partial schemas in `sitemap/pages/_product-card.md`.',
      layer2Adapter: 'Author `webcmd blinkit search` and `webcmd zepto search` returning `[item, brand, price, unit, discount, inStock, url]`.',
      layer3Cli: 'Run `webcmd blinkit search --query "milk" -f json` in a recurring agent heartbeat for price-drop alerts.',
    },
    samplePrompt: 'Compare current prices and stock for organic oats across Blinkit, Zepto, and BigBasket in Bhubaneswar.',
    sampleCommand: 'webcmd blinkit search --query "organic oats" -f json',
  },
  {
    id: 'travel-multi-city-radar',
    title: 'Autonomous Flight & Hotel Multi-City Fare Radar',
    vertical: 'travel',
    summary: 'Aggregates non-stop flight routes and hotel stays via Skyscanner and Booking.com, discovering price anomalies and optimal departure windows.',
    targetSites: ['skyscanner.com', 'booking.com'],
    strategy: 'PUBLIC',
    blueprint: {
      layer0Explore: 'Observe route selection datepickers and fare grid responses using Playwright session.',
      layer1Sitemap: 'Capture request signatures for Skyscanner flight search endpoints and currency exchange filters.',
      layer2Adapter: 'Author `webcmd skyscanner flights` with arguments `--from`, `--to`, `--date`, `--cabin` and output `[airline, price, duration, stops, departure]`.',
      layer3Cli: 'Execute `webcmd skyscanner flights --from DEL --to LHR --date 2026-09-15 -f json` for zero-latency itinerary tables.',
    },
    samplePrompt: 'Track the cheapest flights from New Delhi to London for mid-September and notify when prices drop below 40,000 INR.',
    sampleCommand: 'webcmd skyscanner flights --from DEL --to LHR --date 2026-09-15 -f json',
  },
  {
    id: 'career-lead-monitor',
    title: 'AI Engineering Job Lead & Recruiter Outreach Radar',
    vertical: 'career',
    summary: 'Scans LinkedIn Jobs, Y Combinator Work at a Startup, and Indeed for freshly posted remote roles, filtering out ghost listings.',
    targetSites: ['linkedin.com', 'ycombinator.com', 'indeed.com'],
    strategy: 'COOKIE',
    blueprint: {
      layer0Explore: 'Use authenticated Chrome profile (`--profile work`) to access LinkedIn Job search feeds without auth walls.',
      layer1Sitemap: 'Document job card container selectors and company profile links in `sitemap/workflows/job-discovery.md`.',
      layer2Adapter: 'Create `webcmd linkedin jobs` and `webcmd ycombinator jobs` with columns `[title, company, location, salary, postedDate, url]`.',
      layer3Cli: 'Run `webcmd --profile work linkedin jobs --query "AI Engineer" --remote -f json`.',
    },
    samplePrompt: 'Collect all newly posted remote AI Engineer roles from Y Combinator companies and format into a priority outreach table.',
    sampleCommand: 'webcmd ycombinator jobs --query "AI Engineer" -f json',
  },
  {
    id: 'social-sentiment-tracker',
    title: 'Real-Time Developer Sentiment & Topic Tracker',
    vertical: 'social',
    summary: 'Monitors community feedback and developer sentiment regarding new AI models across X/Twitter, Reddit, and Hacker News.',
    targetSites: ['x.com', 'reddit.com', 'news.ycombinator.com'],
    strategy: 'PUBLIC',
    blueprint: {
      layer0Explore: 'Capture discussions using `webcmd reddit popular` and `webcmd hackernews top`.',
      layer1Sitemap: 'Map discussion threads and comment depth schemas for community nodes.',
      layer2Adapter: 'Leverage built-in `webcmd hackernews` and `webcmd reddit` plugins for unified multi-source streaming.',
      layer3Cli: 'Execute `webcmd omnisearch search --query "Antigravity Agent" -f json` to aggregate posts in one shot.',
    },
    samplePrompt: 'Analyze community sentiment regarding local browser agents across Hacker News and Reddit.',
    sampleCommand: 'webcmd hackernews top --limit 10 -f json',
  },
  {
    id: 'devtools-cve-radar',
    title: 'Open Source Security Vulnerability & Dependency Radar',
    vertical: 'devtools',
    summary: 'Scans NVD, OSV, and GitHub Security Advisories for emerging zero-day vulnerabilities in ecosystem dependencies (npm, PyPI, Crates.io).',
    targetSites: ['nvd.nist.gov', 'osv.dev', 'github.com'],
    strategy: 'PUBLIC',
    blueprint: {
      layer0Explore: 'Explore CVE lookup and ecosystem query endpoints on OSV and NVD.',
      layer1Sitemap: 'Record OSV package vulnerability schema in `sitemap/apis.md`.',
      layer2Adapter: 'Author `webcmd osv query` and `webcmd nvd search` returning `[cveId, package, severity, fixedVersion, summary, url]`.',
      layer3Cli: 'Run `webcmd osv query --package express --ecosystem npm -f json` in CI/CD pipeline.',
    },
    samplePrompt: 'Check if any dependencies in our project have newly disclosed high or critical CVEs on OSV and NVD.',
    sampleCommand: 'webcmd osv query --package express --ecosystem npm -f json',
  },
  {
    id: 'finance-crypto-yield-radar',
    title: 'DeFi Yield & Liquidity Pool Arbitrage Radar',
    vertical: 'finance',
    summary: 'Scans DeFiLlama, CoinGecko, and Binance to track high-yield liquidity pools, protocol TVL changes, and stablecoin peg health.',
    targetSites: ['defillama.com', 'coingecko.com', 'binance.com'],
    strategy: 'PUBLIC',
    blueprint: {
      layer0Explore: 'Inspect protocol yield tables and historical TVL charts.',
      layer1Sitemap: 'Record DeFiLlama public yield endpoints and TVL metric schema.',
      layer2Adapter: 'Use `webcmd defillama pools` and `webcmd coingecko price` with `[chain, project, symbol, tvlUsd, apy, url]`.',
      layer3Cli: 'Run `webcmd defillama pools --chain Ethereum --limit 10 -f json`.',
    },
    samplePrompt: 'Find top Ethereum and Solana liquidity pools with TVL over $10M and sustainable yield over 8%.',
    sampleCommand: 'webcmd defillama pools --chain Ethereum --limit 10 -f json',
  },
];

/**
 * Generate agent ideas by vertical.
 */
export function generateIdeas(vertical: string = 'all', count?: number): AgentIdea[] {
  const normVertical = vertical.toLowerCase().trim();
  let matches: AgentIdea[];

  if (normVertical === 'all' || !normVertical) {
    matches = [...AGENT_IDEAS];
  } else {
    matches = AGENT_IDEAS.filter((idea) => idea.vertical === normVertical);
    if (matches.length === 0) {
      const validList = IDEA_VERTICALS.join(', ');
      throw new ArgumentError(
        `Unknown vertical '${vertical}'.`,
        `Available verticals: ${validList}`,
      );
    }
  }

  return count ? matches.slice(0, count) : matches;
}

/**
 * List all available verticals.
 */
export function listIdeaVerticals(): readonly string[] {
  return IDEA_VERTICALS;
}

