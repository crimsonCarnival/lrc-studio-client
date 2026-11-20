import { profilePath } from '@/features/profile/profile-path';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
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

const XP_STEPS = [50, 100, 500];

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
  const userId = user.id || user._id;

  // Support work starts from an identifier: the account name to search, the id for the logs,
  // the IP for the network blocks.
  const copyable = [
    { key: 'accountName', label: t('admin.table.copyAccountName'), value: user.accountName },
    { key: 'id', label: t('admin.table.copyUserId'), value: userId },
    { key: 'ip', label: t('admin.table.copyIp'), value: user.lastIp },
  ].filter((c): c is { key: string; label: string; value: string } => !!c.value);
  const copy = (value: string) => {
    navigator.clipboard.writeText(value)
      .then(() => toast.success(t('admin.table.copied')))
      .catch(() => {});
  };
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

        {copyable.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Icon name="content_copy" />
              {t('admin.table.copy')}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {copyable.map((c) => (
                <ContextMenuItem key={c.key} onClick={() => copy(c.value)}>
                  <span className="flex-1">{c.label}</span>
                  <span className="max-w-40 truncate pl-3 font-mono text-xs text-subtle">{c.value}</span>
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

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
                      disabled={user.role === r}
                      data-active={user.role === r}
                    >
                      {tk(`admin.table.${r}`)}
                      {user.role === r && <Icon name="check" className="ml-auto" />}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}

            {/* An amount is picked, never assumed: a stray click used to grant 100 XP outright. */}
            {can.adjustXp && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Icon name="bolt" />
                  {t('admin.table.adjustXp')}
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {XP_STEPS.map((n) => (
                    <ContextMenuItem key={`grant-${n}`} onClick={() => handleAdjustXP('grant', n, 'user', userId)}>
                      <Icon name="add" />
                      {t('admin.table.grantXp', { amount: n })}
                    </ContextMenuItem>
                  ))}
                  <ContextMenuSeparator />
                  {XP_STEPS.map((n) => (
                    <ContextMenuItem key={`revoke-${n}`} variant="destructive" onClick={() => handleAdjustXP('revoke', n, 'user', userId)}>
                      <Icon name="remove" />
                      {t('admin.table.revokeXp', { amount: n })}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
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
                <Icon name="info" />
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
