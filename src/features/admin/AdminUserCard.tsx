import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { LazyImage } from '@ui/LazyImage';
import { SelectField } from '@ui/select-field';
import { StatusChip } from '@ui/StatusChip';
import { Icon } from '@/shared/ui/Icon';
import { CountryFlag } from '@/shared/ui/CountryFlag';
import { OnlineDot } from '@/shared/ui/OnlineDot';
import { profilePath } from '@/features/profile/profile-path';
import type { AdminUser } from '@/features/admin/admin.types';
import { availableUserActions, useShadowBanActions, type AdminActorAccess, type AdminUserHandlers } from './admin-user-actions';

function formatBytes(bytes = 0) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

type AdminUserCardProps = AdminActorAccess & AdminUserHandlers & {
  user: AdminUser;
  isSelf: boolean;
  online: boolean;
  formatDay: (iso: string) => string;
  onRefresh?: () => void;
};

const ACTION = 'min-h-11 w-full justify-start gap-2 px-3 text-sm';

/**
 * A user on a phone: one summary row that expands to the details and the actions.
 * Email and last IP/device stay hidden until opened. Actions are visible buttons gated by
 * the same rules as the long-press menu (availableUserActions).
 */
export function AdminUserCard({ user, isSelf, online, formatDay, onRefresh, ...rest }: AdminUserCardProps) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;
  const [open, setOpen] = useState(false);
  const [xpOpen, setXpOpen] = useState(false);
  const [xpAmount, setXpAmount] = useState('100');
  const detailsId = useId();
  const { myRank, myPermissions, canAssignRoles, assignableRoles } = rest;
  const can = availableUserActions(user, { myRank, myPermissions, canAssignRoles, assignableRoles });
  const { shadowBan, unshadowBan } = useShadowBanActions(onRefresh);

  const name = user.displayName || user.accountName || '';
  const userId = user.id || user._id;
  const lastActive = user.lastOnlineAt || user.lastUsedAt;
  const roleOptions = Array.from(new Set([user.role ?? 'user', ...assignableRoles]));
  const stat = (label: string, value: string) => (
    <div className="rounded-xs bg-zinc-900/50 px-2 py-1.5 text-center text-xs">
      <div className="font-semibold text-zinc-300">{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-zinc-500">{label}</div>
    </div>
  );

  return (
    <div className={`rounded-lg border border-zinc-700/50 bg-zinc-800/30 ${user.isDeleted ? 'opacity-60' : ''}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        aria-label={t('admin.card.toggle', { name })}
        onClick={() => setOpen(o => !o)}
        className="flex min-h-14 w-full items-center gap-3 rounded-lg p-3 text-left outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus"
      >
        <span className="relative size-10 shrink-0">
          <span className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800 font-semibold text-zinc-400">
            {user.avatarUrl ? <LazyImage src={user.avatarUrl} alt="" className="size-full object-cover" /> : (name || '?')[0].toUpperCase()}
          </span>
          {online && <OnlineDot />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium text-zinc-200">{name}</span>
            {isSelf && <span className="shrink-0 rounded-xs bg-primary/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">{t('admin.table.you')}</span>}
          </span>
          <span className="block truncate text-xs text-zinc-500">
            {t('admin.card.summary', { count: user.projectCount ?? 0 })}
            {' · '}
            {lastActive ? t('admin.card.lastActive', { date: formatDay(lastActive) }) : t('admin.card.neverActive')}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <StatusChip role={user.role}>{user.role ? tk(`admin.table.${user.role}`) : ''}</StatusChip>
          {user.ban?.active
            ? <StatusChip tone="love">{t('admin.table.banned')}</StatusChip>
            : <StatusChip tone="foam"><Icon name="check" size={11} />{t('admin.table.active')}</StatusChip>}
        </span>
        <Icon name="expand_more" size={20} className={`shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div id={detailsId} className="flex flex-col gap-3 border-t border-zinc-700/50 p-3">
          <div className="grid grid-cols-2 gap-2">
            {stat(t('admin.table.uploads'), String(user.uploadCount ?? 0))}
            {stat(t('admin.table.storage'), formatBytes(user.storageUsed))}
            {stat(t('admin.table.sync'), `${user.stats?.minutesSynced || 0}m`)}
            {stat(t('admin.table.joined'), user.createdAt ? formatDay(user.createdAt) : '—')}
          </div>

          <dl className="flex flex-col gap-2 text-xs">
            <div>
              <dt className="font-semibold text-zinc-400">{t('admin.card.email')}</dt>
              <dd className="break-all text-zinc-300">{user.email || '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-zinc-400">{t('admin.table.ip')} / {t('admin.table.lastDevice')}</dt>
              <dd className="flex flex-col gap-1 text-zinc-500">
                <span className="flex items-center gap-2">
                  <CountryFlag countryCode={user.country} />
                  <span className="break-all font-mono text-[11px]">{user.lastIp || '—'} {user.country && `(${user.country})`}</span>
                </span>
                {user.lastDeviceName && (
                  <span className="flex items-center gap-1.5">
                    <Icon name="desktop_windows" size={14} className="shrink-0 text-zinc-600" />
                    <span className="break-all text-[11px]">{user.lastDeviceName}</span>
                  </span>
                )}
                <span className="flex items-center gap-2">
                  {user.isVerified && <span className="flex items-center gap-1 text-emerald-500"><Icon name="check_circle" size={14} />{t('admin.table.verified')}</span>}
                  {user.isDeleted && <span className="flex items-center gap-1 text-red-500"><Icon name="delete" size={14} />{t('admin.table.deleted')}</span>}
                </span>
              </dd>
            </div>
          </dl>

          <div role="group" aria-label={t('admin.table.actions')} onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} className="flex flex-col gap-1.5 border-t border-zinc-700/50 pt-3">
            <Button asChild variant="ghost" className={ACTION}>
              <a href={profilePath(user.accountName)} target="_blank" rel="noopener noreferrer">
                <Icon name="open_in_new" size={16} />{t('admin.table.viewProfile')}
              </a>
            </Button>
            {can.changeRole && (
              <div className="flex min-h-11 items-center gap-2 px-3 text-sm text-zinc-300">
                <Icon name="how_to_reg" size={16} className="shrink-0" />
                <span className="flex-1">{t('admin.table.changeRole')}</span>
                <SelectField
                  aria-label={t('admin.table.changeRole')}
                  value={user.role ?? 'user'}
                  onValueChange={(v) => rest.handleChangeRole(user, v)}
                  options={roleOptions.map(r => ({ value: r, label: tk(`admin.table.${r}`) }))}
                  className="min-h-11 text-[10px] font-semibold uppercase tracking-wider"
                />
              </div>
            )}
            {can.adjustXp && (xpOpen ? (
              <div className="flex min-h-11 items-center gap-2 px-1">
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  aria-label={t('admin.card.xpAmount')}
                  value={xpAmount}
                  onChange={e => setXpAmount(e.target.value)}
                  className="h-11 min-w-0 flex-1 rounded-xs border border-zinc-700 bg-zinc-800 px-2 text-sm text-zinc-200 focus:border-primary focus:outline-none"
                />
                <Button variant="outline" size="sm" className="min-h-11 border-amber-500/30 bg-amber-500/15 text-amber-400" onClick={() => { rest.handleAdjustXP('grant', Number(xpAmount), 'user', userId); setXpOpen(false); }}>+XP</Button>
                <Button variant="destructive" size="sm" className="min-h-11" onClick={() => { rest.handleAdjustXP('revoke', Number(xpAmount), 'user', userId); setXpOpen(false); }}>−XP</Button>
                <Button variant="ghost" size="icon" aria-label={t('common.close')} className="size-11" onClick={() => setXpOpen(false)}><Icon name="close" size={16} /></Button>
              </div>
            ) : (
              <Button variant="ghost" className={`${ACTION} text-amber-400`} onClick={() => setXpOpen(true)}>
                <Icon name="bolt" size={16} />{t('admin.table.adjustXp')}
              </Button>
            ))}
            {can.reactivate && (
              <Button variant="ghost" className={`${ACTION} text-emerald-500`} onClick={() => rest.handleReactivate(user)}>
                <Icon name="undo" size={16} />{t('admin.table.reactivate')}
              </Button>
            )}
            {can.reviewAppeal && (
              <Button variant="secondary" className={`${ACTION} border-yellow-500/30 bg-yellow-500/10 text-yellow-400`} onClick={() => rest.setAppealModal({ isOpen: true, user })}>
                <Icon name="info" size={16} />{t('admin.table.reviewAppeal')}
              </Button>
            )}
            {can.unban && (
              <Button variant="ghost" className={`${ACTION} text-emerald-500`} onClick={() => rest.handleToggleBan(user)}>
                <Icon name="how_to_reg" size={16} />{t('admin.table.unban')}
              </Button>
            )}
            {can.ban && (
              <Button variant="ghost" className={`${ACTION} text-red-400`} onClick={() => rest.handleToggleBan(user)}>
                <Icon name="block" size={16} />{t('admin.table.ban')}
              </Button>
            )}
            {can.shadowBan && (
              <Button variant="ghost" className={`${ACTION} text-amber-400`} onClick={() => shadowBan(user)}>
                <Icon name="visibility_off" size={16} />{t('admin.table.shadowBan')}
              </Button>
            )}
            {can.unshadowBan && (
              <Button variant="ghost" className={ACTION} onClick={() => unshadowBan(user)}>
                <Icon name="visibility" size={16} />{t('admin.table.unshadowBan')}
              </Button>
            )}
            {can.blockIp && (
              <Button variant="ghost" className={`${ACTION} text-amber-400`} onClick={() => rest.handleBlockIpDirect(user)}>
                <Icon name="language" size={16} />{t('admin.table.blockIp')}
              </Button>
            )}
            {can.blockDevice && (
              <Button variant="ghost" className={`${ACTION} text-amber-400`} onClick={() => rest.handleBlockDeviceDirect(user)}>
                <Icon name="gpp_bad" size={16} />{t('admin.table.blockDevice')}
              </Button>
            )}
            {can.delete && (
              <Button variant="ghost" className={`${ACTION} text-red-400/80`} onClick={() => rest.handleDelete(user)}>
                <Icon name="delete" size={16} />{tk('admin.table.delete')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
