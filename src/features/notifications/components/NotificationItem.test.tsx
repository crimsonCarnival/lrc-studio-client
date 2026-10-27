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

describe('wall report notification text', () => {
  it('tells moderators who reported a comment, and where', () => {
    expect(text(wallNote('wall_report'), 'ann')).toBe('idkman reported a comment on 32blunts’s wall');
    expect(text(wallNote('wall_report'), '32blunts')).toBe('idkman reported a comment on your wall');
  });

  it('tells the reporter how their report was settled', () => {
    const reviewed = (outcome: string) => ({ ...wallNote('wall_report_reviewed', { outcome }), actors: [], actorCount: 0 } as NotificationData);
    expect(text(reviewed('actioned'), 'ann')).toBe('A moderator removed a comment you reported on 32blunts’s wall');
    expect(text(reviewed('dismissed'), 'ann')).toBe('A moderator reviewed your report on 32blunts’s wall and left the comment up');
  });

  it('gives a restriction with no end date its own wording, and the reason', () => {
    const restricted = { _id: 'n2', type: 'wall_restricted', body: 'spam', meta: { until: null } } as NotificationData;
    expect(text(restricted)).toBe('A moderator stopped you from commenting on walls until further notice. Reason: spam');
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
