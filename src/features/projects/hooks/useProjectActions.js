import { useCallback } from 'react';
import { projects, uploads, getAccessToken } from '@/app/api';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { updateServerSnapshot } from '@/features/editor/hooks/useManualSave';
import { sectionsToFlat, flatToSections } from '@/features/editor/utils/sections';
import { STORAGE_KEYS } from '@/features/projects/services/storage.service';
import { uploadToRestoredMedia } from '@/shared/utils/media-hydration';

function sanitizeLines(raw) {
  return (raw || []).flatMap((l) => {
    if (!(l && typeof l === 'object')) return [];
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
      words: Array.isArray(l.words)
        ? l.words.flatMap((w) => {
            const word = typeof w.word === 'string' ? w.word : '';
            return word ? [{ word, time: typeof w.time === 'number' && isFinite(w.time) ? w.time : null, ...(w.singerIndex != null ? { singerIndex: w.singerIndex } : {}), ...(typeof w.reading === 'string' && w.reading ? { reading: w.reading } : {}) }] : [];
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
 * CRUD-level project actions: load, restore, discard, reset, and media handlers.
 */
export function useProjectActions({
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
  setActiveProjectId,
  setCloudinaryAudio,
  setHasMedia,
  setPlaybackPosition,
  setDuration,
  setIsProjectLoading,
  setPendingProject,
  setForkedFrom,
  activeProjectId,
  activeProjectIdRef,
  lastServerSnapshotRef,
  sessionUploadIdRef,
  pendingProject,
  setProjectSpotifyTrackId,
  setProjectCoverImage,
  mediaTitle,
  projectMetadata,
  duration,
  t,
  toast,
  requestConfirm,
  isCreatingProjectRef,
  setProjectUserId,
}) {
  const { executeRecaptcha } = useGoogleReCaptcha();
  // ── Load a project from the library ──────────────────────────────────────
  const loadProject = useCallback(async (projectId) => {
    setIsProjectLoading(true);
    setProjectUserId?.(null);
    try {
      const { project } = await projects.get(projectId);
      if (!project) throw new Error('Project not found');
      // Server returns sections[]; convert to flat for editor state.
      // Assign fresh IDs so React keys are stable per session.
      const rawFlat = sectionsToFlat(project?.lyrics?.sections || []);
      const projectLines = sanitizeLines(rawFlat);
      // Always restore all project state
      setLines(projectLines);
      setSyncMode(project.state?.syncMode ?? true);
      setActiveLineIndex(project.state?.activeLineIndex || 0);
      setEditorModeRaw(project.lyrics?.editorMode || 'lrc');
      // Always restore media
      setRestoredMedia(uploadToRestoredMedia(project.upload));
      if (project.upload?.source === 'youtube' && project.upload?.youtubeUrl) {
        setProjectYtUrl?.(project.upload.youtubeUrl);
      } else if (project.upload?.source === 'cloudinary') {
        setCloudinaryAudio?.(project.upload);
      } else if (project.upload?.source === 'spotify' && project.upload?.spotifyTrackId) {
        setProjectSpotifyTrackId?.(project.upload.spotifyTrackId);
      }
      if (project.upload?.id) {
        sessionUploadIdRef.current = project.upload.id;
      } else {
        sessionUploadIdRef.current = null;
      }
      if (project.state?.playbackPosition) setRestoredPosition(project.state.playbackPosition);
      if (project.state?.playbackSpeed) setRestoredSpeed(project.state.playbackSpeed);
      if (project.title) setMediaTitle(project.title);
      setProjectMetadata?.(project.metadata || {});
      setProjectCoverImage?.(project.coverImage || '');
      setForkedFrom(project.forkedFrom || null);
      setActiveProjectId(projectId);
      activeProjectIdRef.current = projectId;
      setProjectUserId?.(project.user?.id ?? null);
      updateServerSnapshot(lastServerSnapshotRef, {
        title: project.title || '',
        metadata: project.metadata || { description: '', tags: [] },
        state: { syncMode: project.state?.syncMode ?? true, activeLineIndex: project.state?.activeLineIndex || 0, playbackPosition: project.state?.playbackPosition || 0, playbackSpeed: project.state?.playbackSpeed || 1, saveTime: project.state?.saveTime || null, timezone: project.state?.timezone || null, utcOffset: project.state?.utcOffset || null },
        editorMode: project.lyrics?.editorMode || 'lrc',
        lines: projectLines,
        uploadId: project.upload?.id,
      });
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, projectId);
      localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify({ 
        lines: projectLines, 
        syncMode: true, 
        activeLineIndex: project.state?.activeLineIndex || 0, 
        editorMode: project.lyrics?.editorMode || 'lrc', 
        ytUrl: project.upload?.youtubeUrl || '', 
        cloudinaryAudio: project.upload?.source === 'cloudinary' ? project.upload : null,
        spotifyTrackId: project.upload?.source === 'spotify' ? project.upload?.spotifyTrackId : '',
        playbackPosition: project.state?.playbackPosition || 0, 
        playbackSpeed: project.state?.playbackSpeed || 1, 
        title: project.title || '', 
        metadata: project.metadata || {}, 
        projectId 
      }));
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setIsProjectLoading(false);
    }
  }, [setLines, setSyncMode, setActiveLineIndex, setEditorModeRaw, setMediaTitle, setForkedFrom, setRestoredMedia, setRestoredPosition, setRestoredSpeed, setActiveProjectId, activeProjectIdRef, lastServerSnapshotRef, sessionUploadIdRef, setIsProjectLoading, setProjectSpotifyTrackId, setProjectMetadata, setProjectYtUrl, setCloudinaryAudio, setProjectCoverImage, setProjectUserId]);

  // ── Restore pending (localStorage) project ────────────────────────────────
  const handleRestoreProject = useCallback(() => {
    if (!pendingProject || isCreatingProjectRef.current) return;
    const validLines = sanitizeLines(pendingProject.lines);
    if (!validLines.length) { setPendingProject(null); return; }

    isCreatingProjectRef.current = true;
    setLines(validLines);
    setForkedFrom(pendingProject.forkedFrom || null);
    setSyncMode(true);
    const idx = pendingProject.activeLineIndex;
    if (typeof idx === 'number' && idx >= 0 && idx < validLines.length) setActiveLineIndex(idx);
    const restoredMode = pendingProject.editorMode || (validLines.some((l) => l.endTime != null) ? 'srt' : 'lrc');
    setEditorModeRaw(restoredMode);
    if (pendingProject.title) setMediaTitle(pendingProject.title);
    if (pendingProject.metadata) setProjectMetadata(pendingProject.metadata);
    if (pendingProject.ytUrl) {
      setProjectYtUrl(pendingProject.ytUrl);
      setRestoredMedia({ type: 'youtube', url: pendingProject.ytUrl });
    } else if (pendingProject.cloudinaryAudio?.cloudinaryUrl) {
      const ca = pendingProject.cloudinaryAudio;
      setCloudinaryAudio(ca);
      setRestoredMedia({
        type: 'cloudinary',
        id: ca.id,
        url: ca.cloudinaryUrl,
        fileName: ca.fileName ?? null,
        title: null,
        duration: ca.duration ?? null,
        publicId: ca.publicId ?? null,
      });
    } else if (pendingProject.spotifyTrackId) {
      setRestoredMedia({
        type: 'spotify',
        id: pendingProject.spotifyTrackId,
        trackId: pendingProject.spotifyTrackId,
        title: pendingProject.title || '',
      });
    }
    if (pendingProject.spotifyTrackId) setProjectSpotifyTrackId(pendingProject.spotifyTrackId);
    if (typeof pendingProject.playbackPosition === 'number') setRestoredPosition(pendingProject.playbackPosition);
    if (typeof pendingProject.playbackSpeed === 'number') setRestoredSpeed(pendingProject.playbackSpeed);

    if (getAccessToken()) {
      const persist = async () => {
        setIsProjectLoading(true);
        try {
          let uploadIdToSave = null;

          // ── Try to create an Upload record for whatever media the guest had ──
          if (pendingProject.ytUrl) {
            try {
              const { upload } = await uploads.saveMedia({
                source: 'youtube',
                youtubeUrl: pendingProject.ytUrl,
                fileName: '',
                title: mediaTitle || pendingProject.title || '',
                duration: duration || null,
              });
              if (upload?.id) {
                uploadIdToSave = upload.id;
                sessionUploadIdRef.current = upload.id;
              }
            } catch (err) { console.error('[Restore] YouTube upload save failed:', err); }
          } else if (pendingProject.cloudinaryAudio?.cloudinaryUrl) {
            // Cloudinary: guest may have a URL from a previous session or from a local upload
            // that now needs to be persisted as a real Upload record
            const ca = pendingProject.cloudinaryAudio;
            if (ca.id && !String(ca.id).startsWith('local:')) {
              // Already has a real DB id from a previous authenticated save
              uploadIdToSave = ca.id;
              sessionUploadIdRef.current = ca.id;
            } else {
              try {
                const { upload } = await uploads.saveMedia({
                  source: 'cloudinary',
                  cloudinaryUrl: ca.cloudinaryUrl,
                  publicId: ca.publicId || null,
                  fileName: ca.fileName || '',
                  title: ca.fileName?.replace(/\.[^/.]+$/, '') || mediaTitle || pendingProject.title || '',
                  duration: ca.duration || duration || null,
                });
                if (upload?.id) {
                  uploadIdToSave = upload.id;
                  sessionUploadIdRef.current = upload.id;
                }
              } catch (err) { console.error('[Restore] Cloudinary upload save failed:', err); }
            }
          } else if (pendingProject.spotifyTrackId) {
            try {
              const { upload } = await uploads.saveMedia({
                source: 'spotify',
                spotifyTrackId: pendingProject.spotifyTrackId,
                fileName: '',
                title: mediaTitle || pendingProject.title || '',
                duration: duration || null,
              });
              if (upload?.id) {
                uploadIdToSave = upload.id;
                sessionUploadIdRef.current = upload.id;
              }
            } catch (err) { console.error('[Restore] Spotify upload save failed:', err); }
          }
          const serverPayload = {
            title: pendingProject.title || mediaTitle || '',
            metadata: pendingProject.metadata || projectMetadata,
            lyrics: { editorMode: restoredMode, sections: flatToSections(validLines) },
            state: { 
              syncMode: true, 
              activeLineIndex: idx || 0, 
              playbackPosition: pendingProject.playbackPosition || 0, 
              playbackSpeed: pendingProject.playbackSpeed || 1 
            }, 
            readOnly: false,
            forkedFrom: pendingProject.forkedFrom || undefined
          };
          if (uploadIdToSave) serverPayload.uploadId = uploadIdToSave;

          const existingId = activeProjectId || pendingProject.projectId || activeProjectIdRef.current;
          if (existingId) {
            try {
              await projects.update(existingId, serverPayload);
              if (!activeProjectId) { 
                setActiveProjectId(existingId); 
                activeProjectIdRef.current = existingId; 
                localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, existingId);
              }
              return;
            } catch { /* fall through to create */ }
          }
          
          const recaptchaToken = executeRecaptcha ? await executeRecaptcha('restore_project') : undefined;
          const res = await projects.create({ ...serverPayload, recaptchaToken });
          setActiveProjectId(res.projectId);
          activeProjectIdRef.current = res.projectId;
          localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT_ID, res.projectId);
        } catch (err) {
          console.error('[Restore] Project persistence failed:', err);
        } finally {
          isCreatingProjectRef.current = false;
          setIsProjectLoading(false);
          setPendingProject(null);
        }
      };
      persist();
    } else {
      isCreatingProjectRef.current = false;
      setPendingProject(null);
    }
  }, [pendingProject, setPendingProject, setLines, setForkedFrom, setSyncMode, setActiveLineIndex, setEditorModeRaw, setRestoredMedia, setRestoredPosition, setRestoredSpeed, setIsProjectLoading, activeProjectId, activeProjectIdRef, setActiveProjectId, sessionUploadIdRef, mediaTitle, projectMetadata, duration, executeRecaptcha, isCreatingProjectRef, setProjectSpotifyTrackId, setMediaTitle, setProjectMetadata, setProjectYtUrl, setCloudinaryAudio]);

  // ── Discard pending project ───────────────────────────────────────────────
  const handleDiscardProject = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.PROJECT);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
    setActiveProjectId(null);
    setPendingProject(null);
  }, [setActiveProjectId, setPendingProject]);

  // ── Remove all lyrics ─────────────────────────────────────────────────────
  const handleRemoveAllLyrics = useCallback(() => {
    requestConfirm(t('confirm.removeLyrics') || 'Are you sure you want to remove all lyrics?', () => {
      setLines([]);
      setActiveLineIndex(0);
      toast.success(t('editor.toast.allRemoved') || 'All lyrics removed');
    }, { title: t('confirm.removeLyricsTitle') || 'Remove Lyrics', variant: 'danger' });
  }, [setLines, setActiveLineIndex, requestConfirm, t, toast]);

  // ── Reset full app state ──────────────────────────────────────────────────
  const resetAppState = useCallback(() => {
    setLines([]);
    setSyncMode(false);
    setActiveLineIndex(0);
    setMediaTitle('');
    setProjectMetadata({ description: '', tags: [] });
    setForkedFrom(null);
    setProjectYtUrl('');
    setRestoredMedia(null);
    setRestoredPosition(0);
    setRestoredSpeed(1);
    setActiveProjectId(null);
    activeProjectIdRef.current = null;
    setCloudinaryAudio(null);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROJECT_ID);
    localStorage.removeItem(STORAGE_KEYS.PROJECT);
    localStorage.removeItem(STORAGE_KEYS.SHARED_PROJECT);
    lastServerSnapshotRef.current = null;
    sessionUploadIdRef.current = null;
  }, [setLines, setSyncMode, setActiveLineIndex, setMediaTitle, setProjectMetadata, setForkedFrom, setProjectYtUrl, setRestoredMedia, setRestoredPosition, setRestoredSpeed, setActiveProjectId, activeProjectIdRef, setCloudinaryAudio, lastServerSnapshotRef, sessionUploadIdRef]);

  // ── Media change handlers ─────────────────────────────────────────────────
  const handleMediaChange = useCallback((loaded) => {
    setHasMedia(loaded);
    if (!loaded) {
      setPlaybackPosition(0);
      setDuration(0);
      setMediaTitle('');
      setCloudinaryAudio(null);
      sessionUploadIdRef.current = null;
    }
  }, [setHasMedia, setPlaybackPosition, setDuration, setMediaTitle, setCloudinaryAudio, sessionUploadIdRef]);

  const handleDurationChange = useCallback((d) => {
    setDuration(d);
    setCloudinaryAudio((prev) => {
      if (prev && (prev.duration === null || prev.duration === undefined)) return { ...prev, duration: d };
      return prev;
    });
  }, [setDuration, setCloudinaryAudio]);

  return {
    loadProject,
    handleRestoreProject,
    handleDiscardProject,
    handleRemoveAllLyrics,
    resetAppState,
    handleMediaChange,
    handleDurationChange,
  };
}
