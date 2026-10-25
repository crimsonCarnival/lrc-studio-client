import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { i18n as I18nInstance } from 'i18next';
import { Icon } from '@/shared/ui/Icon';
import { isAdminHost, wwwHostUrl } from '@/shared/utils/host';
import { adminPath, useAdminRoute } from '@/features/admin/admin-nav';
import { useAdminTabs } from '@/features/admin/useAdminTabs';
import type { AuthUser } from '@/features/auth/hooks/useAuth';
import type { AppSettings } from '@/features/settings/settings.types';
import { UserMenu } from './UserMenu';

interface AdminHeaderProps {
  user?: AuthUser | null;
  logout: () => void | Promise<void>;
  settings: AppSettings;
  updateSetting?: (path: string, value: unknown) => void;
  i18n?: I18nInstance;
  navTo: (path: string) => void;
}

const BACK_LINK = 'flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 h-9 coarse:h-11 text-xs font-semibold text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

/** The header of the admin dashboard: the way back to the site, the dashboard's tabs, and the account menu. */
export function AdminHeader({ user, logout, settings, updateSetting, i18n, navTo }: AdminHeaderProps) {
  const { t } = useTranslation();
  const tabs = useAdminTabs();
  const { tab: routeTab } = useAdminRoute();
  // The dashboard opens on its first permitted tab when the URL names none.
  const activeTab = routeTab ?? tabs[0]?.id;

  const back = (
    <>
      <Icon name="arrow_back" size={14} />
      <span className="max-sm:hidden">{t('admin.header.backToSite')}</span>
    </>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-nav animate-fade-in bg-zinc-950/60 backdrop-blur-2xl border-b border-zinc-800/60">
      <div className="mx-auto w-full max-w-[1600px] px-3 lg:px-6 h-14 lg:h-16 flex items-center gap-2 lg:gap-4">
        {isAdminHost()
          ? <a href={wwwHostUrl('/home')} className={BACK_LINK} aria-label={t('admin.header.backToSite')}>{back}</a>
          : <Link to="/home" className={BACK_LINK} aria-label={t('admin.header.backToSite')}>{back}</Link>}

        <span aria-hidden className="h-5 w-px shrink-0 bg-zinc-800" />

        <nav aria-label={t('admin.header.nav')} className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          {tabs.map(tab => (
            <Link
              key={tab.id}
              to={adminPath(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 h-9 coarse:h-11 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Icon name={tab.icon} size={14} className="shrink-0" />
              {tab.label}
            </Link>
          ))}
        </nav>

        {user && (
          <UserMenu
            user={user}
            logout={logout}
            navTo={navTo}
            currentTheme={settings?.interface?.theme || 'dark'}
            updateSetting={updateSetting}
            i18n={i18n}
          />
        )}
      </div>
    </header>
  );
}
