import { useRef, useCallback, useLayoutEffect } from 'react';
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

import deepEqual from 'fast-deep-equal';
import { flatToSections, flatIndexToSectionPos } from '../utils/sections';
const cloneValue = (v) => structuredClone(v);

function buildLyricsPatch(prev, nextMode, nextLines) {
  const nextSections = flatToSections(nextLines);
  if (!prev) return { editorMode: nextMode, sections: nextSections };
  const prevLines = Array.isArray(prev.lines) ? prev.lines : [];
  const modeChanged = prev.editorMode !== nextMode;
  if (prevLines.length !== nextLines.length)
    return modeChanged ? { editorMode: nextMode, sections: nextSections } : { sections: nextSections };
  let changedIdx = -1;
  for (let i = 0; i < nextLines.length; i++) {
    if (!deepEqual(prevLines[i], nextLines[i])) {
      if (changedIdx !== -1) return modeChanged ? { editorMode: nextMode, sections: nextSections } : { sections: nextSections };
      changedIdx = i;
    }
  }
  if (changedIdx === -1) return modeChanged ? { editorMode: nextMode } : null;
  // Section marker changed → send full sections (no positional patch for headers)
  const pos = flatIndexToSectionPos(nextLines, changedIdx);
  if (!pos) return modeChanged ? { editorMode: nextMode, sections: nextSections } : { sections: nextSections };
  return modeChanged
    ? { editorMode: nextMode, sectionIdx: pos.sectionIdx, lineIdx: pos.lineIdx, line: nextLines[changedIdx] }
    : { sectionIdx: pos.sectionIdx, lineIdx: pos.lineIdx, line: nextLines[changedIdx] };
}

export function buildProjectPatch({ prevSnapshot, title, metadata, state, uploadId, editorMode, lines }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {};
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
    const roundedLines = lines.map((l) => ({
      ...l,
      timestamp: typeof l.timestamp === 'number' ? Math.round(l.timestamp * 1000) / 1000 : l.timestamp,
      endTime: editorMode === 'srt'
        ? (typeof l.endTime === 'number' ? Math.round(l.endTime * 1000) / 1000 : (l.endTime ?? null))
        : null,
    }));
    return {
      lines: roundedLines,
      sections: flatToSections(roundedLines),
      syncMode, activeLineIndex, editorMode,
      ytUrl: projectYtUrl || '',
      playbackPosition: hasMedia ? playbackPosition : 0,
      playbackSpeed: hasMedia ? (playerRef.current?.getSpeed?.() ?? 1) : 1,
      saveTime: toLocalISOString(now, utcOffset),
      title: mediaTitle || '',
      metadata: projectMetadata,
      uploadedAudio: uploadedAudio || null,
    };
  }, [lines, syncMode, activeLineIndex, editorMode, settings.advanced.timezone, projectYtUrl, playbackPosition, hasMedia, mediaTitle, projectMetadata, playerRef, uploadedAudio]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleManualSave = useCallback(async (overrides: { title?: string; metadata?: any; isPublic?: boolean; lines?: any[]; editorMode?: string; syncMode?: boolean; coverImage?: string } = {}) => {
    if (isCreatingProjectRef.current) return;
    const key = isSharedProjectRef.current ? STORAGE_KEYS.SHARED_PROJECT : STORAGE_KEYS.PROJECT;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = buildProjectPayload() as Record<string, any>;
    const finalMetadata = overrides.metadata !== undefined ? overrides.metadata : projectMetadata;
    let finalTitle = overrides.title !== undefined ? overrides.title : (mediaTitle || '');
    const GENERIC_TITLES = ['Sin título', 'Untitled', '無題'];
    if (!finalTitle || GENERIC_TITLES.includes(finalTitle)) {
      const { songName, songArtists, songArtist } = finalMetadata || {};
      const artistStr = Array.isArray(songArtists) && songArtists.length > 0 ? songArtists.join(', ') : (songArtist || '');
      if (songName) finalTitle = artistStr ? `${songName} - ${artistStr}` : songName;
    }
    if (overrides.isPublic !== undefined) payload.public = overrides.isPublic;
    if (overrides.lines !== undefined) { payload.lines = overrides.lines; payload.sections = flatToSections(overrides.lines); }
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
    const indicatorDuration = { short: 800, normal: 1500, long: 3000 }[settings?.advanced?.autoSaveIndicator] || 1500;
    setTimeout(() => setIsAutosaving(false), indicatorDuration);

    if (getAccessToken() && activepublicIdRef.current && !isSharedProjectRef.current) {
      setIsSaving?.(true);
      try {
        let uploadIdToSave = sessionUploadIdRef.current || null;
        // Skip a cached sessionUploadId that was set with a local: temp id
        if (uploadIdToSave && String(uploadIdToSave).startsWith('local:')) uploadIdToSave = null;
        if (!uploadIdToSave && uploadedAudio) {
          const hasRealId = uploadedAudio.id && !String(uploadedAudio.id).startsWith('local:');
          if (hasRealId) {
            uploadIdToSave = uploadedAudio.id;
            sessionUploadIdRef.current = uploadedAudio.id;
          } else {
            try {
              const { upload } = await uploads.saveMedia({ source: 'cloudinary', uploadUrl: uploadedAudio.uploadUrl, publicId: uploadedAudio.publicId, fileName: uploadedAudio.fileName, title: overrides?.title ?? mediaTitle ?? '', duration: uploadedAudio.duration });
              if (upload?.id) {
                uploadIdToSave = upload.id;
                sessionUploadIdRef.current = upload.id;
                setUploadedAudio((prev) => ({ ...prev, id: upload.id }));
              }
            } catch (err) { console.error('Failed to save upload:', err); }
          }
        } else if (!uploadIdToSave && payload.ytUrl) {
          try {
            // Don't pass title - let backend fetch it from YouTube API
            const { upload } = await uploads.saveMedia({ source: 'youtube', uploadUrl: payload.ytUrl, fileName: '', title: undefined, duration: duration || null });
            uploadIdToSave = upload.id;
            sessionUploadIdRef.current = upload.id;
            const isGeneric = ['Sin título', 'Untitled', '無題'].includes(finalTitle);
            if (isGeneric && upload.title) {
              finalTitle = upload.title;
            }
          } catch (err) { console.error('Failed to save upload:', err); }
        }

        const patchState = { syncMode: payload.syncMode, activeLineIndex, playbackPosition: payload.playbackPosition, playbackSpeed: payload.playbackSpeed, saveTime: payload.saveTime };
        const patchData = buildProjectPatch({ prevSnapshot: lastServerSnapshotRef.current, title: finalTitle, metadata: finalMetadata, state: patchState, uploadId: uploadIdToSave ?? undefined, editorMode: payload.editorMode, lines: payload.lines });
        if (overrides.title !== undefined) patchData.title = overrides.title;
        if (overrides.metadata !== undefined) patchData.metadata = overrides.metadata;
        if (overrides.isPublic !== undefined) patchData.public = overrides.isPublic;
        if (overrides.coverImage !== undefined) patchData.coverImage = overrides.coverImage;

        if (Object.keys(patchData).length > 0) {
          try {
            await projects.patch(activepublicIdRef.current, patchData);
            updateServerSnapshot(lastServerSnapshotRef, { title: finalTitle, metadata: finalMetadata, state: patchState, editorMode, lines: payload.lines, uploadId: uploadIdToSave ?? undefined });
            toast.success(t('project.saved') || 'Project saved', { id: 'manual-save-ok', duration: 2000 });
          } catch (err) {
            // 401 / 403: access token expired — attempt one silent refresh then retry.
            if (err?.status === 401 || err?.status === 403 || (err?.graphqlErrors && err.message?.includes('Not authorized'))) {
              try {
                await auth.refresh();
                // Retry the save with the fresh token (cookies are sent automatically)
                await projects.patch(activepublicIdRef.current, patchData);
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
    } else if (getAccessToken() && !activepublicIdRef.current && !isSharedProjectRef.current && payload.lines?.length > 0 && !sessionStorage.getItem('pendingGuestClaim:v1')) {
      if (isCreatingProjectRef.current) return;
      isCreatingProjectRef.current = true;
      let uploadIdToSave: string | null = null;
      const cloudinaryHasRealId = uploadedAudio?.id && !String(uploadedAudio.id).startsWith('local:');
      if (cloudinaryHasRealId) { uploadIdToSave = uploadedAudio.id; }
      else if (uploadedAudio) {
        try {
          const { upload } = await uploads.saveMedia({ source: 'cloudinary', uploadUrl: uploadedAudio.uploadUrl, publicId: uploadedAudio.publicId, fileName: uploadedAudio.fileName, title: uploadedAudio.fileName?.replace(/\.[^/.]+$/, '') || '', duration: uploadedAudio.duration });
          if (upload?.id) { uploadIdToSave = upload.id; setUploadedAudio((p) => ({ ...p, id: upload.id })); }
        } catch (err) { console.error(err); }
      } else if (payload.ytUrl) {
        try {
          const { upload } = await uploads.saveMedia({ source: 'youtube', uploadUrl: payload.ytUrl, fileName: '', title: '', duration: duration || null });
          if (upload?.id) {
            uploadIdToSave = upload.id;
            const isGeneric = ['Sin título', 'Untitled', '無題'].includes(finalTitle);
            if (isGeneric && upload.title) {
              finalTitle = upload.title;
            }
          }
        } catch (err) { console.error(err); }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createData: Record<string, any> = { title: finalTitle, metadata: finalMetadata, lyrics: { editorMode: payload.editorMode, sections: payload.sections }, state: { syncMode: payload.syncMode, activeLineIndex, playbackPosition: payload.playbackPosition || 0, playbackSpeed: payload.playbackSpeed || 1, saveTime: payload.saveTime }, readOnly: false };
      if (overrides.isPublic !== undefined) createData.public = overrides.isPublic;
      if (overrides.coverImage !== undefined) createData.coverImage = overrides.coverImage;
      if (uploadIdToSave) createData.uploadId = uploadIdToSave;

      const performCreate = async () => {
        try {
          const recaptchaToken = executeRecaptcha ? await executeRecaptcha('create_project').catch(err => { console.warn('reCAPTCHA failed:', err); return undefined; }) : undefined;
          const res = await projects.create({ ...createData, recaptchaToken });
          const { publicId } = res;
          setForkedFrom?.(null); // Creation from guest is never a fork
          setActivepublicId(publicId);
          activepublicIdRef.current = publicId;
          updateServerSnapshot(lastServerSnapshotRef, { title: createData.title, metadata: createData.metadata, state: createData.state, editorMode: payload.editorMode, lines: payload.lines, uploadId: uploadIdToSave ?? undefined });
          try { localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, publicId); } catch { /* ignore */ }
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
  }, [buildProjectPayload, mediaTitle, projectMetadata, editorMode, activeLineIndex, uploadedAudio, duration, t, isSharedProjectRef, activepublicIdRef, isCreatingProjectRef, sessionUploadIdRef, lastServerSnapshotRef, setIsAutosaving, setIsSaving, setActivepublicId, setUploadedAudio, executeRecaptcha, onSaveSuccess, setForkedFrom, settings?.advanced?.autoSaveIndicator]);

  const manualSaveRef = useRef<typeof handleManualSave | null>(null);
  useLayoutEffect(() => { manualSaveRef.current = handleManualSave; });

  const triggerImportSave = useCallback((payload: Record<string, unknown> | null = null) => {
    manualSaveRef.current?.(payload || {});
  }, []);

  return { handleManualSave, triggerImportSave, buildProjectPayload };
}
