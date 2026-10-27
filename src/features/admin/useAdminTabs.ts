import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { userHasPermission, type Permission } from '@/features/auth/permissions';
import { requestsApi } from './services/requests.service';
import type { AdminTabId } from './admin-nav';

export interface AdminTab {
  id: AdminTabId;
  icon: string;
  label: string;
}

/** The dashboard tabs the signed-in staff member may open. Shared by the header and the page. */
export function useAdminTabs(): AdminTab[] {
  const { t } = useTranslation();
  const { user: currentUser } = useAuthContext();
  const isSuperadmin = currentUser?.role === 'superadmin';
  // Request types this user may submit: drives propose-mode tab visibility.
  const [submittable, setSubmittable] = useState<string[]>([]);
  useEffect(() => {
    requestsApi.capabilities().then(c => setSubmittable(c.submittable)).catch(() => {});
  }, []);

  return useMemo(() => {
    const defs: { id: AdminTabId; icon: string; label: string; perm?: Permission }[] = [
      { id: 'moderation', icon: 'gpp_bad', label: t('admin.dashboard.tabs.moderation'), perm: 'users.view' },
      { id: 'reports', icon: 'flag', label: t('admin.dashboard.tabs.reports'), perm: 'users.ban' },
      { id: 'staff', icon: 'groups', label: t('admin.dashboard.tabs.staff') },
      { id: 'audit', icon: 'history', label: t('admin.dashboard.tabs.auditLogs'), perm: 'audit.view' },
      { id: 'badges', icon: 'military_tech', label: t('admin.dashboard.tabs.badges'), perm: 'badges.manage' },
      { id: 'levels', icon: 'bolt', label: t('admin.dashboard.tabs.levels'), perm: 'levels.manage' },
      { id: 'xp', icon: 'auto_awesome', label: t('admin.dashboard.tabs.xp'), perm: 'xp.adjust' },
      { id: 'permissions', icon: 'admin_panel_settings', label: t('admin.dashboard.tabs.permissions') },
    ];
    const canProposeBadges = submittable.some(ty => ty.startsWith('badge_'));
    const canProposeLevels = submittable.some(ty => ty.startsWith('level_'));
    const isNetworkOnly = !userHasPermission(currentUser?.permissions, 'users.view') && userHasPermission(currentUser?.permissions, 'network.block');
    const gated = defs.filter(tab => {
      if (tab.id === 'moderation') return userHasPermission(currentUser?.permissions, 'users.view') || userHasPermission(currentUser?.permissions, 'network.block');
      if (tab.id === 'staff') return !isNetworkOnly; // all staff except network-only roles
      if (tab.id === 'permissions') return isSuperadmin;
      if (tab.perm && userHasPermission(currentUser?.permissions, tab.perm)) return true;
      if (tab.id === 'badges' && canProposeBadges) return true;
      if (tab.id === 'levels' && canProposeLevels) return true;
      return false;
    });
    gated.push({ id: 'requests', icon: 'inbox', label: t('admin.dashboard.tabs.requests') });
    return gated;
  }, [t, currentUser?.permissions, submittable, isSuperadmin]);
}
