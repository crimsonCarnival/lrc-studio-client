import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { artistFieldsFromForm, artistRoster, type ArtistCredit } from '@/features/artists/artist-credits';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { buildSingerRoster } from '@features/editor/utils/singer-colors';

import { AppBackground } from './layout/AppBackground';
import { AppHeader } from './layout/header/AppHeader';
import { useAutoHideHeader } from './layout/header/useAutoHideHeader';
import { AdminHeader } from './layout/header/AdminHeader';
import { isAdminPathname } from '@/features/admin/admin-nav';
import { AppPlayer } from './layout/AppPlayer';
import { AppMobileNav } from './layout/AppMobileNav';
import { BOTTOM_BAR_CLEARANCE, showsBottomBar } from './layout/nav-items';
import { AppModals } from './layout/AppModals';
import { SafeAreaContainer } from '../shared/ui/SafeAreaContainer';
import { PlayerEngineProvider } from '@/features/player/PlayerEngine';
import { usePlayerSlot } from '@/features/player/hooks/usePlayerSlot';
import { useBreakpoint } from '@/shared/hooks/useBreakpoint';
import { useGuidedTour } from '@/features/editor/hooks/useGuidedTour';
import { GuidedTour } from '@/features/editor/components/GuidedTour';
import { EDITOR_TOUR_STEPS } from '@/features/editor/tour/tour-steps';
import { PhoneEditorChromeContext } from './layout/phone-editor-chrome';
import { isEditorPath, isProjectViewPath } from '@features/projects/project-path';
import type { AppState } from '@/app/useAppState';
import { CollabPresenceProvider } from '@/features/collab/components/CollabPresenceProvider';
import type { AppSettings } from '@/features/settings/settings.types';
import type { AuthUser } from '@/features/auth/auth.types';

// App augments the raw useAppState result with layout-driven playback state
// before passing it down (see App.tsx enhancedAppState).
interface EnhancedAppState extends AppState {
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (v: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleSetupComplete: (data: any) => void | Promise<void>;
}

// layoutState is an inline object assembled in App; kept loose here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseState = Record<string, any>;

interface SetupConfirmData {
  name?: string;
  description?: string;
  tags?: string[];
  songName?: string;
  artists?: ArtistCredit[];
  artistsChanged?: boolean;
  songAlbum?: string;
  songYear?: string | number;
  genre?: string;
  coverImage?: string;
  singerColors?: string[];
  singers?: string[];
}

interface AppLayoutProps {
  children?: ReactNode;
  user?: unknown;
  logout?: () => void;
  appState: EnhancedAppState;
  settingsState: { settings: AppSettings; updateSetting: (path: string, value: unknown) => void };
  layoutState: LooseState;
}

export function AppLayout({ children, user, logout, appState, settingsState, layoutState }: AppLayoutProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    mediaTitle, setMediaTitle, showKeyboardHelp, setShowKeyboardHelp,
    isDraggingFile, playerRef,
    handleManualSave, triggerImportSave, handleDiscardProject, handleRestoreProject, buildProjectPayload,
    handleTimeUpdate, handleDurationChange, handleMediaChange, handleYtUrlChange,
    handleMediaUpload, restoredMedia, restoredPosition,
    restoredSpeed, restoredLoop, hasUnsavedChanges, activepublicId, projectMetadata, setProjectMetadata,
    forkedFrom,
    isProjectLoading, lines, activeLineIndex, playbackPosition, syncMode, pendingProject,
    setIsPlaying, setPlaybackSpeed,
    projectCoverImage, setProjectCoverImage,
    projectIsPublic, setProjectVisibility, isSharedProject,
    collabViewer,
  } = appState;

  const { settings, updateSetting } = settingsState;
  const { mobileTab, isReady, isPlayerMounted, setUnsavedModalTarget, showNamingModal, setShowNamingModal, playerHeight, setPlayerHeight } = layoutState;

  // Reactive so the dynamic padding formula stays correct on resize.
  const isLg = useBreakpoint('lg');

  // Set by the phone editor while it is mounted (see phone-editor-chrome): it draws its own
  // header and player strip, so the app header and the docked player step aside.
  const [phoneEditorMounted, setPhoneEditorMounted] = useState(false);
  const phoneEditorChrome = useMemo(() => ({ mounted: phoneEditorMounted, setMounted: setPhoneEditorMounted }), [phoneEditorMounted]);
  // The workspace shows one view at a time (see EditorWorkspace in AppRouter);
  // whichever is showing owns the desktop player dock.
  const playerSlot = usePlayerSlot({ hideEditor: mobileTab === 'preview' || collabViewer, hidePreview: false, focusMode: 'default', isLg, phoneEditor: phoneEditorMounted });

  // No bottom bar in the editor workspace, setup, the local draft or the public project
  // view, nor while the phone editor draws its own chrome (see showsBottomBar).
  const showMobileNav = showsBottomBar(location.pathname, phoneEditorMounted);

  // Compute dynamic bottom padding only for the mobile dock. Desktop slots (editor/header)
  // are in-flow — no space reservation needed. Above the bottom bar the dock sits at
  // bottom-14 (56px) with a 24px gap, plus the safe-area inset; with no bar it sits on the bottom edge.
  const dynamicPb = playerSlot === 'mobile' && isReady && isPlayerMounted && playerHeight > 0
    ? showMobileNav ? `calc(${playerHeight}px + 5rem + env(safe-area-inset-bottom))` : `${playerHeight}px`
    : undefined;

  const isAdminPage = isAdminPathname(location.pathname);
  const isSetupPage = location.pathname === '/project/new';
  // Same route set AppHeader treats as the editor (it calls the same predicate).
  // The editor builds its own clamped-to-viewport layout below lg (tabs pinned,
  // content scrolls internally via h-full -> flex-1 -> overflow-y-auto), which
  // only works if something upstream actually clamps to the viewport. Every
  // other route relies on min-h-screen so the page scrolls normally under the
  // fixed header/nav; only the editor needs the dvh clamp this early.
  const isEditorPage = isEditorPath(location.pathname) || isSetupPage;

  const { isOpen: isTourOpen, start: startTour, close: closeTour, startIfFirstVisit } = useGuidedTour();

  // Media loads report their title asynchronously (YT onReady fires 1-3s after
  // player creation) through closures captured at load time. Read the CURRENT
  // title from a ref at fire time so a stale closure can't overwrite a name the
  // user set in the meantime (e.g. setup completes with a project name, then
  // the YT title arrives late and clobbers it).
  const mediaTitleRef = useRef(mediaTitle);
  useEffect(() => { mediaTitleRef.current = mediaTitle; });

  const handleMediaTitleChange = useCallback((newTitle: string) => {
    const current = mediaTitleRef.current;
    // Media title only ever fills an empty/placeholder slot — an explicit
    // project name (setup, naming modal, header edit) always wins.
    if (!current || current === t('library.untitled') || current === 'Untitled') {
      setMediaTitle(newTitle);
    }
  }, [setMediaTitle, t]);

  const isPublicProjectView = isProjectViewPath(location.pathname);
  // The editor's workspace header carries its status and actions, and the admin header is a different one.
  useAutoHideHeader(!!settings.interface?.autoHideHeader && !isEditorPage && !isAdminPage);
  // The editor workspace is a full-bleed app screen: its panels run edge to edge
  // under the header, with no page gutters or bottom padding of their own.
  const isWorkspacePage = isEditorPath(location.pathname);
  const isFullWidthPage = isSetupPage || isPublicProjectView || isWorkspacePage;

  // The editor's PlayerEngine lives here, above the routes, so it survives
  // navigation (intentional: the header/mobile dock keep playing while
  // browsing). The public project view mounts its own Player, though, so
  // entering it — via the editor toggle, a link, back/forward or a direct URL —
  // must pause the editor's playback or both play at once.
  useEffect(() => {
    if (isPublicProjectView) playerRef.current?.pause?.();
  }, [isPublicProjectView, playerRef]);

  useEffect(() => {
    if (!isLg || isSetupPage || isPublicProjectView) return;
    if (!isReady || !lines || lines.length === 0) return;
    startIfFirstVisit();
  }, [isLg, isSetupPage, isPublicProjectView, isReady, lines, startIfFirstVisit]);

  const handleProjectConfirm = useCallback(({ name, description, tags, songName, artists, artistsChanged, songAlbum, songYear, genre, coverImage, singerColors, singers }: SetupConfirmData) => {
    const newTitle = name || mediaTitle || '';
    const newMetadata = {
      // Preserve fields not exposed in the modal (songLanguage, trackNumber, trackCount)
      ...projectMetadata,
      description: description || '',
      tags: tags || [],
      songName: songName || '',
      // Credits are only sent when they changed or already exist, so an untouched legacy row keeps its stored artists.
      ...artistFieldsFromForm({ artists, artistsChanged: artistsChanged || projectMetadata?.artistsDirty === true }),
      songAlbum: songAlbum || '',
      songYear: songYear || '',
      genre: genre || '',
      singerColors: (singerColors || []).map((c) => c || ''),
      ...(singers !== undefined ? { singers } : {}),
    };
    setMediaTitle(newTitle);
    setProjectMetadata(newMetadata);
    if (coverImage) setProjectCoverImage(coverImage);
    setShowNamingModal(false);
    handleManualSave({ title: newTitle, metadata: newMetadata, ...(coverImage ? { coverImage } : {}) });
    navigate('/project/local');
  }, [mediaTitle, projectMetadata, setMediaTitle, setProjectMetadata, setProjectCoverImage, navigate, handleManualSave, setShowNamingModal]);

  // Only a saved project of your own has a visibility to change from the settings modal.
  const settingsProjectId = activepublicId && activepublicId !== 'local' && activepublicId !== 'new' && !isSharedProject && !collabViewer ? activepublicId : null;

  const songSingers = useMemo(() => buildSingerRoster(lines, artistRoster(projectMetadata)), [lines, projectMetadata]);

  return (
    <SafeAreaContainer padding="bottom">
      <PlayerEngineProvider
        ref={playerRef as Parameters<typeof PlayerEngineProvider>[0]['ref']}
        onTimeUpdate={handleTimeUpdate}
        onPlayingChange={setIsPlaying}
        onSpeedChange={setPlaybackSpeed}
        onDurationChange={handleDurationChange}
        onMediaChange={handleMediaChange}
        onYtUrlChange={handleYtUrlChange}
        onMediaUpload={handleMediaUpload}
        onTitleChange={handleMediaTitleChange}
        mediaTitle={mediaTitle}
        initialMedia={restoredMedia as Parameters<typeof PlayerEngineProvider>[0]['initialMedia']}
        initialSeek={restoredPosition}
        initialSpeed={restoredSpeed}
        initialLoop={restoredLoop}
        projectMetadata={projectMetadata}
        projectCoverImage={projectCoverImage ?? undefined}
        lines={lines as Parameters<typeof PlayerEngineProvider>[0]['lines']}
        activeLineIndex={activeLineIndex}
        playbackPosition={playbackPosition}
        syncMode={syncMode}
        viewerMode={collabViewer}
      >
        {/* Inert outside a session (no provider): nothing is published or rendered. */}
        <CollabPresenceProvider provider={appState.collabSession.provider} me={appState.collabSession.me} activeLineId={lines[activeLineIndex]?.id ?? null}>
        <div className={`${isEditorPage ? 'h-dvh' : 'min-h-screen'} lg:h-screen bg-zinc-950 relative overflow-hidden flex flex-col`}>
          <AppBackground />

          {/* Drag overlay */}
          {isDraggingFile && (
            <div className="fixed inset-0 z-overlay flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none transition-all">
              <div className="flex flex-col items-center gap-4 text-primary animate-pulse">
                <Icon name="cloud_upload" size={80} />
                <h2 className="text-3xl font-semibold tracking-tight text-center px-4">
                  {t('player.dropAudio')}
                </h2>
              </div>
            </div>
          )}

          {isAdminPage ? (
            <AdminHeader
              user={user as AuthUser | null | undefined}
              logout={logout ?? (() => { })}
              settings={settings}
              updateSetting={updateSetting}
              i18n={i18n}
              navTo={(path) => navigate(path)}
            />
          ) : (
          // Kept mounted while the phone editor hides it, so the workspace header slots
          // (useHeaderSlot) still exist when the window grows back to the desktop layout.
          <div className={phoneEditorMounted ? 'hidden' : 'contents'}>
          <AppHeader
            user={user as AuthUser | null | undefined}
            logout={logout ?? (() => { })}
            isReady={isReady}
            lines={lines}
            mediaTitle={mediaTitle}
            setMediaTitle={setMediaTitle}
            triggerImportSave={triggerImportSave}
            buildProjectPayload={buildProjectPayload}
            hasUnsavedChanges={hasUnsavedChanges}
            activepublicId={activepublicId}
            forkedFrom={forkedFrom}
            setShowKeyboardHelp={setShowKeyboardHelp}
            setUnsavedModalTarget={setUnsavedModalTarget}
            settings={settings}
            updateSetting={updateSetting}
            i18n={i18n}
            syncMode={syncMode}
            setShowNamingModal={setShowNamingModal}
            playerSlot={playerSlot}
            projectCoverImage={projectCoverImage}
            onStartTour={startTour}
            workspaceView={mobileTab}
            sessionPublicId={appState.sessionPublicId}
            collabMe={appState.collabSession.me}
            collabProvider={appState.collabSession.provider}
          />
          </div>
          )}

          <GuidedTour steps={EDITOR_TOUR_STEPS} isOpen={isTourOpen} onClose={closeTour} />

          <div
            className={`relative z-base flex-1 min-h-0 flex flex-col transition-[padding-bottom] duration-500 ease-in-out
            ${location.pathname === '/' ? 'pt-14'
                : phoneEditorMounted ? 'pt-0'
                : isPublicProjectView ? 'pt-14 lg:pt-0'
                  : 'pt-14 lg:pt-(--header-offset)'
              }
            ${isFullWidthPage
                ? 'pb-0'
                : isPlayerMounted
                  ? isReady
                    ? playerSlot === 'mobile'
                      ? 'pb-[200px]'
                      : 'pb-6'
                    // Player will mount on this route but hasn't faded in yet —
                    // reserve its desktop slot too, so nothing jumps when it does.
                    : showMobileNav ? 'pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-6' : 'pb-20 lg:pb-6'
                  // No player ever mounts here (Home, Explore, Feed, …): clear the bottom
                  // bar where it shows, nothing where it does not. Desktop has no bar.
                  : showMobileNav ? BOTTOM_BAR_CLEARANCE : 'pb-0'
              }
          `}
            style={{
              ...(dynamicPb && !isPublicProjectView ? { paddingBottom: dynamicPb } : {}),
            }}
          >
            {/* Full width on every route: pages scroll in their own container and
                centre their content inside it, so a cap or side padding here would
                leave gutters that are outside every scroller and ignore the wheel. */}
            <div className="w-full flex-1 flex flex-col min-h-0">
              <PhoneEditorChromeContext value={phoneEditorChrome}>
                {children}
              </PhoneEditorChromeContext>
            </div>
          </div>

          {/* Gated here rather than inside AppPlayer: isPlayerMounted is a
              route-level fact (isProjectPage || isSetupPage), not a transient
              loading state, so there's nothing to mount on routes where it's
              false — skip the component entirely instead of instantiating its
              refs and ResizeObserver just to render null. */}
          {isPlayerMounted && (
            <AppPlayer
              isReady={isReady}
              isPlayerMounted={isPlayerMounted}
              isProjectLoading={isProjectLoading}
              onHeightChange={setPlayerHeight}
              playerSlot={playerSlot}
              aboveNav={showMobileNav}
            />
          )}

          {showMobileNav && (
            <AppMobileNav
              isReady={isReady}
              lines={lines}
              mediaTitle={mediaTitle}
              buildProjectPayload={buildProjectPayload}
            />
          )}

          <AppModals
            showKeyboardHelp={showKeyboardHelp}
            setShowKeyboardHelp={setShowKeyboardHelp}
            handleManualSave={handleManualSave as () => void | Promise<void | boolean>}
            showNamingModal={showNamingModal}
            setShowNamingModal={setShowNamingModal}
            handleProjectConfirm={handleProjectConfirm}
            mediaTitle={mediaTitle}
            projectMetadata={projectMetadata}
            projectCoverImage={projectCoverImage || ''}
            pendingProject={pendingProject}
            handleDiscardProject={handleDiscardProject}
            handleRestoreProject={handleRestoreProject}
            unsavedModalTarget={layoutState.unsavedModalTarget}
            setUnsavedModalTarget={layoutState.setUnsavedModalTarget}
            sourceInfo={{
              ytUrl: appState.projectYtUrl || (restoredMedia?.type === 'youtube' ? restoredMedia.url : ''),
              cloudinary: appState.uploadedAudio || (restoredMedia?.type === 'cloudinary' ? {
                id: restoredMedia.id, uploadUrl: restoredMedia.url,
                publicId: restoredMedia.publicId, fileName: restoredMedia.fileName,
                duration: restoredMedia.duration,
              } : null),
              title: mediaTitle || appState.projectYtUrl || (restoredMedia?.type === 'youtube' ? restoredMedia.url : '') || '',
            }}
            songSingers={songSingers}
            isPublic={projectIsPublic}
            publicId={settingsProjectId}
            onVisibilityChange={settingsProjectId ? (next: boolean, listed?: boolean) => setProjectVisibility(settingsProjectId, next, listed) : undefined}
          />
        </div>
        </CollabPresenceProvider>
      </PlayerEngineProvider>
    </SafeAreaContainer>
  );
}
