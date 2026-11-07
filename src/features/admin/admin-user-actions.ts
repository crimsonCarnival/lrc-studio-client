import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ROLE_RANK, userHasPermission, type Role } from '@/features/auth/permissions';
import { adminShadowBan, adminUnshadowBan } from '@/features/settings/services/preferences.service';
import { withSudo, isSudoCancelled } from '@/features/admin/services/sudo';
import type { AdminUser } from '@/features/admin/admin.types';

/** What the signed-in staff member may do to others: their rank and permissions, UI-only (the server re-checks). */
export type AdminActorAccess = {
  myRank: number;
  myPermissions?: string[] | null;
  canAssignRoles: boolean;
  assignableRoles: string[];
};

export type AdminUserHandlers = {
  handleChangeRole: (user: AdminUser, role: string) => void;
  handleToggleBan: (user: AdminUser) => void;
  handleReactivate: (user: AdminUser) => void;
  handleDelete: (user: AdminUser) => void;
  setAppealModal: (state: { isOpen: boolean; user: AdminUser }) => void;
  handleAdjustXP: (action: 'grant' | 'revoke', amount: number, type: string, id?: string) => void;
  handleBlockIpDirect: (user: AdminUser) => void;
  handleBlockDeviceDirect: (user: AdminUser) => void;
};

/**
 * Which actions exist for a user row. One source for the long-press menu and the phone
 * card's visible buttons, so the two can never disagree. Acting needs a rank strictly
 * above the target's, which also rules out acting on yourself.
 */
export function availableUserActions(user: AdminUser, { myRank, myPermissions, canAssignRoles, assignableRoles }: AdminActorAccess) {
  const canAct = (ROLE_RANK[(user.role as Role) ?? 'user'] ?? 0) < myRank;
  const live = canAct && !user.isDeleted;
  const pendingAppeal = user.appeal?.status === 'pending';
  const banned = !!user.ban?.active;
  const canShadowBan = userHasPermission(myPermissions, 'users.shadowban');
  return {
    profile: true,
    canAct,
    changeRole: canAct && canAssignRoles && assignableRoles.length > 0,
    adjustXp: canAct,
    reactivate: canAct && !!user.isDeleted,
    reviewAppeal: live && pendingAppeal,
    unban: live && !pendingAppeal && banned,
    ban: live && !pendingAppeal && !banned,
    shadowBan: live && canShadowBan && !user.shadowBanned,
    unshadowBan: live && canShadowBan && !!user.shadowBanned,
    blockIp: live && !!user.lastIp,
    blockDevice: live && !!user.lastDeviceId,
    delete: canAct,
  };
}

/** Sudo-guarded shadow ban and lift for a user row. */
export function useShadowBanActions(onRefresh?: () => void) {
  const { t } = useTranslation();
  const run = async (user: AdminUser, act: (id: string) => Promise<unknown>) => {
    const userId = user.id || user._id;
    if (!userId) return;
    try {
      await withSudo(() => act(userId));
      onRefresh?.();
    } catch (err) {
      if (!isSudoCancelled(err)) toast.error(t('admin.toast.statusError'));
    }
  };
  return {
    shadowBan: (user: AdminUser) => run(user, (id) => adminShadowBan(id, true, true, null)),
    unshadowBan: (user: AdminUser) => run(user, (id) => adminUnshadowBan(id)),
  };
}
