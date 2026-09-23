import { useState, useRef, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ScrollProgress } from '@/shared/ui/magicui/scroll-progress';
import { useTranslation } from 'react-i18next';
import type { i18n as I18nInstance } from 'i18next';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { Icon } from '@/shared/ui/Icon';
import { HeaderSearchBar } from '@/features/search/components/HeaderSearchBar';
import { Tip } from '@ui/tip';
import { UserMenu } from './UserMenu';
import { ThemeLangSwitcher } from './ThemeLangSwitcher';
import { HeaderBreadcrumb } from './HeaderBreadcrumb';
import { GuestAuthButtons } from './GuestAuthButtons';
import type { EditorLine } from '@/features/editor/services/editor.service';
import type { AppSettings } from '@/features/settings/settings.types';
import type { AuthUser } from '@/features/auth/hooks/useAuth';
import type { PlayerSlot } from '@/features/player/hooks/usePlayerSlot';
import PlayerControls from '@/features/player/components/PlayerControls';

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
}

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



  const isGuestLanding = location.pathname === '/';
  // Project pages (setup, edit, public view) are fixed-height app layouts that don't
  // window-scroll — the editor and preview panes own their own scroll-progress bars,
  // so the header's window-scroll bar is meaningless noise there.
  const isProjectPage = location.pathname.startsWith('/project/');
  const isEditorPage = Boolean(location.pathname.match(/^\/project\/(local|new|[^/]+\/edit)$/));

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
    } else if (location.pathname.startsWith(path)) {
      navigate(activepublicId ? `/project/${activepublicId}/edit` : '/project/new');
    } else {
      navigate(path);
    }
  };

  const iconBtn = 'size-8 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors rounded-lg flex-shrink-0 cursor-pointer';

  // Guest landing page has its own embedded nav — don't render the app header there
  if (isGuestLanding) return null;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-nav animate-fade-in bg-zinc-950/60 backdrop-blur-2xl">

        <div className="relative max-w-[1600px] mx-auto w-full px-4 lg:px-6 py-2 sm:py-2.5 flex flex-row items-center justify-between gap-2">

          {/* ── Left: Logo + breadcrumb ── */}
          <div className="flex items-center gap-4 lg:gap-8">
            <HeaderBreadcrumb
              isReady={isReady}
              mediaTitle={mediaTitle}
              setMediaTitle={setMediaTitle}
              triggerImportSave={triggerImportSave}
              forkedFrom={forkedFrom}
              projectCoverImage={projectCoverImage}
              onLogoClick={goHomeOrWarn}
              onProjectSettings={isReady && setShowNamingModal ? () => setShowNamingModal(true) : undefined}
            />

            {/* ── Desktop Navigation ── */}
            {user && !isGuestLanding && (
              <nav className="hidden lg:flex items-center gap-6">
                <button type="button" onClick={() => navTo('/home')} className={`text-sm font-medium transition-colors ${location.pathname === '/home' ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}>{t('nav.home', 'Home')}</button>
                <button type="button" onClick={() => navTo('/explore')} className={`text-sm font-medium transition-colors ${location.pathname === '/explore' ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}>{t('nav.explore', 'Explore')}</button>
                <button type="button" onClick={() => navTo('/feed')} className={`text-sm font-medium transition-colors ${location.pathname === '/feed' ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}>{t('nav.feed', 'Feed')}</button>
                <button type="button" onClick={() => navTo('/leaderboard')} className={`text-sm font-medium transition-colors ${location.pathname === '/leaderboard' ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}>{t('nav.leaderboard', 'Leaderboard')}</button>
                <button type="button" onClick={() => navTo('/library')} className={`text-sm font-medium transition-colors ${location.pathname === '/library' ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}>{t('nav.library', 'Library')}</button>
              </nav>
            )}
          </div>

          {/* ── Center: Start Syncing (edit mode only) ── */}
          {!syncMode && isReady && playerSlot !== 'header' && playerSlot !== 'preview' && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('editor:start-syncing'))}
              className="py-1 px-3 h-7 text-xs font-semibold text-zinc-950 bg-primary hover:bg-primary-dim rounded-lg transition-colors shrink-0"
            >
              {t('editor.startSyncing')}
            </button>
          )}

          {/* ── Center: Compact player (header slot only) — absolutely centered in the bar ── */}
          {playerSlot === 'header' && isReady && (
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-full max-w-xl px-2 flex justify-center">
              <div className="pointer-events-auto w-full flex justify-center">
                <PlayerControls variant="header" />
              </div>
            </div>
          )}

          <div className="flex-1" />

          {/* ── Right: Controls ── */}
          <div className="flex items-center gap-1.5 flex-shrink-0">

            {/* Search — inline in header */}
            {!isGuestLanding && (
              <div ref={searchOverlayRef} className="flex items-center gap-1">
                {searchOpen && (
                  <div className="w-52 sm:w-64">
                    <HeaderSearchBar autoFocus onClose={() => setSearchOpen(false)} />
                  </div>
                )}
                <Tip content={t('search.title')} side="bottom">
                  <button
                    onClick={() => setSearchOpen(o => !o)}
                    aria-label={t('search.title')}
                    className={`${iconBtn} ${searchOpen ? 'text-primary bg-primary/10' : ''}`}
                  >
                    <Icon name="search" size={14} />
                  </button>
                </Tip>
              </div>
            )}

            {/* Panel hide/show controls moved into the editor toolbar and preview (#11/#12/#13) */}

            {/* Auth section — theme/lang live in the user menu for signed-in users (#14),
                so guests keep the standalone switcher. */}
            {!user ? (
              <>
                <ThemeLangSwitcher currentTheme={currentTheme} updateSetting={updateSetting} i18n={i18n} />
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
                navigate={navigate}
                navTo={navTo}
                setShowKeyboardHelp={setShowKeyboardHelp}
                currentTheme={currentTheme}
                updateSetting={updateSetting}
                i18n={i18n}
              />
            )}
          </div>
        </div>

        {!isProjectPage && <ScrollProgress className="absolute top-auto bottom-0 h-[2px]" />}


      </header>

    </>
  );
}
