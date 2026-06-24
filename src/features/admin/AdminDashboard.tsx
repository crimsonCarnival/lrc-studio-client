import { useState, useEffect, useRef, useMemo } from 'react';
import type { ComponentProps, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { admin } from '@/app/api';
import { isSudoCancelled } from './services/sudo';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { userHasPermission, type Permission } from '@/features/auth/permissions';
import { Button } from '@ui/button';
import { ShieldAlert, RefreshCw, Users, History, Award, Zap, Sparkles, Inbox, UsersRound } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '@shared/ui/ConfirmModal';
import BanUserModal from './BanUserModal';
import AppealDetailsModal from './AppealDetailsModal';
import AdminStatsCards from './AdminStatsCards';
import AdminModerationTab from './AdminModerationTab';
import AdminStaffTab from './AdminStaffTab';
import AdminAuditTab from './AdminAuditTab';
import AdminBadgesTab from './AdminBadgesTab';
import AdminLevelsTab from './AdminLevelsTab';
import AdminXpTab from './AdminXpTab';
import AdminRequestsTab from './AdminRequestsTab';
import { requestsApi } from './services/requests.service';
import SudoPasswordModal from './SudoPasswordModal';

interface AdminUser {
  id?: string;
  _id?: string;
  role?: string;
  displayName?: string;
  accountName?: string;
  ban?: { active?: boolean } | null;
  lastIp?: string;
  lastDeviceId?: string;
  [key: string]: unknown;
}

interface ConfirmModalState {
  isOpen: boolean;
  type: string;
  user?: AdminUser | null;
  ipId?: string | null;
  deviceId?: string | null;
  role?: string | null;
  blockIp?: string | null;
  blockDeviceId?: string | null;
}

interface BanConfirmData {
  reason?: string;
  bannedUntil?: string | null;
  banIp?: boolean;
  banDevice?: boolean;
}

// Resolve a user's id across the id/_id duality the API returns.
const uid = (u?: AdminUser | null): string => u?.id || u?._id || '';

export default function AdminDashboard() {
  const { t } = useTranslation();
  // Loose alias for interpolation calls with numeric values (typed-i18n options are strict).
  const tk = t as (k: string, o?: Record<string, unknown>) => string;
  const { user: currentUser } = useAuthContext();
  // Request types this user may submit — drives propose-mode tab visibility.
  const [submittable, setSubmittable] = useState<string[]>([]);
  useEffect(() => {
    requestsApi.capabilities().then(c => setSubmittable(c.submittable)).catch(() => {});
  }, []);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'moderation';

  const setActiveTab = (tab: string) => {
    setSearchParams(prev => {
      prev.set('tab', tab);
      return prev;
    }, { replace: true });
  };

  // Tabs are gated by permission — a mod sees only moderation tabs, etc.
  const visibleTabs = useMemo(() => {
    const defs: { id: string; icon: typeof Users; label: string; perm?: Permission }[] = [
      { id: 'moderation', icon: ShieldAlert, label: t('admin.dashboard.tabs.moderation'), perm: 'users.view' },
      { id: 'staff',      icon: UsersRound,  label: t('admin.dashboard.tabs.staff') },
      { id: 'audit',      icon: History,     label: t('admin.dashboard.tabs.auditLogs'),  perm: 'audit.view' },
      { id: 'badges',     icon: Award,       label: t('admin.dashboard.tabs.badges'),     perm: 'badges.manage' },
      { id: 'levels',     icon: Zap,         label: t('admin.dashboard.tabs.levels'),     perm: 'levels.manage' },
      { id: 'xp',         icon: Sparkles,    label: t('admin.dashboard.tabs.xp'),         perm: 'xp.adjust' },
    ];
    const canProposeBadges = submittable.some(ty => ty.startsWith('badge_'));
    const canProposeLevels = submittable.some(ty => ty.startsWith('level_'));
    const isNetworkOnly = !userHasPermission(currentUser?.permissions, 'users.view') && userHasPermission(currentUser?.permissions, 'network.block');
    const gated = defs.filter(tab => {
      if (tab.id === 'moderation') return userHasPermission(currentUser?.permissions, 'users.view') || userHasPermission(currentUser?.permissions, 'network.block');
      if (tab.id === 'staff') return !isNetworkOnly; // all staff except network-only roles
      if (tab.perm && userHasPermission(currentUser?.permissions, tab.perm)) return true;
      if (tab.id === 'badges' && canProposeBadges) return true;
      if (tab.id === 'levels' && canProposeLevels) return true;
      return false;
    });
    gated.push({ id: 'requests', icon: Inbox, label: t('admin.dashboard.tabs.requests') });
    return gated;
  }, [t, currentUser?.permissions, submittable]);

  // If the URL points at a tab the user can't access, fall back to the first
  // permitted one.
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(tab => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, visibleTabs]);

  // Data States
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<unknown>(null);
  const [bannedIps, setBannedIps] = useState<unknown[]>([]);
  const [bannedDevices, setBannedDevices] = useState<unknown[]>([]);
  const [auditLogs, setAuditLogs] = useState<unknown[]>([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ipForm, setIpForm] = useState({ ip: '', reason: '' });
  const [deviceForm, setDeviceForm] = useState({ deviceId: '', reason: '' });

  // Cursor-based pagination state
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<(string | null)[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);

  // Modal States
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({ isOpen: false, type: '', user: null, ipId: null, deviceId: null });
  const [banModal, setBanModal] = useState<{ isOpen: boolean; user: AdminUser | null }>({ isOpen: false, user: null });
  const [appealModal, setAppealModal] = useState<{ isOpen: boolean; user: AdminUser | null }>({ isOpen: false, user: null });
  // Track whether stats have been fetched at least once (avoid re-fetching on tab switch)
  const statsFetchedRef = useRef(false);

  const fetchStats = async () => {
    try {
      const data = await admin.getStats();
      setStats(data);
      statsFetchedRef.current = true;
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchUsers = async (fetchCursor: string | null = cursor) => {
    setLoading(true);
    try {
      const params: { search: string; role: string; status: string; cursor?: string } = { search, role: roleFilter, status: statusFilter };
      if (fetchCursor) params.cursor = fetchCursor;
      const data = await admin.getUsers(params) as { users: AdminUser[]; hasMore?: boolean; total?: number | null };
      setUsers(data.users);
      setHasMore(data.hasMore ?? false);
      if (data.total !== null && data.total !== undefined) setTotalUsers(data.total);
    } catch {
      toast.error(t('admin.toast.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchIps = async () => {
    setLoading(true);
    try {
      const data = await admin.getBannedIps() as unknown[];
      setBannedIps(data);
    } catch {
      toast.error(t('admin.toast.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const data = await admin.getBannedDevices() as unknown[];
      setBannedDevices(data);
    } catch {
      toast.error(t('admin.toast.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const { logs } = await admin.getAuditLogs({ limit: '50' }) as { logs: unknown[] };
      setAuditLogs(logs);
    } catch {
      toast.error(t('admin.toast.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats once on mount (not on every tab switch) and fetch tab data in parallel
  const fetchData = (forceStats = false) => {
    if (!statsFetchedRef.current || forceStats) fetchStats();
    if (activeTab === 'moderation') { fetchUsers(); fetchIps(); fetchDevices(); }
    else if (activeTab === 'audit') fetchAuditLogs();
  };

  // On mount: fetch stats + initial tab data in parallel
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      // Parallel: stats and initial tab content
      fetchStats();
    }
    // Tab content always refreshes on tab switch
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeTab === 'moderation') { fetchUsers(); fetchIps(); fetchDevices(); }
    else if (activeTab === 'audit') fetchAuditLogs();
    // badges and levels tabs manage their own data fetching
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'moderation') return;
    const timer = setTimeout(() => {
      // Reset to first page when filters change
      setCursor(null);
      setCursorStack([]);
      fetchUsers(null);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, statusFilter]);

  const handleNextPage = () => {
    const last = users[users.length - 1];
    const nextCursor = last?._id?.toString() || last?.id;
    if (!nextCursor) return;
    setCursorStack(prev => [...prev, cursor]);
    setCursor(nextCursor);
    fetchUsers(nextCursor);
  };

  const handlePrevPage = () => {
    const prevCursor = cursorStack[cursorStack.length - 1] ?? null;
    setCursorStack(prev => prev.slice(0, -1));
    setCursor(prevCursor);
    fetchUsers(prevCursor);
  };

  const handleAdjustXP = async (action: string, amount: number, target: string, userId?: string, userIds?: string[]) => {
    try {
      const result = await admin.adjustXP({ action, amount, target, userId, userIds }) as { affected?: number };
      toast.success(tk(action === 'grant' ? 'admin.xp.grantedXp' : 'admin.xp.revokedXp', { amount, count: result.affected }));
      refreshUsersFromStart();
    } catch (err) {
      if (!isSudoCancelled(err)) toast.error(t('admin.xp.failedAdjust'));
    }
  };

  const refreshUsersFromStart = () => {
    setCursor(null);
    setCursorStack([]);
    fetchUsers(null);
  };

  const handleToggleBan = async (user: AdminUser) => {
    if (user.id === currentUser?.id || user._id === currentUser?._id) {
      toast.error(t('admin.toast.noSelfAction'));
      return;
    }

    if (user.ban?.active) {
      try {
        await admin.unbanUser(uid(user));
        toast.success(t('admin.toast.unbannedSuccess', { name: user.displayName || user.accountName }));
        setAppealModal({ isOpen: false, user: null });
        refreshUsersFromStart();
      } catch (err) {
        if (!isSudoCancelled(err)) toast.error(t('admin.toast.statusError'));
      }
    } else {
      setBanModal({ isOpen: true, user });
    }
  };

  const handleRejectAppeal = async (user: AdminUser) => {
    try {
      await admin.rejectAppeal(uid(user));
      toast.success(t('admin.toast.appealRejectedSuccess', { name: user.displayName || user.accountName }));
      setAppealModal({ isOpen: false, user: null });
      refreshUsersFromStart();
    } catch (err) {
      if (!isSudoCancelled(err)) toast.error(t('admin.toast.statusError'));
    }
  };

  const handleReactivate = async (user: AdminUser) => {
    try {
      await admin.reactivateUser(uid(user));
      toast.success(t('admin.toast.reactivateSuccess', { name: user.displayName || user.accountName }));
      refreshUsersFromStart();
    } catch (err) {
      if (!isSudoCancelled(err)) toast.error(t('admin.toast.statusError'));
    }
  };

  const onBanConfirm = async ({ reason, bannedUntil, banIp, banDevice }: BanConfirmData) => {
    const { user } = banModal;
    if (!user) return;
    setBanModal({ isOpen: false, user: null });
    try {
      await admin.banUser(uid(user), { reason, bannedUntil, banIp, banDevice } as Parameters<typeof admin.banUser>[1]);
      toast.success(t('admin.toast.bannedSuccess', { name: user.displayName || user.accountName }));
      refreshUsersFromStart();
      fetchStats();
    } catch (err) {
      if (!isSudoCancelled(err)) toast.error(t('admin.toast.statusError'));
    }
  };

  const handleChangeRole = (user: AdminUser, role: string) => {
    if (user.id === currentUser?.id || user._id === currentUser?._id) {
      toast.error(t('admin.toast.noSelfAction'));
      return;
    }
    if (!role || role === user.role) return;
    setConfirmModal({ isOpen: true, type: 'role', user, role });
  };

  const handleDelete = (user: AdminUser) => {
    if (user.id === currentUser?.id || user._id === currentUser?._id) {
      toast.error(t('admin.toast.noSelfAction'));
      return;
    }
    setConfirmModal({ isOpen: true, type: 'delete', user });
  };

  const handleBlockIpDirect = (user: AdminUser) => {
    if (!user.lastIp) return;
    setConfirmModal({ isOpen: true, type: 'block_ip_direct', user, blockIp: user.lastIp });
  };

  const handleBlockDeviceDirect = (user: AdminUser) => {
    if (!user.lastDeviceId) return;
    setConfirmModal({ isOpen: true, type: 'block_device_direct', user, blockDeviceId: user.lastDeviceId });
  };

  const handleBlockIp = async (e: FormEvent) => {
    e.preventDefault();
    if (!ipForm.ip) return;
    try {
      await admin.blockIp(ipForm.ip, ipForm.reason);
      toast.success(t('admin.toast.ipBlocked'));
      setIpForm({ ip: '', reason: '' });
      fetchIps();
      fetchStats();
    } catch (err) {
      if (!isSudoCancelled(err)) toast.error(t('admin.toast.ipBlockError'));
    }
  };

  const handleUnblockIp = (ipId: string) => {
    setConfirmModal({ isOpen: true, type: 'unblock_ip', ipId });
  };

  const handleBlockDevice = async (e: FormEvent) => {
    e.preventDefault();
    if (!deviceForm.deviceId) return;
    try {
      await admin.blockDevice(deviceForm.deviceId, deviceForm.reason);
      toast.success(t('admin.toast.deviceBlocked'));
      setDeviceForm({ deviceId: '', reason: '' });
      fetchDevices();
      fetchStats();
    } catch (err) {
      if (!isSudoCancelled(err)) toast.error(t('admin.toast.deviceBlockError'));
    }
  };

  const handleUnblockDevice = (deviceId: string) => {
    setConfirmModal({ isOpen: true, type: 'unblock_device', deviceId });
  };

  const onConfirmAction = async () => {
    const { type, user, ipId, deviceId, role, blockIp, blockDeviceId } = confirmModal;
    setConfirmModal({ isOpen: false, type: '', user: null, ipId: null, deviceId: null, blockIp: null, blockDeviceId: null });

    try {
      if (type === 'role') {
        const newRole = role ?? 'user';
        await admin.changeRole(uid(user), newRole);
        toast.success(t('admin.toast.roleSuccess', { name: user?.displayName || user?.accountName, role: tk(`admin.table.${newRole}`) }));
      } else if (type === 'delete') {
        await admin.deleteUser(uid(user));
        toast.success(t('admin.toast.deleteSuccess', { name: user?.displayName || user?.accountName }));
      } else if (type === 'unblock_ip') {
        await admin.unblockIp(ipId ?? "");
        toast.success(t('admin.toast.ipUnblocked'));
        fetchIps();
        fetchStats();
      } else if (type === 'unblock_device') {
        await admin.unblockDevice(deviceId ?? "");
        toast.success(t('admin.toast.deviceUnblocked'));
        fetchDevices();
        fetchStats();
      } else if (type === 'block_ip_direct') {
        const reason = `${t('admin.table.blockIpAutoReason')}: ${user?.accountName ?? user?.displayName ?? ''}`;
        await admin.blockIp(blockIp ?? '', reason);
        toast.success(t('admin.toast.ipBlocked'));
        fetchIps();
        fetchStats();
      } else if (type === 'block_device_direct') {
        const reason = `${t('admin.table.blockIpAutoReason')}: ${user?.accountName ?? user?.displayName ?? ''}`;
        await admin.blockDevice(blockDeviceId ?? '', reason);
        toast.success(t('admin.toast.deviceBlocked'));
        fetchDevices();
        fetchStats();
      }
      refreshUsersFromStart();
    } catch (err) {
      if (!isSudoCancelled(err)) toast.error(t('admin.toast.statusError'));
    }
  };

  return (
    <div className="flex flex-col h-full pt-0 p-6 overflow-y-auto custom-scrollbar">
      {/* Refresh — the page title now lives in the app header */}
      <div className="flex items-center justify-end mb-4">
        <Button variant="ghost" size="icon" onClick={() => fetchData(true)} className="h-9 w-9 shrink-0">
          <RefreshCw className={`size-4 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats Cards */}
      <AdminStatsCards stats={stats as ComponentProps<typeof AdminStatsCards>["stats"]} />

      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-zinc-800/60 contrast-more:border-zinc-600 mb-4 overflow-x-auto">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
            }`}
          >
            <tab.icon className="size-3.5 shrink-0" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col min-h-[400px]">
        {activeTab === 'moderation' && (
          <AdminModerationTab
            users={users as ComponentProps<typeof AdminModerationTab>["users"]}
            currentUser={currentUser}
            search={search}
            setSearch={setSearch}
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            handleChangeRole={handleChangeRole}
            handleToggleBan={handleToggleBan}
            handleReactivate={handleReactivate}
            handleDelete={handleDelete}
            setAppealModal={setAppealModal}
            handleAdjustXP={handleAdjustXP}
            handleBlockIpDirect={handleBlockIpDirect}
            handleBlockDeviceDirect={handleBlockDeviceDirect}
            hasMore={hasMore}
            hasPrev={cursorStack.length > 0}
            totalUsers={totalUsers}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
            ipForm={ipForm}
            setIpForm={setIpForm}
            handleBlockIp={handleBlockIp}
            handleUnblockIp={handleUnblockIp}
            bannedIps={bannedIps}
            deviceForm={deviceForm}
            setDeviceForm={setDeviceForm}
            handleBlockDevice={handleBlockDevice}
            handleUnblockDevice={handleUnblockDevice}
            bannedDevices={bannedDevices}
          />
        )}

        {activeTab === 'staff' && (
          <AdminStaffTab
            currentUser={currentUser}
            handleChangeRole={handleChangeRole}
            handleToggleBan={handleToggleBan}
            handleReactivate={handleReactivate}
            handleDelete={handleDelete}
            setAppealModal={setAppealModal}
            handleAdjustXP={handleAdjustXP}
            handleBlockIpDirect={handleBlockIpDirect}
            handleBlockDeviceDirect={handleBlockDeviceDirect}
          />
        )}

        {activeTab === 'audit' && (
          <AdminAuditTab auditLogs={auditLogs as ComponentProps<typeof AdminAuditTab>["auditLogs"]} />
        )}

        {activeTab === 'badges' && (
          <AdminBadgesTab proposeMode={!userHasPermission(currentUser?.permissions, 'badges.manage')} />
        )}

        {activeTab === 'levels' && (
          <AdminLevelsTab proposeMode={!userHasPermission(currentUser?.permissions, 'levels.manage')} />
        )}

        {activeTab === 'xp' && (
          <AdminXpTab onAdjustXP={handleAdjustXP} />
        )}

        {activeTab === 'requests' && (
          <AdminRequestsTab />
        )}
      </div>

      {/* Confirm Action Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={
          confirmModal.type === 'role' ? t('admin.table.roleTitle') :
          confirmModal.type === 'unblock_ip' ? t('admin.table.unblock') :
          confirmModal.type === 'unblock_device' ? t('admin.table.unblock') :
          confirmModal.type === 'block_ip_direct' ? t('admin.table.blockIpTitle') :
          confirmModal.type === 'block_device_direct' ? t('admin.table.blockDeviceTitle') :
          t('admin.table.deleteTitle')
        }
        message={
          confirmModal.type === 'role'
            ? t('admin.table.confirmRoleChange', { name: confirmModal.user?.displayName || confirmModal.user?.accountName, role: confirmModal.user?.role === 'admin' ? 'user' : 'admin' })
            : confirmModal.type === 'unblock_ip'
              ? t('admin.table.confirmUnblockIp')
              : confirmModal.type === 'unblock_device'
                ? t('admin.table.confirmUnblockDevice')
                : confirmModal.type === 'block_ip_direct'
                  ? t('admin.table.confirmBlockIp', { ip: confirmModal.blockIp, name: confirmModal.user?.accountName ?? confirmModal.user?.displayName })
                  : confirmModal.type === 'block_device_direct'
                    ? t('admin.table.confirmBlockDevice', { name: confirmModal.user?.accountName ?? confirmModal.user?.displayName })
                    : t('admin.table.confirmDelete', { name: confirmModal.user?.displayName || confirmModal.user?.accountName })
        }
        onConfirm={onConfirmAction}
        onCancel={() => setConfirmModal({ isOpen: false, type: '', user: null, ipId: null, deviceId: null, blockIp: null, blockDeviceId: null })}
      />

      <BanUserModal
        isOpen={banModal.isOpen}
        user={banModal.user}
        onConfirm={onBanConfirm}
        onCancel={() => setBanModal({ isOpen: false, user: null })}
      />

      <AppealDetailsModal
        isOpen={appealModal.isOpen}
        user={appealModal.user as ComponentProps<typeof AppealDetailsModal>["user"]}
        onApprove={handleToggleBan as ComponentProps<typeof AppealDetailsModal>["onApprove"]}
        onReject={handleRejectAppeal as ComponentProps<typeof AppealDetailsModal>["onReject"]}
        onCancel={() => setAppealModal({ isOpen: false, user: null })}
      />

      {/* Admin re-auth ("sudo") prompt — opens when a destructive action needs a
          fresh password grant. (F24) */}
      <SudoPasswordModal />
    </div>
  );
}
