import { describe, it, expect } from 'vitest';
import { groupActivities, matchesFilter, GROUP_WINDOW_MS } from './group-activities';

const at = (h: number) => new Date(Date.UTC(2026, 10, 14) - h * 3600_000).toISOString();
const act = (id: string, type: string, actor: string, h: number, target?: string, extra: object = {}) =>
  ({ id, type, createdAt: at(h), actor: { accountName: actor }, target: target ? { accountName: target } : null, ...extra });

describe('groupActivities', () => {
  it('joins a run of the same actor doing the same thing', () => {
    const items = groupActivities([
      act('1', 'USER_FOLLOWED', 'ana', 0, 'b'),
      act('2', 'USER_FOLLOWED', 'ana', 1, 'c'),
      act('3', 'USER_FOLLOWED', 'ana', 2, 'd'),
      act('4', 'PROJECT_PUBLISHED', 'ana', 3),
    ], 'me');
    expect(items.map((i) => i.kind)).toEqual(['group', 'single']);
    expect(items[0].kind === 'group' && items[0].activities.map((a) => a.id)).toEqual(['1', '2', '3']);
  });

  it('never reorders: a different activity in between breaks the run', () => {
    const items = groupActivities([
      act('1', 'PROJECT_FORKED', 'ana', 0, 'x'),
      act('2', 'PROJECT_PUBLISHED', 'bo', 1),
      act('3', 'PROJECT_FORKED', 'ana', 2, 'x'),
    ], 'me');
    expect(items.map((i) => i.kind)).toEqual(['single', 'single', 'single']);
  });

  it('keeps follows of the viewer and shares with a note on their own', () => {
    const items = groupActivities([
      act('1', 'USER_FOLLOWED', 'ana', 0, 'Me'),
      act('2', 'USER_FOLLOWED', 'ana', 1, 'me'),
      act('3', 'PROJECT_SHARED', 'bo', 2, 'x', { description: 'listen' }),
      act('4', 'PROJECT_SHARED', 'bo', 3, 'x', { description: 'this too' }),
    ], 'me');
    expect(items.every((i) => i.kind === 'single')).toBe(true);
  });

  it('separates forks of the viewer’s projects from forks of others’', () => {
    const items = groupActivities([
      act('1', 'PROJECT_FORKED', 'ana', 0, 'me'),
      act('2', 'PROJECT_FORKED', 'ana', 1, 'me'),
      act('3', 'PROJECT_FORKED', 'ana', 2, 'zoe'),
    ], 'me');
    expect(items.map((i) => i.kind)).toEqual(['group', 'single']);
  });

  it('does not join activities further apart than the window', () => {
    const hours = GROUP_WINDOW_MS / 3600_000;
    const items = groupActivities([
      act('1', 'PLAYLIST_CREATED', 'ana', 0),
      act('2', 'PLAYLIST_CREATED', 'ana', hours + 1),
    ], 'me');
    expect(items).toHaveLength(2);
  });
});

describe('matchesFilter', () => {
  it('sorts each type into one chip', () => {
    expect(matchesFilter('PROJECT_STARRED', 'projects')).toBe(true);
    expect(matchesFilter('PLAYLIST_CREATED', 'projects')).toBe(false);
    expect(matchesFilter('PLAYLIST_CREATED', 'lists')).toBe(true);
    expect(matchesFilter('USER_FOLLOWED', 'people')).toBe(true);
    expect(matchesFilter('USER_FOLLOWED', 'all')).toBe(true);
  });
});
