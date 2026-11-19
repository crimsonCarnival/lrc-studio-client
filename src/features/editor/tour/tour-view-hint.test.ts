import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '@/features/projects/services/storage.service';
import { readSeenViewHints, recordViewHintSeen } from './tour-view-hint';

describe('tour view hints', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with no views used', () => {
    expect(readSeenViewHints()).toEqual([]);
  });

  it('records each view once and keeps the others', () => {
    recordViewHintSeen('words');
    recordViewHintSeen('words');
    recordViewHintSeen('review');
    expect(readSeenViewHints()).toEqual(['words', 'review']);
  });

  it('ignores stored values that are not a list of known views', () => {
    localStorage.setItem(STORAGE_KEYS.TOUR_VIEW_HINTS, JSON.stringify(['lines', 'review', 3]));
    expect(readSeenViewHints()).toEqual(['review']);
    localStorage.setItem(STORAGE_KEYS.TOUR_VIEW_HINTS, '{not json');
    expect(readSeenViewHints()).toEqual([]);
  });
});
