import type { User, UserPreferences } from '@/types/graphql';

// Mirrors the server `User` (the /me shape) with auth-only extras. Partial<User>
// because the client sometimes holds a subset (guest, optimistic updates).
export interface AuthUser extends Omit<Partial<User>, 'lastLoginAt' | 'lastIp' | 'lastDevice'> {
  _id?: string;
  isGuest?: boolean;
  permissions?: string[];
  lastIp?: string | null;
  lastDevice?: string | null;
  lastLoginAt?: string | Date | null;
  /** Not a `User` field: `meProfile` fetches `myPreferences` alongside `me` and attaches it here. */
  preferences?: UserPreferences;
  [key: string]: unknown;
}

/** What the identifier lookup returns for the login steps: who the account is and how it can sign in. */
export interface IdentifierData {
  identifier?: string;
  accountName?: string;
  displayName?: string;
  avatarUrl?: string;
  hasPassword?: boolean;
  hasPasskey?: boolean;
  hasGoogle?: boolean;
}
