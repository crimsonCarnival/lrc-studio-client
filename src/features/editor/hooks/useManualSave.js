import { useState, useRef, useCallback, useEffect } from 'react';
const DateTimeFormat = Intl.DateTimeFormat;
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { projects, uploads, getAccessToken, auth } from '@/app/api';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { authEvents } from '@/shared/utils/auth-events';
import { STORAGE_KEYS } from '@/features/projects/services/storage.service';

const _defaultTzFormatter = new Intl.DateTimeFormat();
const _tzFormatters = new Map();
function _getTzFormatter(tz) {
  if (!_tzFormatters.has(tz)) {
    _tzFormatters.set(tz, new DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }));
  }
  return _tzFormatters.get(tz);
}

// ── Utilities ────────────────────────────────────────────────────────────────

function toLocalISOString(date, utcOffset) {
  const [sign, hh, mm] = utcOffset.match(/([+-])(\d{2}):(\d{2})/).slice(1);
  const offsetMs = (sign === '-' ? -1 : 1) * (Number(hh) * 60 + Number(mm)) * 60000;
  const local = new Date(date.getTime() + offsetMs);
  return local.toISOString().replace('Z', utcOffset);
}

const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const cloneValue = (v) => JSON.parse(JSON.stringify(v));

function buildLyricsPatch(prev, nextMode, nextLines) {
  if (!prev) return { editorMode: nextMode, lines: nextLines };
  const prevLines = Array.isArray(prev.lines) ? prev.lines : [];
  const modeChanged = prev.editorMode !== nextMode;
  if (prevLines.length !== nextLines.length)
    return modeChanged ? { editorMode: nextMode, lines: nextLines } : { lines: nextLines };
  let changedIdx = -1;
  for (let i = 0; i < nextLines.length; i++) {
    if (!deepEqual(prevLines[i], nextLines[i])) {
      if (changedIdx !== -1) return modeChanged ? { editorMode: nextMode, lines: nextLines } : { lines: nextLines };
      changedIdx = i;
    }
  }
  if (changedIdx === -1) return modeChanged ? { editorMode: nextMode } : null;
  return modeChanged
    ? { editorMode: nextMode, lineIndex: changedIdx, line: nextLines[changedIdx] }
    : { lineIndex: changedIdx, line: nextLines[changedIdx] };
}

export function buildProjectPatch({ prevSnapshot, title, metadata, state, uploadId, editorMode, lines }) {
  const patch = {};
  if (!prevSnapshot || prevSnapshot.title !== title) patch.title = title;
  if (!prevSnapshot || !deepEqual(prevSnapshot.metadata, metadata)) patch.metadata = metadata;
  if (uploadId !== undefined && (!prevSnapshot || prevSnapshot.uploadId !== uploadId)) patch.uploadId = uploadId;
  const lyricsPatch = buildLyricsPatch(prevSnapshot, editorMode, lines);
  if (lyricsPatch) patch.lyrics = lyricsPatch;

  const prevState = prevSnapshot?.state || {};
  const isStateDirty = !prevSnapshot ||
    prevState.syncMode !== state.syncMode ||
    prevState.activeLineIndex !== state.activeLineIndex ||
    prevState.playbackPosition !== state.playbackPosition ||
    prevState.playbackSpeed !== state.playbackSpeed;

  // If anything else changed, or the state itself changed, include the state patch (to update saveTime)
  if (isStateDirty || Object.keys(patch).length > 0) {
    patch.state = state;
  }

  return patch;
}

export function updateServerSnapshot(ref, { title, metadata, state, editorMode, lines, uploadId }) {
  const prev = ref.current;
  ref.current = {
    title,
    metadata: cloneValue(metadata),
    state: cloneValue(state),
    editorMode,
    lines: cloneValue(lines),
    uploadId: uploadId ?? prev?.uploadId ?? null,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useManualSave({
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
  cloudinaryAudio,
  setCloudinaryAudio,
  projectSpotifyTrackId,
  isSharedProjectRef,
  activeProjectIdRef,
  isCreatingProjectRef,
  sessionUploadIdRef,
  lastServerSnapshotRef,
  playerRef,
  setIsAutosaving,
  setIsSaving,
  setActiveProjectId,
  setForkedFrom,
  onSaveSuccess,
}) {
  const { t } = useTranslation();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const buildProjectPayload = useCallback(() => {
    const tzSetting = settings.advanced.timezone;
    const tz = (!tzSetting || tzSetting === 'auto')
      ? _defaultTzFormatter.resolvedOptions().timeZone : tzSetting;
    const now = new Date();
    const parts = _getTzFormatter(tz).formatToParts(now);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    const match = offsetPart.match(/GMT([+-]?)(\d{1,2})(?::(\d{2}))?/);
    let utcOffset = '+00:00';
    if (match) {
      const sign = match[1] || '+';
      utcOffset = `${sign}${match[2].padStart(2, '0')}:${(match[3] || '0').padStart(2, '0')}`;
    }
    return {
      lines: lines.map((l) => ({
        ...l,
        timestamp: typeof l.timestamp === 'number' ? Math.round(l.timestamp * 1000) / 1000 : l.timestamp,
        endTime: editorMode === 'srt'
          ? (typeof l.endTime === 'number' ? Math.round(l.endTime * 1000) / 1000 : (l.endTime ?? null))
          : null,
      })),
      syncMode, activeLineIndex, editorMode,
      ytUrl: projectYtUrl || '',
      playbackPosition: hasMedia ? playbackPosition : 0,
      playbackSpeed: hasMedia ? (playerRef.current?.getSpeed?.() ?? 1) : 1,
      saveTime: toLocalISOString(now, utcOffset),
      timezone: tz, utcOffset,
      title: mediaTitle || '',
      metadata: projectMetadata,
      cloudinaryAudio: cloudinaryAudio || null,
      spotifyTrackId: projectSpotifyTrackId || '',
    };
  }, [lines, syncMode, activeLineIndex, editorMode, settings.advanced.timezone, projectYtUrl, playbackPosition, hasMedia, mediaTitle, projectMetadata, playerRef, cloudinaryAudio, projectSpotifyTrackId]);

  const handleManualSave = useCallback(async (overrides = {}) => {
    if (isCreatingProjectRef.current) return;
    const key = isSharedProjectRef.current ? STORAGE_KEYS.SHARED_PROJECT : STORAGE_KEYS.PROJECT;
    const payload = buildProjectPayload();
    const finalMetadata = overrides.metadata !== undefined ? overrides.metadata : projectMetadata;
    let finalTitle = overrides.title !== undefined ? overrides.title : (mediaTitle || '');
    if (overrides.isPublic !== undefined) payload.public = overrides.isPublic;
    if (overrides.lines !== undefined) payload.lines = overrides.lines;
    if (overrides.editorMode !== undefined) payload.editorMode = overrides.editorMode;
    if (overrides.syncMode !== undefined) payload.syncMode = overrides.syncMode;
    payload.metadata = finalMetadata;
    payload.title = finalTitle;
    // Only persist to localStorage for guest users.
    // Authenticated users save exclusively to the server (prevents stale local data).
    if (!getAccessToken()) {
      localStorage.setItem(key, JSON.stringify(payload));
    }
    setIsAutosaving(true);
    setTimeout(() => setIsAutosaving(false), 1200);

    if (getAccessToken() && activeProjectIdRef.current && !isSharedProjectRef.current) {
      setIsSaving?.(true);
      try {
        let uploadIdToSave = sessionUploadIdRef.current || null;
        // Skip a cached sessionUploadId that was set with a local: temp id
        if (uploadIdToSave && String(uploadIdToSave).startsWith('local:')) uploadIdToSave = null;
        if (!uploadIdToSave && cloudinaryAudio) {
          const hasRealId = cloudinaryAudio.id && !String(cloudinaryAudio.id).startsWith('local:');
          if (hasRealId) {
            uploadIdToSave = cloudinaryAudio.id;
            sessionUploadIdRef.current = cloudinaryAudio.id;
          } else {
            try {
              const { upload } = await uploads.saveMedia({ source: 'cloudinary', cloudinaryUrl: cloudinaryAudio.cloudinaryUrl, publicId: cloudinaryAudio.publicId, fileName: cloudinaryAudio.fileName, title: overrides?.title ?? mediaTitle ?? '', duration: cloudinaryAudio.duration });
              if (upload?.id) {
                uploadIdToSave = upload.id;
                sessionUploadIdRef.current = upload.id;
                setCloudinaryAudio((prev) => ({ ...prev, id: upload.id }));
              }
            } catch (err) { console.error('Failed to save upload:', err); }
          }
        } else if (!uploadIdToSave && payload.ytUrl) {
          try {
            // Don't pass title - let backend fetch it from YouTube API
            const { upload } = await uploads.saveMedia({ source: 'youtube', youtubeUrl: payload.ytUrl, fileName: '', title: undefined, duration: duration || null });
            uploadIdToSave = upload.id;
            sessionUploadIdRef.current = upload.id;
            const isGeneric = ['Sin título', 'Untitled', '無題'].includes(finalTitle);
            if (isGeneric && upload.title) {
              finalTitle = upload.title;
            }
          } catch (err) { console.error('Failed to save upload:', err); }
        } else if (!uploadIdToSave && payload.spotifyTrackId) {
          try {
            const { upload } = await uploads.saveMedia({ source: 'spotify', spotifyTrackId: payload.spotifyTrackId, fileName: '', title: undefined, duration: duration || null });
            uploadIdToSave = upload.id;
            sessionUploadIdRef.current = upload.id;
          } catch (err) { console.error('Failed to save upload:', err); }
        }

        const patchState = { syncMode: payload.syncMode, activeLineIndex, playbackPosition: payload.playbackPosition, playbackSpeed: payload.playbackSpeed, saveTime: payload.saveTime, timezone: payload.timezone, utcOffset: payload.utcOffset };
        const patchData = buildProjectPatch({ prevSnapshot: lastServerSnapshotRef.current, title: finalTitle, metadata: finalMetadata, state: patchState, uploadId: uploadIdToSave ?? undefined, editorMode: payload.editorMode, lines: payload.lines });
        if (overrides.title !== undefined) patchData.title = overrides.title;
        if (overrides.metadata !== undefined) patchData.metadata = overrides.metadata;
        if (overrides.isPublic !== undefined) patchData.public = overrides.isPublic;

        if (Object.keys(patchData).length > 0) {
          try {
            await projects.patch(activeProjectIdRef.current, patchData);
            updateServerSnapshot(lastServerSnapshotRef, { title: finalTitle, metadata: finalMetadata, state: patchState, editorMode, lines: payload.lines, uploadId: uploadIdToSave ?? undefined });
            toast.success(t('project.saved') || 'Project saved', { id: 'manual-save-ok', duration: 2000 });
          } catch (err) {
            // 401 / 403: access token expired — attempt one silent refresh then retry.
            if (err?.status === 401 || err?.status === 403 || (err?.graphqlErrors && err.message?.includes('Not authorized'))) {
              try {
                await auth.refresh();
                // Retry the save with the fresh token (cookies are sent automatically)
                await projects.patch(activeProjectIdRef.current, patchData);
                updateServerSnapshot(lastServerSnapshotRef, { title: finalTitle, metadata: finalMetadata, state: patchState, editorMode: payload.editorMode, lines: payload.lines, uploadId: uploadIdToSave ?? undefined });
                toast.success(t('project.saved') || 'Project saved', { id: 'manual-save-ok', duration: 2000 });
                return; // retry succeeded
              } catch {
                // Refresh also failed — emit expiry so useAuth handles logout + toast
                authEvents.emit('token:expired');
                return;
              }
            }
            console.error('[Manual Save] Server error:', err);
            toast.error(t('project.saveFailed') || 'Failed to save to server');
          }
        }
        onSaveSuccess?.();
      } finally { setIsSaving?.(false); }
    } else if (getAccessToken() && !activeProjectIdRef.current && !isSharedProjectRef.current && payload.lines?.length > 0 && !sessionStorage.getItem('pendingGuestClaim:v1')) {
      if (isCreatingProjectRef.current) return;
      isCreatingProjectRef.current = true;
      let uploadIdToSave = null;
      const cloudinaryHasRealId = cloudinaryAudio?.id && !String(cloudinaryAudio.id).startsWith('local:');
      if (cloudinaryHasRealId) { uploadIdToSave = cloudinaryAudio.id; }
      else if (cloudinaryAudio) {
        try {
          const { upload } = await uploads.saveMedia({ source: 'cloudinary', cloudinaryUrl: cloudinaryAudio.cloudinaryUrl, publicId: cloudinaryAudio.publicId, fileName: cloudinaryAudio.fileName, title: cloudinaryAudio.fileName?.replace(/\.[^/.]+$/, '') || '', duration: cloudinaryAudio.duration });
          if (upload?.id) { uploadIdToSave = upload.id; setCloudinaryAudio((p) => ({ ...p, id: upload.id })); }
        } catch (err) { console.error(err); }
      } else if (payload.ytUrl) {
        try {
          const { upload } = await uploads.saveMedia({ source: 'youtube', youtubeUrl: payload.ytUrl, fileName: '', title: '', duration: duration || null });
          if (upload?.id) {
            uploadIdToSave = upload.id;
            const isGeneric = ['Sin título', 'Untitled', '無題'].includes(finalTitle);
            if (isGeneric && upload.title) {
              finalTitle = upload.title;
            }
          }
        } catch (err) { console.error(err); }
      } else if (payload.spotifyTrackId) {
        try {
          const { upload } = await uploads.saveMedia({ source: 'spotify', spotifyTrackId: payload.spotifyTrackId, fileName: '', title: '', duration: duration || null });
          if (upload?.id) { uploadIdToSave = upload.id; }
        } catch (err) { console.error(err); }
      }
      const createData = { title: finalTitle, metadata: finalMetadata, lyrics: { editorMode: payload.editorMode, lines: payload.lines }, state: { syncMode: payload.syncMode, activeLineIndex, playbackPosition: payload.playbackPosition || 0, playbackSpeed: payload.playbackSpeed || 1, saveTime: payload.saveTime, timezone: payload.timezone, utcOffset: payload.utcOffset }, readOnly: false };
      if (overrides.isPublic !== undefined) createData.public = overrides.isPublic;
      if (uploadIdToSave) createData.uploadId = uploadIdToSave;

      const performCreate = async () => {
        try {
          const recaptchaToken = executeRecaptcha ? await executeRecaptcha('create_project').catch(err => { console.warn('reCAPTCHA failed:', err); return undefined; }) : undefined;
          const res = await projects.create({ ...createData, recaptchaToken });
          const { projectId } = res;
          setForkedFrom?.(null); // Creation from guest is never a fork
          setActiveProjectId(projectId);
          activeProjectIdRef.current = projectId;
          updateServerSnapshot(lastServerSnapshotRef, { title: createData.title, metadata: createData.metadata, state: createData.state, editorMode: payload.editorMode, lines: payload.lines, uploadId: uploadIdToSave ?? undefined });
          try { localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, projectId); } catch { /* ignore */ }
          onSaveSuccess?.();
          toast.success(t('project.created') || 'Project created');
        } catch (err) {
          console.error(err);
          toast.error(t('project.createFailed') || 'Failed to create project');
        } finally {
          isCreatingProjectRef.current = false;
        }
      };
      performCreate();
    }
  }, [buildProjectPayload, mediaTitle, projectMetadata, editorMode, activeLineIndex, cloudinaryAudio, duration, t, isSharedProjectRef, activeProjectIdRef, isCreatingProjectRef, sessionUploadIdRef, lastServerSnapshotRef, setIsAutosaving, setIsSaving, setActiveProjectId, setCloudinaryAudio, executeRecaptcha, onSaveSuccess, setForkedFrom]);

  const [importTick, setImportTick] = useState(0);
  const importPayloadRef = useRef(null);
  const manualSaveRef = useRef(null);
  useEffect(() => { manualSaveRef.current = handleManualSave; });
  useEffect(() => {
    if (importTick > 0) { manualSaveRef.current?.(importPayloadRef.current || {}); importPayloadRef.current = null; }
  }, [importTick]);

  const triggerImportSave = useCallback((payload = null) => {
    if (payload) importPayloadRef.current = payload;
    setImportTick((n) => n + 1);
  }, []);

  return { handleManualSave, triggerImportSave, buildProjectPayload };
}
