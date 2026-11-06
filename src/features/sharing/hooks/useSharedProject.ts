import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { projects } from '@/app/api';
import { sectionsToFlat } from '@/features/editor/utils/sections';
import { useSettings } from '@/features/settings/useSettings';
import { STORAGE_KEYS } from '@/features/projects/services/storage.service';
import { useProjectSocket } from './useProjectSocket';
import { uploadToRestoredMedia } from '@/shared/utils/media-hydration';
import { sanitizeLines } from '@/shared/utils/sanitize-lines';

// Legacy URL-encoded share fallbacks
async function decompressFromBase64(str) {
  const { decompress } = await import('fflate');
  const bytes = Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
  return new Promise((res, rej) => decompress(bytes, (err, data) => err ? rej(err) : res(new TextDecoder().decode(data))));
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
  setShareModal,
  activepublicIdRef,
  lines,
  projectYtUrl,
  uploadedAudio,
}) {
  const { t } = useTranslation();
  const { updateSetting } = useSettings();

  const [isSharedProject, setIsSharedProject] = useState(false);
  const [sharedReadOnly, setSharedReadOnly] = useState(true);
  const [shareModal, _setShareModal] = useState<unknown>(null);
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
          .then((text) => { const raw = JSON.parse(text as string); restoreProject(raw); })
          .catch((err) => console.error('Failed to decode shared project URL', err)))
        .finally(() => setIsProjectLoading(false));
    } else {
      decompressFromBase64(encoded)
        .then((text) => { const raw = JSON.parse(text as string); restoreProject(raw); })
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

  // ── Show the share link ───────────────────────────────────────────────────
  // Never publishes and never saves: making a project public is PublishDialog's job (see
  // useShareFlow). This only presents the link of a project that is already public.
  const exportToUrl = useCallback(() => {
    const sharedId = activepublicIdRef.current;
    if (!sharedId || sharedId === 'local' || sharedId === 'new') {
      toast.error(t('project.publishNeedsSave'));
      return;
    }
    setShareModalState({
      url: `${window.location.origin}/share/${sharedId}`,
      ytUrl: projectYtUrl,
      uploadedAudio,
      mediaSource: uploadedAudio ? 'cloudinary' : (projectYtUrl ? 'youtube' : 'none'),
      linesCount: lines.length,
      hasSynced: lines.some((l) => l.timestamp != null),
      readOnly: true,
    });
  }, [lines, projectYtUrl, uploadedAudio, t, activepublicIdRef, setShareModalState]);

  return {
    isSharedProject, setIsSharedProject,
    sharedReadOnly, setSharedReadOnly,
    shareModal, setShareModal: setShareModalState,
    isSharedProjectRef, sharedReadOnlyRef,
    setLinesGuarded, forkFromShared, exportToUrl,
  };
}
