import type { User } from '@/types/graphql';

// Mirrors the server `User` (the /me shape) with auth-only extras. Partial<User>
// because the client sometimes holds a subset (guest, optimistic updates).
export interface AuthUser extends Omit<Partial<User>, 'lastLoginAt' | 'lastIp' | 'lastDevice'> {
  _id?: string;
  isGuest?: boolean;
  permissions?: string[];
  lastIp?: string | null;
  lastDevice?: string | null;
  lastLoginAt?: string | Date | null;
  [key: string]: unknown;
}
