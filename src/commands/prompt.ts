/**
 * Prompt optimization and token minimization engine.
 *
 * Compresses verbose natural language browser instructions into dense,
 * deterministic Webcmd CLI invocations, cutting token consumption by up to 90%.
 */

import { getRegistry } from '../registry.js';
import { ArgumentError } from '../errors.js';

export interface PromptOptimizationResult {
  originalPrompt: string;
  originalEstimatedTokens: number;
  optimizedCommand: string;
  optimizedPrompt: string;
  optimizedEstimatedTokens: number;
  tokensSaved: number;
  percentReduction: number;
  matchedSite?: string;
  matchedCommand?: string;
  strategy?: string;
  extractedParameters: Record<string, unknown>;
  tips: string[];
}

export interface PromptSchemaResult {
  site: string;
  command: string;
  compactSchema: string;
  estimatedTokens: number;
}

/**
 * Rough token estimation (~4 characters per token for English text).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.trim().length / 4);
}

/**
 * Optimize a natural language prompt into a deterministic, token-minimized Webcmd command.
 */
export function optimizePrompt(rawPrompt: string): PromptOptimizationResult {
  if (!rawPrompt || !rawPrompt.trim()) {
    throw new ArgumentError('Prompt cannot be empty.', 'Provide a descriptive browser task or query.');
  }

  const prompt = rawPrompt.trim();
  const originalTokens = estimateTokens(prompt);

  const extractedParams: Record<string, unknown> = {};
  const tips: string[] = [];

  // Extract common numbers like limit
  const limitMatch = prompt.match(/\b(?:top|first|limit(?:\s+to)?|latest)\s+(\d+)\b/i);
  if (limitMatch) {
    extractedParams.limit = Number.parseInt(limitMatch[1], 10);
  }

  // Extract quoted terms
  const quotedMatches = [...prompt.matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
  if (quotedMatches.length > 0) {
    extractedParams.searchQuery = quotedMatches[0];
  }

  // Site matching patterns
  const knownSites: Record<string, { plugin: string; defaultCmd: string; strategy: string; pattern: RegExp }> = {
    hackernews: {
      plugin: 'hackernews',
      defaultCmd: 'top',
      strategy: 'PUBLIC',
      pattern: /\b(?:hacker\s*news|hn|ycombinator\s*news)\b/i,
    },
    reddit: {
      plugin: 'reddit',
      defaultCmd: 'popular',
      strategy: 'PUBLIC',
      pattern: /\b(?:reddit|subreddit|r\/)\b/i,
    },
    pubmed: {
      plugin: 'pubmed',
      defaultCmd: 'search',
      strategy: 'PUBLIC',
      pattern: /\b(?:pubmed|medical\s*paper|nih|ncbi)\b/i,
    },
    arxiv: {
      plugin: 'arxiv',
      defaultCmd: 'search',
      strategy: 'PUBLIC',
      pattern: /\b(?:arxiv|research\s*paper|preprint)\b/i,
    },
    github: {
      plugin: 'github',
      defaultCmd: 'search',
      strategy: 'PUBLIC',
      pattern: /\b(?:github|git\s*repo|repository)\b/i,
    },
    amazon: {
      plugin: 'amazon',
      defaultCmd: 'search',
      strategy: 'PUBLIC',
      pattern: /\b(?:amazon|product\s*price|buy\s*on\s*amazon)\b/i,
    },
    skyscanner: {
      plugin: 'skyscanner',
      defaultCmd: 'flights',
      strategy: 'PUBLIC',
      pattern: /\b(?:flight|fly|airline|skyscanner|ticket\s*price)\b/i,
    },
    twitter: {
      plugin: 'twitter',
      defaultCmd: 'search',
      strategy: 'COOKIE',
      pattern: /\b(?:twitter|tweet|x\.com)\b/i,
    },
    linkedin: {
      plugin: 'linkedin',
      defaultCmd: 'messages',
      strategy: 'COOKIE',
      pattern: /\b(?:linkedin|connections|job\s*posting)\b/i,
    },
  };

  let matchedSite: string | undefined;
  let matchedCommand: string | undefined;
  let strategy = 'PUBLIC';
  let optimizedCommand = '';

  for (const [, config] of Object.entries(knownSites)) {
    if (config.pattern.test(prompt)) {
      matchedSite = config.plugin;
      matchedCommand = config.defaultCmd;
      strategy = config.strategy;
      break;
    }
  }

  if (matchedSite) {
    const argsParts: string[] = [`webcmd ${matchedSite} ${matchedCommand}`];
    if (extractedParams.searchQuery) {
      argsParts.push(`--query "${extractedParams.searchQuery}"`);
    } else if (quotedMatches.length === 0) {
      // Find query keywords by stripping noise words
      const cleaned = prompt
        .replace(new RegExp(`\\b(?:use\\s+webcmd|please|search|find|for|on|in|get|pull|fetch|top|latest|stories|articles|papers|items|products|results|from|${matchedSite})\\b`, 'gi'), '')
        .replace(/[^\w\s-]/g, '')
        .trim();
      if (cleaned.length > 2) {
        argsParts.push(`--query "${cleaned}"`);
        extractedParams.inferredQuery = cleaned;
      }
    }

    if (extractedParams.limit) {
      argsParts.push(`--limit ${extractedParams.limit}`);
    }

    argsParts.push('-f json');
    optimizedCommand = argsParts.join(' ');
  } else if (prompt.includes('http://') || prompt.includes('https://')) {
    // Direct URL fetch pattern
    const urlMatch = prompt.match(/https?:\/\/[^\s"'<>]+/);
    const targetUrl = urlMatch ? urlMatch[0] : '';
    optimizedCommand = `webcmd web fetch --url "${targetUrl}" -f json`;
    strategy = 'PUBLIC';
    matchedSite = 'web';
    matchedCommand = 'fetch';
    extractedParams.targetUrl = targetUrl;
    tips.push('Using local stealth web fetch; avoids full browser startup overhead.');
  } else {
    // Raw browser exploration pattern
    optimizedCommand = 'webcmd session create -f json && webcmd --session <session-id> browser snapshot --snapshot-mode act';
    strategy = 'UI';
    tips.push('No pre-built adapter found. Start with a sandboxed session and accessibility snapshot.');
  }

  const optimizedPrompt = `Run \`${optimizedCommand}\``;
  const optimizedTokens = estimateTokens(optimizedPrompt);
  // Compare against standard raw browser exploration baseline (~1500 tokens of DOM / screenshot per turn)
  const baselineBrowserTokens = Math.max(originalTokens, 1200);
  const tokensSaved = Math.max(0, baselineBrowserTokens - optimizedTokens);
  const percentReduction = baselineBrowserTokens > 0
    ? Math.round((tokensSaved / baselineBrowserTokens) * 100)
    : 0;

  if (strategy === 'COOKIE') {
    tips.push('Requires logged-in profile: use `webcmd --profile <name> ...`');
  }

  tips.push('Use `-f json` for structured, non-hallucinatory output.');

  return {
    originalPrompt: prompt,
    originalEstimatedTokens: originalTokens,
    optimizedCommand,
    optimizedPrompt,
    optimizedEstimatedTokens: optimizedTokens,
    tokensSaved,
    percentReduction: Math.max(0, percentReduction),
    matchedSite,
    matchedCommand,
    strategy,
    extractedParameters: extractedParams,
    tips,
  };
}

/**
 * Generate a compact schema representation of an adapter command.
 */
export function generateCompactSchema(site: string, commandName: string): PromptSchemaResult {
  const registry = getRegistry();
  const cmd = Array.from(registry.values()).find(
    (c) => c.site === site && (c.name === commandName || c.aliases?.includes(commandName)),
  );

  if (!cmd) {
    throw new ArgumentError(
      `Command '${site} ${commandName}' not found in registry.`,
      `Run 'webcmd ${site} --help' or 'webcmd list -f json' to see available commands.`,
    );
  }

  const argsSummary = (cmd.args || [])
    .map((a: { name: string; required?: boolean; type?: string }) => `${a.name}${a.required ? '!' : '?'}:${a.type || 'string'}`)
    .join(' ');
  const colsSummary = (cmd.columns || []).join(',');
  const compactSchema = `${cmd.site}.${cmd.name}(${argsSummary})->[${colsSummary}]`;

  return {
    site,
    command: cmd.name,
    compactSchema,
    estimatedTokens: estimateTokens(compactSchema),
  };
}
