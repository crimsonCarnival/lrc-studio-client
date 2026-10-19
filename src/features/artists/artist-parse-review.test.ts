import { describe, expect, it } from 'vitest';
import { applyPlan, buildPlan, defaultDecisions, needsReview, splitWithSeparators } from './artist-parse-review';

const names = (r: ReturnType<typeof applyPlan>, role: 'primary' | 'featured') => r.credits.filter((c) => c.role === role).map((c) => c.name);

describe('buildPlan', () => {
  it('needs no review when nothing is doubtful', () => {
    const plan = buildPlan({ artist: 'Drake feat. Rihanna' });
    expect(needsReview(plan)).toBe(false);
    expect(names(applyPlan(plan, defaultDecisions(plan)), 'featured')).toEqual(['Rihanna']);
  });

  it('turns & / and / x splits into ambiguous groups the person must confirm', () => {
    const plan = buildPlan({ artist: 'Simon & Garfunkel' });
    expect(needsReview(plan)).toBe(true);
    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0].parts).toEqual(['Simon', 'Garfunkel']);
  });

  it('classifies the other flags', () => {
    // "Ft Lauderdale" is exactly why a bare ft is only a question, never a decision.
    const lauderdale = buildPlan({ artist: 'Ft Lauderdale' });
    expect(lauderdale.weak).toHaveLength(1);
    expect(names(applyPlan(lauderdale, defaultDecisions(lauderdale)), 'primary')).toEqual(['Ft Lauderdale']);
    expect(buildPlan({ artist: 'Drake ft Rihanna' }).weak).toHaveLength(1);
    expect(buildPlan({ artist: 'Drake feat.' }).warnings.map((f) => f.code)).toEqual(['empty_feat_segment']);
    expect(buildPlan({ artist: 'Song (feat. A' }).warnings.map((f) => f.code)).toEqual(['unbalanced_bracket']);
    expect(buildPlan({ artist: 'A, a' }).duplicates).toHaveLength(1);
  });
});

describe('applyPlan', () => {
  it('splits an ambiguous segment by default (the parser proposal)', () => {
    const plan = buildPlan({ artist: 'Simon & Garfunkel' });
    expect(names(applyPlan(plan, defaultDecisions(plan)), 'primary')).toEqual(['Simon', 'Garfunkel']);
  });

  it('keeps a merged group as one artist, with its original separator', () => {
    const plan = buildPlan({ artist: 'Simon & Garfunkel' });
    const result = applyPlan(plan, { ...defaultDecisions(plan), merges: [[true]] });
    expect(names(result, 'primary')).toEqual(['Simon & Garfunkel']);
  });

  it('merges only the boundaries chosen: "Earth, Wind & Fire"', () => {
    const plan = buildPlan({ artist: 'Earth, Wind & Fire' });
    const result = applyPlan(plan, { ...defaultDecisions(plan), merges: [[true, true]] });
    expect(names(result, 'primary')).toEqual(['Earth, Wind & Fire']);
    const partial = applyPlan(plan, { ...defaultDecisions(plan), merges: [[false, true]] });
    expect(names(partial, 'primary')).toEqual(['Earth', 'Wind & Fire']);
  });

  it('merges inside featured names too and keeps the primaries', () => {
    const plan = buildPlan({ artist: 'Drake feat. Simon & Garfunkel' });
    const result = applyPlan(plan, { ...defaultDecisions(plan), merges: [[true]] });
    expect(names(result, 'primary')).toEqual(['Drake']);
    expect(names(result, 'featured')).toEqual(['Simon & Garfunkel']);
  });

  it('asks before treating a bare ft as a marker: keep leaves the text as typed', () => {
    const plan = buildPlan({ artist: 'Drake ft Rihanna' });
    expect(plan.weak).toHaveLength(1);
    const kept = applyPlan(plan, { ...defaultDecisions(plan), acceptWeak: false });
    expect(kept.credits.map((c) => [c.name, c.role])).toEqual([['Drake ft Rihanna', 'primary']]);
    const accepted = applyPlan(plan, { ...defaultDecisions(plan), acceptWeak: true });
    expect(names(accepted, 'featured')).toEqual(['Rihanna']);
  });

  it('declining a weak marker in the title leaves the title alone', () => {
    const plan = buildPlan({ artist: 'Drake', title: 'Song ft Bob' });
    const declined = applyPlan(plan, defaultDecisions(plan));
    expect(declined.title).toBeNull();
    expect(names(declined, 'featured')).toEqual([]);
    const accepted = applyPlan(plan, { ...defaultDecisions(plan), acceptWeak: true });
    expect(accepted.title).toBe('Song');
    expect(names(accepted, 'featured')).toEqual(['Bob']);
  });

  it('forces every credit into the role of the field it was typed in', () => {
    const plan = buildPlan({ artist: 'A, B' }, 'featured');
    expect(applyPlan(plan, defaultDecisions(plan)).credits.map((c) => c.role)).toEqual(['featured', 'featured']);
  });

  it('numbers primaries before featured', () => {
    const plan = buildPlan({ artist: 'P feat. F' });
    expect(applyPlan(plan, defaultDecisions(plan)).credits.map((c) => [c.name, c.order])).toEqual([['P', 0], ['F', 1]]);
  });
});

describe('splitWithSeparators', () => {
  it('keeps the separators so a merge can rebuild the name', () => {
    expect(splitWithSeparators('A, B & C')).toEqual({ parts: ['A', 'B', 'C'], separators: [', ', ' & '] });
    expect(splitWithSeparators('A and B')).toEqual({ parts: ['A', 'B'], separators: [' and '] });
  });
});
