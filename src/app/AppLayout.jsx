import { useCallback, useState, useEffect } from 'react';
import { splitArtists } from '@/shared/utils/lrc';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UploadCloud } from 'lucide-react';

import { AppBackground } from './layout/AppBackground';
import { AppHeader } from './layout/AppHeader';
import { AppPlayer } from './layout/AppPlayer';
import { AppMobileNav } from './layout/AppMobileNav';
import { AppModals } from './layout/AppModals';
import { SafeAreaContainer } from '../shared/ui/SafeAreaContainer.jsx';

export function AppLayout({ children, user, logout, appState, settingsState, layoutState }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    mediaTitle, setMediaTitle, showKeyboardHelp, setShowKeyboardHelp,
    isDraggingFile, playerRef,
    handleManualSave, triggerImportSave, handleDiscardProject, handleRestoreProject, buildProjectPayload,
    handleTimeUpdate, handleDurationChange, handleMediaChange, handleYtUrlChange,
    handleMediaUpload, restoredMedia, restoredPosition,
    restoredSpeed, hasUnsavedChanges, activeProjectId, projectMetadata, setProjectMetadata,
    forkedFrom,
    isProjectLoading, hasMedia, lines, activeLineIndex, playbackPosition, syncMode, pendingProject,
    setIsPlaying, setPlaybackSpeed, setProjectSpotifyTrackId,
    projectCoverImage, setProjectCoverImage,
  } = appState;

  const { settings, updateSetting } = settingsState;
  const { focusMode, setFocusMode, hideEditor, setHideEditor, hidePreview, setHidePreview, mobileTab, setMobileTab, isReady, isPlayerMounted, setUnsavedModalTarget, playerTop, showNamingModal, setShowNamingModal, playerHeight, setPlayerHeight } = layoutState;

  // Track lg breakpoint reactively so dynamic padding formula is correct on resize
  const [isLg, setIsLg] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const handler = (e) => setIsLg(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Compute dynamic padding from measured player height
  const dynamicPt = playerTop && isReady && isPlayerMounted && playerHeight > 0 && isLg
    ? `${playerHeight + 104}px`  // lg:top-[88px] + playerHeight + 16px gap
    : undefined;
  const dynamicPb = !playerTop && isReady && isPlayerMounted && playerHeight > 0
    ? `${playerHeight + (isLg ? 48 : 72)}px`  // desktop: bottom-6(24) + gap(24); mobile: bottom-14(56) + gap(16)
    : undefined;

  const isSetupPage = location.pathname === '/project/new';

  const handleProjectConfirm = useCallback(({ name, description, tags, songName, songArtist, songAlbum, songYear, genre, coverImage, albumArt }) => {
    const newTitle = name || mediaTitle || '';
    const songArtists = splitArtists(songArtist);
    const newMetadata = {
      // Preserve fields not exposed in the modal (songLanguage, trackNumber, trackCount)
      ...projectMetadata,
      description: description || '',
      tags: tags || [],
      songName: songName || '',
      songArtist: songArtist || '',
      songArtists,
      songAlbum: songAlbum || '',
      songYear: songYear || '',
      genre: genre || '',
      albumArt: albumArt || '',
    };
    setMediaTitle(newTitle);
    setProjectMetadata(newMetadata);
    if (coverImage) setProjectCoverImage(coverImage);
    setShowNamingModal(false);
    handleManualSave({ title: newTitle, metadata: newMetadata, ...(coverImage ? { coverImage } : {}) });
    navigate('/project/local');
  }, [mediaTitle, projectMetadata, setMediaTitle, setProjectMetadata, setProjectCoverImage, navigate, handleManualSave, setShowNamingModal]);

  return (
    <SafeAreaContainer padding="bottom">
      <div className="min-h-screen lg:h-screen bg-zinc-950 relative overflow-hidden flex flex-col">
        <AppBackground />

        {/* Drag overlay */}
        {isDraggingFile && (
          <div className="fixed inset-0 z-overlay flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none transition-all">
            <div className="flex flex-col items-center gap-4 text-primary animate-pulse">
              <UploadCloud className="size-20" />
              <h2 className="text-3xl font-semibold tracking-tight text-center px-4">
                {t('player.dropAudio') || 'Drop your audio or lyrics file here'}
              </h2>
            </div>
          </div>
        )}

        <AppHeader
          user={user}
          logout={logout}
          isReady={isReady}
          lines={lines}
          mediaTitle={mediaTitle}
          setMediaTitle={setMediaTitle}
          triggerImportSave={triggerImportSave}
          buildProjectPayload={buildProjectPayload}
          hasUnsavedChanges={hasUnsavedChanges}
          activeProjectId={activeProjectId}
          forkedFrom={forkedFrom}
          setShowKeyboardHelp={setShowKeyboardHelp}
          focusMode={focusMode}
          setFocusMode={setFocusMode}
          hideEditor={hideEditor}
          setHideEditor={setHideEditor}
          hidePreview={hidePreview}
          setHidePreview={setHidePreview}
          setUnsavedModalTarget={setUnsavedModalTarget}
          settings={settings}
          updateSetting={updateSetting}
          i18n={i18n}
          syncMode={syncMode}
          setShowNamingModal={setShowNamingModal}
        />

        <div
          className={`relative z-base flex-1 min-h-0 ${isSetupPage ? 'px-0' : 'px-0 lg:px-6'} flex flex-col transition-[padding] duration-500 ease-in-out
            ${location.pathname === '/' ? 'pt-14'
              : (playerTop && isReady && isPlayerMounted) ? 'max-lg:pt-14 lg:pt-[216px]'
                : 'pt-14 lg:pt-16'
            }
            ${isSetupPage
              ? 'pb-0'
              : isPlayerMounted && isReady
                ? playerTop
                  ? 'max-lg:pb-[80px] lg:pb-6'
                  : 'max-lg:pb-[240px] lg:pb-[160px]'
                : 'pb-20 lg:pb-6'
            }
          `}
          style={{
            ...(dynamicPt ? { paddingTop: dynamicPt } : {}),
            ...(dynamicPb ? { paddingBottom: dynamicPb } : {}),
          }}
        >
          <div className={`${isSetupPage ? 'w-full' : 'max-w-[1600px] mx-auto w-full'} flex-1 flex flex-col min-h-0`}>
            {children}
          </div>
        </div>

        <AppPlayer
          isReady={isReady}
          isPlayerMounted={isPlayerMounted}
          isProjectLoading={isProjectLoading}
          playerRef={playerRef}
          mediaTitle={mediaTitle}
          setMediaTitle={setMediaTitle}
          setIsPlaying={setIsPlaying}
          setPlaybackSpeed={setPlaybackSpeed}
          handleTimeUpdate={handleTimeUpdate}
          handleDurationChange={handleDurationChange}
          handleMediaChange={handleMediaChange}
          handleYtUrlChange={handleYtUrlChange}
          handleMediaUpload={handleMediaUpload}
          restoredMedia={restoredMedia}
          restoredPosition={restoredPosition}
          restoredSpeed={restoredSpeed}
          projectMetadata={projectMetadata}
          lines={lines}
          activeLineIndex={activeLineIndex}
          playbackPosition={playbackPosition}
          syncMode={syncMode}
          playerTop={playerTop}
          hasMedia={hasMedia}
          setProjectSpotifyTrackId={setProjectSpotifyTrackId}
          onHeightChange={setPlayerHeight}
        />

        <AppMobileNav
          isReady={isReady}
          mobileTab={mobileTab}
          setMobileTab={setMobileTab}
          activeProjectId={activeProjectId}
        />

        <AppModals
          showKeyboardHelp={showKeyboardHelp}
          setShowKeyboardHelp={setShowKeyboardHelp}
          handleManualSave={handleManualSave}
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
            spotifyId: appState.projectSpotifyTrackId || (restoredMedia?.type === 'spotify' ? restoredMedia.trackId : null),
            title: mediaTitle || appState.projectYtUrl || (restoredMedia?.type === 'youtube' ? restoredMedia.url : '') || '',
          }}
        />
      </div>
    </SafeAreaContainer>
  );
}