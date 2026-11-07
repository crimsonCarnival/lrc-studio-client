import { profilePath } from '@/features/profile/profile-path';
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
import { availableUserActions, useShadowBanActions, type AdminActorAccess, type AdminUserHandlers } from './admin-user-actions';
import type { AdminUser } from '@/features/admin/admin.types';

type Props = AdminActorAccess & AdminUserHandlers & {
  children: React.ReactNode;
  user: AdminUser;
  onRefresh?: () => void;
};

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

  const can = availableUserActions(user, { myRank, myPermissions, canAssignRoles, assignableRoles });
  const { shadowBan, unshadowBan } = useShadowBanActions(onRefresh);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>{user.accountName ?? '—'}</ContextMenuLabel>

        <ContextMenuItem asChild>
          <a href={profilePath(user.accountName)} target="_blank" rel="noopener noreferrer">
            <Icon name="open_in_new" />
            {t('admin.table.viewProfile')}
          </a>
        </ContextMenuItem>

        {can.canAct && (
          <>
            <ContextMenuSeparator />

            {can.changeRole && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Icon name="how_to_reg" />
                  {t('admin.table.changeRole')}
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

            {can.adjustXp && (
              <ContextMenuItem onClick={() => handleAdjustXP('grant', 100, 'user', user.id || user._id)}>
                <Icon name="bolt" />
                {t('admin.table.adjustXp')}
              </ContextMenuItem>
            )}

            <ContextMenuSeparator />

            {can.reactivate && (
              <ContextMenuItem onClick={() => handleReactivate(user)}>
                <Icon name="undo" />
                {t('admin.table.reactivate')}
              </ContextMenuItem>
            )}
            {can.reviewAppeal && (
              <ContextMenuItem onClick={() => setAppealModal({ isOpen: true, user })}>
                {t('admin.table.reviewAppeal')}
              </ContextMenuItem>
            )}
            {can.unban && (
              <ContextMenuItem onClick={() => handleToggleBan(user)}>
                <Icon name="how_to_reg" />
                {t('admin.table.unban')}
              </ContextMenuItem>
            )}
            {can.ban && (
              <ContextMenuItem variant="destructive" onClick={() => handleToggleBan(user)}>
                <Icon name="block" />
                {t('admin.table.ban')}
              </ContextMenuItem>
            )}
            {can.unshadowBan && (
              <ContextMenuItem onClick={() => unshadowBan(user)}>
                <Icon name="visibility" />
                {t('admin.table.unshadowBan')}
              </ContextMenuItem>
            )}
            {can.shadowBan && (
              <ContextMenuItem variant="warning" onClick={() => shadowBan(user)}>
                <Icon name="visibility_off" />
                {t('admin.table.shadowBan')}
              </ContextMenuItem>
            )}
            {can.blockIp && (
              <ContextMenuItem variant="warning" onClick={() => handleBlockIpDirect(user)}>
                <Icon name="language" />
                {t('admin.table.blockIp')}
              </ContextMenuItem>
            )}
            {can.blockDevice && (
              <ContextMenuItem variant="warning" onClick={() => handleBlockDeviceDirect(user)}>
                <Icon name="gpp_bad" />
                {t('admin.table.blockDevice')}
              </ContextMenuItem>
            )}

            <ContextMenuSeparator />

            {can.delete && (
              <ContextMenuItem variant="destructive" onClick={() => handleDelete(user)}>
                <Icon name="delete" />
                {tk('admin.table.delete')}
              </ContextMenuItem>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
