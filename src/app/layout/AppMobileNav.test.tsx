import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AuthUser } from '@/features/auth/auth.types';
import { showsBottomBar } from './nav-items';

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

  it('renders nothing until the app is ready', () => {
    renderBar('/home', ana, [], false);
    expect(screen.queryByRole('navigation')).toBeNull();
  });
});

describe('showsBottomBar', () => {
  it('shows on app pages and the public project view', () => {
    for (const p of ['/home', '/library', '/explore', '/explore/projects', '/ana', '/settings', '/notifications', '/ana/projects/song-abcdefghij']) {
      expect(showsBottomBar(p)).toBe(true);
    }
  });

  it('hides in the editor, setup, the local draft and live sessions', () => {
    for (const p of ['/ana/projects/song-abcdefghij/edit', '/project/new', '/project/local', '/session/abcdefghij']) {
      expect(showsBottomBar(p)).toBe(false);
    }
  });

  it('hides on admin routes', () => {
    expect(showsBottomBar('/admin')).toBe(false);
    expect(showsBottomBar('/admin/moderation/users')).toBe(false);
  });

  it('hides while the phone editor draws its own chrome', () => {
    expect(showsBottomBar('/home', true)).toBe(false);
  });
});
