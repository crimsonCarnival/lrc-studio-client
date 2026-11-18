import { describe, it, expect } from 'vitest';
import { showsInstrumentalBreak, MIN_INSTRUMENTAL_SECONDS } from './instrumental-break';

describe('showsInstrumentalBreak', () => {
  it('hides a gap shorter than the threshold', () => {
    expect(showsInstrumentalBreak(0)).toBe(false);
    expect(showsInstrumentalBreak(1.5)).toBe(false);
    expect(showsInstrumentalBreak(3.99)).toBe(false);
  });

  it('shows a gap at or above it', () => {
    expect(showsInstrumentalBreak(MIN_INSTRUMENTAL_SECONDS)).toBe(true);
    expect(showsInstrumentalBreak(12)).toBe(true);
  });

  it('shows a gap it cannot measure rather than hiding it', () => {
    // An unsynced empty line, or the last line of a project, has no next
    // timestamp to measure against. Hiding those would drop rows the user
    // deliberately added and cannot see to fix.
    expect(showsInstrumentalBreak(null)).toBe(true);
    expect(showsInstrumentalBreak(undefined)).toBe(true);
  });
});
