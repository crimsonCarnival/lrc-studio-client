import { useRef, useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { uploads, projects, getAccessToken } from '@/app/api';
import { flatToSections } from '@/features/editor/utils/sections';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { authEvents } from '@/shared/utils/auth-events';
import { STORAGE_KEYS } from '@/features/projects/services/storage.service';
import { getSocket } from '@/app/socket.client';
import {
  enqueueSyncJob,
  flushSyncQueue,
  getSyncQueueSize,
  isSyncQueueEmpty,
} from '../sync.queue';

/**
 * Dual-condition autosave: fires when either the time interval elapses
 * OR the user makes N edits (action-count), whichever comes first.
 *
 * Also auto-creates a project on the server when the user is authenticated
 * but has no active project yet.
 */
export function useAutosave({
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
  updateServerSnapshot,
  setActivepublicId,
  setIsAutosaving,
  isProjectLoadingRef,
  setForkedFrom,
  onSaveSuccess,
}) {
  const { executeRecaptcha } = useGoogleReCaptcha();
  // Keep a ref-snapshot of volatile values to avoid stale closures inside the
  // setInterval / doAutoSave callback.
  // Values stored here are read via autoSaveRef.current inside doAutoSave, so
  // they do NOT appear in doAutoSave's dependency array — keeping it stable and
  // preventing the [lines, doAutoSave] effect from firing on every playback tick.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autoSaveRef = useRef<any>(null);
  useEffect(() => {
    autoSaveRef.current = {
      pendingProject,
      enabled: settings.advanced?.autoSave?.enabled ?? false,
      timeInterval: settings.advanced?.autoSave?.timeInterval ?? 30,
      buildPayload: buildProjectPayload,
      isSharedProject,
      // Volatile editing values — removed from doAutoSave deps to prevent flooding
      mediaTitle,
      projectMetadata,
      editorMode,
      syncMode,
      activeLineIndex,
      uploadedAudio,
      duration,
    };
  });

  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [initialTime] = useState(() => Date.now());
  const lastSaveTimeRef = useRef(initialTime);
  const changeCountRef = useRef(0);
  const saveControllerRef = useRef<AbortController | null>(null);

  const doAutoSave = useCallback(async () => {
    // 1. Guard against concurrent creates or loads (manual restore race)
    if (isCreatingProjectRef.current || isProjectLoadingRef.current) return;

    const s = autoSaveRef.current;
    if (!s || s.pendingProject !== null || !s.enabled) return;

    // Read all volatile values from the ref snapshot — none of these appear in
    // the dep array below, which keeps doAutoSave stable across playback ticks.
    const {
      buildPayload, isSharedProject,
      mediaTitle, projectMetadata, editorMode, syncMode,
      activeLineIndex, uploadedAudio, duration,
    } = s;

    const payload = buildPayload();
    const key = isSharedProject ? STORAGE_KEYS.SHARED_PROJECT : STORAGE_KEYS.PROJECT;
    // Only persist to localStorage for guest users.
    // Auth users persist exclusively to the server.
    if (!getAccessToken()) {
      localStorage.setItem(key, JSON.stringify(payload));
    }

    if (getAccessToken() && activepublicIdRef.current && !isSharedProjectRef.current) {
      // Skip saveMedia if we already have an upload ID for this session
      let uploadIdToSave = sessionUploadIdRef.current || null;

      if (!uploadIdToSave && uploadedAudio) {
        const hasRealId = uploadedAudio.id && !String(uploadedAudio.id).startsWith('local:');
        if (hasRealId) {
          uploadIdToSave = uploadedAudio.id;
          sessionUploadIdRef.current = uploadedAudio.id;
        } else {
          try {
            const { upload } = await uploads.saveMedia({
              source: 'cloudinary',
              uploadUrl: uploadedAudio.uploadUrl,
              publicId: uploadedAudio.publicId,
              fileName: uploadedAudio.fileName,
              title: uploadedAudio.fileName?.replace(/\.[^/.]+$/, '') || '',
              duration: uploadedAudio.duration,
            });
            if (upload?.id) {
              uploadIdToSave = upload.id;
              sessionUploadIdRef.current = upload.id;
            }
          } catch (err) {
            console.error('Failed to save upload:', err);
          }
        }
      } else if (!uploadIdToSave && payload.ytUrl) {
        try {
          const { upload } = await uploads.saveMedia({
            source: 'youtube',
            uploadUrl: payload.ytUrl,
            fileName: '',
            title: mediaTitle || '',
            duration: duration || null,
          });
          if (upload?.id) { uploadIdToSave = upload.id; sessionUploadIdRef.current = upload.id; }
        } catch (err) {
          console.error('Failed to save upload:', err);
        }
      }

      const patchState = {
        syncMode,
        activeLineIndex,
        playbackPosition: payload.playbackPosition || 0,
        playbackSpeed: payload.playbackSpeed || 1,
        saveTime: payload.saveTime,
      };
      const title = mediaTitle || '';
      const metadata = projectMetadata;
      const patchData = buildProjectPatch({
        prevSnapshot: lastServerSnapshotRef.current,
        title,
        metadata,
        state: patchState,
        uploadId: uploadIdToSave ?? undefined,
        editorMode,
        lines: payload.lines || [],
      });

      if (Object.keys(patchData).length > 0) {
        // Cancel any previous in-flight save — the current state supersedes it
        saveControllerRef.current?.abort();
        saveControllerRef.current = new AbortController();
        const { signal } = saveControllerRef.current;
        const socketId = getSocket()?.id;
        const extraHeaders: Record<string, string> = socketId ? { 'x-socket-id': socketId } : {};
        try {
          await projects.patch(activepublicIdRef.current, patchData, { signal, headers: extraHeaders });
          updateServerSnapshot({
            title,
            metadata,
            state: patchState,
            editorMode,
            lines: payload.lines || [],
            uploadId: uploadIdToSave ?? undefined,
          });
          onSaveSuccess?.();
          // On a successful save, attempt to drain any jobs that failed earlier
          if (!isSyncQueueEmpty()) {
            try {
              await flushSyncQueue((id, p) => projects.patch(id, p));
              setPendingSyncs(0);
            } catch {
              setPendingSyncs(getSyncQueueSize());
            }
          }
        } catch (err) {
          if ((err as { name?: string })?.name === 'AbortError') return; // superseded — ignore
          // Auth failure: token may have expired. Signal the global handler.
          if ((err as { status?: number })?.status === 401 || (err as { status?: number })?.status === 403) {
            authEvents.emit('token:expired');
          } else {
            // Network failure — queue for retry on reconnect
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            enqueueSyncJob({ projectId: activepublicIdRef.current, payload: patchData as any, timestamp: Date.now() });
            setPendingSyncs(getSyncQueueSize());
          }
          // All other errors: silent fail (autosave — user not waiting for feedback)
        }
      }
    } else if (
      getAccessToken() &&
      !activepublicIdRef.current &&
      !isSharedProjectRef.current &&
      payload.lines?.length > 0 &&
      !sessionStorage.getItem('pendingGuestClaim:v1')
    ) {
      // Guard against concurrent creates (autosave + manual save race)
      if (isCreatingProjectRef.current) return;
      isCreatingProjectRef.current = true;

      let uploadIdToSave: string | null = null;
      if (uploadedAudio) {
        const hasRealId = uploadedAudio.id && !String(uploadedAudio.id).startsWith('local:');
        if (hasRealId) {
          uploadIdToSave = uploadedAudio.id;
        } else {
          try {
            const { upload } = await uploads.saveMedia({
              source: 'cloudinary',
              uploadUrl: uploadedAudio.uploadUrl,
              publicId: uploadedAudio.publicId,
              fileName: uploadedAudio.fileName,
              title: uploadedAudio.fileName?.replace(/\.[^/.]+$/, '') || '',
              duration: uploadedAudio.duration,
            });
            if (upload?.id) uploadIdToSave = upload.id;
          } catch (err) {
            console.error('Failed to save upload:', err);
          }
        }
      } else if (payload.ytUrl) {
        try {
          const { upload } = await uploads.saveMedia({
            source: 'youtube',
            uploadUrl: payload.ytUrl,
            fileName: '',
            title: mediaTitle || '',
            duration: duration || null,
          });
          uploadIdToSave = upload.id;
        } catch (err) {
          console.error('Failed to save upload:', err);
        }
      }

      const derivedTitle = (() => {
        if (mediaTitle) return mediaTitle;
        const { songName, songArtists, songArtist } = projectMetadata || {};
        const artistStr = Array.isArray(songArtists) && songArtists.length > 0 ? songArtists.join(', ') : (songArtist || '');
        if (songName) return artistStr ? `${songName} - ${artistStr}` : songName;
        return mediaTitle || '';
      })();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createData: Record<string, any> = {
        title: derivedTitle,
        metadata: projectMetadata,
        lyrics: { editorMode, sections: payload.sections || flatToSections(payload.lines || []) },
        state: {
          syncMode,
          activeLineIndex,
          playbackPosition: payload.playbackPosition || 0,
          playbackSpeed: payload.playbackSpeed || 1,
          saveTime: payload.saveTime,
        },
        readOnly: false,
      };
      if (uploadIdToSave) createData.uploadId = uploadIdToSave;

      const performCreate = async () => {
        try {
          const recaptchaToken = executeRecaptcha ? await executeRecaptcha('autosave_create') : undefined;
          const { publicId } = await projects.create({ ...createData, recaptchaToken });
          setForkedFrom?.(null); // Auto-creation from guest is never a fork
          setActivepublicId(publicId);
          activepublicIdRef.current = publicId;
          updateServerSnapshot({
            title: createData.title,
            metadata: createData.metadata,
            state: createData.state,
            editorMode,
            lines: payload.lines,
            uploadId: uploadIdToSave ?? undefined,
          });
          try {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, publicId);
          } catch { /* ignore */ }
          onSaveSuccess?.();
        } catch { /* ignore — project create failed; isCreatingProjectRef reset in finally */ }
        finally {
          isCreatingProjectRef.current = false;
        }
      };
      performCreate();
    }

    lastSaveTimeRef.current = Date.now();
    changeCountRef.current = 0;
    setIsAutosaving(true);
    const indicatorDuration = { short: 800, normal: 1500, long: 3000 }[settings.advanced?.autoSaveIndicator] || 1500;
    setTimeout(() => setIsAutosaving(false), indicatorDuration);
  // Volatile editing values (mediaTitle, projectMetadata, editorMode, syncMode,
  // activeLineIndex, uploadedAudio, duration) are intentionally NOT listed here.
  // They are read from autoSaveRef.current which is updated every render,
  // ensuring freshness without recreating doAutoSave on every playback tick.
  }, [
    isSharedProjectRef,
    activepublicIdRef,
    isCreatingProjectRef,
    sessionUploadIdRef,
    lastServerSnapshotRef,
    buildProjectPatch,
    updateServerSnapshot,
    setActivepublicId,
    setIsAutosaving,
    executeRecaptcha,
    onSaveSuccess,
    isProjectLoadingRef,
    setForkedFrom,
    settings.advanced?.autoSaveIndicator,
  ]);

  const doAutoSaveRef = useRef(doAutoSave);
  useLayoutEffect(() => { doAutoSaveRef.current = doAutoSave; });

  // ——— Action-based trigger (every 5 line edits) ———
  const isFirstLinesRender = useRef(true);
  useEffect(() => {
    if (isFirstLinesRender.current) { isFirstLinesRender.current = false; return; }
    const s = autoSaveRef.current;
    // Never count edits while restoring — the setLines calls from restore look
    // identical to user edits from React's perspective.
    if (!s?.enabled || s.isProjectLoading) return;
    changeCountRef.current += 1;
    if (changeCountRef.current >= 5) {
      doAutoSaveRef.current();
    }
  }, [lines]); // doAutoSave intentionally omitted — read via doAutoSaveRef

  // ——— Time-based trigger ———
  useEffect(() => {
    if (!settings.advanced?.autoSave?.enabled) return;
    const intervalMs = Math.max(10, settings.advanced.autoSave.timeInterval ?? 30) * 1000;
    const id = setInterval(() => { doAutoSaveRef.current(); }, intervalMs);
    return () => clearInterval(id);
    // doAutoSave read via ref to avoid restarting the interval on every save cycle
  }, [settings.advanced?.autoSave?.enabled, settings.advanced?.autoSave?.timeInterval]);

  // ——— Autosave server acknowledgment ———
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function onAck() {
      // ack received — future: update lastSaved UI here
    }

    socket.on('autosave:ack', onAck);
    return () => { socket.off("autosave:ack", onAck); };
  }, []);

  // ——— Flush queued saves on socket reconnect ———
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReconnect = async () => {
      if (isSyncQueueEmpty()) return;
      try {
        await flushSyncQueue((id, p) => projects.patch(id, p));
        setPendingSyncs(0);
      } catch {
        setPendingSyncs(getSyncQueueSize());
      }
    };

    socket.on('connect', handleReconnect);
    return () => { socket.off('connect', handleReconnect); };
  }, []);

  return { doAutoSave, pendingSyncs };
}
