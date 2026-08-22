/**
 * Auto-suggestion and intent matching engine.
 *
 * Automatically routes natural language goals to the most relevant installed
 * or catalog Webcmd command surfaces before agents spend tokens on exploratory browsing.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRegistry, type CliCommand } from '../registry.js';
import '../fetch/command.js';
import { ArgumentError } from '../errors.js';
import { findPackageRoot } from '../package-paths.js';

const MODULE_FILE = fileURLToPath(import.meta.url);

export interface SuggestionCandidate {
  site: string;
  command: string;
  description: string;
  strategy: string;
  score: number;
  isInstalled: boolean;
  installSource?: string;
  exampleInvocation: string;
  columns?: string[];
  args?: Array<{ name: string; required?: boolean; description?: string }>;
}

export interface SuggestResult {
  intent: string;
  suggestions: SuggestionCandidate[];
  recommendedAction: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
}

interface PluginCommandManifestEntry {
  site: string;
  name: string;
  description?: string;
  strategy?: string;
  args?: Array<{ name: string; required?: boolean; description?: string }>;
  columns?: string[];
  tags?: string[];
  keywords?: string[];
}

function loadCatalogCommands(packageRoot: string = findPackageRoot(MODULE_FILE)): PluginCommandManifestEntry[] {
  const manifestPath = path.join(packageRoot, 'plugin-command-manifest.json');
  if (!fs.existsSync(manifestPath)) return [];
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const STOP_WORDS = new Set(['to', 'in', 'on', 'at', 'for', 'by', 'of', 'and', 'or', 'the', 'a', 'an', 'is', 'it', 'with', 'from', 'as', 'into', 'find', 'get', 'pull']);

/**
 * Score relevance between an intent and a command metadata record.
 */
function scoreMatch(tokens: string[], site?: string, name?: string, description?: string, tags: (string | undefined)[] = []): number {
  let score = 0;
  const siteLower = (site || '').toLowerCase();
  const nameLower = (name || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const tagsLower = tags.filter((t): t is string => typeof t === 'string').map((t) => t.toLowerCase());

  let siteMatched = false;
  let nameMatched = false;

  for (const token of tokens) {
    if (token.length < 2 || STOP_WORDS.has(token)) continue;

    if (siteLower === token) {
      score += 70;
      siteMatched = true;
    } else if (token.length >= 4 && siteLower.includes(token)) {
      score += 25;
    }

    if (nameLower === token) {
      score += 50;
      nameMatched = true;
    } else if (token.length >= 4 && nameLower.includes(token)) {
      score += 20;
    }

    if (descLower.includes(token)) {
      score += token.length >= 5 ? 15 : 8;
    }

    if (tagsLower.includes(token)) {
      score += 20;
    }
  }

  if (siteMatched && nameMatched) {
    score += 100;
  }

  return score;
}

/**
 * Generate suggestions for a user intent.
 */
export function suggestCommands(intent: string, options: { limit?: number; packageRoot?: string } = {}): SuggestResult {
  if (!intent || !intent.trim()) {
    throw new ArgumentError('Intent cannot be empty.', 'Provide a natural language description of what you want to do.');
  }

  const cleanIntent = intent.trim().toLowerCase();
  const tokens = cleanIntent.replace(/[^\w\s-]/g, '').split(/\s+/).filter(Boolean);
  const maxLimit = options.limit ?? 5;

  const registry = getRegistry();
  const installedMap = new Map<string, CliCommand>();
  for (const cmd of registry.values()) {
    if (cmd.site && cmd.name) {
      installedMap.set(`${cmd.site}/${cmd.name}`, cmd);
    }
  }

  const catalogEntries = loadCatalogCommands(options.packageRoot);
  const candidateScores: SuggestionCandidate[] = [];

  // 1. Check installed registry commands
  for (const cmd of registry.values()) {
    if (!cmd.site || !cmd.name) continue;
    const score = scoreMatch(tokens, cmd.site, cmd.name, cmd.description || '', cmd.tags || []);
    if (score > 0) {
      candidateScores.push({
        site: cmd.site,
        command: cmd.name,
        description: cmd.description || '',
        strategy: cmd.strategy || 'PUBLIC',
        score: score + 50, // Major boost for already installed commands
        isInstalled: true,
        exampleInvocation: `webcmd ${cmd.site} ${cmd.name} -f json`,
        columns: cmd.columns,
        args: cmd.args,
      });
    }
  }

  // 2. Check catalog entries
  for (const entry of catalogEntries) {
    const key = `${entry.site}/${entry.name}`;
    if (installedMap.has(key)) continue; // Already counted

    const score = scoreMatch(tokens, entry.site, entry.name, entry.description || '', (entry.tags || []).concat(entry.keywords || []));
    if (score > 0) {
      candidateScores.push({
        site: entry.site,
        command: entry.name,
        description: entry.description || '',
        strategy: entry.strategy || 'PUBLIC',
        score,
        isInstalled: false,
        installSource: `github:agentrhq/webcmd/plugins/${entry.site}`,
        exampleInvocation: `webcmd plugin install github:agentrhq/webcmd/plugins/${entry.site} && webcmd ${entry.site} ${entry.name} -f json`,
        columns: entry.columns,
        args: entry.args,
      });
    }
  }

  // Sort descending by score
  candidateScores.sort((a, b) => b.score - a.score);

  const topSuggestions = candidateScores.slice(0, maxLimit);
  let confidence: SuggestResult['confidence'] = 'NONE';
  let recommendedAction = 'No matching CLI adapter found. Explore using `webcmd session create` and `webcmd browser snapshot`.';

  if (topSuggestions.length > 0) {
    const top = topSuggestions[0];
    if (top.score >= 50) confidence = 'HIGH';
    else if (top.score >= 25) confidence = 'MEDIUM';
    else confidence = 'LOW';

    if (top.isInstalled) {
      recommendedAction = `Run \`${top.exampleInvocation}\``;
    } else {
      recommendedAction = `Install plugin: \`webcmd plugin install ${top.installSource}\` then run \`webcmd ${top.site} ${top.command} -f json\``;
    }
  }

  return {
    intent,
    suggestions: topSuggestions,
    recommendedAction,
    confidence,
  };
}

