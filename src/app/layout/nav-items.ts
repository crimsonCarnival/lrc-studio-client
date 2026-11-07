import type { ParseKeys } from 'i18next';
import { accessFor } from '@/app/route-access';
import { isAdminPathname } from '@/features/admin/admin-nav';
import { isStaff } from '@/features/auth/permissions';
import { isEditorPath } from '@/features/projects/project-path';
import { profilePath } from '@/features/profile/profile-path';

export type NavGroup = 'main' | 'discover' | 'you' | 'staff';

export type NavItem = {
  id: string;
  path: string;
  /** A key of the `nav` locale namespace. */
  labelKey: ParseKeys;
  icon: string;
  group: NavGroup;
};

type NavArgs = {
  /** Anything truthy means signed in; only the presence matters here. */
  user: object | null | undefined;
  permissions?: string[] | null;
  accountName?: string | null;
};

// Every indexed, static route the app has, in drawer order. The route-coverage test
// compares this against the route table so a new page cannot silently miss the menu.
const MAIN: NavItem[] = [
  { id: 'home', path: '/home', labelKey: 'nav.home', icon: 'home', group: 'main' },
  { id: 'library', path: '/library', labelKey: 'nav.projects', icon: 'menu_book', group: 'main' },
  { id: 'uploads', path: '/uploads', labelKey: 'nav.uploads', icon: 'cloud_upload', group: 'main' },
  { id: 'new-project', path: '/project/new', labelKey: 'nav.newProject', icon: 'add', group: 'main' },
];

const DISCOVER: NavItem[] = [
  { id: 'explore', path: '/explore', labelKey: 'nav.explore', icon: 'explore', group: 'discover' },
  { id: 'explore-projects', path: '/explore/projects', labelKey: 'nav.exploreProjects', icon: 'library_music', group: 'discover' },
  { id: 'explore-playlists', path: '/explore/playlists', labelKey: 'nav.explorePlaylists', icon: 'queue_music', group: 'discover' },
  { id: 'feed', path: '/feed', labelKey: 'nav.feed', icon: 'rss_feed', group: 'discover' },
  { id: 'search', path: '/search', labelKey: 'nav.search', icon: 'search', group: 'discover' },
  { id: 'leaderboard', path: '/leaderboard', labelKey: 'nav.leaderboard', icon: 'emoji_events', group: 'discover' },
];

const YOU: NavItem[] = [
  // Profile's path is filled in per account in getNavItems.
  { id: 'profile', path: '/', labelKey: 'nav.profile', icon: 'person', group: 'you' },
  { id: 'notifications', path: '/notifications', labelKey: 'nav.notifications', icon: 'notifications', group: 'you' },
  { id: 'reports', path: '/reports', labelKey: 'nav.reports', icon: 'flag', group: 'you' },
  { id: 'sessions', path: '/sessions', labelKey: 'nav.sessions', icon: 'group', group: 'you' },
  { id: 'settings', path: '/settings', labelKey: 'nav.settings', icon: 'settings', group: 'you' },
  { id: 'guide', path: '/guide', labelKey: 'nav.guide', icon: 'school', group: 'you' },
];

const STAFF: NavItem[] = [
  { id: 'admin', path: '/admin', labelKey: 'nav.admin', icon: 'admin_panel_settings', group: 'staff' },
];

// route-access treats /sessions as a public vanity profile URL (it is not in its auth
// list), but the page lists the signed-in user's own sessions, so guests never get it.
// Profile has no path without an account.
const ACCOUNT_ONLY = new Set(['sessions', 'profile']);

/**
 * The drawer's entries for this viewer. Guests get only what route-access calls public;
 * Admin needs a staff permission. Both are UI-only: the server re-checks every request.
 */
export function getNavItems({ user, permissions, accountName }: NavArgs): NavItem[] {
  if (!user) {
    return [...MAIN, ...DISCOVER, ...YOU].filter(
      (item) => accessFor(item.path) === 'public' && !ACCOUNT_ONLY.has(item.id),
    );
  }
  const you = YOU.filter((item) => item.id !== 'profile' || !!accountName).map((item) =>
    item.id === 'profile' ? { ...item, path: profilePath(accountName) } : item,
  );
  return [...MAIN, ...DISCOVER, ...you, ...(isStaff(permissions) ? STAFF : [])];
}

const byId = (list: NavItem[], id: string): NavItem => list.find((item) => item.id === id)!;

/** Sign-in is not a page of the app; the bar sends it through the guest auth flow. */
export const SIGN_IN_ID = 'sign-in';

type BarArgs = {
  user: object | null | undefined;
  accountName?: string | null;
  /** A guest with lines in their local project. */
  hasDraft?: boolean;
};

/** Signed in: Home, Projects, Explore, Profile. Guest: Explore, Draft, Sign in. */
export function getBottomBarItems({ user, accountName, hasDraft }: BarArgs): NavItem[] {
  if (!user) {
    return [
      byId(DISCOVER, 'explore'),
      {
        id: 'draft',
        path: hasDraft ? '/project/local' : '/project/new',
        labelKey: 'nav.draft',
        icon: 'draft',
        group: 'main',
      },
      { id: SIGN_IN_ID, path: '/auth?action=signin', labelKey: 'nav.signIn', icon: 'login', group: 'main' },
    ];
  }
  return [
    byId(MAIN, 'home'),
    byId(MAIN, 'library'),
    byId(DISCOVER, 'explore'),
    { ...byId(YOU, 'profile'), path: profilePath(accountName) },
  ];
}

const norm = (p: string) => p.toLowerCase().replace(/\/+$/, '') || '/';

function matches(item: NavItem, pathname: string): boolean {
  if (item.path.includes('?')) return false;
  const base = norm(item.path);
  const here = norm(pathname);
  if (item.id === 'profile') return here === base || here.startsWith(`${base}/lists/`);
  return here === base || here.startsWith(`${base}/`);
}

/** The item whose page the viewer is on: the longest matching path wins, so /explore/projects beats /explore. */
export function activeNavId(items: NavItem[], pathname: string): string | null {
  let best: NavItem | null = null;
  for (const item of items) {
    if (matches(item, pathname) && (!best || item.path.length > best.path.length)) best = item;
  }
  return best?.id ?? null;
}

/**
 * Whether the phone bottom bar shows on this page. Not in the editor workspace (at any
 * width the editor is a full-screen tool), setup, the local draft, the admin dashboard
 * (it gets its own navigation) or while the phone editor draws its own chrome.
 */
export function showsBottomBar(pathname: string, phoneEditorMounted = false): boolean {
  if (phoneEditorMounted) return false;
  if (isEditorPath(pathname) || pathname === '/project/new') return false;
  return !isAdminPathname(pathname);
}
