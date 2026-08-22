import { describe, expect, it } from 'vitest';
import { ArgumentError } from '../errors.js';
import { generateIdeas, listIdeaVerticals } from './idea.js';

describe('idea generator engine', () => {
  it('lists available idea verticals', () => {
    const verticals = listIdeaVerticals();
    expect(verticals).toContain('research');
    expect(verticals).toContain('ecommerce');
    expect(verticals).toContain('travel');
    expect(verticals).toContain('career');
    expect(verticals).toContain('social');
    expect(verticals).toContain('devtools');
    expect(verticals).toContain('finance');
  });

  it('generates all ideas when vertical is all or omitted', () => {
    const ideas = generateIdeas();
    expect(ideas.length).toBeGreaterThanOrEqual(6);
    expect(ideas.every((i) => i.blueprint.layer0Explore && i.blueprint.layer1Sitemap && i.blueprint.layer2Adapter && i.blueprint.layer3Cli)).toBe(true);
  });

  it('filters ideas by vertical correctly', () => {
    const ecommerceIdeas = generateIdeas('ecommerce');
    expect(ecommerceIdeas.length).toBeGreaterThan(0);
    expect(ecommerceIdeas.every((i) => i.vertical === 'ecommerce')).toBe(true);

    const researchIdeas = generateIdeas('research');
    expect(researchIdeas.length).toBeGreaterThan(0);
    expect(researchIdeas.every((i) => i.vertical === 'research')).toBe(true);
  });

  it('throws ArgumentError on unknown vertical', () => {
    expect(() => generateIdeas('nonexistent_vertical')).toThrow(ArgumentError);
  });

  it('limits result count when specified', () => {
    const ideas = generateIdeas('all', 2);
    expect(ideas).toHaveLength(2);
  });
});
