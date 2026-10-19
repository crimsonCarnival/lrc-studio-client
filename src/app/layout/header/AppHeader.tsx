import { useState, useRef, useEffect } from 'react';
import { isAdminHost } from '@/shared/utils/host';
import type { Dispatch, SetStateAction } from 'react';
import { ScrollProgress } from '@/shared/ui/magicui/scroll-progress';
import { useTranslation } from 'react-i18next';
import type { i18n as I18nInstance } from 'i18next';
import { useNavigate, useLocation, NavLink, Link } from 'react-router-dom';
import { guardedLinkClick } from './guarded-link-click';
import { Icon } from '@/shared/ui/Icon';
import { HeaderSearchBar } from '@/features/search/components/HeaderSearchBar';
import { findOpenDialog, isSearchShortcut, pickShortcutTarget } from '@/shared/utils/search-shortcut';
import { Tip } from '@ui/tip';
import { Button } from '@ui/button';
import { UserMenu } from './UserMenu';
import { ThemeLangSwitcher } from './ThemeLangSwitcher';
import { HeaderBreadcrumb } from './HeaderBreadcrumb';
import { GuestAuthButtons } from './GuestAuthButtons';
import type { EditorLine } from '@/features/editor/services/editor.service';
import type { AppSettings } from '@/features/settings/settings.types';
import type { AuthUser } from '@/features/auth/hooks/useAuth';
import type { PlayerSlot } from '@/features/player/hooks/usePlayerSlot';
import PlayerControls from '@/features/player/components/PlayerControls';
import { isEditorPath, isProjectViewPath, projectEditPath } from '@features/projects/project-path';

interface ForkedFrom {
  publicId?: string;
  accountName?: string;
}

interface AppHeaderProps {
  user?: AuthUser | null;
  logout: () => void | Promise<void>;
  isReady: boolean;
  lines: EditorLine[];
  mediaTitle: string;
  setMediaTitle: (title: string) => void;
  triggerImportSave: (opts: { title?: string }) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildProjectPayload?: () => Record<string, any>;
  hasUnsavedChanges: () => boolean;
  activepublicId?: string | null;
  forkedFrom?: ForkedFrom | null;
  setUnsavedModalTarget: (target: string) => void;
  settings: AppSettings;
  updateSetting?: (path: string, value: unknown) => void;
  i18n?: I18nInstance;
  syncMode: boolean;
  setShowKeyboardHelp?: (v: boolean) => void;
  setShowNamingModal?: (v: boolean) => void;
  playerSlot?: PlayerSlot;
  projectCoverImage?: string | null;
  onStartTour?: () => void;
  /** Which workspace view is showing; the preview replaces the breadcrumb with its back button. */
  workspaceView?: string;
}

// Desktop primary navigation, in display order.
const NAV_LINKS = [
  ['/home', 'nav.home'],
  ['/explore', 'nav.explore'],
  ['/feed', 'nav.feed'],
  ['/leaderboard', 'nav.leaderboard'],
  ['/library', 'nav.library'],
] as const;

export function AppHeader({
  user,
  logout,
  isReady,
  lines,
  mediaTitle,
  setMediaTitle,
  triggerImportSave,
  buildProjectPayload,
  hasUnsavedChanges,
  activepublicId,
  forkedFrom,
  setUnsavedModalTarget,
  settings,
  updateSetting,
  i18n,
  syncMode,
  setShowKeyboardHelp,
  setShowNamingModal,
  playerSlot,
  projectCoverImage,
  onStartTour,
  workspaceView,
}: AppHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const searchOverlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!searchOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (searchOverlayRef.current && !searchOverlayRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') setSearchOpen(false); }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [searchOpen]);

  // "/" opens the header search on pages with no search box of their own. A page-level
  // field (or one inside an open dialog) takes the key first, so this only fills the gap.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!isSearchShortcut(e) || !searchOverlayRef.current) return;
      if (findOpenDialog(document) || pickShortcutTarget(document)) return;
      e.preventDefault();
      setSearchOpen(true);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);



  // On the admin host `/` is the dashboard, not the landing page, so keep the header.
  const isGuestLanding = location.pathname === '/' && !isAdminHost();
  // Project pages (setup, edit, public view) are fixed-height app layouts that don't
  // window-scroll — the editor and preview panes own their own scroll-progress bars,
  // so the header's window-scroll bar is meaningless noise there.
  const isProjectPage = isEditorPath(location.pathname) || isProjectViewPath(location.pathname)
    || location.pathname === '/project/new';
  const isEditorPage = isEditorPath(location.pathname) || location.pathname === '/project/new';
  // The editor/preview workspace takes over the middle and right of the bar:
  // it portals its own status badge, tabs and actions into the slots below
  // (see useHeaderSlot), so the site nav, search and tour button step aside.
  const isWorkspace = isEditorPage && location.pathname !== '/project/new' && isReady;

  const currentTheme = settings?.interface?.theme || 'dark';

  const goHomeOrWarn = () => {
    if (isEditorPage && hasUnsavedChanges()) {
      setUnsavedModalTarget('/');
    } else {
      navigate('/');
    }
  };

  const navTo = (path: string) => {
    if (isEditorPage && hasUnsavedChanges()) {
      setUnsavedModalTarget(path);
    } else if (path !== '/home' && location.pathname.startsWith(path)) {
      // Re-clicking an open section toggles back to the editor. Home is excluded:
      // it is the landing page, so clicking it again must stay on it.
      // The open project belongs to the signed-in user, so they are its owner.
      const dest = activepublicId ? projectEditPath({ publicId: activepublicId }, user?.accountName) : null;
      navigate(dest ?? '/project/new');
    } else {
      navigate(path);
    }
  };

  // Header icon buttons are 40px (44px on touch) at every breakpoint, unlike Button's own icon size.
  const iconBtn = 'size-10 lg:size-10 coarse:size-11';

  // Guest landing page has its own embedded nav — don't render the app header there
  if (isGuestLanding) return null;

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-nav animate-fade-in bg-zinc-950/60 backdrop-blur-2xl ${isWorkspace ? 'border-b border-zinc-800' : ''}`}>

        <div className={`relative mx-auto w-full px-4 lg:px-6 py-2 sm:py-2.5 flex flex-row items-center justify-between gap-2 ${isWorkspace ? '' : 'max-w-[1600px]'}`}>

          {/* ── Left: Logo + breadcrumb ── */}
          <div className={`flex items-center gap-4 lg:gap-8 min-w-0 ${isWorkspace ? 'lg:flex-1' : ''}`}>
            {!(isWorkspace && workspaceView === 'preview') && (
            <HeaderBreadcrumb
              isReady={isReady}
              mediaTitle={mediaTitle}
              setMediaTitle={setMediaTitle}
              triggerImportSave={triggerImportSave}
              forkedFrom={forkedFrom}
              projectCoverImage={projectCoverImage}
              onLogoClick={goHomeOrWarn}
              onProjectSettings={isReady && setShowNamingModal ? () => setShowNamingModal(true) : undefined}
              onLibrary={isWorkspace ? () => navTo('/library') : undefined}
            />
            )}
            <div id="workspace-header-status" className="empty:hidden flex items-center" />

            {/* ── Desktop Navigation ── */}
            {user && !isGuestLanding && !isWorkspace && (
              <nav aria-label={t('nav.main')} className="hidden lg:flex items-center gap-1">
                {NAV_LINKS.map(([path, labelKey]) => {
                  const current = location.pathname === path;
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={(e) => guardedLinkClick(e, () => navTo(path))}
                      aria-current={current ? 'page' : undefined}
                      // Active link: brighter text plus a 16px iris tick under it (sheet 06).
                      className={`relative flex h-10 items-center rounded-[10px] px-3 text-[15px] font-semibold transition-colors duration-[var(--duration-state)] hover:bg-raised hover:text-foreground focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus ${current ? "text-foreground after:absolute after:bottom-0.5 after:left-1/2 after:h-[3px] after:w-4 after:-translate-x-1/2 after:rounded-sm after:bg-iris after:content-['']" : 'text-subtle'}`}
                    >
                      {t(labelKey)}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* ── Center: Start Syncing (edit mode only) ── */}
          {/* Workspace tabs / preview title. In flow between the two sides, so it
              can never sit on top of the actions the way absolute centring did. */}
          <div id="workspace-header-center" className="empty:hidden max-lg:hidden flex items-center shrink-0" />

          {!syncMode && isReady && !isWorkspace && playerSlot !== 'header' && playerSlot !== 'preview' && (
            <Button
              size="sm"
              onClick={() => window.dispatchEvent(new CustomEvent('editor:start-syncing'))}
              className="shrink-0"
            >
              {t('editor.startSyncing')}
            </Button>
          )}

          {/* ── Center: Compact player (header slot only) — absolutely centered in the bar ── */}
          {playerSlot === 'header' && isReady && (
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-full max-w-xl px-2 flex justify-center">
              <div className="pointer-events-auto w-full flex justify-center">
                <PlayerControls variant="header" />
              </div>
            </div>
          )}

          <div className={isWorkspace ? 'flex-1 lg:hidden' : 'flex-1'} />

          {/* ── Right: Controls ── */}
          <div className={`flex items-center gap-2 coarse:gap-1 flex-shrink-0`}>
            <div id="workspace-header-actions" className="empty:hidden flex items-center gap-2" />

            {/* Search — inline in header */}
            {!isGuestLanding && !isWorkspace && (
              <div ref={searchOverlayRef} className="flex items-center gap-1">
                {searchOpen && (
                  <div className="w-52 sm:w-64">
                    <HeaderSearchBar autoFocus onClose={() => setSearchOpen(false)} />
                  </div>
                )}
                <Tip content={t('search.title')} side="bottom">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchOpen(o => !o)}
                    aria-label={t('search.title')}
                    aria-pressed={searchOpen}
                    className={iconBtn}
                  >
                    <Icon name="search" size={20} />
                  </Button>
                </Tip>
              </div>
            )}

            {/* Panel hide/show controls moved into the editor toolbar and preview (#11/#12/#13) */}

            {isEditorPage && isReady && onStartTour && !isWorkspace && (
              <Tip content={t('editor.tour.replay')} side="bottom">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onStartTour}
                  aria-label={t('editor.tour.replay')}
                  className={`${iconBtn} max-sm:hidden`}
                >
                  <Icon name="school" size={20} />
                </Button>
              </Tip>
            )}

            {/* Auth section — theme/lang live in the user menu for signed-in users (#14),
                so guests keep the standalone switcher. */}
            {!user ? (
              <>
                {!isWorkspace && <ThemeLangSwitcher currentTheme={currentTheme} updateSetting={updateSetting} i18n={i18n} />}
                <GuestAuthButtons
                  isReady={isReady}
                  lines={lines}
                  mediaTitle={mediaTitle}
                  buildProjectPayload={buildProjectPayload}
                />
              </>
            ) : (
              <UserMenu
                user={user}
                logout={logout}
                navTo={navTo}
                setShowKeyboardHelp={setShowKeyboardHelp}
                currentTheme={currentTheme}
                updateSetting={updateSetting}
                i18n={i18n}
              />
            )}
          </div>
        </div>

        {!isProjectPage && <ScrollProgress className="absolute top-auto bottom-0 h-[2px] bg-none bg-iris" />}


      </header>

    </>
  );
}
