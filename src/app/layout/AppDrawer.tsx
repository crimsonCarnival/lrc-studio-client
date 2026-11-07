import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { i18n as I18nInstance, ParseKeys } from 'i18next';
import ActionDrawer from '@/shared/ui/ActionDrawer';
import { Icon } from '@/shared/ui/Icon';
import { InitialsAvatar } from '@/shared/ui/InitialsAvatar';
import { LazyImage } from '@ui/LazyImage';
import { StaffRing } from '@/shared/ui/StaffRing';
import ThemeModal from '@/features/settings/components/theme/ThemeModal';
import type { AuthUser } from '@/features/auth/auth.types';
import { adminHostUrl, canUseAdminHost } from '@/shared/utils/host';
import { guardedLinkClick } from './header/guarded-link-click';
import { THEMES, LANGUAGES, getLangLabel } from './header/theme-options';
import { activeNavId, getNavItems } from './nav-items';
import type { NavGroup, NavItem } from './nav-items';
import { useDrawerHistory } from './use-drawer-history';

type AppDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AuthUser | null | undefined;
  logout: () => void | Promise<void>;
  /** Navigation with the app's unsaved-changes guard. */
  go: (path: string) => void;
  /** Guest sign in / sign up, which stashes a draft in progress first. */
  onGuestAuth: (target: 'signin' | 'signup') => void;
  currentTheme: string;
  customTheme?: string;
  updateSetting?: (path: string, value: unknown) => void;
  i18n?: I18nInstance;
  unreadCount?: number;
  /** Requests to review plus open reports, for the Admin item. */
  staffPending?: number;
};

const GROUP_LABEL: Record<NavGroup, ParseKeys> = {
  main: 'nav.groupMain',
  discover: 'nav.groupDiscover',
  you: 'nav.groupYou',
  staff: 'nav.groupStaff',
};
const GROUP_ORDER: NavGroup[] = ['main', 'discover', 'you', 'staff'];

export const rowBase =
  'flex min-h-11 w-full items-center gap-3 rounded-[calc(var(--radius)*1)] px-3 py-2.5 text-left text-[15px] font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus';

const choice = (selected: boolean) =>
  `flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[calc(var(--radius)*1)] border px-3 text-sm font-semibold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus ${
    selected ? 'border-primary bg-primary/10 text-primary' : 'border-zinc-800 text-foreground/80 hover:bg-raised'
  }`;

/**
 * The phone navigation drawer: every indexed route, grouped, plus the account and
 * appearance controls that used to live in the avatar menu. Slides in from the left.
 */
export function AppDrawer({
  open, onOpenChange, user, logout, go, onGuestAuth, currentTheme, customTheme, updateSetting, i18n, unreadCount = 0, staffPending = 0,
}: AppDrawerProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [themeOpen, setThemeOpen] = useState(false);
  const requestClose = useDrawerHistory(open, () => onOpenChange(false));

  // A route change from outside the drawer (a link in the page, a redirect) closes it too.
  const openPathRef = useRef(pathname);
  useEffect(() => { if (!open) openPathRef.current = pathname; }, [open, pathname]);
  useEffect(() => {
    if (open && pathname !== openPathRef.current) requestClose();
  }, [open, pathname, requestClose]);

  const items = getNavItems({ user, permissions: user?.permissions, accountName: user?.accountName });
  const activeId = activeNavId(items, pathname);
  const lang = (i18n?.language || 'en').split('-')[0];
  const name = user?.displayName || user?.accountName || user?.email || t('auth.user');

  const renderItem = (item: NavItem): ReactNode => {
    const active = item.id === activeId;
    const badge = item.id === 'notifications' && unreadCount > 0 ? unreadCount : 0;
    const dashboardCount = item.id === 'admin' ? staffPending : 0;
    const cls = `${rowBase} ${active ? 'bg-primary/10 text-primary' : 'text-foreground/85 hover:bg-raised active:bg-raised'}`;
    const inner = (
      <>
        <span aria-hidden="true" className="inline-flex shrink-0"><Icon name={item.icon} size={20} filled={active} /></span>
        <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
        {dashboardCount > 0 && (
          <span className="rounded-pill bg-love px-1.5 font-mono text-[11px] font-bold leading-5 text-primary-foreground tabular-nums">
            <span aria-hidden="true">{dashboardCount > 99 ? '99+' : dashboardCount}</span>
            <span className="sr-only">{t('admin.header.dashboardPending', { count: dashboardCount })}</span>
          </span>
        )}
        {badge > 0 && (
          <span className="rounded-pill bg-love px-1.5 font-mono text-[11px] font-bold leading-5 text-primary-foreground tabular-nums">
            <span aria-hidden="true">{badge > 99 ? '99+' : badge}</span>
            <span className="sr-only">{t('nav.unread', { count: badge })}</span>
          </span>
        )}
      </>
    );
    // The dashboard lives on its own host in production; elsewhere it is the /admin route.
    if (item.id === 'admin' && canUseAdminHost()) {
      return <a key={item.id} href={adminHostUrl('/')} className={cls}>{inner}</a>;
    }
    return (
      <Link
        key={item.id}
        to={item.path}
        aria-current={active ? 'page' : undefined}
        className={cls}
        onClick={(e) => guardedLinkClick(e, () => requestClose(() => go(item.path)))}
      >
        {inner}
      </Link>
    );
  };

  return (
    <>
      <ThemeModal
        open={themeOpen}
        onOpenChange={setThemeOpen}
        settings={{ interface: { theme: currentTheme, customTheme } }}
        updateSetting={(path, value) => updateSetting?.(path, value)}
      />
      <ActionDrawer isOpen={open} onClose={() => requestClose()} title={t('nav.menu')} side="left">
        <div className="space-y-4 pb-2">
          {user ? (
            <div className="flex items-center gap-3 px-3 py-2">
              <StaffRing role={user.staffRole} outset={3.5}>
                <div className="size-12 shrink-0 overflow-hidden rounded-full bg-primary-soft">
                  {user.avatarUrl
                    ? <LazyImage src={user.avatarUrl} alt="" className="size-full object-cover" />
                    : <InitialsAvatar name={name} handle={user.accountName} className="size-full text-[19px]" />}
                </div>
              </StaffRing>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-foreground">{name}</p>
                {user.accountName && <p className="truncate text-sm text-subtle">@{user.accountName}</p>}
              </div>
            </div>
          ) : (
            <div className="flex gap-2 px-1">
              <button type="button" className={choice(false)} onClick={() => requestClose(() => onGuestAuth('signin'))}>
                {t('auth.signIn')}
              </button>
              <button type="button" className={choice(true)} onClick={() => requestClose(() => onGuestAuth('signup'))}>
                {t('auth.signUp')}
              </button>
            </div>
          )}

          {user?.email && !user.isVerified && (
            <Link
              to="/settings"
              className={`${rowBase} border border-amber-400/40 text-foreground/90 hover:bg-raised`}
              onClick={(e) => guardedLinkClick(e, () => requestClose(() => go('/settings')))}
            >
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-amber-400" />
              <span className="min-w-0 flex-1">{t('nav.verifyEmail')}</span>
            </Link>
          )}

          <nav aria-label={t('nav.mainNav')} className="space-y-4">
            {GROUP_ORDER.map((group) => {
              const groupItems = items.filter((i) => i.group === group);
              if (groupItems.length === 0) return null;
              return (
                <section key={group} aria-label={t(GROUP_LABEL[group])} className="space-y-0.5">
                  <h4 aria-hidden="true" className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-subtle">
                    {t(GROUP_LABEL[group])}
                  </h4>
                  {groupItems.map(renderItem)}
                </section>
              );
            })}
          </nav>

          <section aria-label={t('nav.appearance')} className="space-y-2 border-t border-zinc-800/60 px-1 pt-4">
            <div className="flex gap-2">
              {THEMES.map(({ id, labelKey, iconName }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={currentTheme === id}
                  className={choice(currentTheme === id)}
                  onClick={() => updateSetting?.('interface.theme', id)}
                >
                  <span aria-hidden="true" className="inline-flex shrink-0"><Icon name={iconName} size={18} /></span>{t(labelKey)}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`${rowBase} text-foreground/85 hover:bg-raised`}
              onClick={() => requestClose(() => setThemeOpen(true))}
            >
              <span aria-hidden="true" className="inline-flex shrink-0"><Icon name="palette" size={20} /></span>{t('settings.interface.moreThemes')}
            </button>
            <div role="group" aria-label={t('nav.language')} className="flex gap-2">
              {LANGUAGES.map(({ code }) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={lang === code}
                  className={choice(lang === code)}
                  onClick={() => i18n?.changeLanguage(code)}
                >
                  {getLangLabel(code, lang)}
                </button>
              ))}
            </div>
          </section>

          {user && (
            <div className="border-t border-zinc-800/60 pt-3">
              <button
                type="button"
                className={`${rowBase} text-red-400 hover:bg-red-500/10`}
                onClick={async () => {
                  await logout();
                  window.location.href = '/auth/signin?from=logout';
                }}
              >
                <span aria-hidden="true" className="inline-flex shrink-0"><Icon name="logout" size={20} /></span>{t('auth.signOut')}
              </button>
            </div>
          )}
        </div>
      </ActionDrawer>
    </>
  );
}
