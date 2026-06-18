import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { projects, uploads, getAccessToken } from '@/app/api';
import { sectionsToFlat, flatToSections } from '@/features/editor/utils/sections';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useSettings } from '@/features/settings/useSettings';
import { STORAGE_KEYS } from '@/features/projects/services/storage.service';
import { useProjectSocket } from './useProjectSocket';
import { uploadToRestoredMedia } from '@/shared/utils/media-hydration';

// Legacy URL-encoded share fallbacks
async function decompressFromBase64(str) {
  const { decompress } = await import('fflate');
  const bytes = Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
  return new Promise((res, rej) => decompress(bytes, (err, data) => err ? rej(err) : res(new TextDecoder().decode(data))));
}
function expandSharePayload(raw) { return raw; } // v1 format passthrough

function sanitizeLines(raw) {
  return (raw || []).flatMap((l) => {
    if (!(l && typeof l === 'object')) return [];
    if (l.type === 'section') {
      return [{ type: 'section', label: l.label || '', timestamp: typeof l.timestamp === 'number' ? l.timestamp : null, id: typeof l.id === 'string' ? l.id : crypto.randomUUID() }];
    }
    if (typeof l.text !== 'string') return [];
    return [{
      text: l.text,
      timestamp: typeof l.timestamp === 'number' && isFinite(l.timestamp) ? l.timestamp : null,
      endTime: typeof l.endTime === 'number' && isFinite(l.endTime) ? l.endTime : undefined,
      secondary: typeof l.secondary === 'string' ? l.secondary : '',
      translations: Array.isArray(l.translations) ? l.translations : undefined,
      id: typeof l.id === 'string' ? l.id : crypto.randomUUID(),
      words: Array.isArray(l.words)
        ? l.words.flatMap((w) => {
            const word = typeof w.word === 'string' ? w.word : '';
            return word ? [{ word, time: typeof w.time === 'number' && isFinite(w.time) ? w.time : null, ...(typeof w.reading === 'string' && w.reading ? { reading: w.reading } : {}) }] : [];
          })
        : undefined,
      secondaryWords: Array.isArray(l.secondaryWords)
        ? l.secondaryWords.flatMap((w) => {
            const word = typeof w.word === 'string' ? w.word : '';
            return word ? [{ word, time: typeof w.time === 'number' && isFinite(w.time) ? w.time : null }] : [];
          })
        : undefined,
    }];
  });
}

/**
 * Manages shared-project state: URL-hash decode on mount, read-only fork guard,
 * cleanup on unload, and export-to-shareable-URL.
 */
export function useSharedProject({
  setLines,
  setSyncMode,
  setActiveLineIndex,
  setEditorModeRaw,
  setRestoredMedia,
  setRestoredPosition,
  setRestoredSpeed,
  setIsProjectLoading,
  setActivepublicId,
  setShareModal,
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
}) {
  const { t } = useTranslation();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const { updateSetting } = useSettings();

  const [isSharedProject, setIsSharedProject] = useState(false);
  const [sharedReadOnly, setSharedReadOnly] = useState(true);
  const [shareModal, _setShareModal] = useState<unknown>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lastShareData, setLastShareData] = useState<any>(null);
  const isSharedProjectRef = useRef(false);
  const sharedReadOnlyRef = useRef(true);

  useLayoutEffect(() => {
    isSharedProjectRef.current = isSharedProject;
    sharedReadOnlyRef.current = sharedReadOnly;
  });

  // Live updates from the server when viewing a shared project
  // eslint-disable-next-line react-hooks/refs
  const socketpublicId = isSharedProject ? activepublicIdRef.current : null;
  useProjectSocket(socketpublicId, {
    setLines,
    setSyncMode,
    setActiveLineIndex,
    setRestoredPosition,
    setRestoredSpeed,
  });

  // Expose shareModal setter so exportToUrl can call it
  const setShareModalState = setShareModal ?? _setShareModal;

  // ── Decode #s= hash on mount ──────────────────────────────────────────────
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#s=')) return;
    const encoded = hash.slice(3);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    const restoreProject = (parsed) => {
      const validLines = sanitizeLines(parsed.lines);
      if (!validLines.length) return;
      setLines(validLines);
      if (parsed.syncMode) setSyncMode(parsed.syncMode);
      const idx = parsed.activeLineIndex;
      if (typeof idx === 'number' && idx >= 0 && idx < validLines.length) setActiveLineIndex(idx);
      const mode = parsed.editorMode || (validLines.some((l) => l.endTime != null) ? 'srt' : 'lrc');
      setEditorModeRaw(mode);
      if (parsed.ytUrl) {
        setRestoredMedia({ type: 'youtube', url: parsed.ytUrl });
      } else if (parsed.cloudinaryUpload) {
        setRestoredMedia(uploadToRestoredMedia(parsed.cloudinaryUpload));
      }
      if (typeof parsed.playbackPosition === 'number') setRestoredPosition(parsed.playbackPosition);
      if (typeof parsed.playbackSpeed === 'number') setRestoredSpeed(parsed.playbackSpeed);
      const ro = parsed.readOnly !== false;
      setSharedReadOnly(ro);
      sharedReadOnlyRef.current = ro;
      setIsSharedProject(true);
      updateSetting('interface.focusMode', 'playback');
      localStorage.setItem(STORAGE_KEYS.SHARED_PROJECT, JSON.stringify(parsed));
    };

    const looksLikeId = /^[A-Za-z0-9_-]{6,21}$/.test(encoded) && !encoded.includes('eJy');
    if (looksLikeId) {
      setIsProjectLoading(true);
      // Use getShare for public shared projects - works without authentication
      projects.getShare(encoded)
        .then((result) => {
          const project = result?.project;
          if (!project) throw new Error('Project not found');

          const upload = project.upload;
          const uploadData = upload ? {
            id: upload.id,
            source: upload.source,
            uploadUrl: upload.uploadUrl,
            fileName: upload.fileName,
            title: upload.title,
            duration: upload.duration,
          } : null;

          restoreProject({
            lines: sectionsToFlat(project.lyrics?.sections || []),
            editorMode: project.lyrics?.editorMode || 'lrc',
            ytUrl: upload?.source === 'youtube' ? upload?.uploadUrl : '',
            cloudinaryUpload: upload?.source === 'cloudinary' ? uploadData : null,
            syncMode: project.state?.syncMode ?? true,
            activeLineIndex: project.state?.activeLineIndex || 0,
            playbackPosition: project.state?.playbackPosition || 0,
            playbackSpeed: project.state?.playbackSpeed || 1,
            readOnly: project.readOnly !== false,
          });
        })
        .catch(() => decompressFromBase64(encoded)
          .then((text) => { const raw = JSON.parse(text as string); restoreProject(raw.v === 1 ? expandSharePayload(raw) : raw); })
          .catch((err) => console.error('Failed to decode shared project URL', err)))
        .finally(() => setIsProjectLoading(false));
    } else {
      decompressFromBase64(encoded)
        .then((text) => { const raw = JSON.parse(text as string); restoreProject(raw.v === 1 ? expandSharePayload(raw) : raw); })
        .catch((err) => console.error('Failed to decode shared project URL', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cleanup on tab close ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isSharedProject) return;
    const cleanup = () => localStorage.removeItem(STORAGE_KEYS.SHARED_PROJECT);
    window.addEventListener('beforeunload', cleanup);
    return () => window.removeEventListener('beforeunload', cleanup);
  }, [isSharedProject]);

  // ── Fork guard ────────────────────────────────────────────────────────────
  const forkFromShared = useCallback(() => {
    isSharedProjectRef.current = false;
    setIsSharedProject(false);
    localStorage.removeItem(STORAGE_KEYS.SHARED_PROJECT);
  }, []);

  const setLinesGuarded = useCallback((updater) => {
    if (isSharedProjectRef.current && sharedReadOnlyRef.current) return;
    if (isSharedProjectRef.current && !sharedReadOnlyRef.current) forkFromShared();
    setLines(updater);
  }, [setLines, forkFromShared]);

  // ── Export to shareable URL ───────────────────────────────────────────────
  const exportToUrl = useCallback(async () => {
    // If we already have a share link, show it immediately while we update in the background
    if (lastShareData) {
      setShareModalState(lastShareData);
    } else {
      setShareModalState({ loading: 'media' });
    }

    try {
      let sharedId = activepublicIdRef.current;
      let uploadIdToSave: string | null = null;

      // Get the effective upload - check current state first, then fall back to restored
      const effectiveUpload = uploadedAudio
        || (restoredMedia?.type === 'cloudinary' ? {
          id: restoredMedia.id,
          uploadUrl: restoredMedia.url,
          publicId: restoredMedia.publicId,
          fileName: restoredMedia.fileName,
          duration: restoredMedia.duration,
        } : null);
      const effectiveYtUrl = projectYtUrl || (restoredMedia?.type === 'youtube' ? restoredMedia.url : '');

      // Only persist upload records to the database for authenticated users.
      // Guests cannot own DB records and the project creation below also requires auth.
      if (getAccessToken()) {
        if (effectiveUpload?.id) {
          uploadIdToSave = effectiveUpload.id;
        } else if (effectiveUpload) {
          try {
            const { upload } = await uploads.saveMedia({
              source: 'cloudinary',
              uploadUrl: effectiveUpload.uploadUrl,
              publicId: effectiveUpload.publicId,
              fileName: effectiveUpload.fileName,
              title: effectiveUpload.fileName?.replace(/\.[^/.]+$/, '') || '',
              duration: effectiveUpload.duration,
            });
            uploadIdToSave = upload.id;
          } catch (err) {
            console.error(err);
          }
        } else if (effectiveYtUrl) {
          try {
            const { upload } = await uploads.saveMedia({
              source: 'youtube',
              uploadUrl: effectiveYtUrl,
              fileName: '',
              title: undefined,
              duration: duration || null,
            });
            uploadIdToSave = upload.id;
          } catch (err) {
            console.error(err);
          }
        }
      }

      const projectData = {
        title: mediaTitle || '',
        metadata: projectMetadata,
        lyrics: { editorMode, sections: flatToSections(lines.map((l) => ({ ...l, id: undefined }))) },
        state: { syncMode, activeLineIndex: 0, playbackPosition: 0, playbackSpeed: 1 },
        public: true,
      };
      if (uploadIdToSave) (projectData as { uploadId?: string }).uploadId = uploadIdToSave;

      if (sharedId) {
        if (!lastShareData) setShareModalState({ loading: 'saving' });
        try { await projects.update(sharedId, projectData); }
        catch (err) { console.error(err); sharedId = null; }
      }
      if (!sharedId) {
        if (!lastShareData) setShareModalState({ loading: 'recaptcha' });
        const recaptchaToken = executeRecaptcha ? await executeRecaptcha('share_project') : undefined;
        if (!lastShareData) setShareModalState({ loading: 'creating' });
        const result = await projects.create({ ...projectData, recaptchaToken });
        sharedId = result.publicId;
        setActivepublicId(sharedId);
        activepublicIdRef.current = sharedId;
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, sharedId);
      }

      const finalData = {
        url: `${window.location.origin}/share/${sharedId}`,
        ytUrl: projectYtUrl,
        uploadedAudio,
        mediaSource: uploadedAudio ? 'cloudinary' : (projectYtUrl ? 'youtube' : 'none'),
        linesCount: lines.length,
        hasSynced: lines.some((l) => l.timestamp != null),
        readOnly: true,
      };
      setLastShareData(finalData);
      setShareModalState(finalData);
    } catch {
      setShareModalState(null);
      toast.error(t('project.shareFailed') || 'Could not generate share link.');
    }
  }, [lines, editorMode, projectYtUrl, syncMode, mediaTitle, uploadedAudio, duration, t, projectMetadata, activepublicIdRef, setActivepublicId, setShareModalState, executeRecaptcha, lastShareData, restoredMedia]);

  return {
    isSharedProject, setIsSharedProject,
    sharedReadOnly, setSharedReadOnly,
    shareModal, setShareModal: setShareModalState,
    isSharedProjectRef, sharedReadOnlyRef,
    setLinesGuarded, forkFromShared, exportToUrl,
  };
}
