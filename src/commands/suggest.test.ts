import { describe, expect, it } from 'vitest';
import { ArgumentError } from '../errors.js';
import { suggestCommands } from './suggest.js';

describe('auto-suggestion engine', () => {
  it('throws on empty intent', () => {
    expect(() => suggestCommands('')).toThrow(ArgumentError);
    expect(() => suggestCommands('   ')).toThrow(ArgumentError);
  });

  it('suggests relevant commands for web fetch and common catalog plugins', () => {
    const result = suggestCommands('fetch web url content');
    expect(result.intent).toBe('fetch web url content');
    expect(result.suggestions.length).toBeGreaterThan(0);
    const hasWeb = result.suggestions.some((s) => s.site === 'web');
    expect(hasWeb).toBe(true);
  });

  it('suggests skyscanner for flight search intents', () => {
    const result = suggestCommands('find cheap flights to tokyo with skyscanner');
    expect(result.suggestions.length).toBeGreaterThan(0);
    const top = result.suggestions[0];
    expect(top.site).toBe('skyscanner');
    expect(top.installSource).toContain('skyscanner');
    expect(result.recommendedAction).toContain('skyscanner');
  });

  it('handles completely unknown intent gracefully with low confidence and browser fallback', () => {
    const result = suggestCommands('xyzzy foobarbaz completelyunknownaction');
    expect(result.confidence).toBe('NONE');
    expect(result.suggestions).toHaveLength(0);
    expect(result.recommendedAction).toContain('session create');
  });
});
