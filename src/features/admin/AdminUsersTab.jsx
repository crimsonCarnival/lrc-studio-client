import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Tip } from '@ui/tip';
import { LazyImage } from '@ui/LazyImage';
import { Filter, Ban, CheckCircle2, BarChart3, Music, Trash2, Undo2, Info, Activity, Zap } from 'lucide-react';
import useInputMethod from '@/shared/hooks/useInputMethod';
import { useState as useLocalState } from 'react';

export default function AdminUsersTab({
  users,
  currentUser,
  search,
  setSearch,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  handleChangeRole,
  handleToggleBan,
  handleReactivate,
  handleDelete,
  setAppealModal,
  handleAdjustXP,
  hasMore,
  hasPrev,
  totalUsers,
  onNextPage,
  onPrevPage,
}) {
  const { t } = useTranslation();
  const inputMethod = useInputMethod();
  const isMobile = inputMethod === 'touch';
  const [xpPopover, setXpPopover] = useLocalState(null); // userId | null
  const [xpAmount, setXpAmount] = useLocalState('100');

  return (
    <>
      <div className="p-3 sm:p-4 border-b border-zinc-800/50 flex flex-col gap-3 bg-zinc-900/50">
        <div className="relative">
          <Input
            placeholder={t('admin.dashboard.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-zinc-950 border-zinc-800 focus:border-primary !pl-10 h-10 text-sm"
          />
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-600 pointer-events-none" />
        </div>
        <div className={`flex ${isMobile ? 'flex-col gap-2' : 'flex-row gap-2 sm:gap-4'}`}>
          <select
            value={roleFilter}
            aria-label={t('admin.dashboard.filters.filterByRole')}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={`bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-300 outline-none focus:border-primary ${isMobile ? 'h-10 flex-1' : ''}`}
          >
            <option value="">{t('admin.dashboard.filters.allRoles')}</option>
            <option value="admin">{t('admin.table.admin')}</option>
            <option value="user">{t('admin.table.user')}</option>
          </select>
          <select
            value={statusFilter}
            aria-label={t('admin.dashboard.filters.filterByStatus')}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-300 outline-none focus:border-primary ${isMobile ? 'h-10 flex-1' : ''}`}
          >
            <option value="">{t('admin.dashboard.filters.allStatuses')}</option>
            <option value="active">{t('admin.dashboard.filters.active')}</option>
            <option value="banned">{t('admin.dashboard.filters.banned')}</option>
            <option value="deleted">{t('admin.dashboard.filters.deleted')}</option>
            <option value="verified">{t('admin.dashboard.filters.verified')}</option>
            <option value="premium">{t('admin.dashboard.filters.premium')}</option>
          </select>
        </div>
      </div>

      <div className={isMobile ? 'flex-1 overflow-y-auto custom-scrollbar' : 'flex-1 overflow-x-auto'}>
        {isMobile ? (
          // Mobile card layout
          <div className="flex flex-col gap-3 p-4">
            {users.length === 0 ? (
              <div className="text-center p-8 text-zinc-500">{t('admin.dashboard.noUsers')}</div>
            ) : (
              users.map(user => {
                const isSelf = user.id === currentUser?.id || user._id === currentUser?._id;
                return (
                  <div
                    key={user.id || user._id}
                    className={`bg-zinc-800/30 rounded-lg p-4 flex flex-col gap-3 border border-zinc-700/50 ${user.isDeleted ? 'opacity-50' : ''}`}
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-semibold overflow-hidden border border-zinc-700 flex-shrink-0">
                        {user.avatarUrl ? <LazyImage src={user.avatarUrl} alt={user.displayName || user.accountName} className="size-full object-cover" /> : (user.displayName || user.accountName || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-zinc-200 truncate">{user.displayName || user.accountName}</span>
                          {isSelf && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider flex-shrink-0">{t('admin.table.you')}</span>}
                        </div>
                        <div className="text-xs text-zinc-500 truncate">{user.email}</div>
                      </div>
                    </div>

                    {/* Role and Status */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-zinc-400 mb-1">{t('admin.table.role')}</p>
                        <button
                          disabled={isSelf}
                          onClick={() => handleChangeRole(user)}
                          className={`w-full px-2 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                            user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-zinc-800 text-zinc-400 active:bg-zinc-700'
                          }`}
                        >
                          {user.role}
                        </button>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-zinc-400 mb-1">{t('admin.table.status')}</p>
                        <div className="w-full p-2 rounded text-xs font-medium text-center">
                          {user.ban?.active ? (
                            <span className="flex items-center justify-center gap-1 text-red-400">
                              <Ban className="size-3" /> {t('admin.table.banned')}
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-1 text-emerald-400">
                              <CheckCircle2 className="size-3" /> {t('admin.table.active')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Projects and Uploads */}
                    <div className="flex gap-2 text-xs">
                      <div className="flex-1 bg-zinc-900/50 rounded px-2 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1 text-zinc-300">
                          <BarChart3 className="size-3.5" />
                          <span>{user.projectCount} {t('admin.table.projects')}</span>
                        </div>
                      </div>
                      <div className="flex-1 bg-zinc-900/50 rounded px-2 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1 text-zinc-300">
                          <Music className="size-3.5" />
                          <span>{user.uploadCount} {t('admin.table.uploads')}</span>
                        </div>
                      </div>
                    </div>

                    {/* IP and Flags */}
                    <div className="flex flex-col gap-1 text-xs">
                      <p className="font-semibold text-zinc-400">{t('admin.table.ip')} / {t('admin.table.flags')}</p>
                      <div className="font-mono text-zinc-500 text-[10px] break-all">{user.lastIp || '—'}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {user.isVerified && <Tip content={t('admin.table.verified')}><CheckCircle2 className="size-4 text-emerald-500" /></Tip>}
                        {user.spotify?.connected && <Tip content={t('admin.table.spotify')}><Activity className={`size-4 ${user.spotify?.isPremium ? 'text-emerald-400' : 'text-zinc-600'}`} /></Tip>}
                        {user.isDeleted && <Tip content={t('admin.table.deleted')}><Trash2 className="size-4 text-red-500" /></Tip>}
                      </div>
                    </div>

                    {/* Actions */}
                    {!isSelf && (
                      <div className="flex flex-col gap-2 pt-2 border-t border-zinc-700/50">
                        {user.isDeleted ? (
                          <Button
                            variant="ghost"
                            onClick={() => handleReactivate(user)}
                            className="h-10 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 gap-2 w-full"
                          >
                            <Undo2 className="size-4" /> {t('admin.table.reactivate')}
                          </Button>
                        ) : (
                          <>
                            {user.appeal?.status === 'pending' ? (
                              <Button
                                variant="secondary"
                                onClick={() => setAppealModal({ isOpen: true, user })}
                                className="h-10 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border-yellow-500/30 gap-2 w-full"
                              >
                                <Info className="size-4" /> {t('admin.table.reviewAppeal')}
                              </Button>
                            ) : (
                              !user.ban?.active && (
                                <Button
                                  variant="ghost"
                                  onClick={() => handleToggleBan(user)}
                                  className="h-10 text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2 w-full"
                                >
                                  <Ban className="size-4" /> {t('admin.table.ban')}
                                </Button>
                              )
                            )}
                            {user.ban?.active && user.appeal?.status !== 'pending' && (
                              <Button
                                variant="ghost"
                                onClick={() => handleToggleBan(user)}
                                className="h-10 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 w-full"
                              >
                                {t('admin.table.unban')}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              onClick={() => handleDelete(user)}
                              className="h-10 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 gap-2 w-full"
                            >
                              <Trash2 className="size-4" /> {t('admin.table.delete')}
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          // Desktop table layout
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/50 bg-zinc-950/30">
                <th className="p-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest">{t('admin.table.user')}</th>
                <th className="p-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest">{t('admin.table.role')}</th>
                <th className="p-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest">{t('admin.table.status')}</th>
                <th className="p-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest">{t('admin.table.projects')} / {t('admin.table.uploads')}</th>
                <th className="p-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest">{t('admin.table.ip')} / {t('admin.table.flags')}</th>
                <th className="p-4 font-semibold text-zinc-500 text-[10px] uppercase tracking-widest text-right">{t('admin.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {users.map(user => {
                const isSelf = user.id === currentUser?.id || user._id === currentUser?._id;
                return (
                  <tr key={user.id || user._id} className={`group hover:bg-zinc-800/30 transition-colors ${user.isDeleted ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-semibold overflow-hidden border border-zinc-700">
                          {user.avatarUrl ? <LazyImage src={user.avatarUrl} alt={user.displayName || user.accountName} className="size-full object-cover" /> : (user.displayName || user.accountName || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-zinc-200">{user.displayName || user.accountName}</span>
                            {isSelf && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">{t('admin.table.you')}</span>}
                          </div>
                          <div className="text-xs text-zinc-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <button
                        disabled={isSelf}
                        onClick={() => handleChangeRole(user)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all ${user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                      >
                        {user.role}
                      </button>
                    </td>
                    <td className="p-4">
                      {user.ban?.active ? (
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5 text-xs text-red-400 font-medium"><Ban className="size-3" /> {t('admin.table.banned')}</span>
                          <span className="text-[10px] text-zinc-600 line-clamp-1 italic" title={user.ban?.reason}>{user.ban?.reason}</span>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium"><CheckCircle2 className="size-3" /> {t('admin.table.active')}</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-4 text-xs font-medium">
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <BarChart3 className="size-3.5 text-zinc-500" /> {user.projectCount}
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <Music className="size-3.5 text-zinc-500" /> {user.uploadCount}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-mono text-[10px] text-zinc-500">{user.lastIp || '—'}</span>
                        <div className="flex items-center gap-1.5">
                          {user.isVerified && <Tip content={t('admin.table.verified')}><CheckCircle2 className="size-3.5 text-emerald-500" /></Tip>}
                          {user.spotify?.connected && <Tip content={t('admin.table.spotify')}><Activity className={`size-3.5 ${user.spotify?.isPremium ? 'text-emerald-400' : 'text-zinc-600'}`} /></Tip>}
                          {user.isDeleted && <Tip content={t('admin.table.deleted')}><Trash2 className="size-3.5 text-red-500" /></Tip>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* XP popover */}
                        {xpPopover === (user.id || user._id) && (
                          <div className="flex items-center gap-1 mr-1">
                            <input
                              type="number"
                              min={1}
                              value={xpAmount}
                              onChange={e => setXpAmount(e.target.value)}
                              className="w-16 h-7 px-2 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-primary"
                            />
                            <button
                              onClick={() => { handleAdjustXP('grant', Number(xpAmount), 'user', user.id || user._id); setXpPopover(null); }}
                              className="h-7 px-2 text-[10px] font-bold rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-colors"
                            >+XP</button>
                            <button
                              onClick={() => { handleAdjustXP('revoke', Number(xpAmount), 'user', user.id || user._id); setXpPopover(null); }}
                              className="h-7 px-2 text-[10px] font-bold rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                            >−XP</button>
                            <button onClick={() => setXpPopover(null)} className="h-7 px-1.5 text-zinc-600 hover:text-zinc-400 text-xs">✕</button>
                          </div>
                        )}
                        {!isSelf && (
                          <>
                            <Tip content="Adjust XP" side="top">
                              <Button variant="ghost" size="icon" onClick={() => { setXpPopover(p => p === (user.id || user._id) ? null : (user.id || user._id)); }} className="size-8 text-amber-500/70 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg">
                                <Zap className="size-3.5" />
                              </Button>
                            </Tip>
                            {user.isDeleted ? (
                              <Button variant="ghost" size="sm" onClick={() => handleReactivate(user)} className="h-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 gap-1.5">
                                <Undo2 className="size-3.5" /> {t('admin.table.reactivate')}
                              </Button>
                            ) : (
                              <>
                                {user.appeal?.status === 'pending' ? (
                                  <Button variant="secondary" size="sm" onClick={() => setAppealModal({ isOpen: true, user })} className="h-8 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border-yellow-500/30 gap-1.5">
                                    <Info className="size-3.5" /> {t('admin.table.reviewAppeal')}
                                  </Button>
                                ) : (
                                  !user.ban?.active && (
                                    <Button variant="ghost" size="sm" onClick={() => handleToggleBan(user)} className="h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5">
                                      <Ban className="size-3.5" /> {t('admin.table.ban')}
                                    </Button>
                                  )
                                )}
                                {user.ban?.active && user.appeal?.status !== 'pending' && (
                                  <Button variant="ghost" size="sm" onClick={() => handleToggleBan(user)} className="h-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10">
                                    {t('admin.table.unban')}
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(user)} className="size-8 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg">
                                  <Trash2 className="size-4" />
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {(hasPrev || hasMore) && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800/50 bg-zinc-900/50">
          <div className="text-xs text-zinc-500">
            {totalUsers != null ? t('admin.dashboard.totalUsers', { count: totalUsers }) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasPrev}
              onClick={onPrevPage}
              className="h-8 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
            >
              {t('common.pagination.previous')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasMore}
              onClick={onNextPage}
              className="h-8 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
            >
              {t('common.pagination.next')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
