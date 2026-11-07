import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { accessFor } from '@/app/route-access';
import { ADMIN_TABS, adminPath } from '@/features/admin/admin-nav';
import { activeNavId, getBottomBarItems, getNavItems, SIGN_IN_ID } from './nav-items';

const paths = (items: { path: string }[]) => items.map((i) => i.path);
const user = { accountName: 'ana' };

describe('getNavItems', () => {
  it('lists every indexed route for a signed-in user, in group order', () => {
    const items = getNavItems({ user, permissions: [], accountName: 'ana' });
    expect(paths(items)).toEqual([
      '/home', '/library', '/uploads', '/project/new',
      '/explore', '/explore/projects', '/explore/playlists', '/feed', '/search', '/leaderboard',
      '/ana', '/notifications', '/reports', '/sessions', '/settings', '/guide',
    ]);
    expect(new Set(items.map((i) => i.group))).toEqual(new Set(['main', 'discover', 'you']));
  });

  it('encodes the profile path from the account name', () => {
    const items = getNavItems({ user, permissions: [], accountName: 'a b' });
    expect(items.find((i) => i.id === 'profile')?.path).toBe('/a%20b');
  });

  it('omits Profile when the account name is not known yet', () => {
    const items = getNavItems({ user, permissions: [], accountName: null });
    expect(items.find((i) => i.id === 'profile')).toBeUndefined();
  });

  it('adds Admin only for staff permissions', () => {
    const has = (permissions: string[] | null | undefined) =>
      getNavItems({ user, permissions, accountName: 'ana' }).some((i) => i.id === 'admin' && i.group === 'staff');
    expect(has(['users.view'])).toBe(true);
    expect(has(['*'])).toBe(true);
    expect(has([])).toBe(false);
    expect(has(undefined)).toBe(false);
    expect(has(null)).toBe(false);
  });

  it('never gives a guest an account page, Admin or Profile', () => {
    const items = getNavItems({ user: null, permissions: ['*'], accountName: 'ana' });
    expect(paths(items)).toEqual([
      '/project/new', '/explore', '/explore/projects', '/explore/playlists', '/search', '/leaderboard', '/guide',
    ]);
    for (const item of items) expect(accessFor(item.path)).toBe('public');
  });
});

describe('getBottomBarItems', () => {
  it('signed in: Home, Projects, Explore, Profile (no Settings)', () => {
    const items = getBottomBarItems({ user, accountName: 'ana' });
    expect(paths(items)).toEqual(['/home', '/library', '/explore', '/ana']);
    expect(items.map((i) => i.labelKey)).toEqual(['nav.home', 'nav.projects', 'nav.explore', 'nav.profile']);
  });

  it('guest: Explore, Draft, Sign in', () => {
    const items = getBottomBarItems({ user: null });
    expect(items.map((i) => i.id)).toEqual(['explore', 'draft', SIGN_IN_ID]);
  });

  it('points a guest Draft at the local project only when there is one', () => {
    expect(getBottomBarItems({ user: null, hasDraft: true })[1].path).toBe('/project/local');
    expect(getBottomBarItems({ user: null, hasDraft: false })[1].path).toBe('/project/new');
  });
});

describe('activeNavId', () => {
  const items = getNavItems({ user, permissions: [], accountName: 'ana' });
  it('matches by path and prefers the longest match', () => {
    expect(activeNavId(items, '/home')).toBe('home');
    expect(activeNavId(items, '/explore')).toBe('explore');
    expect(activeNavId(items, '/explore/projects')).toBe('explore-projects');
    expect(activeNavId(items, '/library/')).toBe('library');
    expect(activeNavId(items, '/settings/profile')).toBe('settings');
  });
  it('matches the own profile case-insensitively but not own project pages', () => {
    expect(activeNavId(items, '/Ana')).toBe('profile');
    expect(activeNavId(items, '/ana/projects/x-abcdefghij')).toBeNull();
  });
  it('is null where no item applies', () => {
    expect(activeNavId(items, '/somebody-else')).toBeNull();
  });
});

// Reads the real route table (the <Route> elements in AppRouter) so a new static page has
// to be put in the menu or listed here with a reason. Routes are inline JSX rather than a
// data table, so this parses the source; every <Route must be understood or the test fails.
describe('route coverage', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/app/AppRouter.tsx'), 'utf8');

  type Parsed = { literal: string[]; templated: number; index: number; unparsed: string[] };

  const parse = (): Parsed => {
    const out: Parsed = { literal: [], templated: 0, index: 0, unparsed: [] };
    const starts = [...source.matchAll(/<Route(?=\s)/g)].map((m) => m.index!);
    starts.forEach((start, i) => {
      // The tag's props live between this <Route and the next one (nested routes follow it).
      const chunk = source.slice(start, starts[i + 1] ?? source.length);
      const literal = /\bpath=(?:"([^"]*)"|'([^']*)')/.exec(chunk);
      if (literal) out.literal.push(literal[1] ?? literal[2]);
      else if (/\bpath=\{`/.test(chunk)) out.templated++;
      else if (/<Route\s+(?:[^>]*?\s)?index(?=[\s/>])/.test(chunk)) out.index++;
      else out.unparsed.push(chunk.slice(0, 60).replace(/\s+/g, ' '));
    });
    return out;
  };

  const staticRoutes = (): string[] => {
    const parsed = parse();
    const found = new Set<string>();
    if (parsed.index > 0) found.add('/');
    for (const raw of parsed.literal) {
      // "settings/:tab?" is the settings page with an optional tab; any other
      // parameter or wildcard makes the route dynamic.
      const optional = raw.replace(/\/:[A-Za-z]+\?$/, '');
      if (/[:*]/.test(optional)) continue;
      found.add(`/${optional}`);
    }
    return [...found].sort();
  };

  // Static routes that are deliberately not menu entries.
  const EXCLUDED: Record<string, string> = {
    '/': 'guest landing page, reached through the logo',
    '/project/local': 'the local editor, reached through the bar Draft item and the editor itself',
    '/verify-email': 'email-link flow',
    '/dashboard': 'admin-host alias of the dashboard, which Admin already covers',
  };

  const menuPaths = () =>
    new Set(getNavItems({ user, permissions: ['*'], accountName: 'ana' }).map((i) => i.path));

  it('understands every <Route> element, so none can slip past unseen', () => {
    const parsed = parse();
    expect(parsed.unparsed).toEqual([]);
    const total = (source.match(/<Route(?=\s)/g) ?? []).length;
    expect(parsed.literal.length + parsed.templated + parsed.index).toBe(total);
    expect(staticRoutes()).toEqual(expect.arrayContaining(['/home', '/explore/playlists', '/settings', '/guide']));
  });

  it('puts every static route in the menu or in the excluded list', () => {
    const inMenu = menuPaths();
    const missing = staticRoutes().filter((p) => !inMenu.has(p) && !(p in EXCLUDED));
    // Admin is generated from ADMIN_TABS; the next test ties it to the Admin item.
    expect(missing.filter((p) => p !== '/admin')).toEqual([]);
  });

  it('ties the ADMIN_TABS routes to the Admin item', () => {
    expect(parse().templated).toBeGreaterThan(0);
    expect(source).toContain('ADMIN_TABS.map');
    const admin = getNavItems({ user, permissions: ['users.view'], accountName: 'ana' }).find((i) => i.id === 'admin');
    expect(admin?.path).toBe('/admin');
    for (const tab of ADMIN_TABS) expect(adminPath(tab)).toMatch(/^\/admin\//);
  });

  it('keeps the excluded list honest', () => {
    const routes = new Set(staticRoutes());
    const inMenu = menuPaths();
    for (const p of Object.keys(EXCLUDED)) {
      expect(routes.has(p)).toBe(true);
      expect(inMenu.has(p)).toBe(false);
    }
  });
});
