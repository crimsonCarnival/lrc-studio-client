import { useAuthContext } from './useAuthContext';

// Mirror of the server permission catalog (server/src/shared/permissions.ts).
// The client uses these only to show/hide UI; the server re-checks every action,
// so this is a UX layer, never a security boundary.

export const WILDCARD = '*';

export type Permission =
  | 'users.view'
  | 'users.ban'
  | 'users.delete'
  | 'users.role'
  | 'users.shadowban'
  | 'network.block'
  | 'audit.view'
  | 'stats.view'
  | 'badges.manage'
  | 'levels.manage'
  | 'xp.adjust';

export const ROLES = ['user', 'mod', 'admin', 'superadmin'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_RANK: Record<Role, number> = { user: 0, mod: 1, admin: 2, superadmin: 3 };

export function userHasPermission(permissions: string[] | undefined | null, required: Permission): boolean {
  if (!permissions || permissions.length === 0) return false;
  return permissions.includes(WILDCARD) || permissions.includes(required);
}

/** True if the user holds any permission at all (i.e. is staff). */
export function isStaff(permissions: string[] | undefined | null): boolean {
  return (permissions?.length ?? 0) > 0;
}

/** Reactive single-permission check bound to the current user. */
export function usePermission(required: Permission): boolean {
  const { user } = useAuthContext();
  return userHasPermission(user?.permissions, required);
}

/** Reactive staff check (any permission). Used to gate the /admin surface. */
export function useIsStaff(): boolean {
  const { user } = useAuthContext();
  return isStaff(user?.permissions);
}
