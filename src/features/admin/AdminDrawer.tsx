import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ActionDrawer from '@/shared/ui/ActionDrawer';
import { Icon } from '@/shared/ui/Icon';
import { isAdminHost, wwwHostUrl } from '@/shared/utils/host';
import { rowBase } from '@/app/layout/AppDrawer';
import { guardedLinkClick } from '@/app/layout/header/guarded-link-click';
import { useDrawerHistory } from '@/app/layout/use-drawer-history';
import { adminPath, groupAdminTabs, type AdminTabId } from './admin-nav';
import type { AdminTab } from './useAdminTabs';

type AdminDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The tabs this staff member may open (already permission-filtered by useAdminTabs). */
  tabs: AdminTab[];
  activeTab?: AdminTabId;
};

/** The phone navigation of the admin dashboard: its tabs in four groups, plus the way back to the app. */
export function AdminDrawer({ open, onOpenChange, tabs, activeTab }: AdminDrawerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const requestClose = useDrawerHistory(open, () => onOpenChange(false));

  // A route change from outside the drawer closes it too.
  const openPathRef = useRef(pathname);
  useEffect(() => { if (!open) openPathRef.current = pathname; }, [open, pathname]);
  useEffect(() => {
    if (open && pathname !== openPathRef.current) requestClose();
  }, [open, pathname, requestClose]);

  const groups = groupAdminTabs(tabs);

  return (
    <ActionDrawer isOpen={open} onClose={() => requestClose()} title={t('admin.header.menu')} side="left">
      <div className="space-y-4 pb-2">
        <nav aria-label={t('admin.header.nav')} className="space-y-4">
          {groups.map(group => (
            <section key={group.id} aria-label={t(`admin.header.groups.${group.id}`)} className="space-y-0.5">
              <h4 aria-hidden="true" className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-subtle">
                {t(`admin.header.groups.${group.id}`)}
              </h4>
              {group.tabs.map(tab => {
                const active = tab.id === activeTab;
                const to = adminPath(tab.id);
                return (
                  <Link
                    key={tab.id}
                    to={to}
                    aria-current={active ? 'page' : undefined}
                    className={`${rowBase} ${active ? 'bg-primary/10 text-primary' : 'text-foreground/85 hover:bg-raised active:bg-raised'}`}
                    onClick={(e) => guardedLinkClick(e, () => requestClose(() => navigate(to)))}
                  >
                    <span aria-hidden="true" className="inline-flex shrink-0"><Icon name={tab.icon} size={20} filled={active} /></span>
                    <span className="min-w-0 flex-1 truncate">{tab.label}</span>
                    {!!tab.count && (
                      <span className="rounded-pill bg-love px-1.5 font-mono text-[11px] font-bold leading-5 text-primary-foreground tabular-nums">
                        <span aria-hidden="true">{tab.count > 99 ? '99+' : tab.count}</span>
                        <span className="sr-only">{t('admin.header.pending', { count: tab.count })}</span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </section>
          ))}
        </nav>

        <div className="border-t border-zinc-800/60 pt-3">
          {isAdminHost() ? (
            <a href={wwwHostUrl('/home')} className={`${rowBase} text-foreground/85 hover:bg-raised`}>
              <span aria-hidden="true" className="inline-flex shrink-0"><Icon name="arrow_back" size={20} /></span>{t('admin.header.backToSite')}
            </a>
          ) : (
            <Link
              to="/home"
              className={`${rowBase} text-foreground/85 hover:bg-raised`}
              onClick={(e) => guardedLinkClick(e, () => requestClose(() => navigate('/home')))}
            >
              <span aria-hidden="true" className="inline-flex shrink-0"><Icon name="arrow_back" size={20} /></span>{t('admin.header.backToSite')}
            </Link>
          )}
        </div>
      </div>
    </ActionDrawer>
  );
}
