import { useLocation } from 'react-router-dom';
import { isAdminHost } from '@/shared/utils/host';

export const ADMIN_TABS = ['moderation', 'staff', 'audit', 'badges', 'levels', 'xp', 'permissions', 'requests'] as const;
export type AdminTabId = (typeof ADMIN_TABS)[number];

/** Tabs that split into sub-views. Only these get a second path segment; the rest are one segment. */
export const ADMIN_SUBTABS = {
  moderation: ['users', 'ips', 'devices'],
  xp: ['grant', 'levels'],
  permissions: ['catalog', 'defaults', 'overrides'],
} as const satisfies Partial<Record<AdminTabId, readonly string[]>>;

// The admin host serves the dashboard at its root; everywhere else it lives under /admin.
const base = () => (isAdminHost() ? '' : '/admin');

export function adminPath(tab: AdminTabId, sub?: string): string {
  return `${base()}/${tab}${sub ? `/${sub}` : ''}`;
}

function isAdminTab(value: string | undefined): value is AdminTabId {
  return !!value && (ADMIN_TABS as readonly string[]).includes(value);
}

/** Whether a pathname is part of the admin dashboard, on whichever host is serving it. */
export function isAdminPathname(pathname: string): boolean {
  if (isAdminHost()) {
    return pathname === '/' || pathname === '/home' || pathname === '/dashboard' || isAdminTab(pathname.split('/')[1]);
  }
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

/** The tab and sub-view named by the current URL. Either is null when the URL does not name it. */
export function useAdminRoute(): { tab: AdminTabId | null; sub: string | null } {
  const { pathname } = useLocation();
  const rest = isAdminHost() ? pathname : pathname.replace(/^\/admin/, '');
  const [tab, sub] = rest.split('/').filter(Boolean);
  return { tab: isAdminTab(tab) ? tab : null, sub: sub ?? null };
}

/** The active sub-view of `tab`: the one in the URL when it is valid, else the first. */
export function useAdminSub<T extends keyof typeof ADMIN_SUBTABS>(tab: T, allowed: readonly string[] = ADMIN_SUBTABS[tab]): string {
  const { sub } = useAdminRoute();
  return sub && allowed.includes(sub) ? sub : allowed[0];
}
