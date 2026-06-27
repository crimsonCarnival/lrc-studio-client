import { useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Globe, ShieldAlert } from 'lucide-react';
import AdminUsersTab from './AdminUsersTab';
import AdminIpsTab from './AdminIpsTab';
import AdminDevicesTab from './AdminDevicesTab';
import { userHasPermission } from '@/features/auth/permissions';

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

  const defaultView: ModerationView = canViewUsers ? 'users' : canBlockNetwork ? 'ips' : 'users';
  const [view, setView] = useState<ModerationView>(defaultView);

  const subNav: { id: ModerationView; icon: typeof Users; label: string; visible: boolean }[] = [
    { id: 'users',   icon: Users,       label: t('admin.moderation.viewUsers'),   visible: canViewUsers },
    { id: 'ips',     icon: Globe,       label: t('admin.moderation.viewIps'),     visible: canBlockNetwork },
    { id: 'devices', icon: ShieldAlert, label: t('admin.moderation.viewDevices'), visible: canBlockNetwork },
  ];

  const visibleNav = subNav.filter(n => n.visible);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Inner sub-nav */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-zinc-800/40">
        {visibleNav.map(nav => (
          <button
            key={nav.id}
            onClick={() => setView(nav.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-md border-b-2 -mb-px transition-colors whitespace-nowrap ${
              view === nav.id
                ? 'border-primary/70 text-primary bg-primary/5'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <nav.icon className="size-3.5 shrink-0" />
            {nav.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {view === 'users' && canViewUsers && (
          <AdminUsersTab
            users={props.users as Parameters<typeof AdminUsersTab>[0]['users']}
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
