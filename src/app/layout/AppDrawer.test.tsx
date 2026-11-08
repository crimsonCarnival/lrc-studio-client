import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { TooltipProvider } from '@ui/tooltip';
import type { AuthUser } from '@/features/auth/auth.types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: { count?: number }) => (o?.count != null ? `${k}:${o.count}` : k),
    i18n: { language: 'en' },
  }),
}));
vi.mock('@/features/settings/components/theme/ThemeModal', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div>theme-modal</div> : null),
}));

import { AppDrawer } from './AppDrawer';

const ana: AuthUser = { accountName: 'ana', displayName: 'Ana', permissions: [] };

function Where() {
  const navigate = useNavigate();
  return (
    <>
      <div data-testid="where">{useLocation().pathname}</div>
      <button data-testid="redirect" onClick={() => {
        // MemoryRouter does not touch window.history; a browser router's push replaces the top entry.
        window.history.pushState({}, '');
        navigate('/feed');
      }}>redirect</button>
    </>
  );
}

type HostProps = {
  user?: AuthUser | null;
  unreadCount?: number;
  staffPending?: number;
  start?: string;
  go?: (p: string) => void;
  onGuestAuth?: (t: 'signin' | 'signup') => void;
};

function Host({ user = ana, unreadCount = 0, staffPending = 0, start = '/home', go = vi.fn(), onGuestAuth = vi.fn() }: HostProps) {
  const [isOpen, setOpen] = useState(false);
  return (
    <MemoryRouter initialEntries={[start]}>
      <TooltipProvider>
        <button data-testid="burger" onClick={() => setOpen(true)}>burger</button>
        <Where />
        <button data-testid="external-close" onClick={() => setOpen(false)}>external</button>
        <AppDrawer
          open={isOpen}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) screen.getByTestId('burger').focus();
          }}
          user={user}
          logout={vi.fn()}
          go={go}
          onGuestAuth={onGuestAuth}
          currentTheme="dark"
          i18n={{ language: 'en', changeLanguage: vi.fn() } as never}
          unreadCount={unreadCount}
          staffPending={staffPending}
        />
      </TooltipProvider>
    </MemoryRouter>
  );
}

const openDrawer = () => {
  screen.getByTestId('burger').focus();
  fireEvent.click(screen.getByTestId('burger'));
  return screen.getByRole('dialog', { name: 'nav.menu' });
};
const closed = () => waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('AppDrawer', () => {
  it('is closed until opened, then a named modal dialog with grouped navigation', () => {
    render(<Host />);
    expect(screen.queryByRole('dialog')).toBeNull();
    const dialog = openDrawer();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const nav = within(dialog).getByRole('navigation', { name: 'nav.mainNav' });
    for (const group of ['nav.groupMain', 'nav.groupDiscover', 'nav.groupYou']) {
      expect(within(nav).getByRole('region', { name: group })).toBeInTheDocument();
    }
    const hrefs = within(nav).getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([
      '/home', '/library', '/uploads', '/project/new',
      '/explore', '/explore/projects', '/explore/playlists', '/feed', '/search', '/leaderboard',
      '/ana', '/notifications', '/reports', '/sessions', '/settings', '/guide',
    ]);
  });

  it('carries the app branding: the logo mark and the app name', () => {
    render(<Host />);
    const dialog = openDrawer();
    expect(within(dialog).getByText('app.name')).toBeInTheDocument();
    expect(dialog.querySelector('svg[viewBox="0 0 64 64"]')).not.toBeNull();
  });

  it('shows who is signed in and a sign out button, but no sign in or up', () => {
    render(<Host />);
    const dialog = openDrawer();
    expect(within(dialog).getByText('Ana')).toBeInTheDocument();
    expect(within(dialog).getByText('@ana')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'auth.signOut' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'auth.signIn' })).toBeNull();
  });

  it('marks the current page', () => {
    render(<Host start="/explore/projects" />);
    const dialog = openDrawer();
    expect(within(dialog).getByRole('link', { name: 'nav.exploreProjects' })).toHaveAttribute('aria-current', 'page');
    expect(within(dialog).getByRole('link', { name: 'nav.explore' })).not.toHaveAttribute('aria-current');
  });

  it('offers Admin only with staff permissions', () => {
    const { unmount } = render(<Host />);
    expect(within(openDrawer()).queryByRole('link', { name: 'nav.admin' })).toBeNull();
    unmount();
    render(<Host user={{ ...ana, permissions: ['users.view'] }} />);
    expect(within(openDrawer()).getByRole('link', { name: 'nav.admin' })).toHaveAttribute('href', '/admin');
  });

  it('badges Notifications with the unread count, readable by screen readers', () => {
    render(<Host unreadCount={3} />);
    const link = within(openDrawer()).getByRole('link', { name: /nav\.notifications/ });
    expect(link).toHaveTextContent('nav.unread:3');
  });

  it('gives a guest sign in and sign up, only public pages, and no sign out', async () => {
    const onGuestAuth = vi.fn();
    render(<Host user={null} onGuestAuth={onGuestAuth} />);
    const dialog = openDrawer();
    expect(within(dialog).queryByRole('button', { name: 'auth.signOut' })).toBeNull();
    const hrefs = within(dialog).getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([
      '/project/new', '/explore', '/explore/projects', '/explore/playlists', '/search', '/leaderboard', '/guide',
    ]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'auth.signUp' }));
    await waitFor(() => expect(onGuestAuth).toHaveBeenCalledWith('signup'));
  });

  it('closes on Escape and gives focus back to the burger', async () => {
    render(<Host />);
    fireEvent.keyDown(openDrawer(), { key: 'Escape' });
    await closed();
    expect(screen.getByTestId('burger')).toHaveFocus();
  });

  it('closes on a backdrop tap', async () => {
    render(<Host />);
    openDrawer();
    const backdrop = document.body.querySelector('.fixed.inset-0') as HTMLElement;
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop);
    await closed();
  });

  it('closes on the close button', async () => {
    render(<Host />);
    fireEvent.click(within(openDrawer()).getByRole('button', { name: 'common.close' }));
    await closed();
  });

  it('closes and navigates when a link is chosen, through the guarded go()', async () => {
    const go = vi.fn();
    render(<Host go={go} />);
    fireEvent.click(within(openDrawer()).getByRole('link', { name: 'nav.feed' }));
    await closed();
    await waitFor(() => expect(go).toHaveBeenCalledWith('/feed'));
  });

  it('closes when the system back button is pressed, staying on the page', async () => {
    render(<Host />);
    openDrawer();
    expect(window.history.state?.lrcDrawer).toBe(true);
    act(() => window.history.back());
    await closed();
    expect(window.history.state?.lrcDrawer).toBeFalsy();
    expect(screen.getByTestId('where')).toHaveTextContent('/home');
  });

  it('leaves no marker entry on top after closing by Escape', async () => {
    render(<Host />);
    openDrawer();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await closed();
    await waitFor(() => expect(window.history.state?.lrcDrawer).toBeFalsy());
  });

  it('offers the theme and language choices', () => {
    render(<Host />);
    const dialog = openDrawer();
    expect(within(dialog).getByRole('button', { name: 'settings.options.themes.dark' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(dialog).getByRole('group', { name: 'nav.language' })).toBeInTheDocument();
  });

  it('pops history once however many times it is asked to close', async () => {
    render(<Host />);
    const dialog = openDrawer();
    const back = vi.spyOn(window.history, 'back');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'common.close' }));
    await closed();
    expect(back).toHaveBeenCalledTimes(1);
    back.mockRestore();
  });

  it('closes without popping when the route changes under it', async () => {
    render(<Host />);
    openDrawer();
    const back = vi.spyOn(window.history, 'back');
    act(() => screen.getByTestId('redirect').click());
    await closed();
    expect(screen.getByTestId('where')).toHaveTextContent('/feed');
    expect(back).not.toHaveBeenCalled();
    back.mockRestore();
  });

  it('counts what waits on staff on the Admin item', () => {
    render(<Host user={{ ...ana, permissions: ['users.ban'] }} staffPending={4} />);
    const admin = within(openDrawer()).getByRole('link', { name: /nav\.admin/ });
    expect(admin).toHaveTextContent('admin.header.dashboardPending:4');
  });

  it('shows no count on Admin when nothing waits', () => {
    render(<Host user={{ ...ana, permissions: ['users.ban'] }} />);
    expect(within(openDrawer()).getByRole('link', { name: /nav\.admin/ })).not.toHaveTextContent('dashboardPending');
  });

  it('adds a Verify email row to Settings for an unverified email', () => {
    render(<Host user={{ ...ana, email: 'a@example.test', isVerified: false }} />);
    expect(within(openDrawer()).getByRole('link', { name: 'nav.verifyEmail' })).toHaveAttribute('href', '/settings');
  });

  it('has no Verify email row once verified or without an email', () => {
    const { unmount } = render(<Host user={{ ...ana, email: 'a@example.test', isVerified: true }} />);
    expect(within(openDrawer()).queryByRole('link', { name: 'nav.verifyEmail' })).toBeNull();
    unmount();
    render(<Host />);
    expect(within(openDrawer()).queryByRole('link', { name: 'nav.verifyEmail' })).toBeNull();
  });

  it('does not pop twice when closed from outside while a pop is in flight, and reopens normally', async () => {
    render(<Host />);
    const dialog = openDrawer();
    const back = vi.spyOn(window.history, 'back');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    act(() => screen.getByTestId('external-close').click());
    await closed();
    expect(back).toHaveBeenCalledTimes(1);
    // The next open must still honour close requests.
    const again = openDrawer();
    fireEvent.keyDown(again, { key: 'Escape' });
    await closed();
    expect(back).toHaveBeenCalledTimes(2);
    expect(window.history.state?.lrcDrawer).toBeFalsy();
    back.mockRestore();
  });
});
