import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { admin } from '@/app/api';
import { isSudoCancelled } from './services/sudo';
import ConfirmModal from '@shared/ui/ConfirmModal';
import { Icon } from '@/shared/ui/Icon';
import { PERMISSIONS, ROLE_RANK, type Permission, type Role } from '@/features/auth/permissions';

// Roles whose default permission set is editable here. Mirrors
// EDITABLE_ROLES in server/src/modules/admin/admin.service.ts — 'user' is
// always empty and 'superadmin' always holds every permission by design.
const EDITABLE_ROLES: Role[] = ['mod', 'admin'];

interface StaffUser {
  id?: string;
  displayName?: string;
  accountName?: string;
  role?: string;
  permissions?: string[];
}

interface PermissionsCatalog {
  permissions: Permission[];
  presets: Record<Role, Permission[]>;
}

// This whole page is superadmin-only. The nav entry and the page itself both
// gate on it (UI convenience) — the server independently re-checks the
// literal `role` on every request (requireSuperadmin), so this check is not
// the security boundary, just UX.
export default function AdminPermissionsTab({ isSuperadmin }: { isSuperadmin: boolean }) {
  const { t } = useTranslation();
  const tk = t as (key: string, opts?: Record<string, unknown>) => string;

  const [catalog, setCatalog] = useState<PermissionsCatalog | null>(null);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftPresets, setDraftPresets] = useState<Record<Role, Permission[]>>({ user: [], mod: [], admin: [], superadmin: [] });
  const [draftUserPerms, setDraftUserPerms] = useState<Record<string, string[]>>({});
  const [confirm, setConfirm] = useState<{ type: 'role' | 'user'; role?: Role; userId?: string; label: string } | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [catalogData, staffData] = await Promise.all([
        admin.getPermissionsCatalog() as Promise<PermissionsCatalog>,
        admin.getUsers({ role: 'mod,admin,superadmin', limit: '100' }) as Promise<{ users: StaffUser[] }>,
      ]);
      setCatalog(catalogData);
      setDraftPresets({
        user: [],
        mod: catalogData.presets.mod,
        admin: catalogData.presets.admin,
        superadmin: catalogData.presets.superadmin,
      });
      setStaff(staffData.users);
      setDraftUserPerms(Object.fromEntries(staffData.users.map(u => [u.id ?? '', [...(u.permissions ?? [])]])));
    } catch {
      toast.error(t('admin.toast.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isSuperadmin) fetchAll();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperadmin]);

  const presetDirty = (role: Role) => {
    if (!catalog) return false;
    const saved = new Set(catalog.presets[role]);
    const draft = new Set(draftPresets[role]);
    return saved.size !== draft.size || [...saved].some(p => !draft.has(p));
  };

  const userDirty = (user: StaffUser) => {
    const saved = new Set(user.permissions ?? []);
    const draft = new Set(draftUserPerms[user.id ?? ''] ?? []);
    return saved.size !== draft.size || [...saved].some(p => !draft.has(p));
  };

  const togglePresetPerm = (role: Role, perm: Permission) => {
    setDraftPresets(prev => {
      const has = prev[role].includes(perm);
      return { ...prev, [role]: has ? prev[role].filter(p => p !== perm) : [...prev[role], perm] };
    });
  };

  const toggleUserPerm = (userId: string, perm: string) => {
    setDraftUserPerms(prev => {
      const current = prev[userId] ?? [];
      const has = current.includes(perm);
      return { ...prev, [userId]: has ? current.filter(p => p !== perm) : [...current, perm] };
    });
  };

  const saveRolePreset = async (role: Role) => {
    try {
      const result = await admin.updateRolePreset(role, draftPresets[role]) as { presets: Record<Role, Permission[]> };
      toast.success(tk('admin.permissions.toast.presetSaved', { role: tk(`admin.table.${role}`) }));
      setCatalog(prev => prev ? { ...prev, presets: result.presets } : prev);
    } catch (err) {
      if (!isSudoCancelled(err)) toast.error(t('admin.permissions.toast.saveError'));
    } finally {
      setConfirm(null);
    }
  };

  const saveUserPermissions = async (userId: string) => {
    try {
      await admin.updateUserPermissions(userId, draftUserPerms[userId] ?? []);
      toast.success(t('admin.permissions.toast.userSaved'));
      fetchAll();
    } catch (err) {
      if (!isSudoCancelled(err)) toast.error(t('admin.permissions.toast.saveError'));
    } finally {
      setConfirm(null);
    }
  };

  const permissionLabel = (perm: string) => tk(`admin.permissions.catalog.${perm}.label`);
  const permissionDescription = (perm: string) => tk(`admin.permissions.catalog.${perm}.description`);

  const editableStaff = useMemo(
    () => staff.filter(u => ROLE_RANK[(u.role as Role) ?? 'user'] < ROLE_RANK.superadmin),
    [staff]
  );
  const superadminStaff = useMemo(() => staff.filter(u => u.role === 'superadmin'), [staff]);

  if (!isSuperadmin) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm gap-2 p-8">
        <Icon name="lock" size={16} />
        {t('admin.permissions.notAuthorized')}
      </div>
    );
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">{t('admin.dashboard.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-8 p-1">
      {/* Permission catalog */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-200 mb-1">{t('admin.permissions.catalogTitle')}</h3>
        <p className="text-xs text-zinc-500 mb-3">{t('admin.permissions.catalogSubtitle')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PERMISSIONS.map(perm => (
            <div key={perm} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
              <div className="text-xs font-mono text-primary">{perm}</div>
              <div className="text-sm text-zinc-200 font-medium">{permissionLabel(perm)}</div>
              <div className="text-xs text-zinc-500">{permissionDescription(perm)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Role default presets */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-200 mb-1">{t('admin.permissions.rolePresetsTitle')}</h3>
        <p className="text-xs text-zinc-500 mb-3">{t('admin.permissions.rolePresetsSubtitle')}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EDITABLE_ROLES.map(role => (
            <div key={role} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">{tk(`admin.table.${role}`)}</span>
                <button
                  type="button"
                  disabled={!presetDirty(role)}
                  onClick={() => setConfirm({ type: 'role', role, label: tk(`admin.table.${role}`) })}
                  className="text-[11px] font-semibold rounded px-2 py-1 bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {t('admin.permissions.save')}
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {PERMISSIONS.map(perm => (
                  <label key={perm} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draftPresets[role].includes(perm)}
                      onChange={() => togglePresetPerm(role, perm)}
                      className="accent-[var(--color-primary)]"
                    />
                    {permissionLabel(perm)}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Per-staff overrides */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-200 mb-1">{t('admin.permissions.staffTitle')}</h3>
        <p className="text-xs text-zinc-500 mb-3">{t('admin.permissions.staffSubtitle')}</p>
        <div className="flex flex-col gap-3">
          {editableStaff.length === 0 && (
            <div className="text-xs text-zinc-500">{t('admin.dashboard.noUsers')}</div>
          )}
          {editableStaff.map(user => (
            <div key={user.id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm font-medium text-zinc-200">{user.displayName || user.accountName}</span>
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-zinc-500">{tk(`admin.table.${user.role}`)}</span>
                </div>
                <button
                  type="button"
                  disabled={!userDirty(user)}
                  onClick={() => setConfirm({ type: 'user', userId: user.id, label: user.displayName || user.accountName || '' })}
                  className="text-[11px] font-semibold rounded px-2 py-1 bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {t('admin.permissions.save')}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {PERMISSIONS.map(perm => (
                  <label key={perm} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(draftUserPerms[user.id ?? ''] ?? []).includes(perm)}
                      onChange={() => toggleUserPerm(user.id ?? '', perm)}
                      className="accent-[var(--color-primary)]"
                    />
                    {permissionLabel(perm)}
                  </label>
                ))}
              </div>
            </div>
          ))}

          {superadminStaff.length > 0 && (
            <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-lg p-4">
              <p className="text-xs text-zinc-500 mb-2">{t('admin.permissions.superadminNote')}</p>
              {superadminStaff.map(user => (
                <div key={user.id} className="text-xs text-zinc-400">{user.displayName || user.accountName}</div>
              ))}
            </div>
          )}
        </div>
      </section>

      <ConfirmModal
        isOpen={!!confirm}
        variant="default"
        title={confirm?.type === 'role' ? t('admin.permissions.confirmPresetTitle') : t('admin.permissions.confirmUserTitle')}
        message={
          confirm?.type === 'role'
            ? t('admin.permissions.confirmPresetMessage', { role: confirm.label })
            : t('admin.permissions.confirmUserMessage', { name: confirm?.label })
        }
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.type === 'role' && confirm.role) saveRolePreset(confirm.role);
          else if (confirm.type === 'user' && confirm.userId) saveUserPermissions(confirm.userId);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
