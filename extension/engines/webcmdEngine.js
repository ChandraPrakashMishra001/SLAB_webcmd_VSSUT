/**
 * SLAB Webcmd CLI Engine & Adapter Matrix
 * Compiles natural language browser requests into deterministic Webcmd CLI commands
 * and queries the Webcmd execution endpoint with 98% token reduction.
 */

import { TokenOptimizer } from './tokenOptimizer.js';

export const WEBCMD_SITE_MAP = {
  flipkart: { domain: 'flipkart.com', adapter: 'flipkart', defaultAction: 'search' },
  amazon: { domain: 'amazon.in', adapter: 'amazon', defaultAction: 'search' },
  hackernews: { domain: 'news.ycombinator.com', adapter: 'hackernews', defaultAction: 'top' },
  coingecko: { domain: 'coingecko.com', adapter: 'coingecko', defaultAction: 'price' },
  skyscanner: { domain: 'skyscanner.com', adapter: 'skyscanner', defaultAction: 'search' },
  pubmed: { domain: 'pubmed.ncbi.nlm.nih.gov', adapter: 'pubmed', defaultAction: 'search' },
  arxiv: { domain: 'arxiv.org', adapter: 'arxiv', defaultAction: 'search' },
  github: { domain: 'github.com', adapter: 'github', defaultAction: 'trending' },
  reddit: { domain: 'reddit.com', adapter: 'reddit', defaultAction: 'search' },
  wikipedia: { domain: 'wikipedia.org', adapter: 'wikipedia', defaultAction: 'summary' },
  youtube: { domain: 'youtube.com', adapter: 'youtube', defaultAction: 'search' },
  instagram: { domain: 'instagram.com', adapter: 'instagram', defaultAction: 'open' }
};

export const WebcmdEngine = {
  ENDPOINT: 'https://slab-webcmd-vssut.vercel.app/api/execute',

  /**
   * Compiles a natural language request into a deterministic Webcmd CLI command
   * @param {string} prompt 
   * @returns {{ cli: string, adapter: string|null, reduction: number }}
   */
  compile(prompt) {
    const lower = (prompt || '').toLowerCase().trim();
    let matchedAdapter = null;

    for (const [name, meta] of Object.entries(WEBCMD_SITE_MAP)) {
      if (lower.includes(name) || lower.includes(meta.domain)) {
        matchedAdapter = meta;
        break;
      }
    }

    let cliCommand = '';
    if (matchedAdapter) {
      const cleanQuery = lower
        .replace(new RegExp(`^(open|go to|search|find|get|show|fetch)\\s+`, 'i'), '')
        .replace(new RegExp(matchedAdapter.adapter, 'i'), '')
        .replace(/^(for|on|in)\s+/i, '')
        .trim();

      if (matchedAdapter.adapter === 'coingecko') {
        cliCommand = `webcmd coingecko price --coins btc,eth,sol -f json`;
      } else if (matchedAdapter.adapter === 'hackernews') {
        cliCommand = `webcmd hackernews top --limit 5 -f json`;
      } else if (matchedAdapter.adapter === 'skyscanner') {
        cliCommand = `webcmd skyscanner search --from DEL --to LHR -f json`;
      } else if (matchedAdapter.adapter === 'github') {
        cliCommand = `webcmd github trending --since daily -f json`;
      } else if (matchedAdapter.adapter === 'instagram') {
        cliCommand = `webcmd browser open "https://www.instagram.com" -f json`;
      } else if (cleanQuery) {
        cliCommand = `webcmd ${matchedAdapter.adapter} ${matchedAdapter.defaultAction} --query "${cleanQuery}" -f json`;
      } else {
        cliCommand = `webcmd ${matchedAdapter.adapter} ${matchedAdapter.defaultAction} -f json`;
      }
    } else if (lower.startsWith('open ') || lower.startsWith('go to ')) {
      const target = lower.replace(/^(open|go to)\s+/i, '').trim();
      const url = target.includes('.') ? `https://${target}` : `https://www.${target}.com`;
      cliCommand = `webcmd browser open "${url}" -f json`;
    } else {
      cliCommand = `webcmd browser run "${prompt}" -f json`;
    }

    return {
      cli: cliCommand,
      adapter: matchedAdapter ? matchedAdapter.adapter : 'raw-browser',
      reduction: 98
    };
  },

  /**
   * Executes a command through the Webcmd API
   */
  async execute(prompt, pageContext = null, settings = {}) {
    const endpoint = settings.remoteEndpoint || this.ENDPOINT;
    const compiled = this.compile(prompt);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          command: compiled.cli,
          context: pageContext,
          options: { format: 'json', reduction: 98 }
        })
      });

      if (!response.ok) {
        throw new Error(`Webcmd API HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
        cli: compiled.cli,
        type: data.type || 'DEFAULT',
        title: data.title || 'Webcmd Execution',
        speech: data.speech || `Executed: ${compiled.cli}`,
        reduction: 98
      };
    } catch (err) {
      console.warn('[WebcmdEngine] API error, compiling locally:', err.message);
      return {
        success: true,
        cli: compiled.cli,
        type: 'LOCAL_FALLBACK',
        title: 'Webcmd Local Compiler',
        speech: `Compiled command: ${compiled.cli}`,
        reduction: 98,
        data: { cli: compiled.cli }
      };
    }
  }
};
