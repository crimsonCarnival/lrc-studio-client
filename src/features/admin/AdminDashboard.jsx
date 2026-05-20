import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { admin } from '@/app/api';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { Button } from '@ui/button';
import { ShieldAlert, RefreshCw, Users, Globe, History } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '@shared/ui/ConfirmModal';
import BanUserModal from './BanUserModal';
import AppealDetailsModal from './AppealDetailsModal';
import AdminStatsCards from './AdminStatsCards';
import AdminUsersTab from './AdminUsersTab';
import AdminIpsTab from './AdminIpsTab';
import AdminDevicesTab from './AdminDevicesTab';
import AdminAuditTab from './AdminAuditTab';
import { ThemedShineBorder } from '@ui/themed-shine-border';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuthContext();
  const [activeTab, setActiveTab] = useState('users'); // users, ips, audit, monitor

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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { users: fetchedUsers } = await admin.getUsers({
        search,
        role: roleFilter,
        status: statusFilter
      });
      setUsers(fetchedUsers);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'users') return;
    const timer = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, statusFilter]);

  const handleToggleBan = async (user) => {
    if (user.id === currentUser?.id || user._id === currentUser?._id) {
      toast.error(t('admin.toast.noSelfAction'));
      return;
    }

    if (user.isBanned) {
      try {
        await admin.unbanUser(user.id || user._id);
        toast.success(t('admin.toast.unbannedSuccess', { name: user.username }));
        setAppealModal({ isOpen: false, user: null });
        fetchUsers();
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
      toast.success(t('admin.toast.appealRejectedSuccess', { name: user.username }));
      setAppealModal({ isOpen: false, user: null });
      fetchUsers();
    } catch {
      toast.error(t('admin.toast.statusError'));
    }
  };

  const handleReactivate = async (user) => {
    try {
      await admin.reactivateUser(user.id || user._id);
      toast.success(t('admin.toast.reactivateSuccess', { name: user.username }));
      fetchUsers();
    } catch {
      toast.error(t('admin.toast.statusError'));
    }
  };

  const onBanConfirm = async ({ reason, bannedUntil, banIp, banDevice }) => {
    const { user } = banModal;
    setBanModal({ isOpen: false, user: null });
    try {
      await admin.banUser(user.id || user._id, { reason, bannedUntil, banIp, banDevice });
      toast.success(t('admin.toast.bannedSuccess', { name: user.username }));
      fetchUsers();
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
        toast.success(t('admin.toast.roleSuccess', { name: user.username, role: newRole }));
      } else if (type === 'delete') {
        await admin.deleteUser(user.id || user._id);
        toast.success(t('admin.toast.deleteSuccess', { name: user.username }));
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
      fetchUsers();
    } catch {
      toast.error(t('admin.toast.statusError'));
    }
  };

  return (
    <div className="flex flex-col h-full pt-0 p-6 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-100 flex items-center gap-2 sm:gap-3">
            <ShieldAlert className="text-primary size-6 sm:size-8 flex-shrink-0" />
            <span className="truncate">{t('admin.dashboard.title')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">{t('admin.dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => fetchData(true)} className="h-10 w-10 sm:h-9 sm:w-9">
            <RefreshCw className={`size-4 sm:size-5 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <AdminStatsCards stats={stats} />

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 mb-4 sm:mb-6 overflow-x-auto">
        {[
          { id: 'users', icon: Users, label: t('admin.dashboard.tabs.users') },
          { id: 'ips', icon: Globe, label: t('admin.dashboard.tabs.ipBlocklist') },
          { id: 'devices', icon: ShieldAlert, label: t('admin.dashboard.tabs.deviceBlocklist') },
          { id: 'audit', icon: History, label: t('admin.dashboard.tabs.auditLogs') },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                ? 'bg-zinc-800 text-zinc-100 shadow-lg ring-1 ring-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
          >
            <tab.icon className="size-3.5 sm:size-4 flex-shrink-0" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl flex-1 flex flex-col min-h-[400px] overflow-hidden">
        <ThemedShineBorder />
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
            ? t('admin.table.confirmRoleChange', { name: confirmModal.user?.username, role: confirmModal.user?.role === 'admin' ? 'user' : 'admin' })
            : confirmModal.type === 'unblock_ip'
              ? t('admin.table.confirmUnblockIp')
              : confirmModal.type === 'unblock_device'
                ? t('admin.table.confirmUnblockDevice')
                : t('admin.table.confirmDelete', { name: confirmModal.user?.username })
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
