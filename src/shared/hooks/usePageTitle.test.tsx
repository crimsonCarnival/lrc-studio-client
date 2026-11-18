import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { unreadTitlePrefix, usePageTitle } from './usePageTitle';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

let unread = 0;
vi.mock('@/features/notifications/NotificationsContext', () => ({
  useUnreadNotificationCount: () => unread,
}));

function Probe() {
  usePageTitle();
  return null;
}

const page = (path: string) => <MemoryRouter initialEntries={[path]}><Probe /></MemoryRouter>;

function titleAt(path: string): string {
  render(page(path));
  return document.title;
}

beforeEach(() => { unread = 0; });

describe('usePageTitle', () => {
  it('titles a shelf artist page as an artist page, not as not-found', () => {
    expect(titleAt('/32blunts/artists/6ad6b6acb11b7bd48d4340a1')).toBe('app.titles.artist - app.name');
  });

  it('titles the library playlists page as the library', () => {
    expect(titleAt('/library/playlists')).toBe('app.titles.library - app.name');
  });

  it('still titles an unknown deep path as not found', () => {
    expect(titleAt('/a/b/c/d')).toBe('app.titles.notFound - app.name');
  });

  it('prefixes the unread count and follows it as it changes', () => {
    unread = 3;
    const { rerender } = render(page('/feed'));
    expect(document.title).toBe('(3) app.titles.feed - app.name');

    unread = 0;
    rerender(page('/feed'));
    expect(document.title).toBe('app.titles.feed - app.name');
  });
});

describe('unreadTitlePrefix', () => {
  it('is empty at zero or below', () => {
    expect(unreadTitlePrefix(0)).toBe('');
    expect(unreadTitlePrefix(-1)).toBe('');
  });

  it('shows the count, capped at 99+', () => {
    expect(unreadTitlePrefix(1)).toBe('(1) ');
    expect(unreadTitlePrefix(99)).toBe('(99) ');
    expect(unreadTitlePrefix(100)).toBe('(99+) ');
  });
});
