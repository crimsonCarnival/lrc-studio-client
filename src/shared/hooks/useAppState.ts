import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSettings } from '@/features/settings/useSettings';
import useHistory from '@/features/editor/hooks/useHistory';
import useConfirm from './useConfirm';
import { useThemeSync } from './useThemeSync';
import { useDragAndDrop } from './useDragAndDrop';
import { useGlobalShortcuts } from './useGlobalShortcuts';
import { useLoopCurrentLine } from '@/features/editor/hooks/useLoopCurrentLine';
import { useAutosave } from '@/features/editor/hooks/useAutosave';
import { useManualSave, buildProjectPatch, updateServerSnapshot } from '@/features/editor/hooks/useManualSave';
import { useSharedProject } from '@/features/sharing/hooks/useSharedProject';
import { useProjectActions } from '@/features/projects/hooks/useProjectActions';
import { lyrics, projects, getAccessToken } from '@/app/api';
import { STORAGE_KEYS } from '@/features/projects/services/storage.service';
import { migrateLines, splitArtists } from '@/shared/utils/lrc';
import { sectionsToFlat } from '@/features/editor/utils/sections';
import { uploadToRestoredMedia } from '@/shared/utils/media-hydration';
import type { AuthUser as AuthUserType } from '@/features/auth/hooks/useAuth';
import type { EditorLine } from '@/features/editor/services/editor.service';

const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export interface PlayerHandle {
  play?: () => void;
  pause?: () => void;
  seek?: (time?: number | null) => void;
  getCurrentTime?: () => number;
  currentTime?: number;
  togglePlay?: () => void;
  adjustSpeed?: (delta: number) => void;
  loadLocalAudio?: (file: File) => void;
  [key: string]: unknown;
}

export interface ProjectMetadata {
  description?: string;
  tags?: string[];
  songName?: string;
  songArtist?: string;
  songArtists?: string[];
  songAlbum?: string;
  songYear?: string | number;
  genre?: string;
  songLanguage?: string;
  trackNumber?: number;
  trackCount?: number;
  [key: string]: unknown;
}

export interface RestoredMedia {
  type: string;
  url: string;
  id?: string | null;
  fileName?: string | null;
  title?: string | null;
  duration?: number | null;
  publicId?: string | null;
}

export interface UploadedAudio {
  id?: string;
  uploadUrl?: string;
  publicId?: string;
  fileName?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface ForkedFrom {
  publicId?: string;
  accountName?: string;
  [key: string]: unknown;
}

export function useAppState(user?: AuthUserType | null) {
  const { t, i18n } = useTranslation();
  const { settings, updateSetting } = useSettings();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useThemeSync(settings?.interface?.theme as string | undefined);

  // ——— Lines state with undo/redo ———
  // editorMode must be declared before useHistory so getCompanion can close over it
  const [editorMode, setEditorModeRaw] = useState('lrc');
  const [isProjectLoading, setIsProjectLoading] = useState(() => {
    try {
      return !!localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
    } catch {
      return false;
    }
  });

  const [lines, setLines, undo, redo, canUndo, canRedo, clearHistory] = useHistory<EditorLine[]>([], {
    limit: settings.editor?.history?.limit || 250,
    groupingThresholdMs: settings.editor?.history?.groupingThresholdMs || 1000,
    getCompanion: () => editorMode,
    onRestoreCompanion: setEditorModeRaw,
  });

  const [syncMode, setSyncMode] = useState(true);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [activeTranslationIndex, setActiveTranslationIndex] = useState(0);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mediaTitle, setMediaTitle] = useState('');
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata>({ description: '', tags: [] });
  const [forkedFrom, setForkedFrom] = useState<ForkedFrom | null>(null);
  const [hasMedia, setHasMedia] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);


  const [pendingProject, setPendingProject] = useState(() => {
    // Always discard any leftover shared project (e.g. from a crash before beforeunload fired)
    localStorage.removeItem(STORAGE_KEYS.SHARED_PROJECT);
    // If a shared project hash is in the URL, skip localStorage — useEffect handles it async
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#s=')) {
      return null;
    }
    // GuestProjectSaveGate owns the fromGuest=1 flow — it reads from IndexedDB and creates
    // the project on the server. Restoring from localStorage here would show a stale
    // restoration prompt on top of the in-progress project creation.
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('fromGuest') === '1') {
      return null;
    }
    // If we have an activepublicId, this is a known project — skip the restore modal
    try {
      const existingId = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
      if (existingId) return null; // will be silently restored in useEffect
    } catch { /* ignore localStorage errors */ }
    // Only show restore modal if user is authenticated
    if (!user) return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROJECT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lines && parsed.lines.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse project data', e);
    }
    return null;
  });
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [projectYtUrl, setProjectYtUrl] = useState('');
  const [restoredMedia, setRestoredMedia] = useState<RestoredMedia | null>(null);
  const [restoredPosition, setRestoredPosition] = useState(0);
  const [restoredSpeed, setRestoredSpeed] = useState(1);
  const [activepublicId, setActivepublicId] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT_ID) || null; } catch { return null; }
  });
  const [uploadedAudio, setUploadedAudio] = useState<UploadedAudio | null>(null);
  const [projectCoverImage, setProjectCoverImage] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null); // 'project', 'upload', 'user', etc.
  const [projectUserId, setProjectUserId] = useState<string | null>(null);
  // Refs for stale-closure-safe reads inside save callbacks and guarded setLines
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastServerSnapshotRef = useRef<any>(null);
  // Guard: prevents two concurrent project.create() calls (manual + autosave race)
  const isCreatingProjectRef = useRef(false);
  // Mirror isProjectLoading in a ref so the beforeunload handler (a non-reactive
  // closure) can always read the live value without being re-registered every render.
  // Initialised to match isProjectLoading's lazy initialiser so it's correct
  // from the very first render (before the sync useEffect can fire).
  const isProjectLoadingRef = useRef(isProjectLoading);
  // Keep activepublicId accessible synchronously inside save callbacks (state is async)
  const activepublicIdRef = useRef(activepublicId);
  // Cache the persisted upload ID for the current session to avoid repeated saveMedia calls
  const sessionUploadIdRef = useRef<string | null>(null);
  // Stable bound wrapper so callers (useAutosave, silent restore) don't need to pass the ref
  const saveServerSnapshot = useCallback(
    (data) => updateServerSnapshot(lastServerSnapshotRef, data),
    [],
  );
  // Callback registry: components (e.g. Editor) register teardown / post-save hooks here
  const afterSaveRef = useRef<(() => void) | null>(null);
  const registerAfterSave = useCallback((fn) => { afterSaveRef.current = fn; }, []);
  const callAfterSave = useCallback(() => { afterSaveRef.current?.(); }, []);

  const playerRef = useRef<PlayerHandle | null>(null);
  const langMenuRef = useRef<HTMLElement | null>(null);
  const [requestConfirm, confirmModal] = useConfirm();





  // ——— Silent restore when activepublicId exists (known project, skip modal) ———
  const silentRestoreRan = useRef(false);
  useEffect(() => {
    if (silentRestoreRan.current) return;
    if (!activepublicId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsProjectLoading(false);
      return;
    }
    // If the URL has a shared project hash, skip silent restore
    if (window.location.hash.startsWith('#s=')) {
      setIsProjectLoading(false);
      return;
    }
    silentRestoreRan.current = true;

    // \u2705 FIX: Try loading from server first (source of truth), fall back to localStorage
    const restoreFromLocalStorage = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.PROJECT);
        if (!saved) return;
        const parsed = JSON.parse(saved);
        // \u2705 FIX: Allow restoring even if lines are empty (user may have deleted all lyrics)
        const validLines = migrateLines((parsed.lines || []).flatMap((l) => {
          if (!(l && typeof l === 'object')) return [];
          // Section marker
          if (l.type === 'section') {
            return [{ type: 'section', label: l.label || '', depth: l.depth, singers: Array.isArray(l.singers) ? l.singers : undefined, timestamp: typeof l.timestamp === 'number' ? l.timestamp : null, id: typeof l.id === 'string' ? l.id : crypto.randomUUID() }];
          }
          if (typeof l.text !== 'string') return [];
          return [{
            text: l.text,
            timestamp: typeof l.timestamp === 'number' && isFinite(l.timestamp) ? l.timestamp : null,
            endTime: typeof l.endTime === 'number' && isFinite(l.endTime) ? l.endTime : undefined,
            secondary: typeof l.secondary === 'string' ? l.secondary : '',
            singers: Array.isArray(l.singers) ? l.singers : undefined,
            translations: Array.isArray(l.translations) ? l.translations : undefined,
            id: typeof l.id === 'string' ? l.id : crypto.randomUUID(),
            words: Array.isArray(l.words) ? l.words.flatMap((w) => {
              const word = typeof w.word === 'string' ? w.word : '';
              return word ? [{
                word,
                time: typeof w.time === 'number' && isFinite(w.time) ? w.time : null,
                ...(typeof w.reading === 'string' && w.reading ? { reading: w.reading } : {}),
              }] : [];
            }) : undefined,
            secondaryWords: Array.isArray(l.secondaryWords) ? l.secondaryWords.flatMap((w) => {
              const word = typeof w.word === 'string' ? w.word : '';
              return word ? [{
                word,
                time: typeof w.time === 'number' && isFinite(w.time) ? w.time : null,
              }] : [];
            }) : undefined,
          }];
        }));
        setLines(validLines);
        clearHistory();
        setSyncMode(validLines.length > 0 ? true : (parsed.syncMode ?? true));
        const idx = parsed.activeLineIndex;
        if (typeof idx === 'number' && idx >= 0 && idx < validLines.length) {
          setActiveLineIndex(idx);
        }
        const restoredMode = parsed.editorMode
          || (validLines.some((l) => l.endTime != null) ? 'srt' : 'lrc');
        setEditorModeRaw(restoredMode);
        if (parsed.ytUrl) setRestoredMedia({ type: 'youtube', url: parsed.ytUrl });
        if (typeof parsed.playbackPosition === 'number') setRestoredPosition(parsed.playbackPosition);
        if (typeof parsed.playbackSpeed === 'number') setRestoredSpeed(parsed.playbackSpeed);
        if (parsed.title) setMediaTitle(parsed.title);
        if (parsed.metadata) {
          const m = parsed.metadata;
          setProjectMetadata({
            ...m,
            songArtists: Array.isArray(m.songArtists) && m.songArtists.length > 0 ? m.songArtists : splitArtists(m.songArtist || ''),
          });
        }
        if (parsed.uploadedAudio) {
          setUploadedAudio(parsed.uploadedAudio);
          const ca = parsed.uploadedAudio;
          if (ca.uploadUrl) {
            setRestoredMedia({
              type: 'cloudinary',
              id: ca.id,
              url: ca.uploadUrl,
              fileName: ca.fileName ?? null,
              title: null,
              duration: ca.duration ?? null,
              publicId: ca.publicId ?? null,
            });
          }
        }
      } catch (e) {
        console.error('localStorage restore failed', e);
      }
    };

    // If authenticated, try server first (source of truth)
    if (getAccessToken()) {
      setIsProjectLoading(true);
      projects.get(activepublicId)
        .then(({ project }) => {
          if (!project) return;
          // Server data found - use it as source of truth
          const serverLines = migrateLines(sectionsToFlat(project.lyrics?.sections || []).map((l) => ({ ...l, id: l.id || crypto.randomUUID() })));
          setLines(serverLines);
          clearHistory();
          setSyncMode(serverLines.length > 0 ? true : (project.state?.syncMode ?? true));
          setActiveLineIndex(project.state?.activeLineIndex || 0);
          setEditorModeRaw(project.lyrics?.editorMode || 'lrc');
          setRestoredMedia(uploadToRestoredMedia(project.upload));
          if (project.upload?.id) sessionUploadIdRef.current = project.upload.id;
          if (project.state?.playbackPosition) setRestoredPosition(project.state.playbackPosition);
          if (project.state?.playbackSpeed) setRestoredSpeed(project.state.playbackSpeed);
          if (project.title) setMediaTitle(project.title);
          if (project.coverImage) setProjectCoverImage(project.coverImage);
          setForkedFrom((project.forkedFrom as ForkedFrom) || null);
          if (project.metadata) {
            const m = project.metadata as ProjectMetadata;
            setProjectMetadata({
              description: m.description || '',
              tags: m.tags || [],
              songName: m.songName || '',
              songArtist: m.songArtist || '',
              songArtists: Array.isArray(m.songArtists) && m.songArtists.length > 0 ? m.songArtists : splitArtists(m.songArtist || ''),
              songAlbum: m.songAlbum || '',
              songYear: m.songYear || '',
              genre: m.genre || '',
              songLanguage: m.songLanguage || '',
              ...(m.trackNumber != null ? { trackNumber: m.trackNumber } : {}),
              ...(m.trackCount != null ? { trackCount: m.trackCount } : {}),
            });
          }
          // ── Rollback to setup if the project has lyrics but no media ──
          // Only redirect when the project actually has content worth recovering.
          // Empty projects with no media are just blank slates — leave them alone.
          const hasServerMedia = !!(
            (project.upload?.source === 'youtube' && project.upload?.uploadUrl) ||
            (project.upload?.source === 'cloudinary' && project.upload?.uploadUrl)
          );
          if (!hasServerMedia && serverLines.length > 0) {
            navigate('/project/new', {
              state: {
                prefill: {
                  lines: serverLines,
                  editorMode: project.lyrics?.editorMode || 'lrc',
                  name: project.title || '',
                  description: project.metadata?.description || '',
                  tags: project.metadata?.tags || [],
                  songName: project.metadata?.songName || '',
                  songArtist: project.metadata?.songArtist || '',
                  songAlbum: project.metadata?.songAlbum || '',
                  songYear: project.metadata?.songYear || '',
                }
              },
              replace: true,
            });
          }
          saveServerSnapshot({
            title: project.title || '',
            metadata: project.metadata || { description: '', tags: [] },
            state: {
              syncMode: project.state?.syncMode ?? true,
              activeLineIndex: project.state?.activeLineIndex || 0,
              playbackPosition: project.state?.playbackPosition || 0,
              playbackSpeed: project.state?.playbackSpeed || 1,
              saveTime: project.state?.saveTime || null,
            },
            editorMode: project.lyrics?.editorMode || 'lrc',
            lines: serverLines,
            uploadId: project.upload?.id,
          });
          // Auth users are server-only — do NOT sync server data back to localStorage.
        })
        .catch((err) => {
          // Server failed (404, network error, etc.) — stale project ID, clear it
          if (err.status === 404) {
            setLoadError('project');
          } else if (err.status === 403) {
            setLoadError('forbidden');
          } else if (err.status === 410) {
            setLoadError('gone');
          }
          setActivepublicId(null);
          try {
            localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
            // DO NOT remove PROJECT_KEY — if the server project is missing,
            // we want to preserve the local work so they can save it again.
          } catch { /* ignore */ }
        })
        .finally(() => setIsProjectLoading(false));
    } else {
      // Not authenticated - use localStorage
      restoreFromLocalStorage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    activepublicIdRef.current = activepublicId;
    isProjectLoadingRef.current = isProjectLoading;
  });

  // ——— Guest silent restore (no activepublicId, no auth) ———
  // When a guest visits /project/local or refreshes, restore their last session from localStorage.
  const guestRestoreRan = useRef(false);
  useEffect(() => {
    if (guestRestoreRan.current) return;
    if (getAccessToken()) return; // auth users restore from server
    if (activepublicId) return;  // handled by the silent restore effect above
    if (window.location.hash.startsWith('#s=')) return; // shared project
    guestRestoreRan.current = true;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROJECT);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      const validLines = (parsed.lines || []).flatMap((l) => {
        if (!(l && typeof l === 'object')) return [];
        if (l.type === 'section') return [{ type: 'section', label: l.label || '', depth: l.depth, timestamp: typeof l.timestamp === 'number' ? l.timestamp : null, id: typeof l.id === 'string' ? l.id : crypto.randomUUID() }];
        if (typeof l.text !== 'string') return [];
        return [{
          text: l.text,
          timestamp: typeof l.timestamp === 'number' && isFinite(l.timestamp) ? l.timestamp : null,
          endTime: typeof l.endTime === 'number' && isFinite(l.endTime) ? l.endTime : undefined,
          secondary: typeof l.secondary === 'string' ? l.secondary : '',
          singers: Array.isArray(l.singers) ? l.singers : undefined,
          translations: Array.isArray(l.translations) ? l.translations : undefined,
          id: typeof l.id === 'string' ? l.id : crypto.randomUUID(),
          words: Array.isArray(l.words) ? l.words.flatMap((w) => {
            const word = typeof w.word === 'string' ? w.word : '';
            return word ? [{
              word,
              time: typeof w.time === 'number' && isFinite(w.time) ? w.time : null,
              ...(typeof w.reading === 'string' && w.reading ? { reading: w.reading } : {}),
            }] : [];
          }) : undefined,
        }];
      });
      if (validLines.length === 0) return;
      setLines(validLines);
      clearHistory();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSyncMode(parsed.syncMode ?? true);
      const idx = parsed.activeLineIndex;
      if (typeof idx === 'number' && idx >= 0 && idx < validLines.length) {
        setActiveLineIndex(idx);
      }
      setEditorModeRaw(parsed.editorMode || 'lrc');
      if (parsed.ytUrl) {
        setRestoredMedia({ type: 'youtube', url: parsed.ytUrl });
        setProjectYtUrl(parsed.ytUrl);
      }
      if (typeof parsed.playbackPosition === 'number') setRestoredPosition(parsed.playbackPosition);
      if (typeof parsed.playbackSpeed === 'number') setRestoredSpeed(parsed.playbackSpeed);
      if (parsed.title) setMediaTitle(parsed.title);
      if (parsed.metadata) {
        const m = parsed.metadata;
        setProjectMetadata({
          ...m,
          songArtists: Array.isArray(m.songArtists) && m.songArtists.length > 0 ? m.songArtists : splitArtists(m.songArtist || ''),
        });
      }
      if (parsed.uploadedAudio) {
        setUploadedAudio(parsed.uploadedAudio);
        const ca = parsed.uploadedAudio;
        if (ca.uploadUrl) {
          setRestoredMedia({
            type: 'cloudinary',
            id: ca.id,
            url: ca.uploadUrl,
            fileName: ca.fileName ?? null,
            title: null,
            duration: ca.duration ?? null,
            publicId: ca.publicId ?? null,
          });
        }
      }
      if (parsed.forkedFrom) setForkedFrom(parsed.forkedFrom);
    } catch (e) {
      console.error('Guest localStorage restore failed', e);
    }
    // Restore cloudinary upload info saved before the auth redirect
    try {
      const raw = sessionStorage.getItem('pendingSetupUpload');
      if (raw) {
        const upload = JSON.parse(raw);
        setUploadedAudio(upload);
        sessionStorage.removeItem('pendingSetupUpload');
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ——— Migration Detection (Guest -> Auth) ———
  // If the user just logged in and has local data but no active project ID,
  // trigger the restoration prompt.
  // Skip when fromGuest=1: GuestProjectSaveGate owns that flow — it reads from
  // IndexedDB and creates the project on the server. Restoring from localStorage
  // here would show a stale restoration prompt on top of the new project.
  useEffect(() => {
    if (searchParams.get('fromGuest') === '1') return;
    if (user && !user.isGuest && !activepublicId && !pendingProject) {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.PROJECT);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.lines?.length > 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPendingProject(parsed);
          }
        }
      } catch { /* ignore */ }
    }
  }, [user, activepublicId, pendingProject, searchParams]);

  // ——— Shared project (hash decode, fork guard, export-to-URL) ———
  const {
    isSharedProject,
    sharedReadOnly, setSharedReadOnly,
    shareModal, setShareModal,
    isSharedProjectRef,
    setLinesGuarded, exportToUrl,
  } = useSharedProject({
    setLines,
    setSyncMode,
    setActiveLineIndex,
    setEditorModeRaw,
    setRestoredMedia,
    setRestoredPosition,
    setRestoredSpeed,
    setIsProjectLoading,
    setActivepublicId,
    setShareModal: undefined, // hook owns its own state
    activepublicIdRef,
    lines,
    editorMode,
    syncMode,
    mediaTitle,
    projectMetadata,
    duration,
    projectYtUrl,
    uploadedAudio,
    restoredMedia,
  });

  // Handle Playback Time (s) and Readonly params on mount
  useEffect(() => {
    const sParam = searchParams.get('s');
    if (sParam && !isNaN(Number(sParam))) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRestoredPosition(Number(sParam));
    }
    
    const readonlyParam = searchParams.get('readonly');
    if (readonlyParam !== null) {
      setSharedReadOnly(readonlyParam === '1' || readonlyParam === 'true');
    }
  }, [searchParams, setRestoredPosition, setSharedReadOnly]);

  // ——— Manual save, payload building, import-save trigger ———
  const { handleManualSave, triggerImportSave, buildProjectPayload } = useManualSave({
    settings,
    lines,
    syncMode,
    activeLineIndex,
    editorMode,
    projectYtUrl,
    playbackPosition,
    hasMedia,
    mediaTitle,
    projectMetadata,
    duration,
    uploadedAudio,
    setUploadedAudio,
    isSharedProjectRef,
    activepublicIdRef,
    isCreatingProjectRef,
    sessionUploadIdRef,
    lastServerSnapshotRef,
    playerRef,
    setIsAutosaving,
    setIsSaving,
    setActivepublicId,
    setForkedFrom,
    onSaveSuccess: callAfterSave,
  });

  // ——— Project CRUD actions ———
  const {
    loadProject,
    handleRestoreProject,
    handleDiscardProject,
    handleRemoveAllLyrics,
    resetAppState,
    handleMediaChange,
    handleDurationChange,
  } = useProjectActions({
    setLines,
    setSyncMode,
    setActiveLineIndex,
    setEditorModeRaw,
    setMediaTitle,
    setProjectMetadata,
    setProjectYtUrl,
    setRestoredMedia,
    setRestoredPosition,
    setRestoredSpeed,
    setActivepublicId,
    setUploadedAudio,
    setHasMedia,
    setPlaybackPosition,
    setDuration,
    setIsProjectLoading,
    setPendingProject,
    setForkedFrom,
    activepublicId,
    activepublicIdRef,
    lastServerSnapshotRef,
    sessionUploadIdRef,
    pendingProject,
    setProjectCoverImage,
    mediaTitle,
    projectMetadata,
    duration,
    t,
    toast,
    requestConfirm,
    isCreatingProjectRef,
    setProjectUserId,
  });




  // ——— Mode switching with end-time inference ———
  const setEditorMode = useCallback(
    (mode) => {
      setEditorModeRaw(mode);
      if (mode === 'srt' && editorMode !== 'srt') {
        lyrics.inferEndTimes({
          lines,
          duration,
          srtConfig: settings.editor?.srt,
        }).then(({ lines: inferred }) => {
          setLines(prev =>
            prev.map((line, i) => {
              const inf = inferred[i];
              if (!inf) return line;
              // Preserve word-level data (readings + word timestamps) — server only infers endTime
              return { ...inf, words: line.words, secondaryWords: line.secondaryWords };
            })
          );
        }).catch((err) => {
          console.error('Failed to infer end times', err);
        });
      }
    },
    [editorMode, lines, duration, setLines, settings.editor?.srt],
  );

  // ——— Auto-save ———
  const { pendingSyncs } = useAutosave({
    settings,
    pendingProject,
    isSharedProject,
    isSharedProjectRef,
    activepublicIdRef,
    isCreatingProjectRef,
    sessionUploadIdRef,
    lastServerSnapshotRef,
    uploadedAudio,
    mediaTitle,
    projectMetadata,
    editorMode,
    syncMode,
    activeLineIndex,
    lines,
    duration,
    buildProjectPayload,
    buildProjectPatch,
    updateServerSnapshot: saveServerSnapshot,
    setActivepublicId,
    setIsAutosaving,
    isProjectLoadingRef,
    setForkedFrom,
    onSaveSuccess: callAfterSave,
  });

  // ——— Editor ready signal ———
  // Fires after all restore effects (localStorage / server) have completed.
  // setTimeout(0) lets React commit any state updates from restore effects first.
  const [editorReady, setEditorReady] = useState(false);
  useEffect(() => {
    if (isProjectLoading) return;
    const id = setTimeout(() => setEditorReady(true), 0);
    return () => clearTimeout(id);
  }, [isProjectLoading]);

  // ——— Guest auto-save ———
  // Always save to localStorage for unauthenticated users so sessions survive reloads.
  // This is intentionally independent of the autosave setting.
  const guestSavePayloadRef = useRef<(() => unknown) | null>(null);
  useEffect(() => { guestSavePayloadRef.current = buildProjectPayload; });
  useEffect(() => {
    if (getAccessToken() || activepublicId) return;
    if (lines.length === 0) return;
    const id = setTimeout(() => {
      try {
        const payload = guestSavePayloadRef.current?.();
        if (payload) localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(payload));
      } catch { /* ignore quota errors */ }
    }, 1500);
    return () => clearTimeout(id);
  }, [lines, activepublicId]);

  // ——— Global keyboard shortcuts ———
  useGlobalShortcuts({
    undo,
    redo,
    setShowKeyboardHelp,
    handleManualSave,
    settings,
    updateSetting,
    playerRef,
  });

  // ——— Close language menu on outside click ———
  useEffect(() => {
    if (!showLangMenu) return;
    const handler = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showLangMenu]);

  const handleYtUrlChange = useCallback((url) => {
    // Clear upload ID cache whenever YouTube URL changes (different media)
    if (url !== projectYtUrl) sessionUploadIdRef.current = null;
    setProjectYtUrl(url || '');
  }, [projectYtUrl]);

  const handleTimeUpdate = useCallback((time) => {
    setPlaybackPosition(time);
  }, []);




  const hasUnsavedChanges = useCallback(() => {
    // Unsaved local project with actual content
    if (!activepublicId && lines.length > 0) return true;

    // Server project with potential differences
    if (activepublicId && lastServerSnapshotRef.current) {
      const snapshot = lastServerSnapshotRef.current;
      const payload = buildProjectPayload();
      const patch = buildProjectPatch({
        prevSnapshot: snapshot,
        title: mediaTitle || '',
        metadata: projectMetadata,
        state: {
          syncMode,
          activeLineIndex,
          // Use the snapshot's own position/speed values so that playback changes
          // alone never trigger the guard. Position and speed are ephemeral — they
          // change during normal playback and are persisted by autosave independently.
          // Including them here caused false positives whenever a project was loaded
          // with a non-zero saved position (snapshot says 120s, state starts at 0).
          playbackPosition: snapshot.state?.playbackPosition ?? 0,
          playbackSpeed: snapshot.state?.playbackSpeed ?? 1,
          saveTime: payload.saveTime,
        },
        editorMode,
        lines: payload.lines || [],
      } as NonNullable<Parameters<typeof buildProjectPatch>[0]>);

      return Object.keys(patch).length > 0;
    }
    return false;
  }, [activepublicId, lines, mediaTitle, projectMetadata, syncMode, activeLineIndex, editorMode, buildProjectPayload]);

  // ——— Page Exit Guard (Unsaved Changes) ———
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Never block exit while the project is still being restored from server
      if (isProjectLoadingRef.current) return;

      // Ensure we only prompt on project-related URLs.
      if (!window.location.pathname.startsWith('/project/')) return;

      // Block exit while a save / create is in-flight so we don't corrupt state.
      if (isSaving || (isCreatingProjectRef.current && !!activepublicIdRef.current)) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }

      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSaving, hasUnsavedChanges]);


  const handleMediaUpload = useCallback((info) => {
    setUploadedAudio(info);
    if (activepublicIdRef.current) {
      triggerImportSave();
    }
  }, [triggerImportSave, setUploadedAudio]);

  // ——— Loop Current Line ———
  useLoopCurrentLine({
    enabled: settings.playback?.loopCurrentLine,
    syncMode,
    lines,
    activeLineIndex,
    editorMode,
    playbackPosition,
    playerRef,
  });

  // ——— Drag & Drop ———
  const { isDraggingFile } = useDragAndDrop({
    setLines: setLinesGuarded,
    setEditorMode: setEditorModeRaw,
    linesLength: lines.length,
    settings,
    requestConfirm,
    playerRef,
  });

  // ——— Process Query Parameters (?clone= and ?publicId=) ———
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cloneId = params.get('clone');
    const projId = params.get('publicId');
    
    if (cloneId) {
      // Redirect legacy clone param to the new dedicated route
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('clone');
      window.history.replaceState(null, '', newUrl.toString());
      window.location.href = `/project/fork/${cloneId}`;
      return;
    } else if (projId && getAccessToken()) {
      // Remove query param
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('publicId');
      window.history.replaceState(null, '', newUrl.toString());
      
      loadProject(projId);
    }
  }, [t, loadProject]); // loadProject included as dependency



  return {
    t,
    i18n,
    settings,
    lines,
    setLines: setLinesGuarded,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    editorReady,
    syncMode,
    setSyncMode,
    activeLineIndex,
    setActiveLineIndex,
    activeTranslationIndex,
    setActiveTranslationIndex,
    playbackPosition,
    duration,
    mediaTitle,
    setMediaTitle,
    projectMetadata,
    setProjectMetadata,
    forkedFrom,
    setForkedFrom,
    hasMedia,
    showKeyboardHelp,
    setShowKeyboardHelp,
    showSettings,
    setShowSettings,
    pendingProject,
    showLangMenu,
    setShowLangMenu,
    editorMode,
    setEditorMode,
    isDraggingFile,
    playerRef,
    langMenuRef,
    handleManualSave,
    triggerImportSave,
    handleRestoreProject,
    handleDiscardProject,
    handleRemoveAllLyrics,
    handleMediaChange,
    handleTimeUpdate,
    handleDurationChange,
    handleYtUrlChange,
    restoredMedia,
    setRestoredMedia,
    restoredPosition,
    restoredSpeed,
    exportToUrl,
    requestConfirm,
    hasUnsavedChanges,
    confirmModal,
    isAutosaving,
    pendingSyncs,
    isSaving,
    isSharedProject,
    sharedReadOnly,
    setSharedReadOnly,
    shareModal,
    setShareModal,
    activepublicId,
    loadProject,
    resetAppState,
    handleMediaUpload,
    projectCoverImage,
    setProjectCoverImage,
    isProjectLoading,
    loadError,
    setLoadError,
    projectUserId,
    setHasMedia,
    registerAfterSave,
    buildProjectPayload,
    // Exposed so consumers (AppLayout share sourceInfo, App setup flow) can read
    // the current media source — previously omitted from the return (latent bug).
    projectYtUrl,
    uploadedAudio,
  };
}

export type AppState = ReturnType<typeof useAppState>;
