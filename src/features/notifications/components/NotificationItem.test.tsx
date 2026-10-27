// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import i18n from 'i18next';

import { NotificationText } from './NotificationItem';
import type { NotificationData } from './NotificationItem';

const wallNote = (type: string, meta: Record<string, unknown> = {}): NotificationData => ({
  _id: 'n1',
  type,
  actors: [{ accountName: 'idkman' }],
  actorCount: 1,
  meta: { wall: '32blunts', ...meta },
} as NotificationData);

const text = (n: NotificationData, viewer?: string) =>
  render(<NotificationText notification={n} t={i18n.t} viewerAccountName={viewer} />).container.textContent;

describe('wall notification text', () => {
  it('says "your wall" to the wall\'s owner', () => {
    expect(text(wallNote('wall_comment'), '32Blunts')).toBe('idkman commented on your wall');
    expect(text(wallNote('wall_comment', { reply: true }), '32blunts')).toBe('idkman replied to your comment on your wall');
    expect(text(wallNote('mention'), '32blunts')).toBe('idkman tagged you on your wall');
    expect(text(wallNote('comment_like'), '32blunts')).toBe('idkman liked your comment on your wall');
  });

  it('names the wall to everyone else', () => {
    expect(text(wallNote('wall_comment'), 'ann')).toBe('idkman commented on 32blunts’s wall');
    expect(text(wallNote('mention'))).toBe('idkman tagged you on 32blunts’s wall');
  });
});

describe('notification actors', () => {
  const grouped = (names: string[]): NotificationData => ({
    ...wallNote('wall_comment', { reply: true }),
    actors: names.map(accountName => ({ accountName })),
    actorCount: names.length,
  } as NotificationData);

  it('names each actor once, newest first', () => {
    expect(text(grouped(['bob', 'sam']), 'ann')).toBe('sam and bob replied to your comment on 32blunts’s wall');
    expect(text(grouped(['bob', 'sam', 'mia']), 'ann')).toBe('mia, sam and bob replied to your comment on 32blunts’s wall');
  });
});
