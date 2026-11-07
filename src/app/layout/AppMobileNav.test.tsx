import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AuthUser } from '@/features/auth/auth.types';
import { BOTTOM_BAR_CLEARANCE, showsBottomBar } from './nav-items';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}));

const auth = vi.hoisted(() => ({ user: null as AuthUser | null }));
vi.mock('@/features/auth/useAuthContext', () => ({ useAuthContext: () => ({ user: auth.user }) }));
vi.mock('../../shared/hooks/useHapticFeedback.js', () => ({ default: () => ({ trigger: vi.fn() }) }));
const goToAuth = vi.hoisted(() => vi.fn());
vi.mock('./header/use-guest-auth', () => ({ useGuestAuth: () => goToAuth }));

import { AppMobileNav } from './AppMobileNav';

const ana: AuthUser = { accountName: 'ana', permissions: [] };

function renderBar(path: string, user: AuthUser | null, lines: unknown[] = [], isReady = true) {
  auth.user = user;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppMobileNav isReady={isReady} lines={lines as never} mediaTitle="" />
    </MemoryRouter>,
  );
}

describe('AppMobileNav', () => {
  it('signed in: Home, Projects, Explore, Profile, linking to their pages', () => {
    renderBar('/home', ana);
    const bar = screen.getByRole('navigation', { name: 'nav.tabs' });
    const links = within(bar).getAllByRole('link');
    ['nav.home', 'nav.projects', 'nav.explore', 'nav.profile'].forEach((name, i) => expect(links[i]).toHaveAccessibleName(name));
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/home', '/library', '/explore', '/ana']);
  });

  it('marks only the current tab', () => {
    renderBar('/library', ana);
    const current = screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName('nav.projects');
  });

  it('keeps Explore active on its sub-pages and Profile active on the own profile', () => {
    const { unmount } = renderBar('/explore/playlists', ana);
    expect(screen.getByRole('link', { name: 'nav.explore' })).toHaveAttribute('aria-current', 'page');
    unmount();
    renderBar('/ana', ana);
    expect(screen.getByRole('link', { name: 'nav.profile' })).toHaveAttribute('aria-current', 'page');
  });

  it('has no active tab on a page it does not list', () => {
    renderBar('/settings', ana);
    expect(screen.getAllByRole('link').some((a) => a.hasAttribute('aria-current'))).toBe(false);
  });

  it('guest: Explore, Draft (setup when empty), Sign in', () => {
    renderBar('/explore', null);
    const bar = screen.getByRole('navigation', { name: 'nav.tabs' });
    expect(within(bar).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/explore', '/project/new']);
    expect(within(bar).getByRole('button', { name: 'nav.signIn' })).toBeInTheDocument();
    expect(within(bar).getByRole('link', { name: 'nav.explore' })).toHaveAttribute('aria-current', 'page');
  });

  it('guest with a local project: Draft opens it', () => {
    renderBar('/explore', null, [{ text: 'a' }]);
    expect(screen.getByRole('link', { name: 'nav.draft' })).toHaveAttribute('href', '/project/local');
  });

  it('guest Sign in goes through the guest auth flow', () => {
    renderBar('/explore', null);
    fireEvent.click(screen.getByRole('button', { name: 'nav.signIn' }));
    expect(goToAuth).toHaveBeenCalledWith('signin');
  });

  it('shows on pages with no project loaded (isReady is false there)', () => {
    renderBar('/home', ana, [], false);
    expect(screen.getByRole('navigation', { name: 'nav.tabs' })).toBeInTheDocument();
  });
});

describe('showsBottomBar', () => {
  const table: Array<[string, boolean]> = [
    ['/home', true],
    ['/library', true],
    ['/uploads', true],
    ['/uploads/abc123', true],
    ['/explore', true],
    ['/explore/projects', true],
    ['/ana', true],
    ['/settings', true],
    ['/notifications', true],
    // Admin keeps the bar until the dashboard gets its own burger.
    ['/admin', true],
    ['/admin/moderation/users', true],
    // The public view has its own playback bar at the bottom edge.
    ['/ana/projects/song-abcdefghij', false],
    ['/ana/projects/song-abcdefghij/edit', false],
    ['/project/new', false],
    ['/project/local', false],
    ['/session/abcdefghij', false],
  ];
  it.each(table)('%s -> %s', (path, shown) => {
    expect(showsBottomBar(path)).toBe(shown);
  });

  it('hides while the phone editor draws its own chrome', () => {
    expect(showsBottomBar('/home', true)).toBe(false);
  });

  it('clears the bar plus the home-indicator inset, on phones only', () => {
    expect(BOTTOM_BAR_CLEARANCE).toContain('env(safe-area-inset-bottom)');
    expect(BOTTOM_BAR_CLEARANCE).toContain('lg:pb-0');
  });
});
