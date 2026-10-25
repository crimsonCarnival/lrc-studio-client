import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { admin } from '@/app/api';
import { isSudoCancelled } from './services/sudo';
import ConfirmModal from '@shared/ui/ConfirmModal';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { PERMISSIONS, ROLE_RANK, type Permission, type Role } from '@/features/auth/permissions';
import { useAdminSub } from './admin-nav';
import { AdminSubNav } from './AdminSubNav';

/*
 * Note on `advanced.confirmDestructive`: this surface deliberately confirms
 * UNCONDITIONALLY and does not consult that setting.
 *
 * The setting is a personal convenience toggle for actions on your own data
 * (deleting your project, your upload, your playlist). These actions destroy or
 * restrict OTHER people's accounts and are irreversible. The server already
 * requires a sudo grant for them, but sudo proves who you are, not that you
 * meant this particular target — within a 5-minute sudo window a single stray
 * click would otherwise ban or delete the wrong user.
 *
 * If you are here to "make this honour the setting" for consistency: that is
 * the consistency we are declining.
 */

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

  const view = useAdminSub('permissions');
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

  // Staff by rank, highest first, so the list reads as the hierarchy it is.
  const staffByRole = (['admin', 'mod'] as Role[])
    .map(role => ({ role, members: editableStaff.filter(u => u.role === role) }))
    .filter(group => group.members.length > 0);

  // A permission that differs from what the member's role grants by default.
  const differsFromRole = (user: StaffUser, perm: Permission) => {
    const roleDefault = catalog?.presets[(user.role as Role) ?? 'mod'] ?? [];
    return (draftUserPerms[user.id ?? ''] ?? []).includes(perm) !== roleDefault.includes(perm);
  };

  return (
    <div className="flex flex-col gap-6 p-1">
      <AdminSubNav
        tab="permissions"
        current={view}
        items={[
          { id: 'catalog', icon: 'list', label: t('admin.permissions.tabs.catalog') },
          { id: 'defaults', icon: 'admin_panel_settings', label: t('admin.permissions.tabs.defaults') },
          { id: 'overrides', icon: 'groups', label: t('admin.permissions.tabs.overrides') },
        ]}
      />

      {/* Permission catalog */}
      {view === 'catalog' && (
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
      )}

      {/* Role default presets */}
      {view === 'defaults' && (
      <section>
        <h3 className="text-sm font-semibold text-zinc-200 mb-1">{t('admin.permissions.rolePresetsTitle')}</h3>
        <p className="text-xs text-zinc-500 mb-3">{t('admin.permissions.rolePresetsSubtitle')}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EDITABLE_ROLES.map(role => (
            <div key={role} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">{tk(`admin.table.${role}`)}</span>
                <Button
                  type="button"
                  variant="sync"
                  size="xs"
                  disabled={!presetDirty(role)}
                  onClick={() => setConfirm({ type: 'role', role, label: tk(`admin.table.${role}`) })}
                >
                  {t('admin.permissions.save')}
                </Button>
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
      )}

      {/* Per-staff overrides */}
      {view === 'overrides' && (
      <section className="flex flex-col gap-6">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200 mb-1">{t('admin.permissions.staffTitle')}</h3>
          <p className="text-xs text-zinc-500">{t('admin.permissions.staffSubtitle')}</p>
        </div>

        {editableStaff.length === 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-xs text-zinc-500">
            <Icon name="groups" size={18} className="text-zinc-600" />
            {t('admin.dashboard.noUsers')}
          </div>
        )}

        {staffByRole.map(({ role, members }) => (
          <div key={role} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">{tk(`admin.table.${role}`)}</span>
              <span className="text-[10px] tabular-nums text-zinc-600">{t('admin.permissions.staffCount', { count: members.length })}</span>
              <span aria-hidden className="h-px flex-1 bg-zinc-800" />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {members.map(user => {
                const dirty = userDirty(user);
                const name = user.displayName || user.accountName || '';
                return (
                  <div key={user.id} className={`rounded-xl border bg-zinc-900/50 p-4 transition-colors ${dirty ? 'border-primary/40' : 'border-zinc-800'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft font-heading text-sm font-bold text-primary-ink">
                        {name[0]?.toUpperCase() ?? '?'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-zinc-100">{name}</div>
                        {user.accountName && user.accountName !== name && (
                          <div className="truncate font-mono text-[11px] text-zinc-500">{user.accountName}</div>
                        )}
                      </div>
                      {dirty && <span className="shrink-0 text-[10px] font-semibold text-primary">{t('admin.permissions.overridesChanged')}</span>}
                      <Button
                        type="button"
                        variant="sync"
                        size="xs"
                        disabled={!dirty}
                        onClick={() => setConfirm({ type: 'user', userId: user.id, label: name })}
                      >
                        {t('admin.permissions.save')}
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {PERMISSIONS.map(perm => {
                        const on = (draftUserPerms[user.id ?? ''] ?? []).includes(perm);
                        const override = differsFromRole(user, perm);
                        return (
                          <button
                            key={perm}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleUserPerm(user.id ?? '', perm)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 h-7 coarse:h-9 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                              on ? 'bg-primary-soft text-primary-ink' : 'bg-zinc-800/60 text-zinc-500 hover:text-zinc-300'
                            } ${override ? 'ring-1 ring-amber-400/60' : ''}`}
                          >
                            <Icon name={on ? 'check' : 'add'} size={11} />
                            {permissionLabel(perm)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {editableStaff.length > 0 && (
          <p className="flex items-center gap-2 text-[11px] text-zinc-500">
            <span aria-hidden className="size-2.5 rounded-full ring-1 ring-amber-400/60" />
            {t('admin.permissions.overrideLegend')}
          </p>
        )}

        {superadminStaff.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4">
            <Icon name="lock" size={16} className="mt-0.5 shrink-0 text-zinc-500" />
            <div className="min-w-0">
              <p className="text-xs text-zinc-400 mb-2">{t('admin.permissions.superadminNote')}</p>
              <div className="flex flex-wrap gap-1.5">
                {superadminStaff.map(user => (
                  <span key={user.id} className="rounded-full bg-zinc-800/60 px-2.5 py-1 text-[11px] text-zinc-300">
                    {user.displayName || user.accountName}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
      )}

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
