// Single source of truth for route-level access control.
//
// Model: DEFAULT-DENY. Any path that does not explicitly match a `public`
// rule below requires authentication; `admin` paths additionally require staff.
// This is the inverse of the old allowlist-of-public heuristic, where a new
// private single-segment route (e.g. /notifications) silently fell through the
// /:accountName profile regex and became public.
//
// Order matters: PRIVATE rules are evaluated before the public profile shapes,
// so a private segment can never be mistaken for a vanity profile URL.

export type Access = 'public' | 'auth' | 'admin';

interface Rule {
  test: (path: string) => boolean;
  access: Access;
}

const seg1 = (path: string): string => path.split('/')[1] || '';

// Auth-only top-level segments (the route + any sub-path under it).
const AUTH_SEGMENTS = new Set([
  'settings', 'home', 'library', 'uploads', 'feed', 'notifications', 'reports',
]);

const RULES: Rule[] = [
  // ── Admin (staff only) ── must precede everything so it can never be
  //    downgraded to plain auth or matched as a profile.
  { test: p => p === '/admin' || p.startsWith('/admin/'), access: 'admin' },

  // ── Explicit public routes ──
  { test: p => p === '/', access: 'public' },
  { test: p => p === '/project/new' || p === '/project/local', access: 'public' },
  { test: p => /^\/[^/]+\/projects\/[^/]+$/.test(p), access: 'public' },   // public project view
  { test: p => /^\/verify-email/.test(p), access: 'public' },
  { test: p => /^\/search/.test(p), access: 'public' },
  { test: p => /^\/explore(\/.*)?$/.test(p), access: 'public' },
  { test: p => p === '/leaderboard', access: 'public' },

  // ── Auth-only app routes ── listed BEFORE the profile shapes so private
  //    single-segment routes don't get treated as /:accountName.
  { test: p => AUTH_SEGMENTS.has(seg1(p)), access: 'auth' },
  { test: p => /^\/[^/]+\/projects\/[^/]+\/(edit|fork)$/.test(p), access: 'auth' }, // edit / fork a project

  // ── Public profile shapes (vanity URLs at root) ── evaluated LAST.
  // The account segment is any non-slash text, not just today's `[a-z0-9_.:-]`: accounts created before
  // that rule can have capitals or other characters, and a stricter pattern here sent their profile
  // and project links to the sign-in page. Every private route is matched above, so this stays safe.
  // An optional trailing slash is accepted for the same reason.
  { test: p => /^\/[^/]+\/?$/.test(p), access: 'public' },                // /:accountName
  // Legacy /profile/… and /u/… forms: redirected to the bare URLs, but must not bounce to login first.
  { test: p => /^\/(profile|u)\/[^/]+(\/(lists|playlists)\/[^/]+)?\/?$/.test(p), access: 'public' },
  { test: p => /^\/[^/]+\/lists\/[^/]+\/?$/.test(p), access: 'public' },    // public list
  { test: p => /^\/[^/]+\/projects\/[^/]+\/?$/.test(p), access: 'public' }, // public project view
];

/**
 * Resolve the access level required for a pathname. Unmatched paths
 * default to 'auth' (default-deny).
 */
export function accessFor(pathname: string): Access {
  // React Router matches paths case-insensitively, so `/Settings` renders the
  // settings page and `/Alice` opens alice's profile (account names are stored
  // lowercase and the API lowercases lookups). Classify the same way the router
  // matches, or a capitalised private path would slip past every rule above.
  const path = pathname.toLowerCase();
  for (const rule of RULES) {
    if (rule.test(path)) return rule.access;
  }
  return 'auth';
}
