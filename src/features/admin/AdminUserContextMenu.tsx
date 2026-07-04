import { useTranslation } from 'react-i18next';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuLabel,
} from '@ui/context-menu';
import { Icon } from '@/shared/ui/Icon';
import { ROLE_RANK, userHasPermission, type Role } from '@/features/auth/permissions';
import { adminShadowBan, adminUnshadowBan } from '@/features/settings/services/preferences.service';
import toast from 'react-hot-toast';

interface AdminUser {
  id?: string;
  _id?: string;
  accountName?: string;
  role?: string;
  ban?: { active?: boolean };
  appeal?: { status?: string };
  isDeleted?: boolean;
  shadowBanned?: boolean;
  lastIp?: string;
  lastDeviceId?: string;
  [key: string]: unknown;
}

interface Props {
  children: React.ReactNode;
  user: AdminUser;
  myRank: number;
  myPermissions?: string[] | null;
  canAssignRoles: boolean;
  assignableRoles: string[];
  handleChangeRole: (user: AdminUser, role: string) => void;
  handleToggleBan: (user: AdminUser) => void;
  handleReactivate: (user: AdminUser) => void;
  handleDelete: (user: AdminUser) => void;
  setAppealModal: (state: { isOpen: boolean; user: AdminUser }) => void;
  handleAdjustXP: (action: 'grant' | 'revoke', amount: number, type: string, id?: string) => void;
  handleBlockIpDirect: (user: AdminUser) => void;
  handleBlockDeviceDirect: (user: AdminUser) => void;
  onRefresh?: () => void;
}

export function AdminUserContextMenu({
  children,
  user,
  myRank,
  myPermissions,
  canAssignRoles,
  assignableRoles,
  handleChangeRole,
  handleToggleBan,
  handleReactivate,
  handleDelete,
  setAppealModal,
  handleAdjustXP,
  handleBlockIpDirect,
  handleBlockDeviceDirect,
  onRefresh,
}: Props) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;

  const targetRank = ROLE_RANK[(user.role as Role) ?? 'user'] ?? 0;
  const canAct = targetRank < myRank;
  const canShadowBan = userHasPermission(myPermissions, 'users.shadowban');

  const handleShadowBan = async () => {
    const userId = user.id || user._id;
    if (!userId) return;
    try {
      await adminShadowBan(userId, true, true, null);
      onRefresh?.();
    } catch {
      toast.error(t('admin.toast.statusError'));
    }
  };

  const handleUnshadowBan = async () => {
    const userId = user.id || user._id;
    if (!userId) return;
    try {
      await adminUnshadowBan(userId);
      onRefresh?.();
    } catch {
      toast.error(t('admin.toast.statusError'));
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>{user.accountName ?? '—'}</ContextMenuLabel>

        <ContextMenuItem onClick={() => window.open(`/u/${user.accountName}`, '_blank')}>
          <Icon name="open_in_new" />
          {t('admin.table.viewProfile', 'View profile')}
        </ContextMenuItem>

        {canAct && (
          <>
            <ContextMenuSeparator />

            {canAssignRoles && assignableRoles.length > 0 && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Icon name="how_to_reg" />
                  {t('admin.table.changeRole', 'Change role')}
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {assignableRoles.map(r => (
                    <ContextMenuItem
                      key={r}
                      onClick={() => handleChangeRole(user, r)}
                      data-active={user.role === r}
                    >
                      {tk(`admin.table.${r}`)}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}

            <ContextMenuItem onClick={() => handleAdjustXP('grant', 100, 'user', user.id || user._id)}>
              <Icon name="bolt" />
              {t('admin.table.adjustXp', 'Adjust XP')}
            </ContextMenuItem>

            <ContextMenuSeparator />

            {user.isDeleted ? (
              <ContextMenuItem onClick={() => handleReactivate(user)}>
                <Icon name="undo" />
                {t('admin.table.reactivate')}
              </ContextMenuItem>
            ) : (
              <>
                {user.appeal?.status === 'pending' ? (
                  <ContextMenuItem onClick={() => setAppealModal({ isOpen: true, user })}>
                    {t('admin.table.reviewAppeal')}
                  </ContextMenuItem>
                ) : user.ban?.active ? (
                  <ContextMenuItem onClick={() => handleToggleBan(user)}>
                    <Icon name="how_to_reg" />
                    {t('admin.table.unban')}
                  </ContextMenuItem>
                ) : (
                  <ContextMenuItem variant="destructive" onClick={() => handleToggleBan(user)}>
                    <Icon name="block" />
                    {t('admin.table.ban')}
                  </ContextMenuItem>
                )}

                {canShadowBan && (
                  user.shadowBanned ? (
                    <ContextMenuItem onClick={handleUnshadowBan}>
                      <Icon name="visibility" />
                      {t('admin.table.unshadowBan')}
                    </ContextMenuItem>
                  ) : (
                    <ContextMenuItem variant="destructive" onClick={handleShadowBan}>
                      <Icon name="visibility_off" />
                      {t('admin.table.shadowBan')}
                    </ContextMenuItem>
                  )
                )}

                {user.lastIp && (
                  <ContextMenuItem variant="destructive" onClick={() => handleBlockIpDirect(user)}>
                    <Icon name="language" />
                    {t('admin.table.blockIp')}
                  </ContextMenuItem>
                )}

                {user.lastDeviceId && (
                  <ContextMenuItem variant="destructive" onClick={() => handleBlockDeviceDirect(user)}>
                    <Icon name="gpp_bad" />
                    {t('admin.table.blockDevice')}
                  </ContextMenuItem>
                )}
              </>
            )}

            <ContextMenuSeparator />

            <ContextMenuItem variant="destructive" onClick={() => handleDelete(user)}>
              <Icon name="delete" />
              {tk('admin.table.delete')}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
