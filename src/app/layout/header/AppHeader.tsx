import { useState, useRef, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ScrollProgress } from '@/shared/ui/magicui/scroll-progress';
import { useTranslation } from 'react-i18next';
import type { i18n as I18nInstance } from 'i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Settings2,
} from 'lucide-react';
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
  focusMode: string;
  setFocusMode: (mode: string) => void;
  hideEditor: boolean;
  setHideEditor: Dispatch<SetStateAction<boolean>>;
  hidePreview: boolean;
  setHidePreview: Dispatch<SetStateAction<boolean>>;
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
  focusMode,
  setFocusMode,
  hideEditor,
  setHideEditor,
  hidePreview,
  setHidePreview,
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

  const currentTheme = settings?.interface?.theme || 'dark';

  const goHomeOrWarn = () => {
    if (location.pathname.startsWith('/project/') && hasUnsavedChanges()) {
      setUnsavedModalTarget('/');
    } else {
      navigate('/');
    }
  };

  const navTo = (path: string) => {
    const inProject = location.pathname.startsWith('/project/');
    if (inProject && hasUnsavedChanges()) {
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
          <HeaderBreadcrumb
            isReady={isReady}
            mediaTitle={mediaTitle}
            setMediaTitle={setMediaTitle}
            triggerImportSave={triggerImportSave}
            forkedFrom={forkedFrom}
            projectCoverImage={projectCoverImage}
            onLogoClick={goHomeOrWarn}
          />

          {/* ── Center: Start Syncing (edit mode only) ── */}
          {!syncMode && isReady && playerSlot !== 'header' && (
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
                    <Search className="size-3.5" />
                  </button>
                </Tip>
              </div>
            )}

            {/* Panel toggle button group — desktop, project pages */}
            {isReady && lines.length > 0 && (
              <div className="hidden lg:flex items-center bg-zinc-800/60 border border-zinc-800/50 rounded-xl overflow-hidden flex-shrink-0">
                <Tip content={t('app.hideEditor')} side="bottom">
                  <button
                    aria-label={t('app.hideEditor')}
                    onClick={() => {
                      if (focusMode === 'playback') { setFocusMode('default'); setHideEditor(false); }
                      else { setHideEditor(h => !h); if (hidePreview) setHidePreview(false); }
                    }}
                    className={`flex size-8 items-center justify-center transition-colors text-xs font-bold border-r border-zinc-800/50 ${(hideEditor || focusMode === 'playback')
                        ? 'text-primary bg-primary/10'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                      }`}
                  >
                    {(hideEditor || focusMode === 'playback') ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
                  </button>
                </Tip>
                <Tip content={t('app.hidePreview')} side="bottom">
                  <button
                    aria-label={t('app.hidePreview')}
                    onClick={() => { setHidePreview(h => !h); if (hideEditor) setHideEditor(false); }}
                    className={`flex size-8 items-center justify-center transition-colors text-xs font-bold border-r border-zinc-800/50 ${hidePreview
                        ? 'text-primary bg-primary/10'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                      }`}
                  >
                    {hidePreview ? <PanelRightOpen className="size-3.5" /> : <PanelRightClose className="size-3.5" />}
                  </button>
                </Tip>
                {setShowNamingModal && (
                  <Tip content={t('editor.projectSettings')} side="bottom">
                    <button
                      aria-label={t('editor.projectSettings')}
                      onClick={() => setShowNamingModal(true)}
                      className="flex size-8 items-center justify-center transition-colors text-xs font-bold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                    >
                      <Settings2 className="size-3.5" />
                    </button>
                  </Tip>
                )}
              </div>
            )}

            {/* Grouped icon controls: theme | lang */}
            <ThemeLangSwitcher currentTheme={currentTheme} updateSetting={updateSetting} i18n={i18n} />

            {/* Auth section */}
            {!user ? (
              <GuestAuthButtons
                isReady={isReady}
                lines={lines}
                mediaTitle={mediaTitle}
                buildProjectPayload={buildProjectPayload}
              />
            ) : (
              <UserMenu
                user={user}
                logout={logout}
                navigate={navigate}
                navTo={navTo}
                setShowKeyboardHelp={setShowKeyboardHelp}
              />
            )}
          </div>
        </div>

        {!isProjectPage && <ScrollProgress className="absolute top-auto bottom-0 h-[2px]" />}


      </header>

    </>
  );
}
