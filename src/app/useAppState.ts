import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '@/features/settings/useSettings';
import useHistory from '@/features/editor/hooks/useHistory';
import useConfirm from '@/shared/hooks/useConfirm';
import { useDragAndDrop } from '@/shared/hooks/useDragAndDrop';
import { useGlobalShortcuts } from '@/shared/hooks/useGlobalShortcuts';
import { useLoopCurrentLine } from '@/features/editor/hooks/useLoopCurrentLine';
import { useAutosave } from '@/features/editor/hooks/useAutosave';
import { useManualSave, buildProjectPatch, updateServerSnapshot } from '@/features/editor/hooks/useManualSave';
import { useSharedProject } from '@/features/sharing/hooks/useSharedProject';
import { useProjectActions } from '@/features/projects/hooks/useProjectActions';
import { parseDeepLink } from '@/shared/utils/url-params';
import { lyrics, projects, getAccessToken } from '@/app/api';
import { STORAGE_KEYS } from '@/features/projects/services/storage.service';
import { isEditorPath, sessionPublicIdFromPath } from '@/features/projects/project-path';
import { useCollabSession } from '@/features/collab/useCollabSession';
import { useCollabLines } from '@/features/collab/useCollabLines';
import { useCollabEditorMode } from '@/features/collab/useCollabEditorMode';
import { useCollabMedia, useCollabSong, collabMediaToRestored } from '@/features/collab/useCollabMedia';
import { otherLockHolder } from '@/features/collab/useLineLocks';
import type { LinesUpdater } from '@/features/collab/collab.types';
import { migrateLines } from '@/shared/utils/lrc';
import { hasCJK } from '@/shared/utils/furigana';
import { loadCjkFont } from '@/app/cjk-font';
import { creditsOf } from '@/features/artists/artist-credits';
import { sectionsToFlat } from '@/features/editor/utils/sections';
import { applyInferredEndTimes, sentIndexResolver } from '@/features/editor/utils/sent-lines';
import { uploadToRestoredMedia } from '@/shared/utils/media-hydration';
import type { AuthUser as AuthUserType } from '@/features/auth/auth.types';
import type { EditorLine } from '@/features/editor/editor.types';
import type { ProjectMetadata, RestoredMedia, UploadedAudio, ForkedFrom } from '@/types/app-state';
import type { PlayerHandle } from '@/features/player/player.types';

const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// The edit setter a viewer gets in a collab session: the server would drop the write anyway.
const ignoreLines = (_u: LinesUpdater): void => {};

export function useAppState(user?: AuthUserType | null) {
  const { t, i18n } = useTranslation();
  const { settings, updateSetting } = useSettings();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // `/session/:publicId`: lines and editor mode come from the shared doc instead of a project.
  const sessionPublicId = sessionPublicIdFromPath(useLocation().pathname);
  const inSession = sessionPublicId !== null;


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

  // Solo history. Every load/restore path writes here (setSoloLines), never into
  // a collab doc, even while a session is open.
  const soloHistory = useHistory<EditorLine[]>([], {
    limit: settings.editor?.history?.limit || 250,
    groupingThresholdMs: settings.editor?.history?.groupingThresholdMs || 1000,
    getCompanion: () => editorMode,
    onRestoreCompanion: setEditorModeRaw,
  });
  const [, setSoloLines, , , , , clearSoloHistory] = soloHistory;

  // ——— Collab session (only while on /session/:publicId) ———
  // Same 7-tuple as useHistory, so everything below reads one source. Seams for
  // later tasks: collabSession.provider / .doc / .me / .role are returned below.
  // The session's media hydrates the player further down ("Session media").
  const collabSession = useCollabSession(sessionPublicId);
  const collabCanWrite = collabSession.role === 'owner' || collabSession.role === 'editor';
  // Undo/redo are doc writes too: without write access they are no-ops.
  const collabHistory = useCollabLines(collabSession.doc, collabCanWrite);
  // A viewer sees the session read-only (the preview); AppRouter and the player key off this.
  const collabViewer = inSession && collabSession.role === 'viewer';
  useCollabEditorMode(collabSession.doc, collabSession.status, collabCanWrite, editorMode, setEditorModeRaw);
  const [lines, , undo, redo, canUndo, canRedo, clearHistory] = inSession ? collabHistory : soloHistory;
  // Saves read this from callbacks; the server rejects solo saves during a session (collab_active).
  const inSessionRef = useRef(inSession);
  useLayoutEffect(() => { inSessionRef.current = inSession; });
  // Removing every line refuses while another participant holds one (it would delete it from
  // under them). Read at click and confirm time, so it uses the latest lock snapshot.
  const collabLocksRef = useRef({ locks: collabSession.locks, conn: collabSession.me?.conn ?? null });
  useLayoutEffect(() => { collabLocksRef.current = { locks: collabSession.locks, conn: collabSession.me?.conn ?? null }; });
  const replaceAllBlocked = useCallback(() => {
    const { locks, conn } = collabLocksRef.current;
    const holder = otherLockHolder(locks, conn);
    if (!holder) return false;
    toast.error(t('collab.locks.replaceLocked', { name: holder.name }), { id: 'collab-replace-locked' });
    return true;
  }, [t]);

  // ── CJK fallback face ──
  // Noto Serif JP is not in the render-blocking stylesheet: its 124 unicode-range
  // @font-face rules are 31 KB gzipped, which every visitor would pay before first
  // paint to support text most of them never render. It is fetched on demand here
  // instead (src/app/cjk-font.ts), the first time a CJK character actually appears.
  //
  // `lines` is the right thing to watch because it is the one state every lyric
  // reaches — typed, pasted, imported, auto-stamped or restored from a saved project
  // — so a single effect covers all of them.
  //
  // The trade-off we accepted: a Japanese lyric paints in the platform CJK face for
  // a moment before swapping. That is a fallback flash, not tofu — every OS ships a
  // CJK face — and a latin-only reader pays nothing at all.
  //
  // Cost of the scan: .some() short-circuits on the first hit, and cjkFontLoadedRef
  // stops it running again afterwards. The surviving case is a latin-only project,
  // where this is one cheap regex per line per edit; negligible beside the render.


  const [syncMode, setSyncMode] = useState(true);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  // A collaborator deleting lines can leave the cursor past the end, which no view can show.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (lines.length > 0 && activeLineIndex >= lines.length) setActiveLineIndex(lines.length - 1);
  }, [lines.length, activeLineIndex]);
  const [activeTranslationIndex, setActiveTranslationIndex] = useState(0);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mediaTitle, setMediaTitle] = useState('');
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata>({ description: '', tags: [] });

  const cjkFontLoadedRef = useRef(false);
  useEffect(() => {
    if (cjkFontLoadedRef.current) return;
    const hasCjkContent =
      hasCJK(mediaTitle) ||
      hasCJK(projectMetadata?.songName) ||
      hasCJK(projectMetadata?.songArtist) ||
      lines.some(
        (l) =>
          hasCJK(l.text as string | undefined) ||
          hasCJK(l.label as string | undefined) ||
          hasCJK(l.secondary as string | undefined) ||
          l.translations?.some((tr) => hasCJK(tr?.text)),
      );
    if (!hasCjkContent) return;
    cjkFontLoadedRef.current = true;
    void loadCjkFont();
  }, [lines, mediaTitle, projectMetadata]);
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
  // Last manual save was rejected by the server. Cleared when the next one starts.
  const [saveFailed, setSaveFailed] = useState(false);

  const [projectYtUrl, setProjectYtUrl] = useState('');
  const [restoredMedia, setRestoredMedia] = useState<RestoredMedia | null>(null);
  const [restoredPosition, setRestoredPositionRaw] = useState(0);
  const [restoredSpeed, setRestoredSpeed] = useState(1);

  // ——— URL deep link (?s=, ?loop=) ———
  // Parsed once from the URL at mount. A deep link is an explicit instruction
  // from whoever shared the link, so where it specifies a playback position it
  // outranks the position stored in the project's own saved state. All five
  // restore paths (localStorage, silent project restore, pendingProject,
  // useSharedProject, useProjectActions) write through setRestoredPosition, so
  // the precedence rule lives in that one setter rather than at each call site.
  //
  // The suppression is released as soon as the project has lines, which is the
  // same commit in which a load resolves — early enough that PlayerEngine's
  // one-shot `initialSeek` effect still sees our value, since that effect only
  // runs once media is ready and media hydrates from the same resolution.
  // Held in state, not a ref: the parsed value is immutable for the lifetime of
  // the mount, and reading a ref during render is not allowed.
  const [deepLink] = useState(() => parseDeepLink(typeof window !== 'undefined' ? window.location.search : ''));
  const deepLinkPendingRef = useRef(true);
  const restoredLoop = deepLink.loop;

  const setRestoredPosition = useCallback((pos: number) => {
    if (deepLinkPendingRef.current && deepLink.seek !== null) return;
    setRestoredPositionRaw(pos);
  }, [deepLink.seek]);
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
    // A session loads from the shared doc; restoring a project there would leak its
    // editor state (and media) into the session.
    if (!activepublicId || sessionPublicIdFromPath(window.location.pathname)) {
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
            adLibOf: typeof l.adLibOf === 'number' && isFinite(l.adLibOf) ? l.adLibOf : undefined,
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
        setSoloLines(validLines);
        clearSoloHistory();
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
          setProjectMetadata(m);
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
          setSoloLines(serverLines);
          clearSoloHistory();
          setSyncMode(serverLines.length > 0 ? true : (project.state?.syncMode ?? true));
          setActiveLineIndex(project.state?.activeLineIndex || 0);
          setEditorModeRaw(project.lyrics?.editorMode || 'lrc');
          setRestoredMedia(uploadToRestoredMedia(project.upload));
          // Mirror loadProject: pre-set the YT url so the player's onYtUrlChange
          // during hydration isn't mistaken for a user media change.
          if (project.upload?.source === 'youtube' && project.upload?.uploadUrl) setProjectYtUrl(project.upload.uploadUrl);
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
              artists: creditsOf(m),
              songArtist: m.songArtist || '',
              songAlbum: m.songAlbum || '',
              songYear: m.songYear || '',
              genre: m.genre || '',
              songLanguage: m.songLanguage || '',
              ...(m.trackNumber != null ? { trackNumber: m.trackNumber } : {}),
              ...(m.trackCount != null ? { trackCount: m.trackCount } : {}),
              ...(Array.isArray(m.singers) ? { singers: m.singers } : {}),
              ...(Array.isArray(m.singerColors) ? { singerColors: m.singerColors } : {}),
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
                  artists: creditsOf(project.metadata as ProjectMetadata),
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
    if (sessionPublicIdFromPath(window.location.pathname)) return; // loads from the shared doc
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
          adLibOf: typeof l.adLibOf === 'number' && isFinite(l.adLibOf) ? l.adLibOf : undefined,
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
      setSoloLines(validLines);
      clearSoloHistory();
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
        setProjectMetadata(m);
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
    if (inSession) return;
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
  }, [user, activepublicId, pendingProject, searchParams, inSession]);

  // ——— Shared project (hash decode, fork guard, export-to-URL) ———
  const {
    isSharedProject,
    sharedReadOnly, setSharedReadOnly,
    shareModal, setShareModal,
    isSharedProjectRef,
    setLinesGuarded, exportToUrl,
  } = useSharedProject({
    setLines: setSoloLines,
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

  // In a session a viewer's edits are dropped here: the server refuses them, and
  // writing them into the local doc would only fork that viewer's copy.
  const setCollabLines = collabCanWrite ? collabHistory[1] : ignoreLines;
  // What `setLines` from useHistory used to be: unguarded, used by mode switching and "remove all".
  const setLines = inSession ? setCollabLines : setSoloLines;
  // The setter handed to the editor and to drag & drop.
  const setLinesForEditing = inSession ? setCollabLines : setLinesGuarded;
  // Project loads still resolve after the owner is redirected into a session; their
  // mode must not reach the doc (useCollabEditorMode would write it back).
  const setSoloEditorMode = useCallback((mode: string) => {
    if (!inSessionRef.current) setEditorModeRaw(mode);
  }, []);

  // Leaving a session: the solo state still holds the project as it was before the
  // session, and the server now has the session's edits. Forget it, so the project
  // editor reloads it rather than showing (and autosaving over) the stale copy.
  const wasInSessionRef = useRef(inSession);
  useEffect(() => {
    const left = wasInSessionRef.current && !inSession;
    wasInSessionRef.current = inSession;
    if (!left) return;
    // An unsaved draft (no publicId) has no server copy to go stale, so its lines are kept.
    // Its media is not: entering the session already dropped it (see "Session media") and
    // loaded the session's song, which a draft started next would otherwise save as its own.
    if (!activepublicIdRef.current) {
      playerRef.current?.clearMedia();
      setRestoredMedia(null);
      setUploadedAudio(null);
      setProjectYtUrl('');
      return;
    }
    setSoloLines([]);
    clearSoloHistory();
    activepublicIdRef.current = null;
    setActivepublicId(null);
    lastServerSnapshotRef.current = null;
    sessionUploadIdRef.current = null;
  }, [inSession, setSoloLines, clearSoloHistory]);

  // ——— Session media ———
  // Entering a session from another project leaves that project's audio, metadata and
  // cover behind: forget them first, so the player never plays the wrong song under
  // the session's lyrics. The owner arriving from their own project keeps what is
  // loaded (it is the session's song, possibly a local file nobody else has).
  // Then the doc's `meta.media` is loaded. It is only read: media is not edited in a session.
  // The clear and the load land in separate commits (sessionMediaFor gates the load), so
  // the player sees the descriptor go through null and reloads even when two projects
  // share one upload.
  const collabMedia = useCollabMedia(collabSession.doc);
  const collabSong = useCollabSong(collabSession.doc);
  const [sessionMediaFor, setSessionMediaFor] = useState<string | null>(null);
  useEffect(() => {
    if (sessionPublicId === sessionMediaFor) return;
    if (sessionPublicId !== null && activepublicIdRef.current !== sessionPublicId) {
      playerRef.current?.clearMedia();
      setRestoredMedia(null);
      setProjectYtUrl('');
      setUploadedAudio(null);
      setProjectMetadata({ description: '', tags: [] });
      setProjectCoverImage('');
      setForkedFrom(null);
    }
    // Synchronising with the route: marks which session the stale state was cleared for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionMediaFor(sessionPublicId);
  }, [sessionPublicId, sessionMediaFor]);
  useEffect(() => {
    if (sessionPublicId === null || sessionMediaFor !== sessionPublicId || !collabMedia) return;
    const next = collabMediaToRestored(collabMedia);
    // Shared-doc media, read once per change (the hook keeps its identity otherwise).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRestoredMedia(next);
    if (next?.type === 'youtube') setProjectYtUrl(next.url);
  }, [sessionPublicId, sessionMediaFor, collabMedia]);
  // The session never loads the project, so its song name, artist and album come from the doc.
  useEffect(() => {
    if (sessionPublicId === null || sessionMediaFor !== sessionPublicId || !collabSong) return;
    const { title, artist, album } = collabSong;
    // Shared-doc metadata, read once per change (the hook keeps its identity otherwise).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjectMetadata((prev) => ({ ...prev, songName: title ?? '', songArtist: artist ?? '', songAlbum: album ?? '' }));
  }, [sessionPublicId, sessionMediaFor, collabSong]);

  // Apply the deep-linked playback position once the project has lines, and
  // release the suppression in setRestoredPosition so ordinary playback can
  // move the position again. `?readonly=` used to be read here; it had no
  // producer anywhere in the app and has been removed.
  useEffect(() => {
    if (!deepLinkPendingRef.current || lines.length === 0) return;
    deepLinkPendingRef.current = false;
    if (deepLink.seek !== null) {
      // Synchronising React state with an external system (the URL), which is
      // what every other restore path in this hook does.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRestoredPositionRaw(deepLink.seek);
    }
  }, [lines.length, deepLink.seek]);

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
    inSessionRef,
    activepublicIdRef,
    isCreatingProjectRef,
    sessionUploadIdRef,
    lastServerSnapshotRef,
    playerRef,
    setIsAutosaving,
    setIsSaving,
    setSaveFailed,
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
    setLines: setSoloLines,
    setEditLines: setLines,
    setSyncMode,
    setActiveLineIndex,
    setEditorModeRaw: setSoloEditorMode,
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
    replaceAllBlocked,
  });




  // ——— Mode switching with end-time inference ———
  const setEditorMode = useCallback(
    (mode) => {
      setEditorModeRaw(mode);
      if (mode === 'srt' && editorMode !== 'srt') {
        // Results come back by position; the lines may have moved by the time they do
        // (a collaborator's insert, or the user's own edit), so they are matched back to
        // the lines that were sent and only endTime is written.
        const sentIndexOf = sentIndexResolver(lines);
        lyrics.inferEndTimes({
          lines,
          duration,
          srtConfig: settings.editor?.srt,
          publicId: activepublicIdRef.current,
        }).then(({ lines: inferred }) => {
          setLines((prev: EditorLine[]) => applyInferredEndTimes(prev, sentIndexOf, inferred ?? []));
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
    inSessionRef,
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
    if (getAccessToken() || activepublicId || inSession) return;
    if (lines.length === 0) return;
    const id = setTimeout(() => {
      try {
        const payload = guestSavePayloadRef.current?.();
        if (payload) localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(payload));
      } catch { /* ignore quota errors */ }
    }, 1500);
    return () => clearTimeout(id);
  }, [lines, activepublicId, inSession]);

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

  // Set when the user switches media; the save runs in an effect after the new
  // media state has committed, so the save callback sees fresh values instead
  // of the closure captured before setUploadedAudio/setProjectYtUrl applied.
  const pendingMediaSaveRef = useRef(false);

  const handleYtUrlChange = useCallback((url) => {
    // Clear upload ID cache whenever YouTube URL changes (different media)
    if (url !== projectYtUrl) {
      sessionUploadIdRef.current = null;
      if (url) {
        // A YouTube source replaces any Cloudinary upload; otherwise the save
        // paths would keep resolving the old uploadedAudio and re-save it.
        setUploadedAudio(null);
        // Restore paths pre-set projectYtUrl, so reaching here means the user
        // actually picked different media.
        if (activepublicIdRef.current) pendingMediaSaveRef.current = true;
      }
    }
    setProjectYtUrl(url || '');
  }, [projectYtUrl]);

  const handleTimeUpdate = useCallback((time) => {
    setPlaybackPosition(time);
  }, []);




  const hasUnsavedChanges = useCallback(() => {
    // Only editor routes (local, new, or edit) can have unsaved changes
    if (!window.location.pathname.match(/^\/project\/(local|new|[^/]+\/edit)$/)) return false;

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

      // Ensure we only prompt on editor routes (local, new, or a project's /edit).
      // We do NOT want to prompt on the public view page, which is the same
      // owner-scoped path without the /edit suffix.
      const path = window.location.pathname;
      if (!isEditorPath(path) && path !== '/project/new') return;

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
    // Save paths prefer sessionUploadIdRef over uploadedAudio, and it still
    // holds the previously loaded upload's id — point it at the new upload
    // (or clear it for `local:` placeholders so the save persists a real record).
    const id = info?.id;
    const realId = id && !String(id).startsWith('local:') ? id : null;
    // Hydrating a restored project reports the upload it was loaded with —
    // that's not a change, so don't save (a save here would also overwrite the
    // saved playback position before the restore seek has happened).
    const isChange = !realId || realId !== sessionUploadIdRef.current;
    sessionUploadIdRef.current = realId;
    if (!isChange) return;
    // Cloudinary audio replaces any YouTube source.
    setProjectYtUrl('');
    if (activepublicIdRef.current) pendingMediaSaveRef.current = true;
  }, [setUploadedAudio]);

  useEffect(() => {
    if (!pendingMediaSaveRef.current) return;
    pendingMediaSaveRef.current = false;
    triggerImportSave();
  }, [uploadedAudio, projectYtUrl, triggerImportSave]);

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
    setLines: setLinesForEditing,
    setEditorMode: setEditorModeRaw,
    linesLength: lines.length,
    settings,
    requestConfirm,
    playerRef,
  });




  return {
    t,
    i18n,
    settings,
    lines,
    setLines: setLinesForEditing,
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
    restoredLoop,
    exportToUrl,
    requestConfirm,
    hasUnsavedChanges,
    confirmModal,
    isAutosaving,
    pendingSyncs,
    isSaving,
    saveFailed,
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
    // Collab: null publicId outside /session/:publicId. collabSession carries the
    // provider, doc, status, me and role for the presence/lock tasks.
    sessionPublicId,
    collabSession,
    collabViewer,
  };
}

export type AppState = ReturnType<typeof useAppState>;
