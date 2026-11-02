/** A user row as the admin endpoints return it. Fields are optional because each view
 *  (users list, moderation, staff, context menu) reads from a different query. */
export interface AdminUser {
  id?: string;
  _id?: string;
  displayName?: string;
  accountName?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  ban?: { active?: boolean; reason?: string } | null;
  appeal?: { status?: string };
  isDeleted?: boolean;
  isVerified?: boolean;
  shadowBanned?: boolean;
  projectCount?: number;
  uploadCount?: number;
  lastIp?: string;
  lastDeviceId?: string;
  lastDeviceName?: string;
  country?: string | null;
  lastOnlineAt?: string | null;
  isOnline?: boolean;
  storageUsed?: number;
  createdAt?: string;
  lastUsedAt?: string;
  stats?: { minutesSynced?: number };
  [key: string]: unknown;
}

/** A banned user whose appeal is waiting on a decision (`GET /admin/appeals`). */
export interface PendingAppeal {
  id: string;
  accountName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  ban: { active: true; reason: string | null; until: string | null };
  appeal: { text: string | null; status: string; submittedAt: string | null };
}
