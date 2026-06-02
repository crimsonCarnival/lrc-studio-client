import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { admin } from '@/app/api';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { Button } from '@ui/button';
import { ShieldAlert, RefreshCw, Users, Globe, History, Award } from 'lucide-react';
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
