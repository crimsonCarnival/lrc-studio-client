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
import { ExternalLink, Zap, Ban, Undo2, Globe, ShieldAlert, Trash2, UserCheck } from 'lucide-react';
import { ROLE_RANK, type Role } from '@/features/auth/permissions';

interface AdminUser {
  id?: string;
  _id?: string;
  accountName?: string;
  role?: string;
  ban?: { active?: boolean };
  appeal?: { status?: string };
  isDeleted?: boolean;
  lastIp?: string;
  lastDeviceId?: string;
  [key: string]: unknown;
}

interface Props {
  children: React.ReactNode;
  user: AdminUser;
  myRank: number;
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
}

export function AdminUserContextMenu({
  children,
  user,
  myRank,
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
}: Props) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;

  const targetRank = ROLE_RANK[(user.role as Role) ?? 'user'] ?? 0;
  const canAct = targetRank < myRank;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>{user.accountName ?? '—'}</ContextMenuLabel>

        <ContextMenuItem onClick={() => window.open(`/u/${user.accountName}`, '_blank')}>
          <ExternalLink />
          {t('admin.table.viewProfile', 'View profile')}
        </ContextMenuItem>

        {canAct && (
          <>
            <ContextMenuSeparator />

            {canAssignRoles && assignableRoles.length > 0 && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <UserCheck />
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
              <Zap />
              {t('admin.table.adjustXp', 'Adjust XP')}
            </ContextMenuItem>

            <ContextMenuSeparator />

            {user.isDeleted ? (
              <ContextMenuItem onClick={() => handleReactivate(user)}>
                <Undo2 />
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
                    <UserCheck />
                    {t('admin.table.unban')}
                  </ContextMenuItem>
                ) : (
                  <ContextMenuItem variant="destructive" onClick={() => handleToggleBan(user)}>
                    <Ban />
                    {t('admin.table.ban')}
                  </ContextMenuItem>
                )}

                {user.lastIp && (
                  <ContextMenuItem variant="destructive" onClick={() => handleBlockIpDirect(user)}>
                    <Globe />
                    {t('admin.table.blockIp')}
                  </ContextMenuItem>
                )}

                {user.lastDeviceId && (
                  <ContextMenuItem variant="destructive" onClick={() => handleBlockDeviceDirect(user)}>
                    <ShieldAlert />
                    {t('admin.table.blockDevice')}
                  </ContextMenuItem>
                )}
              </>
            )}

            <ContextMenuSeparator />

            <ContextMenuItem variant="destructive" onClick={() => handleDelete(user)}>
              <Trash2 />
              {tk('admin.table.delete')}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
