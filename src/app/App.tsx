import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useAppState } from '@/shared/hooks/useAppState';
import { useSettings } from '@/features/settings/useSettings';
import { useScrollLock } from '@/shared/hooks/useScrollLock';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { matchKey } from '@/shared/utils/keyboard';
import { splitArtists } from '@/shared/utils/lrc';
import { useUrlParamsSync } from '@/shared/hooks/useUrlParamsSync';
import BannedScreen from '@features/auth/components/BannedScreen';
import GuestProjectSaveGate from '@features/editor/components/core/GuestProjectSaveGate';

import type { EditorLine } from '@/features/editor/services/editor.service';
import { AppLayout } from './AppLayout';
import { AppRouter } from './AppRouter';

interface UploadLike {
  id?: string;
  uploadUrl?: string;
  fileName?: string;
  title?: string;
  duration?: number;
  publicId?: string;
}

interface SetupCompleteData {
  lines: EditorLine[];
  editorMode: string;
  audioSource?: string;
  ytUrl?: string;
  audioName?: string;
  selectedUpload?: UploadLike;
  name?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  songName?: string;
  songArtist?: string;
  songAlbum?: string;
  songYear?: string | number;
  genre?: string;
  songLanguage?: string;
  trackNumber?: number | null;
  trackCount?: number | null;
  coverImage?: string;
}

interface UiState {
  hideEditor: boolean;
  hidePreview: boolean;
  unsavedModalTarget: unknown;
  isPlaying: boolean;
  playbackSpeed: number;
  showNamingModal: boolean;
}

function AppInner() {
  useTranslation();
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { settings, updateSetting, syncFromServer } = useSettings();

  const appState = useAppState();
  const {
    pendingProject,
    resetAppState,
    playerRef,
    setLines,
    setEditorMode,
    setSyncMode,
    activepublicId,
    setMediaTitle,
    handleYtUrlChange,
    handleMediaUpload,
  } = appState;

  useScrollLock(!!pendingProject);
  useNetworkStatus();

  // Sync settings from server when user logs in
  useEffect(() => {
    if (user) syncFromServer();
    // syncFromServer is stable; user presence is the true trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Promote /project/local → /project/:id once the server assigns a real ID
  useEffect(() => {
    if (
      user && activepublicId && routerLocation.pathname === '/project/local' &&
      new URLSearchParams(routerLocation.search).get('fromGuest') !== '1'
    ) {
      navigate(`/project/${activepublicId}/edit`, { replace: true });
    }
  }, [user, activepublicId, routerLocation.pathname, routerLocation.search, navigate]);

  // Public project view (/project/:id without /edit) has its own embedded player
  const isPublicProjectView = /^\/project\/[^/]+$/.test(routerLocation.pathname) &&
    !['new', 'local'].includes(routerLocation.pathname.split('/')[2] ?? '');
  const isProjectPage = routerLocation.pathname.startsWith('/project/') &&
    routerLocation.pathname !== '/project/new' &&
    !isPublicProjectView;
  const isSetupPage = routerLocation.pathname === '/project/new';
  const isReady = isProjectPage;
  const isPlayerMounted = isProjectPage || isSetupPage;

  // Layout-specific state
  const rawFocusMode = settings.interface?.focusMode || 'default';
  const focusMode = ['default', 'sync', 'playback'].includes(rawFocusMode) ? rawFocusMode : 'default';
  const layoutSwap = settings.interface?.layoutSwap || false;
  const playerTop = settings.interface?.playerTop || false;
  const editorWidth = settings.interface?.editorWidth ?? 50;
  const lockLayout = settings.interface?.lockLayout || false;
  const mobileTab = settings.interface?.mobileTab || 'editor';

  // Dynamic player height — fed by ResizeObserver in AppPlayer
  const [playerHeight, setPlayerHeight] = useState(0);

  // Layout-specific state
  const [ui, setUi] = useState<UiState>({
    hideEditor: false,
    hidePreview: false,
    unsavedModalTarget: null,
    isPlaying: false,
    playbackSpeed: 1,
    showNamingModal: false,
  });

  const { hideEditor, hidePreview, unsavedModalTarget, isPlaying, playbackSpeed, showNamingModal } = ui;
  const setHideEditor = useCallback((val: boolean | ((p: boolean) => boolean)) => setUi(prev => ({ ...prev, hideEditor: typeof val === 'function' ? val(prev.hideEditor) : val })), []);
  const setHidePreview = useCallback((val: boolean | ((p: boolean) => boolean)) => setUi(prev => ({ ...prev, hidePreview: typeof val === 'function' ? val(prev.hidePreview) : val })), []);
  const setUnsavedModalTarget = useCallback((val: unknown) => setUi(prev => ({ ...prev, unsavedModalTarget: val })), []);
  const setIsPlaying = useCallback((val: boolean) => setUi(prev => ({ ...prev, isPlaying: val })), []);
  const setPlaybackSpeed = useCallback((val: number) => setUi(prev => ({ ...prev, playbackSpeed: val })), []);
  const setShowNamingModal = useCallback((val: boolean) => setUi(prev => ({ ...prev, showNamingModal: val })), []);

  // Called by SetupScreen when user finishes the 3-step setup
  const handleSetupComplete = useCallback(async ({
    lines,
    editorMode,
    audioSource,
    ytUrl,
    audioName,
    selectedUpload,
    name,
    description,
    tags,
    isPublic,
    songName,
    songArtist,
    songAlbum,
    songYear,
    genre,
    songLanguage,
    trackNumber,
    trackCount,
    coverImage: _coverImage,
  }: SetupCompleteData) => {
    setLines(lines);
    setEditorMode(editorMode);
    setSyncMode(true);

    const effectiveYtUrl = ytUrl || appState.projectYtUrl;
    let finalTitle = name || audioName || '';

    if (audioSource === 'youtube' && effectiveYtUrl) {
      if (ytUrl) handleYtUrlChange(ytUrl);
      if (ytUrl) appState.setRestoredMedia({ type: 'youtube', url: ytUrl });
      try {
        const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(effectiveYtUrl)}&format=json`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(oEmbedUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data.title && !name) finalTitle = data.title;
        }
      } catch {
        // oEmbed failed or timed out — leave finalTitle as-is
      }
    } else if (audioSource === 'cloud' && selectedUpload) {
      handleMediaUpload(selectedUpload);
      if (selectedUpload.uploadUrl) {
        appState.setRestoredMedia({
          type: 'cloudinary',
          id: selectedUpload.id,
          url: selectedUpload.uploadUrl,
          fileName: selectedUpload.fileName ?? null,
          title: selectedUpload.title ?? null,
          duration: selectedUpload.duration ?? null,
          publicId: selectedUpload.publicId ?? null,
        });
      }
    }

    setMediaTitle(finalTitle);

    const songArtists = splitArtists(songArtist);
    const newMetadata = { description: description || '', tags: tags || [], songName: songName || '', songArtist: songArtist || '', songArtists, songAlbum: songAlbum || '', songYear: songYear || '', genre: genre || '', songLanguage: songLanguage || '', ...(trackNumber != null ? { trackNumber } : {}), ...(trackCount != null ? { trackCount } : {}) };
    appState.setProjectMetadata(newMetadata);

    if (!user) {
      // Guest: handleManualSave writes to localStorage only (no token).
      // The editor's Save button uses the server-side claim flow instead.
      await appState.handleManualSave({ title: finalTitle, metadata: newMetadata, isPublic, lines, editorMode, syncMode: true });
      navigate('/project/local');
      return;
    }

    await appState.handleManualSave({
      title: finalTitle,
      metadata: newMetadata,
      isPublic,
      lines,
      editorMode,
      syncMode: true,
      ...(_coverImage ? { coverImage: _coverImage } : {}),
    });

    navigate('/project/local');
  }, [setLines, setEditorMode, setSyncMode, setMediaTitle, handleYtUrlChange, handleMediaUpload, appState, navigate, user]);

  const setFocusMode = useCallback((mode: string) => {
    updateSetting('interface.focusMode', mode);
  }, [updateSetting]);

  const setLayoutSwap = useCallback((swap: boolean) => {
    updateSetting('interface.layoutSwap', swap);
  }, [updateSetting]);

  const setPlayerTop = useCallback((top: boolean) => {
    updateSetting('interface.playerTop', top);
  }, [updateSetting]);

  const setEditorWidth = useCallback((width: number) => {
    updateSetting('interface.editorWidth', width);
  }, [updateSetting]);

  // Focus mode keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (matchKey(e, settings.shortcuts?.focusSync?.[0] || 'Ctrl+1')) {
        e.preventDefault();
        setFocusMode(focusMode === 'sync' ? 'default' : 'sync');
      } else if (matchKey(e, settings.shortcuts?.focusPreview?.[0] || 'Ctrl+2')) {
        e.preventDefault();
        if (focusMode === 'playback') {
          setFocusMode('default');
          setHideEditor(false);
        } else {
          setHideEditor(h => !h);
          setHidePreview(false);
        }
      } else if (matchKey(e, settings.shortcuts?.focusPlayback?.[0] || 'Ctrl+3')) {
        e.preventDefault();
        setFocusMode(focusMode === 'playback' ? 'default' : 'playback');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [settings.shortcuts, focusMode, setFocusMode, setHideEditor, setHidePreview]);

  // Pause player when navigating away
  useEffect(() => {
    if (!routerLocation.pathname.startsWith('/project/')) {
      playerRef.current?.pause?.();
    }
  }, [routerLocation.pathname, playerRef]);

  // Reset load errors when navigating
  useEffect(() => {
    if (appState.loadError) appState.setLoadError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerLocation.pathname, appState.loadError]);

  // Reset project state when entering "New Project" — but not when coming from no-media rollback
  useEffect(() => {
    if (routerLocation.pathname === '/project/new' && !(routerLocation.state as { prefill?: unknown } | null)?.prefill) {
      resetAppState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerLocation.pathname, (routerLocation.state as { prefill?: unknown } | null)?.prefill]);

  // Grid column classes
  const editorColClass = useMemo(() => ((({
    default: 'lg:col-span-7',
    sync: 'lg:col-span-8',
    playback: 'hidden',
  } as Record<string, string>)[focusMode]) || 'lg:col-span-7'), [focusMode]);

  const previewColClass = useMemo(() => ((hideEditor || focusMode === 'playback')
    ? 'lg:col-span-12'
    : (({ default: 'lg:col-span-5', sync: 'lg:col-span-4' } as Record<string, string>)[focusMode] || 'lg:col-span-5')), [hideEditor, focusMode]);

  const showEditor = focusMode !== 'playback' && !hideEditor;
  const showPreview = !hidePreview;

  const layoutState = {
    focusMode,
    setFocusMode,
    hideEditor,
    setHideEditor,
    hidePreview,
    setHidePreview,
    unsavedModalTarget,
    setUnsavedModalTarget,
    mobileTab,
    setMobileTab: useCallback((tab: string) => updateSetting('interface.mobileTab', tab), [updateSetting]),
    isReady,
    isPlayerMounted,
    editorColClass,
    previewColClass,
    showEditor,
    showPreview,
    layoutSwap,
    setLayoutSwap,
    playerTop,
    setPlayerTop,
    editorWidth,
    setEditorWidth,
    lockLayout,
    setLockLayout: useCallback((lock: boolean) => updateSetting('interface.lockLayout', lock), [updateSetting]),
    showNamingModal,
    setShowNamingModal,
    playerHeight,
    setPlayerHeight,
  };

  // Enhance appState with layout-driven state
  const enhancedAppState = {
    ...appState,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    handleSetupComplete,
  };

  useUrlParamsSync(enhancedAppState, layoutState);

  if (user?.ban?.active) return <BannedScreen />;

  return (
    <>
      <GuestProjectSaveGate />
      <AppLayout
        user={user}
        logout={logout}
        appState={enhancedAppState}
        settingsState={{ settings, updateSetting }}
        layoutState={layoutState}
      >
        <AppRouter
          appState={enhancedAppState}
          layoutState={layoutState}
          navigate={navigate}
        />
      </AppLayout>
    </>
  );
}

export default function App() {
  return <AppInner />;
}
