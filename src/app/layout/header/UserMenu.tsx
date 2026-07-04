import { useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { i18n as I18nInstance } from 'i18next';
import { Icon } from '@/shared/ui/Icon';
import { Popover, PopoverContent, PopoverItem, PopoverTrigger } from '@ui/popover';
import { Tip } from '@ui/tip';
import { LazyImage } from '@ui/LazyImage';
import { projects, uploads } from '@/app/api';
import { requestsApi } from '@/features/admin/services/requests.service';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import type { AuthUser } from '@/features/auth/hooks/useAuth';
import { isStaff } from '@/features/auth/permissions';
import { THEMES } from './theme-options';

interface UserMenuProps {
  user: AuthUser;
  logout: () => void | Promise<void>;
  navigate: NavigateFunction;
  // navTo carries the unsaved-changes guard from AppHeader (project pages warn before leaving).
  navTo: (path: string) => void;
  setShowKeyboardHelp?: (v: boolean) => void;
  // Theme + language now live in this menu (#14).
  currentTheme: string;
  updateSetting?: (path: string, value: unknown) => void;
  i18n?: I18nInstance;
}

export function UserMenu({ user, logout, navigate, navTo, setShowKeyboardHelp, currentTheme, updateSetting, i18n }: UserMenuProps) {
  const { t } = useTranslation();
  const currentLang = (i18n?.language || 'en').split('-')[0];
  // Library/upload/request counts are only shown in this menu — own the state here.
  const [counts, setCounts] = useState({ library: 0, uploads: 0, requests: 0 });
  const staff = isStaff(user?.permissions);

  const fetchCounts = async () => {
    if (!user) return;
    try {
      const [pRes, uRes, rRes] = await Promise.all([
        projects.list(),
        uploads.listMedia(),
        // Staff workflow counts; non-staff users have no reviewable/own requests.
        staff ? requestsApi.counts().catch(() => ({ pendingReview: 0, myPending: 0 })) : Promise.resolve({ pendingReview: 0, myPending: 0 }),
      ]) as [{ length?: number } | null, { length?: number } | null, { pendingReview: number; myPending: number }];
      setCounts({ library: pRes?.length || 0, uploads: uRes?.length || 0, requests: rRes.pendingReview + rRes.myPending });
    } catch (err) { console.error('Failed to fetch counts for menu:', err); }
  };

  return (
    <>
      <NotificationBell />
      <Popover onOpenChange={(open) => { if (open) fetchCounts(); }}>
        <div className="relative flex-shrink-0">
          <PopoverTrigger className="relative z-[110] size-8 rounded-full overflow-hidden bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 transition-all focus:ring-2 focus:ring-primary/50 cursor-pointer outline-none block">
            {user?.avatarUrl
              ? <LazyImage src={user.avatarUrl} alt={user?.displayName || user?.accountName || user?.email || ''} className="size-full object-cover" />
              : <div className="size-full flex items-center justify-center bg-gradient-to-br from-primary/50 to-accent-purple/50 text-white font-bold text-sm">
                {(user?.displayName || user?.accountName || user?.email || '?').charAt(0).toUpperCase()}
              </div>}
          </PopoverTrigger>
          {user?.email && !user?.isVerified && (
            <Tip content={t('auth.verification.avatarBadge')}>
              <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-amber-400 border-2 border-zinc-950 pointer-events-none z-[111]" />
            </Tip>
          )}
        </div>
        <PopoverContent className="w-[calc(100vw-32px)] sm:w-64 p-0" align="end" sideOffset={8}>
          <div className="p-3 border-b border-zinc-800/60 flex flex-col">
            <span className="text-sm font-bold text-zinc-100 truncate">{user?.displayName || user?.accountName || t('auth.user')}</span>
            <span className="text-xs text-zinc-400 truncate">{user?.email || ''}</span>
          </div>

          <div className="p-1 border-b border-zinc-800/60">
            <PopoverItem onClick={() => navigate('/search')} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
              <span className="flex items-center gap-2"><Icon name="search" size={16} className="text-zinc-400" />{t('search.title')}</span>
            </PopoverItem>
            <PopoverItem onClick={() => navTo('/explore')} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
              <span className="flex items-center gap-2"><Icon name="explore" size={16} className="text-zinc-400" />{t('explore.nav')}</span>
            </PopoverItem>
            <PopoverItem onClick={() => navTo('/feed')} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
              <span className="flex items-center gap-2"><Icon name="language" size={16} className="text-zinc-400" />{t('feed.title')}</span>
            </PopoverItem>
          </div>

          <div className="p-1 border-b border-zinc-800/60">
            <PopoverItem onClick={() => { navigate(user?.accountName ? `/${user.accountName}` : '/'); }} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
              <Icon name="person" size={16} className="text-zinc-400" />{t('profile.title')}
            </PopoverItem>
            <PopoverItem onClick={() => navTo('/library')} className="flex items-center justify-between cursor-pointer font-medium text-sm py-3 sm:py-2">
              <span className="flex items-center gap-2"><Icon name="menu_book" size={16} className="text-zinc-400" />{t('library.title')}</span>
              {counts.library > 0 && <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full text-[10px] tabular-nums font-bold">{counts.library}</span>}
            </PopoverItem>
            <PopoverItem onClick={() => navTo('/uploads')} className="flex items-center justify-between cursor-pointer font-medium text-sm py-3 sm:py-2">
              <span className="flex items-center gap-2"><Icon name="cloud_upload" size={16} className="text-zinc-400" />{t('uploads.title')}</span>
              {counts.uploads > 0 && <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full text-[10px] tabular-nums font-bold">{counts.uploads}</span>}
            </PopoverItem>
            <PopoverItem onClick={() => navigate('/leaderboard')} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
              <span className="flex items-center gap-2"><Icon name="emoji_events" size={16} className="text-warning" />{t('badges.leaderboard.title')}</span>
            </PopoverItem>
          </div>

          <div className="p-1 border-b border-zinc-800/60">
            {staff && (
              <>
                <PopoverItem onClick={() => { navigate('/admin'); }} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2 text-zinc-400 hover:text-zinc-200">
                  <Icon name="security" size={16} />{t('admin.dashboard.title')}
                </PopoverItem>
                <PopoverItem onClick={() => { navigate('/admin?tab=requests'); }} className="flex items-center justify-between cursor-pointer font-medium text-sm py-3 sm:py-2 text-zinc-400 hover:text-zinc-200">
                  <span className="flex items-center gap-2"><Icon name="mail" size={16} />{t('admin.requests.title')}</span>
                  {counts.requests > 0 && <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] tabular-nums font-bold">{counts.requests}</span>}
                </PopoverItem>
              </>
            )}
            <PopoverItem onClick={() => { navigate('/settings'); }} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
              <Icon name="settings" size={16} className="text-zinc-400" />{t('settings.title')}
            </PopoverItem>
            {setShowKeyboardHelp && (
              <PopoverItem onClick={() => { setShowKeyboardHelp(true); }} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
                <Icon name="menu_book" size={16} className="text-zinc-400" />{t('shortcuts.title')}
              </PopoverItem>
            )}
          </div>

          <div className="p-1 border-b border-zinc-800/60">
            {/* Theme picker (#14) */}
            <div className="px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-zinc-300">{t('settings.interface.theme')}</span>
              <div className="flex items-center gap-1.5">
                {THEMES.map(({ id, label, iconName }) => (
                  <Tip key={id} content={label}>
                    <button
                      onClick={() => updateSetting?.('interface.theme', id)}
                      aria-label={label}
                      aria-pressed={currentTheme === id}
                      className={`size-7 flex items-center justify-center rounded-lg transition-all ${currentTheme === id ? 'text-primary bg-primary/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                    >
                      <Icon name={iconName} size={14} />
                    </button>
                  </Tip>
                ))}
              </div>
            </div>
            {/* Language toggle — two languages, so a single flip (#14) */}
            <PopoverItem
              onClick={() => i18n?.changeLanguage(currentLang === 'es' ? 'en' : 'es')}
              className="flex items-center justify-between cursor-pointer font-medium text-sm py-3 sm:py-2"
            >
              <span className="flex items-center gap-2"><Icon name="language" size={16} className="text-zinc-400" />{t('settings.interface.language')}</span>
              <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full text-[10px] tabular-nums font-bold uppercase">{currentLang}</span>
            </PopoverItem>
          </div>

          <div className="p-1">
            <PopoverItem onClick={async () => {
              await logout();
              window.location.href = '/auth/signin?from=logout';
            }} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2 text-red-400 hover:text-red-300">
              <Icon name="logout" size={16} />{t('auth.signOut')}
            </PopoverItem>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
