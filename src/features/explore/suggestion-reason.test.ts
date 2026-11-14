import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import { suggestionReasonText } from './suggestion-reason';

const t = ((k: string, o?: Record<string, unknown>) => `${k}${o ? ' ' + JSON.stringify(o) : ''}`) as unknown as TFunction;
const base = { mutualCount: 0, mutualName: null, sharedArtistCount: 0, sharedArtists: [] as string[] };

describe('suggestionReasonText', () => {
  it('names the mutual follow, and counts the rest', () => {
    expect(suggestionReasonText({ ...base, kind: 'MUTUAL', mutualCount: 1, mutualName: 'Ana' }, t))
      .toBe('explore.suggested.reason.mutual {"name":"Ana"}');
    expect(suggestionReasonText({ ...base, kind: 'MUTUAL', mutualCount: 3, mutualName: 'Ana' }, t))
      .toBe('explore.suggested.reason.mutualMore {"name":"Ana","count":2}');
  });

  it('falls back to a count when no mutual follow can be named', () => {
    expect(suggestionReasonText({ ...base, kind: 'MUTUAL', mutualCount: 2 }, t))
      .toBe('explore.suggested.reason.mutualCount {"count":2}');
  });

  it('names the first shared artist', () => {
    expect(suggestionReasonText({ ...base, kind: 'TASTE', sharedArtistCount: 3, sharedArtists: ['Ghostemane', 'X', 'Y'] }, t))
      .toBe('explore.suggested.reason.tasteMore {"artists":"Ghostemane","count":2}');
  });

  it('says "new" otherwise', () => {
    expect(suggestionReasonText({ ...base, kind: 'NEW' }, t)).toBe('explore.suggested.reason.new');
  });
});
