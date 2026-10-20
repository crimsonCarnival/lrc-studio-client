import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { uploads as uploadsApi, getAccessToken } from '@/app/api';
import { useYouTubeAvailability } from '@/features/player/hooks/useYouTubeAvailability';
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';

const CDN_PATTERN = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\//;
const AUDIO_URL_PATTERN = /^https?:\/\/.+\.(mp3|mp4|wav|ogg|flac|aac|m4a|webm)(\?.*)?$/i;
const YT_PATTERN = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|watch\?.+&v=)|youtu\.be\/)([^&?/\s]{11})/;

export interface UploadItem {
  id?: string;
  title?: string;
  fileName?: string;
  source?: string;
  uploadUrl?: string;
  duration?: number | null;
  publicId?: string | null;
}

export interface AudioState {
  ready: boolean;
  name: string;
  tab: string;
  source: string | null;
  ytUrl: string;
  selectedUpload: UploadItem | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlayerRef = { current?: any } | null;

interface UseSetupMediaParams {
  playerRef: PlayerRef;
  /** Drives the media-library fetch; a session still restoring on mount loads it once sign-in lands. */
  userId?: string;
  /** Called when an upload is preselected from elsewhere, so the screen can reveal the media panel. */
  onPreselectUpload: () => void;
}

/**
 * Everything that decides what the player is holding: the audio state, the user's media
 * library, URL parsing, the YouTube availability gate, and the two ways an upload can
 * arrive preselected from outside this screen.
 *
 * Split out of SetupScreen, which had three unrelated state groups (audio, lyrics,
 * metadata) and ~50 hooks in a single function body. This is the group that owns its own
 * state rather than sharing the metadata form's, which is what makes it separable at all —
 * the lyrics and metadata clusters are woven through the same form state and were left in
 * place. SetupScreen.test.tsx covers these paths end-to-end through the rendered screen.
 */
export function useSetupMedia({ playerRef, userId, onPreselectUpload }: UseSetupMediaParams) {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const autoLoadPendingRef = useRef(false);

  const [initialPendingYtUrl] = useState(() => sessionStorage.getItem('pendingYtUrl'));

  const [audio, setAudio] = useState<AudioState>(() => ({
    ready: false,
    name: '',
    tab: 'youtube',
    source: null,
    ytUrl: initialPendingYtUrl || '',
    selectedUpload: null,
  }));

  const setAudioState = useCallback(
    (val: Partial<AudioState> | ((p: AudioState) => Partial<AudioState>)) =>
      setAudio(prev => ({ ...prev, ...(typeof val === 'function' ? val(prev) : val) })),
    [],
  );

  const { ytUrl, selectedUpload } = audio;

  // ── Media library ──

  const [mediaUploads, setMediaUploads] = useState<UploadItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(!!getAccessToken());
  const [uploadsFilter, setUploadsFilter] = useState('');
  const filteredUploads = useMemo(() => {
    const q = uploadsFilter.trim().toLowerCase();
    if (!q) return mediaUploads;
    return mediaUploads.filter((u) => `${u.title ?? ''} ${u.fileName ?? ''}`.toLowerCase().includes(q));
  }, [mediaUploads, uploadsFilter]);

  useEffect(() => {
    if (!userId || !getAccessToken()) return;
    let cancelled = false;
    uploadsApi.listMedia()
      .then((uploads) => { if (!cancelled) setMediaUploads((uploads as UploadItem[]) || []); })
      .catch(() => { })
      .finally(() => { if (!cancelled) setMediaLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (initialPendingYtUrl) {
      autoLoadPendingRef.current = true;
      sessionStorage.removeItem('pendingYtUrl');
      sessionStorage.removeItem('pendingYtTitle');
    }
  }, [initialPendingYtUrl]);

  const saveUploadRecord = useCallback(async (data: Record<string, unknown>) => {
    if (!getAccessToken()) return;
    try {
      await uploadsApi.saveMedia(data as Parameters<typeof uploadsApi.saveMedia>[0]);
      const uploads = await uploadsApi.listMedia();
      setMediaUploads((uploads as UploadItem[]) || []);
    } catch { /* ignore */ }
  }, []);

  // ── URL / pattern helpers ──

  const detectedUrlType = (() => {
    const v = ytUrl.trim().split(/\s+/)[0];
    if (!v) return 'none';
    if (CDN_PATTERN.test(v) || AUDIO_URL_PATTERN.test(v)) return 'cdn';
    if (YT_PATTERN.test(v) || v.length === 11) return 'youtube';
    return 'unknown';
  })();

  // ── YouTube availability ──
  // The editor plays through the IFrame API, so private / removed / non-embeddable
  // videos are unusable: verify before marking the audio ready (which gates Continue).
  const { check: ytCheck, verify: verifyYouTube, reset: clearYtCheck } = useYouTubeAvailability();
  const ytLoading = ytCheck.state === 'checking';

  const loadYouTubeVerified = useCallback(async (videoId: string, url: string, onReady: Partial<AudioState>) => {
    if (await verifyYouTube(videoId) !== 'playable') return; // blocked, or superseded by a newer selection
    playerRef?.current?.loadYouTube?.(url);
    setAudioState({ ready: true, source: 'youtube', selectedUpload: null, ...onReady });
  }, [verifyYouTube, playerRef, setAudioState]);

  // ── Audio handlers ──

  const handleAudioFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      toast.error(t('setup.invalidAudioType'));
      if (audioInputRef.current) audioInputRef.current.value = '';
      return;
    }
    if (playerRef?.current?.loadLocalAudio) playerRef.current.loadLocalAudio(file);
    setAudioState({ ready: true, name: file.name, source: 'local', selectedUpload: null });
  };

  const handleLoadUrl = useCallback(async () => {
    const trimmed = ytUrl.trim().split(/\s+/)[0];
    if (!trimmed) return;

    if (detectedUrlType === 'cdn') {
      const pathOnly = trimmed.split('?')[0].split('#')[0];
      const lastSegment = pathOnly.split('/').pop() || 'audio';
      const dotIdx = lastSegment.lastIndexOf('.');
      const rawName = dotIdx > 0 ? lastSegment.slice(0, dotIdx) : lastSegment;
      const ext = dotIdx > 0 ? lastSegment.slice(dotIdx + 1).toLowerCase() : 'mp4';
      const title = rawName.length > 30 ? 'Cloud Audio' : rawName;
      if (playerRef?.current?.loadFromUrl) playerRef.current.loadFromUrl(trimmed, title);
      setAudioState({ ready: true, name: title, source: 'cloud', selectedUpload: null });
      saveUploadRecord({ source: 'cloudinary', uploadUrl: trimmed, fileName: `${rawName}.${ext}`, title });
      return;
    }

    const videoId = trimmed.match(YT_PATTERN)?.[1] || (trimmed.length === 11 ? trimmed : null);
    if (!videoId) { toast.error(t('player.invalidUrl')); return; }

    loadYouTubeVerified(videoId, trimmed, { name: t('setup.youtubeVideo'), ytUrl: '' });
  }, [ytUrl, detectedUrlType, playerRef, setAudioState, saveUploadRecord, loadYouTubeVerified, t]);

  const handleLoadUrlRef = useRef(handleLoadUrl);
  useLayoutEffect(() => { handleLoadUrlRef.current = handleLoadUrl; });

  useEffect(() => {
    if (autoLoadPendingRef.current && ytUrl) {
      autoLoadPendingRef.current = false;
      const timer = setTimeout(() => handleLoadUrlRef.current(), 0);
      return () => clearTimeout(timer);
    }
  }, [ytUrl]);

  const handleSelectUpload = (upload: UploadItem) => {
    clearYtCheck();
    setAudioState({
      selectedUpload: upload,
      name: upload.title || upload.fileName || 'Media',
      ready: true,
      source: upload.source === 'youtube' ? 'youtube' : 'cloud',
    });

    if (upload.source === 'youtube' && upload.uploadUrl) {
      setAudioState({ ytUrl: upload.uploadUrl });
      playerRef?.current?.loadYouTube?.(upload.uploadUrl);
    } else if (upload.source === 'cloudinary' && upload.uploadUrl) {
      playerRef?.current?.loadFromUrl?.(upload.uploadUrl, upload.title || upload.fileName);
    }
  };

  const handleSelectUploadRef = useRef(handleSelectUpload);
  useLayoutEffect(() => { handleSelectUploadRef.current = handleSelectUpload; });

  // Arriving from the uploads library ("Create project"): preselect that upload.
  // `?uploadId=` is the carrier — history state does not survive the app's
  // state reset on entering this route, nor a reload of the setup page.
  const requestedUploadId = searchParams.get('uploadId')
    || (location.state as { uploadId?: string } | null)?.uploadId
    || null;
  const requestedUploadAppliedRef = useRef(false);
  useEffect(() => {
    // Waits for the media list to settle: the by-id fetch below is the fallback
    // for an upload outside the 50 most recent, not a race against the list.
    if (!requestedUploadId || requestedUploadAppliedRef.current || mediaLoading || !userId) return;
    requestedUploadAppliedRef.current = true;
    const apply = (upload: UploadItem) => {
      onPreselectUpload();
      setAudioState({ tab: 'library' });
      handleSelectUploadRef.current(upload);
    };
    const listed = mediaUploads.find((u) => u.id === requestedUploadId);
    if (listed) { apply(listed); return; }
    uploadsApi.getMedia(requestedUploadId)
      .then(({ upload }) => {
        if (!upload) { toast.error(t('setup.uploadNotFound')); return; }
        setMediaUploads((prev) => (prev.some((u) => u.id === upload.id) ? prev : [upload as UploadItem, ...prev]));
        apply(upload as UploadItem);
      })
      .catch(() => toast.error(t('setup.uploadNotFound')));
  }, [requestedUploadId, mediaUploads, mediaLoading, userId, setAudioState, onPreselectUpload, t]);

  const handleDeleteUpload = async (uploadId: string) => {
    try {
      await uploadsApi.deleteMedia(uploadId);
      setMediaUploads((prev) => prev.filter((u) => u.id !== uploadId));
      if (selectedUpload?.id === uploadId) { setAudioState({ ready: false, name: '', selectedUpload: null, source: null }); }
    } catch { toast.error(t('setup.deleteFailed')); }
  };

  const handleYtKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleLoadUrlRef.current(); }
  };

  return {
    audio,
    setAudioState,
    audioInputRef: audioInputRef as RefObject<HTMLInputElement | null>,
    mediaUploads,
    mediaLoading,
    filteredUploads,
    uploadsFilter,
    setUploadsFilter,
    saveUploadRecord,
    detectedUrlType,
    ytCheck,
    ytLoading,
    clearYtCheck,
    loadYouTubeVerified,
    handleAudioFile,
    handleLoadUrl,
    handleSelectUpload,
    handleDeleteUpload,
    handleYtKeyDown,
  };
}
