import { describe, expect, it } from 'vitest';
import { ArgumentError } from '../errors.js';
import { estimateTokens, optimizePrompt } from './prompt.js';

describe('prompt optimization engine', () => {
  it('estimates tokens reasonably based on text length', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('Hello world! How are you doing today?')).toBeGreaterThan(5);
  });

  it('throws ArgumentError on empty prompt', () => {
    expect(() => optimizePrompt('')).toThrow(ArgumentError);
    expect(() => optimizePrompt('   ')).toThrow(ArgumentError);
  });

  it('optimizes Hacker News prompts with limit', () => {
    const result = optimizePrompt('Please go to Hacker News and pull the top 10 stories for me');
    expect(result.matchedSite).toBe('hackernews');
    expect(result.matchedCommand).toBe('top');
    expect(result.extractedParameters.limit).toBe(10);
    expect(result.optimizedCommand).toContain('webcmd hackernews top');
    expect(result.optimizedCommand).toContain('--limit 10');
    expect(result.optimizedCommand).toContain('-f json');
    expect(result.percentReduction).toBeGreaterThan(0);
  });

  it('optimizes Reddit research query with quoted terms', () => {
    const result = optimizePrompt('Search reddit for "browser automation agents" limit 5');
    expect(result.matchedSite).toBe('reddit');
    expect(result.matchedCommand).toBe('popular');
    expect(result.extractedParameters.searchQuery).toBe('browser automation agents');
    expect(result.extractedParameters.limit).toBe(5);
    expect(result.optimizedCommand).toContain('webcmd reddit popular');
    expect(result.optimizedCommand).toContain('--query "browser automation agents"');
  });

  it('optimizes direct URL fetch requests', () => {
    const result = optimizePrompt('Fetch https://news.ycombinator.com/item?id=123456 and extract article content');
    expect(result.matchedSite).toBe('web');
    expect(result.matchedCommand).toBe('fetch');
    expect(result.extractedParameters.targetUrl).toBe('https://news.ycombinator.com/item?id=123456');
    expect(result.optimizedCommand).toContain('webcmd web fetch --url "https://news.ycombinator.com/item?id=123456" -f json');
  });

  it('provides safe raw browser fallback for unfamiliar tasks', () => {
    const result = optimizePrompt('Go to some random website and click the signup button');
    expect(result.matchedSite).toBeUndefined();
    expect(result.optimizedCommand).toContain('webcmd session create');
    expect(result.optimizedCommand).toContain('snapshot --snapshot-mode act');
    expect(result.strategy).toBe('UI');
  });
});
