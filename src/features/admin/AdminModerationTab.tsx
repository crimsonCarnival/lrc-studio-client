import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import AdminUsersTab from './AdminUsersTab';
import AdminIpsTab from './AdminIpsTab';
import AdminDevicesTab from './AdminDevicesTab';
import { userHasPermission } from '@/features/auth/permissions';
import { useAdminSub } from './admin-nav';
import { AdminSubNav } from './AdminSubNav';

interface AdminUser {
  id?: string;
  _id?: string;
  role?: string;
  displayName?: string;
  accountName?: string;
  ban?: { active?: boolean; reason?: string } | null;
  lastIp?: string;
  lastDeviceId?: string;
  lastDeviceName?: string;
  [key: string]: unknown;
}

interface AdminModerationTabProps {
  // Users sub-tab
  users: AdminUser[];
  currentUser?: { id?: string; _id?: string; role?: string; permissions?: string[] } | null;
  search: string;
  setSearch: (v: string) => void;
  roleFilter: string;
  setRoleFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  handleChangeRole: (user: AdminUser, role: string) => void;
  handleToggleBan: (user: AdminUser) => void;
  handleReactivate: (user: AdminUser) => void;
  handleDelete: (user: AdminUser) => void;
  setAppealModal: (state: { isOpen: boolean; user: AdminUser }) => void;
  handleAdjustXP: (action: 'grant' | 'revoke', amount: number, type: string, id?: string) => void;
  handleBlockIpDirect: (user: AdminUser) => void;
  handleBlockDeviceDirect: (user: AdminUser) => void;
  onRefresh?: () => void;
  page: number;
  hasMore?: boolean;
  hasPrev?: boolean;
  totalUsers?: number | null;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  // IPs sub-tab
  ipForm: { ip: string; reason: string };
  setIpForm: Dispatch<SetStateAction<{ ip: string; reason: string }>>;
  handleBlockIp: (e: FormEvent) => void;
  handleUnblockIp: (ipId: string) => void;
  bannedIps: unknown[];
  // Devices sub-tab
  deviceForm: { deviceId: string; reason: string };
  setDeviceForm: Dispatch<SetStateAction<{ deviceId: string; reason: string }>>;
  handleBlockDevice: (e: FormEvent) => void;
  handleUnblockDevice: (deviceId: string) => void;
  bannedDevices: unknown[];
}

type ModerationView = 'users' | 'ips' | 'devices';

export default function AdminModerationTab(props: AdminModerationTabProps) {
  const { t } = useTranslation();
  const { currentUser } = props;

  const canViewUsers = userHasPermission(currentUser?.permissions, 'users.view');
  const canBlockNetwork = userHasPermission(currentUser?.permissions, 'network.block');

  const subNav: { id: ModerationView; icon: string; label: string; visible: boolean }[] = [
    { id: 'users',   icon: 'group',     label: t('admin.moderation.viewUsers'),   visible: canViewUsers },
    { id: 'ips',     icon: 'language',  label: t('admin.moderation.viewIps'),     visible: canBlockNetwork },
    { id: 'devices', icon: 'gpp_bad',   label: t('admin.moderation.viewDevices'), visible: canBlockNetwork },
  ];

  const visibleNav = subNav.filter(n => n.visible);
  // Which sub-view is open is in the URL (/admin/moderation/ips); a view the user cannot see falls back to the first they can.
  const view = useAdminSub('moderation', visibleNav.length ? visibleNav.map(n => n.id) : ['users']) as ModerationView;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AdminSubNav tab="moderation" items={visibleNav} current={view} />

      {/* Sub-tab content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {view === 'users' && canViewUsers && (
          <AdminUsersTab
            users={props.users as Parameters<typeof AdminUsersTab>[0]['users']}
            page={props.page}
            currentUser={props.currentUser}
            search={props.search}
            setSearch={props.setSearch}
            roleFilter={props.roleFilter}
            setRoleFilter={props.setRoleFilter}
            statusFilter={props.statusFilter}
            setStatusFilter={props.setStatusFilter}
            handleChangeRole={props.handleChangeRole}
            handleToggleBan={props.handleToggleBan}
            handleReactivate={props.handleReactivate}
            handleDelete={props.handleDelete}
            setAppealModal={props.setAppealModal}
            handleAdjustXP={props.handleAdjustXP}
            handleBlockIpDirect={props.handleBlockIpDirect}
            handleBlockDeviceDirect={props.handleBlockDeviceDirect}
            onRefresh={props.onRefresh}
            hasMore={props.hasMore}
            hasPrev={props.hasPrev}
            totalUsers={props.totalUsers}
            onNextPage={props.onNextPage}
            onPrevPage={props.onPrevPage}
          />
        )}
        {view === 'ips' && canBlockNetwork && (
          <AdminIpsTab
            ipForm={props.ipForm}
            setIpForm={props.setIpForm}
            handleBlockIp={props.handleBlockIp}
            handleUnblockIp={props.handleUnblockIp}
            bannedIps={props.bannedIps as Parameters<typeof AdminIpsTab>[0]['bannedIps']}
          />
        )}
        {view === 'devices' && canBlockNetwork && (
          <AdminDevicesTab
            deviceForm={props.deviceForm}
            setDeviceForm={props.setDeviceForm}
            handleBlockDevice={props.handleBlockDevice}
            handleUnblockDevice={props.handleUnblockDevice}
            bannedDevices={props.bannedDevices as Parameters<typeof AdminDevicesTab>[0]['bannedDevices']}
          />
        )}
      </div>
    </div>
  );
}
