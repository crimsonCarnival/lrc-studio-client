import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { guardedLinkClick } from './guarded-link-click';
import { useTranslation } from 'react-i18next';
import type { i18n as I18nInstance } from 'i18next';
import { Icon } from '@/shared/ui/Icon';
import { Popover, PopoverContent, PopoverItem, PopoverTrigger } from '@ui/popover';
import { Tip } from '@ui/tip';
import { Button } from '@ui/button';
import { CountDot } from '@ui/count-dot';
import { LazyImage } from '@ui/LazyImage';
import { projects, uploads } from '@/app/api';
import { requestsApi } from '@/features/admin/services/requests.service';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import type { AuthUser } from '@/features/auth/hooks/useAuth';
import { isStaff } from '@/features/auth/permissions';
import { adminHostUrl, canUseAdminHost } from '@/shared/utils/host';
import { THEMES } from './theme-options';

interface UserMenuProps {
  user: AuthUser;
  logout: () => void | Promise<void>;
  // navTo carries the unsaved-changes guard from AppHeader (project pages warn before leaving).
  navTo: (path: string) => void;
  setShowKeyboardHelp?: (v: boolean) => void;
  // Theme + language now live in this menu (#14).
  currentTheme: string;
  updateSetting?: (path: string, value: unknown) => void;
  i18n?: I18nInstance;
}

export function UserMenu({ user, logout, navTo, setShowKeyboardHelp, currentTheme, updateSetting, i18n }: UserMenuProps) {
  const { t } = useTranslation();
  const currentLang = (i18n?.language || 'en').split('-')[0];
  // Library/upload/request counts are only shown in this menu — own the state here.
  const [counts, setCounts] = useState({ library: 0, uploads: 0, requests: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const staff = isStaff(user?.permissions);

  const fetchCounts = async () => {
    if (!user) return;
    try {
      const [pRes, uRes] = await Promise.all([
        projects.list(),
        uploads.listMedia(),
      ]) as [{ length?: number } | null, { length?: number } | null];
      setCounts(prev => ({ ...prev, library: pRes?.length || 0, uploads: uRes?.length || 0 }));
    } catch (err) { console.error('Failed to fetch counts for menu:', err); }
  };

  useEffect(() => {
    if (staff) {
      requestsApi.counts()
        .then(rRes => setCounts(prev => ({ ...prev, requests: rRes.pendingReview + rRes.myPending })))
        .catch(() => {});
    }
  }, [staff]);

  return (
    <>
      {staff && (
        <Tip content={t('admin.dashboard.title')}>
          <Button asChild variant="ghost" size="icon" className="relative size-10 lg:size-10 coarse:size-11">
            {(() => {
              const inner = (
                <>
                  <Icon name="security" size={20} />
                  <CountDot count={counts.requests} />
                </>
              );
              // The dashboard lives on the admin host; fall back to /admin on previews/localhost.
              return canUseAdminHost()
                ? <a href={adminHostUrl('/')} aria-label={t('admin.dashboard.title')}>{inner}</a>
                : <Link to="/admin" aria-label={t('admin.dashboard.title')}>{inner}</Link>;
            })()}
          </Button>
        </Tip>
      )}
      <NotificationBell />
      <Popover open={menuOpen} onOpenChange={(open) => { setMenuOpen(open); if (open) fetchCounts(); }}>
        <div className="relative flex-shrink-0">
          {/* Double ring: 2px of page colour, then a hairline, so the avatar reads as lifted off the bar (sheet 06). */}
          <PopoverTrigger className="relative z-[110] ml-1 block size-10 coarse:size-11 cursor-pointer overflow-hidden rounded-full bg-primary-soft shadow-[0_0_0_2px_var(--background),0_0_0_3.5px_var(--hl)] transition-shadow duration-[var(--duration-state)] outline-none hover:shadow-[0_0_0_2px_var(--background),0_0_0_3.5px_var(--subtle)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-focus">
            {user?.avatarUrl
              ? <LazyImage src={user.avatarUrl} alt={user?.displayName || user?.accountName || user?.email || ''} className="size-full object-cover" />
              : <div className="size-full grid place-items-center font-heading text-[17px] font-bold text-primary-ink">
                {(user?.displayName || user?.accountName || user?.email || '?').charAt(0).toUpperCase()}
              </div>}
          </PopoverTrigger>
          {user?.email && !user?.isVerified && (
            <Tip content={t('auth.verification.avatarBadge')}>
              <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-amber-400 border-2 border-zinc-950 pointer-events-none z-[111]" />
            </Tip>
          )}
        </div>
        <PopoverContent
          className="w-[calc(100vw-32px)] sm:w-64 p-0"
          align="end"
          sideOffset={8}
          // Choosing an item closes the menu. One handler here instead of one per item, so a
          // new item cannot forget it. Items that flip a preference in place (language)
          // opt out with data-keep-open; the theme buttons are not menu items at all.
          onClick={(e) => {
            const item = (e.target as HTMLElement).closest('[data-slot="popover-item"]');
            if (item && !item.hasAttribute('data-keep-open')) setMenuOpen(false);
          }}
        >
          <div className="p-3 border-b border-zinc-800/60 flex flex-col">
            <span className="text-sm font-bold text-zinc-100 truncate">{user?.displayName || user?.accountName || t('auth.user')}</span>
            <span className="text-xs text-zinc-400 truncate">{user?.email || ''}</span>
          </div>

          <div className="p-1 border-b border-zinc-800/60">
            <PopoverItem asChild><Link to="/search" className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
              <span className="flex items-center gap-2"><Icon name="search" size={16} className="text-zinc-400" />{t('search.title')}</span>
            </Link></PopoverItem>
            <PopoverItem asChild><Link to="/explore" onClick={(e) => guardedLinkClick(e, () => navTo('/explore'))} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
              <span className="flex items-center gap-2"><Icon name="explore" size={16} className="text-zinc-400" />{t('explore.nav')}</span>
            </Link></PopoverItem>
            <PopoverItem asChild><Link to="/feed" onClick={(e) => guardedLinkClick(e, () => navTo('/feed'))} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
              <span className="flex items-center gap-2"><Icon name="language" size={16} className="text-zinc-400" />{t('feed.title')}</span>
            </Link></PopoverItem>
          </div>

          <div className="p-1 border-b border-zinc-800/60">
            <PopoverItem asChild><Link to={user?.accountName ? `/profile/${user.accountName}` : '/'} className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
              <Icon name="person" size={16} className="text-zinc-400" />{t('profile.title')}
            </Link></PopoverItem>
            <PopoverItem asChild><Link to="/library" onClick={(e) => guardedLinkClick(e, () => navTo('/library'))} className="flex items-center justify-between cursor-pointer font-medium text-sm py-3 sm:py-2">
              <span className="flex items-center gap-2"><Icon name="menu_book" size={16} className="text-zinc-400" />{t('library.title')}</span>
              {counts.library > 0 && <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full text-[10px] tabular-nums font-bold">{counts.library}</span>}
            </Link></PopoverItem>
            <PopoverItem asChild><Link to="/uploads" onClick={(e) => guardedLinkClick(e, () => navTo('/uploads'))} className="flex items-center justify-between cursor-pointer font-medium text-sm py-3 sm:py-2">
              <span className="flex items-center gap-2"><Icon name="cloud_upload" size={16} className="text-zinc-400" />{t('uploads.title')}</span>
              {counts.uploads > 0 && <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full text-[10px] tabular-nums font-bold">{counts.uploads}</span>}
            </Link></PopoverItem>
            <PopoverItem asChild><Link to="/leaderboard" className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
              <span className="flex items-center gap-2"><Icon name="emoji_events" size={16} className="text-warning" />{t('badges.leaderboard.title')}</span>
            </Link></PopoverItem>
          </div>

          <div className="p-1 border-b border-zinc-800/60">

            <PopoverItem asChild><Link to="/settings" className="flex items-center gap-2 cursor-pointer font-medium text-sm py-3 sm:py-2">
              <Icon name="settings" size={16} className="text-zinc-400" />{t('settings.title')}
            </Link></PopoverItem>
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
                {THEMES.map(({ id, labelKey, iconName }) => (
                  <Tip key={id} content={t(labelKey)}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => updateSetting?.('interface.theme', id)}
                      aria-label={t(labelKey)}
                      aria-pressed={currentTheme === id}
                    >
                      <Icon name={iconName} size={14} />
                    </Button>
                  </Tip>
                ))}
              </div>
            </div>
            {/* Language toggle — two languages, so a single flip (#14) */}
            <PopoverItem
              data-keep-open
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
