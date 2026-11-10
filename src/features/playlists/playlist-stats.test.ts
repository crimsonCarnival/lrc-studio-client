import { describe, expect, it } from 'vitest';
import {
  distinctArtistCount,
  formatRuntime,
  formatTrackLength,
  topGenre,
  totalDurationSeconds,
  wordSyncedCount,
  type StatsProject,
} from './playlist-stats';

const withDuration = (duration: number | null | undefined): StatsProject => ({ upload: duration === undefined ? undefined : { duration } });
const withGenre = (genre: string | null): StatsProject => ({ metadata: { genre } });
const withArtist = (songArtist: string | null): StatsProject => ({ metadata: { songArtist } });

describe('totalDurationSeconds', () => {
  it('sums known durations and skips missing or invalid ones', () => {
    expect(totalDurationSeconds([withDuration(100), withDuration(null), withDuration(undefined), withDuration(50.5)])).toBe(150.5);
    expect(totalDurationSeconds([withDuration(NaN), withDuration(-3), withDuration(0)])).toBe(0);
  });
  it('is 0 for an empty list', () => {
    expect(totalDurationSeconds([])).toBe(0);
  });
});

describe('formatRuntime', () => {
  it('uses minutes and seconds under an hour', () => {
    expect(formatRuntime(31 * 60 + 42)).toEqual({ key: 'ms', hours: 0, minutes: 31, seconds: 42 });
  });
  it('drops seconds past an hour', () => {
    expect(formatRuntime(3600 + 5 * 60 + 9)).toEqual({ key: 'hm', hours: 1, minutes: 5, seconds: 9 });
  });
  it('uses seconds alone under a minute, rounding', () => {
    expect(formatRuntime(41.6)).toEqual({ key: 's', hours: 0, minutes: 0, seconds: 42 });
  });
  it('rounds up into the next unit', () => {
    expect(formatRuntime(59.7)).toEqual({ key: 'ms', hours: 0, minutes: 1, seconds: 0 });
  });
  it('is null when there is nothing to show', () => {
    expect(formatRuntime(0)).toBeNull();
    expect(formatRuntime(0.2)).toBeNull();
    expect(formatRuntime(NaN)).toBeNull();
  });
});

describe('formatTrackLength', () => {
  it('formats m:ss with padded seconds', () => {
    expect(formatTrackLength(249)).toBe('4:09');
    expect(formatTrackLength(5)).toBe('0:05');
  });
  it('formats h:mm:ss past an hour', () => {
    expect(formatTrackLength(3725)).toBe('1:02:05');
  });
  it('is null when unknown', () => {
    expect(formatTrackLength(null)).toBeNull();
    expect(formatTrackLength(undefined)).toBeNull();
    expect(formatTrackLength(0)).toBeNull();
  });
});

describe('wordSyncedCount', () => {
  it('counts only explicit word sync', () => {
    expect(wordSyncedCount([{ hasWordSync: true }, { hasWordSync: false }, { hasWordSync: null }, {}, { hasWordSync: true }])).toBe(2);
    expect(wordSyncedCount([])).toBe(0);
  });
});

describe('topGenre', () => {
  it('picks the most frequent genre case-insensitively, in its first spelling', () => {
    expect(topGenre([withGenre('R&B'), withGenre('pop'), withGenre('Pop'), withGenre('r&b'), withGenre('POP')])).toBe('pop');
  });
  it('breaks ties by first appearance', () => {
    expect(topGenre([withGenre('Indie'), withGenre('Pop'), withGenre('Pop'), withGenre('Indie')])).toBe('Indie');
  });
  it('ignores blank genres and is null when none', () => {
    expect(topGenre([withGenre('  '), withGenre(null), {}])).toBeNull();
    expect(topGenre([])).toBeNull();
    expect(topGenre([withGenre(' '), withGenre('Jazz ')])).toBe('Jazz');
  });
});

describe('distinctArtistCount', () => {
  it('splits credits and dedupes case-insensitively', () => {
    expect(distinctArtistCount([
      withArtist('Taylor Swift, Post Malone'),
      withArtist('taylor swift'),
      withArtist('Kendrick Lamar feat. SZA'),
    ])).toBe(4);
  });
  it('skips missing artists and is 0 for an empty list', () => {
    expect(distinctArtistCount([withArtist(null), withArtist(''), {}])).toBe(0);
    expect(distinctArtistCount([])).toBe(0);
  });
});
