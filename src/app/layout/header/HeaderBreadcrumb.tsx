import { useState, useRef, useEffect, useMemo, startTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import { Input } from '@ui/input';
import { Tip } from '@ui/tip';
import { Button } from '@ui/button';
import { LazyImage } from '@ui/LazyImage';
import { Icon } from '@/shared/ui/Icon';
import { LogoMark } from '@/shared/ui/LogoMark';
import { findPrevious, readTrail, recordVisit } from '@/shared/utils/nav-trail';

interface ForkedFrom {
  publicId?: string;
  accountName?: string;
}

interface HeaderBreadcrumbProps {
  isReady: boolean;
  mediaTitle: string;
  setMediaTitle: (title: string) => void;
  triggerImportSave: (opts: { title?: string }) => void;
  forkedFrom?: ForkedFrom | null;
  projectCoverImage?: string | null;
  // Logo click is guarded for unsaved changes by the parent.
  onLogoClick: () => void;
  // Opens the project settings modal; shown left of the title on project pages (#10).
  onProjectSettings?: () => void;
  // Editor workspace only: shows "Library /" before the title. Guarded for
  // unsaved changes by the parent.
  onLibrary?: () => void;
}

export function HeaderBreadcrumb({ isReady, mediaTitle, setMediaTitle, triggerImportSave, forkedFrom, projectCoverImage, onLogoClick, onProjectSettings, onLibrary }: HeaderBreadcrumbProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [editingProjectName, setEditingProjectName] = useState(false);
  const projectNameInputRef = useRef<HTMLInputElement | null>(null);

  const isSetupPage = location.pathname === '/project/new';
  const isSettingsPage = location.pathname.startsWith('/settings');

  // Title for a path's first segment. Used for the current page (settings) and for the
  // page the back arrow leads to (everywhere else).
  const titleFor = (pathname: string): string => {
    const seg = pathname.split('/')[1] ?? '';
    const map: Record<string, string> = {
      '': t('nav.home'),
      home: t('nav.home'),
      profile: t('profile.title'),
      settings: t('settings.title'),
      library: t('library.title'),
      uploads: t('uploads.title'),
      admin: t('admin.dashboard.title'),
      'change-password': t('auth.changePassword.title'),
      'verify-email': t('auth.verification.pageTitle'),
      feed: t('feed.title'),
      search: t('search.title'),
      explore: t('explore.nav'),
      leaderboard: t('badges.leaderboard.title'),
      notifications: t('notifications.bell'),
    };
    return map[seg] || seg.replace(/-/g, ' ');
  };
  const breadcrumbTitle = titleFor(location.pathname);

  // Where "back" goes. React Router numbers history entries (history.state.idx); the trail
  // remembers which path sat at each one, so the label can name the real destination
  // instead of the page the user is already on.
  const navigationType = useNavigationType();
  const historyIdx: number | undefined = window.history.state?.idx;
  useEffect(() => {
    if (historyIdx !== undefined) recordVisit(historyIdx, location.pathname, navigationType === 'PUSH');
  }, [historyIdx, location.pathname, navigationType]);
  const previous = useMemo(
    () => (historyIdx === undefined ? null : findPrevious(readTrail(), historyIdx, location.pathname)),
    [historyIdx, location.pathname],
  );
  // Opened directly on this page (deep link, new tab): there is no in-app "back", and
  // history.back() could leave the site, so the arrow offers Home instead.
  const backTitle = previous ? titleFor(previous.path) : t('nav.home');
  const goBack = () => (previous ? navigate(previous.delta) : navigate('/home'));

  return (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
      <button
        onClick={onLogoClick}
        className="size-7 sm:size-8 coarse:size-11 flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
      >
        <LogoMark className="size-full" />
      </button>

      <div className="flex items-center gap-1.5 min-w-0">
        {isReady ? (
          <>
            {onLibrary && (
              <button
                type="button"
                onClick={onLibrary}
                className="max-sm:hidden shrink-0 py-1 coarse:py-3.5 -my-1 text-sm text-foreground/65 hover:text-foreground transition-colors"
              >
                {t('library.title')}
              </button>
            )}
            <span aria-hidden className={`text-foreground/45 shrink-0 ${onLibrary ? 'max-sm:hidden' : ''}`}>/</span>
            {projectCoverImage && (
              <LazyImage
                src={projectCoverImage}
                alt=""
                className="size-6 rounded object-cover border border-zinc-700/50 shrink-0"
              />
            )}
            {onProjectSettings && (
              <Tip content={t('editor.projectSettings')} side="bottom">
                {/* Pinned to 24px on touch too: the breadcrumb shares one row with 44px action icons. */}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={onProjectSettings}
                  aria-label={t('editor.projectSettings')}
                  className="size-6 coarse:size-6"
                >
                  <Icon name="tune" size={14} />
                </Button>
              </Tip>
            )}
            {editingProjectName ? (
              <Input
                ref={projectNameInputRef}
                type="text"
                value={mediaTitle}
                onChange={(e) => setMediaTitle(e.target.value)}
                onBlur={() => {
                  setEditingProjectName(false);
                  triggerImportSave({ title: mediaTitle });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { setEditingProjectName(false); triggerImportSave({ title: mediaTitle }); }
                  else if (e.key === 'Escape') { setEditingProjectName(false); }
                }}
                maxLength={200}
                className="h-6 text-xs bg-zinc-800/60 border-zinc-700/60 text-zinc-200 min-w-[100px] max-w-[180px]"
              />
            ) : (
              <button
                onClick={() => {
                  startTransition(() => setEditingProjectName(true));
                  requestAnimationFrame(() => projectNameInputRef.current?.focus());
                }}
                className="flex items-center gap-1 min-w-0 group py-1 coarse:py-3.5 -my-1"
                aria-label={t('setup.projectNamePlaceholder')}
              >
                <span className={`truncate transition-colors max-w-[16vw] sm:max-w-[200px] ${onLibrary ? 'text-sm font-semibold text-foreground' : 'text-xs font-medium text-zinc-400 group-hover:text-zinc-200'}`}>
                  {mediaTitle || t('setup.projectNamePlaceholder')}
                </span>
                <Icon name="edit" size={12} className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
              </button>
            )}
            {forkedFrom?.publicId && (
              <Tip content={forkedFrom.accountName ? t('share.forkedFrom', { accountName: forkedFrom.accountName }) : t('share.forkedProject')}>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-blue/10 border border-accent-blue/20 text-[9px] font-bold text-accent-blue uppercase shrink-0 cursor-help transition-colors hover:bg-accent-blue/20">
                  <Icon name="open_in_new" size={10} />
                  <span className="hidden xs:inline">{t('share.forkedBadge')}</span>
                </div>
              </Tip>
            )}
          </>
        ) : isSetupPage ? null : location.pathname !== '/home' && location.pathname !== '/' && (
          <>
            <span className="text-zinc-700 shrink-0 hidden sm:inline">/</span>
            {isSettingsPage ? (
              // Settings keeps its own guarded back button in-page, so the header shows the title only.
              <span className="font-mono text-xs font-medium text-subtle truncate uppercase tracking-[0.1em] max-w-[20vw] sm:max-w-none">
                {breadcrumbTitle}
              </span>
            ) : (
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1.5 min-w-0 group py-1 coarse:py-3.5 -my-1"
                aria-label={`${t('common.back')}: ${backTitle}`}
              >
                <Icon name="arrow_back" size={14} className="text-zinc-500 group-hover:text-zinc-200 transition-colors shrink-0" />
                {/* Capped on narrow screens: the header's action icons are
                    44px each on touch, and without a ceiling here the last two
                    (notifications, user menu) get pushed off-screen. */}
                <span className="font-mono text-xs font-medium text-subtle group-hover:text-foreground truncate uppercase tracking-[0.1em] transition-colors max-w-[20vw] sm:max-w-none">
                  {backTitle}
                </span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
