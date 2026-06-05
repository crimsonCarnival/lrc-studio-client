import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { admin } from '@/app/api';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { Button } from '@ui/button';
import { ShieldAlert, RefreshCw, Users, Globe, History, Award, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '@shared/ui/ConfirmModal';
import BanUserModal from './BanUserModal';
import AppealDetailsModal from './AppealDetailsModal';
import AdminStatsCards from './AdminStatsCards';
import AdminUsersTab from './AdminUsersTab';
import AdminIpsTab from './AdminIpsTab';
import AdminDevicesTab from './AdminDevicesTab';
import AdminAuditTab from './AdminAuditTab';
import AdminBadgesTab from './AdminBadgesTab';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuthContext();
  const [activeTab, setActiveTab] = useState('users'); // users, ips, devices, audit, badges

  // Data States
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [bannedIps, setBannedIps] = useState([]);
  const [bannedDevices, setBannedDevices] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ipForm, setIpForm] = useState({ ip: '', reason: '' });
  const [deviceForm, setDeviceForm] = useState({ deviceId: '', reason: '' });

  // Cursor-based pagination state
  const [cursor, setCursor] = useState(null);
  const [cursorStack, setCursorStack] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [totalUsers, setTotalUsers] = useState(null);

  // Modal States
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', user: null, ipId: null, deviceId: null });
  const [banModal, setBanModal] = useState({ isOpen: false, user: null });
  const [appealModal, setAppealModal] = useState({ isOpen: false, user: null });
  // Track whether stats have been fetched at least once (avoid re-fetching on tab switch)
  const statsFetchedRef = useRef(false);

  // Bulk XP state
  const [xpPanel, setXpPanel] = useState(false);
  const [xpBulkAmount, setXpBulkAmount] = useState('500');
  const [xpBulkTarget, setXpBulkTarget] = useState('all'); // 'all' | 'ids'
  const [xpBulkIds, setXpBulkIds] = useState(''); // comma-separated usernames/ids
  const [xpBulkSaving, setXpBulkSaving] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await admin.getStats();
      setStats(data);
      statsFetchedRef.current = true;
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchUsers = async (fetchCursor = cursor) => {
    setLoading(true);
    try {
      const params = { search, role: roleFilter, status: statusFilter };
      if (fetchCursor) params.cursor = fetchCursor;
      const data = await admin.getUsers(params);
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
      const data = await admin.getBannedIps();
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
      const data = await admin.getBannedDevices();
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
      const { logs } = await admin.getAuditLogs({ limit: 50 });
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
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'ips') fetchIps();
    else if (activeTab === 'devices') fetchDevices();
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
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'ips') fetchIps();
    else if (activeTab === 'devices') fetchDevices();
    else if (activeTab === 'audit') fetchAuditLogs();
    // badges tab manages its own data fetching
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'users') return;
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
    const nextCursor = users[users.length - 1]?._id?.toString() || users[users.length - 1]?.id;
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

  const handleAdjustXP = async (action, amount, target, userId, userIds) => {
    try {
      const result = await admin.adjustXP({ action, amount, target, userId, userIds });
      toast.success(t(action === 'grant' ? 'admin.xp.grantedXp' : 'admin.xp.revokedXp', { amount, count: result.affected }));
      refreshUsersFromStart();
    } catch (err) {
      toast.error(err?.message || t('admin.xp.failedAdjust'));
    }
  };

  const handleBulkXP = async (action) => {
    const amount = Number(xpBulkAmount);
    if (!amount || amount <= 0) { toast.error(t('admin.xp.enterValidAmount')); return; }
    setXpBulkSaving(true);
    try {
      if (xpBulkTarget === 'all') {
        await handleAdjustXP(action, amount, 'all');
      } else {
        const ids = xpBulkIds.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
        if (!ids.length) { toast.error(t('admin.xp.enterUserIds')); setXpBulkSaving(false); return; }
        await handleAdjustXP(action, amount, 'users', undefined, ids);
      }
      setXpPanel(false);
    } finally {
      setXpBulkSaving(false);
    }
  };

  const refreshUsersFromStart = () => {
    setCursor(null);
    setCursorStack([]);
    fetchUsers(null);
  };

  const handleToggleBan = async (user) => {
    if (user.id === currentUser?.id || user._id === currentUser?._id) {
      toast.error(t('admin.toast.noSelfAction'));
      return;
    }

    if (user.ban?.active) {
      try {
        await admin.unbanUser(user.id || user._id);
        toast.success(t('admin.toast.unbannedSuccess', { name: user.displayName || user.accountName }));
        setAppealModal({ isOpen: false, user: null });
        refreshUsersFromStart();
      } catch {
        toast.error(t('admin.toast.statusError'));
      }
    } else {
      setBanModal({ isOpen: true, user });
    }
  };

  const handleRejectAppeal = async (user) => {
    try {
      await admin.rejectAppeal(user.id || user._id);
      toast.success(t('admin.toast.appealRejectedSuccess', { name: user.displayName || user.accountName }));
      setAppealModal({ isOpen: false, user: null });
      refreshUsersFromStart();
    } catch {
      toast.error(t('admin.toast.statusError'));
    }
  };

  const handleReactivate = async (user) => {
    try {
      await admin.reactivateUser(user.id || user._id);
      toast.success(t('admin.toast.reactivateSuccess', { name: user.displayName || user.accountName }));
      refreshUsersFromStart();
    } catch {
      toast.error(t('admin.toast.statusError'));
    }
  };

  const onBanConfirm = async ({ reason, bannedUntil, banIp, banDevice }) => {
    const { user } = banModal;
    setBanModal({ isOpen: false, user: null });
    try {
      await admin.banUser(user.id || user._id, { reason, bannedUntil, banIp, banDevice });
      toast.success(t('admin.toast.bannedSuccess', { name: user.displayName || user.accountName }));
      refreshUsersFromStart();
      fetchStats();
    } catch {
      toast.error(t('admin.toast.statusError'));
    }
  };

  const handleChangeRole = (user) => {
    if (user.id === currentUser?.id || user._id === currentUser?._id) {
      toast.error(t('admin.toast.noSelfAction'));
      return;
    }
    setConfirmModal({ isOpen: true, type: 'role', user });
  };

  const handleDelete = (user) => {
    if (user.id === currentUser?.id || user._id === currentUser?._id) {
      toast.error(t('admin.toast.noSelfAction'));
      return;
    }
    setConfirmModal({ isOpen: true, type: 'delete', user });
  };

  const handleBlockIp = async (e) => {
    e.preventDefault();
    if (!ipForm.ip) return;
    try {
      await admin.blockIp(ipForm.ip, ipForm.reason);
      toast.success(t('admin.toast.ipBlocked'));
      setIpForm({ ip: '', reason: '' });
      fetchIps();
      fetchStats();
    } catch {
      toast.error(t('admin.toast.ipBlockError'));
    }
  };

  const handleUnblockIp = (ipId) => {
    setConfirmModal({ isOpen: true, type: 'unblock_ip', ipId });
  };

  const handleBlockDevice = async (e) => {
    e.preventDefault();
    if (!deviceForm.deviceId) return;
    try {
      await admin.blockDevice(deviceForm.deviceId, deviceForm.reason);
      toast.success(t('admin.toast.deviceBlocked'));
      setDeviceForm({ deviceId: '', reason: '' });
      fetchDevices();
      fetchStats();
    } catch {
      toast.error(t('admin.toast.deviceBlockError'));
    }
  };

  const handleUnblockDevice = (deviceId) => {
    setConfirmModal({ isOpen: true, type: 'unblock_device', deviceId });
  };

  const onConfirmAction = async () => {
    const { type, user, ipId, deviceId } = confirmModal;
    setConfirmModal({ isOpen: false, type: '', user: null, ipId: null, deviceId: null });

    try {
      if (type === 'role') {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        await admin.changeRole(user.id || user._id, newRole);
        toast.success(t('admin.toast.roleSuccess', { name: user.displayName || user.accountName, role: newRole }));
      } else if (type === 'delete') {
        await admin.deleteUser(user.id || user._id);
        toast.success(t('admin.toast.deleteSuccess', { name: user.displayName || user.accountName }));
      } else if (type === 'unblock_ip') {
        await admin.unblockIp(ipId);
        toast.success(t('admin.toast.ipUnblocked'));
        fetchIps();
        fetchStats();
      } else if (type === 'unblock_device') {
        await admin.unblockDevice(deviceId);
        toast.success(t('admin.toast.deviceUnblocked'));
        fetchDevices();
        fetchStats();
      }
      refreshUsersFromStart();
    } catch {
      toast.error(t('admin.toast.statusError'));
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
      <AdminStatsCards stats={stats} />

      {/* Bulk XP panel */}
      <div className="mb-4">
        <button
          onClick={() => setXpPanel(p => !p)}
          className="flex items-center gap-2 text-xs font-semibold text-amber-500/80 hover:text-amber-400 transition-colors"
        >
          <Zap className="size-3.5" />
          {xpPanel ? t('admin.xp.hideManager') : t('admin.xp.manageXp')}
        </button>
        {xpPanel && (
          <div className="mt-2 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <label className="flex flex-col gap-1 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t('admin.xp.amount')}</span>
              <input
                type="number"
                min={1}
                value={xpBulkAmount}
                onChange={e => setXpBulkAmount(e.target.value)}
                className="w-24 h-9 px-3 text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-amber-500/50"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t('admin.xp.target')}</span>
              <select
                value={xpBulkTarget}
                onChange={e => setXpBulkTarget(e.target.value)}
                className="h-9 px-3 text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 focus:outline-none focus:border-amber-500/50"
              >
                <option value="all">{t('admin.xp.allUsers')}</option>
                <option value="ids">{t('admin.xp.specificUsers')}</option>
              </select>
            </label>
            {xpBulkTarget === 'ids' && (
              <label className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{t('admin.xp.userIds')}</span>
                <input
                  type="text"
                  value={xpBulkIds}
                  onChange={e => setXpBulkIds(e.target.value)}
                  placeholder="id1, id2, id3…"
                  className="h-9 px-3 text-sm rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50 w-full"
                />
              </label>
            )}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleBulkXP('grant')}
                disabled={xpBulkSaving}
                className="h-9 px-4 text-sm font-semibold rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-colors disabled:opacity-50"
              >
                {t('admin.xp.grantXp')}
              </button>
              <button
                onClick={() => handleBulkXP('revoke')}
                disabled={xpBulkSaving}
                className="h-9 px-4 text-sm font-semibold rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-50"
              >
                {t('admin.xp.revokeXp')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tab bar — underline style */}
      <div className="flex items-center gap-0 border-b border-zinc-800/60 contrast-more:border-zinc-600 mb-4 overflow-x-auto">
        {[
          { id: 'users',   icon: Users,       label: t('admin.dashboard.tabs.users') },
          { id: 'ips',     icon: Globe,       label: t('admin.dashboard.tabs.ipBlocklist') },
          { id: 'devices', icon: ShieldAlert, label: t('admin.dashboard.tabs.deviceBlocklist') },
          { id: 'audit',   icon: History,     label: t('admin.dashboard.tabs.auditLogs') },
          { id: 'badges',  icon: Award,       label: t('admin.dashboard.tabs.badges') },
        ].map(tab => (
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
        {activeTab === 'users' && (
          <AdminUsersTab
            users={users}
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
            hasMore={hasMore}
            hasPrev={cursorStack.length > 0}
            totalUsers={totalUsers}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
          />
        )}

        {activeTab === 'ips' && (
          <AdminIpsTab
            ipForm={ipForm}
            setIpForm={setIpForm}
            handleBlockIp={handleBlockIp}
            handleUnblockIp={handleUnblockIp}
            bannedIps={bannedIps}
          />
        )}

        {activeTab === 'devices' && (
          <AdminDevicesTab
            deviceForm={deviceForm}
            setDeviceForm={setDeviceForm}
            handleBlockDevice={handleBlockDevice}
            handleUnblockDevice={handleUnblockDevice}
            bannedDevices={bannedDevices}
          />
        )}

        {activeTab === 'audit' && (
          <AdminAuditTab auditLogs={auditLogs} />
        )}

        {activeTab === 'badges' && (
          <AdminBadgesTab />
        )}

      </div>

      {/* Confirm Action Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={
          confirmModal.type === 'role' ? t('admin.table.roleTitle') :
            confirmModal.type === 'unblock_ip' ? t('admin.table.unblock') :
              confirmModal.type === 'unblock_device' ? t('admin.table.unblock') :
                t('admin.table.deleteTitle')
        }
        message={
          confirmModal.type === 'role'
            ? t('admin.table.confirmRoleChange', { name: confirmModal.user?.displayName || confirmModal.user?.accountName, role: confirmModal.user?.role === 'admin' ? 'user' : 'admin' })
            : confirmModal.type === 'unblock_ip'
              ? t('admin.table.confirmUnblockIp')
              : confirmModal.type === 'unblock_device'
                ? t('admin.table.confirmUnblockDevice')
                : t('admin.table.confirmDelete', { name: confirmModal.user?.displayName || confirmModal.user?.accountName })
        }
        onConfirm={onConfirmAction}
        onCancel={() => setConfirmModal({ isOpen: false, type: '', user: null, ipId: null, deviceId: null })}
      />

      <BanUserModal
        isOpen={banModal.isOpen}
        user={banModal.user}
        onConfirm={onBanConfirm}
        onCancel={() => setBanModal({ isOpen: false, user: null })}
      />

      <AppealDetailsModal
        isOpen={appealModal.isOpen}
        user={appealModal.user}
        onApprove={handleToggleBan}
        onReject={handleRejectAppeal}
        onCancel={() => setAppealModal({ isOpen: false, user: null })}
      />
    </div>
  );
}
