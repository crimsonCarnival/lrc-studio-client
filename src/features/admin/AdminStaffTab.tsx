import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { admin } from '@/app/api';
import toast from 'react-hot-toast';
import AdminUsersTab from './AdminUsersTab';
import { ROLE_RANK, type Role } from '@/features/auth/permissions';
import type { AdminUser } from '@/features/admin/admin.types';

interface AdminStaffTabProps {
  currentUser?: { id?: string; _id?: string; role?: string; permissions?: string[] } | null;
  handleChangeRole: (user: AdminUser, role: string) => void;
  handleToggleBan: (user: AdminUser) => void;
  handleReactivate: (user: AdminUser) => void;
  handleDelete: (user: AdminUser) => void;
  setAppealModal: (state: { isOpen: boolean; user: AdminUser }) => void;
  handleAdjustXP: (action: 'grant' | 'revoke', amount: number, type: string, id?: string) => void;
  handleBlockIpDirect: (user: AdminUser) => void;
  handleBlockDeviceDirect: (user: AdminUser) => void;
}

export default function AdminStaffTab({
  currentUser,
  handleChangeRole,
  handleToggleBan,
  handleReactivate,
  handleDelete,
  setAppealModal,
  handleAdjustXP,
  handleBlockIpDirect,
  handleBlockDeviceDirect,
}: AdminStaffTabProps) {
  const { t } = useTranslation();
  const [staffUsers, setStaffUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const data = await admin.getUsers({ search, role: 'mod,admin,superadmin', status: statusFilter, limit: '100' }) as { users: AdminUser[] };
      // Highest rank first: the table marks where each rank begins, so equal roles must sit together.
      setStaffUsers([...data.users].sort((a, b) => (ROLE_RANK[(b.role as Role) ?? 'user'] ?? 0) - (ROLE_RANK[(a.role as Role) ?? 'user'] ?? 0)));
    } catch {
      toast.error(t('admin.toast.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchStaff, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  if (loading && staffUsers.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">{t('admin.dashboard.loading')}</div>;
  }

  return (
    <AdminUsersTab
      users={staffUsers as Parameters<typeof AdminUsersTab>[0]['users']}
      page={1}
      currentUser={currentUser}
      search={search}
      setSearch={setSearch}
      roleFilter="mod,admin,superadmin"
      setRoleFilter={() => {}}
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
      hideRoleFilter
      groupByRank
    />
  );
}
