import { useState, useCallback, useMemo, useRef, useImperativeHandle, useEffect, useLayoutEffect, memo } from 'react';
import type { ChangeEvent, Ref, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/features/settings/useSettings';
import useHapticFeedback from '@/shared/hooks/useHapticFeedback';

import { matchKey } from '@/shared/utils/keyboard';
import useLocalAudio from './hooks/useLocalAudio';
import useYouTubePlayer from './hooks/useYouTubePlayer';
import { PlayerContext } from './PlayerContext';
import type { UploadItem } from './PlayerContext';
import type { EditorLine } from '@/features/editor/services/editor.service';
import { uploads as uploadsApi, getAccessToken } from '@/app/api';
import toast from 'react-hot-toast';

const ALL_SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5];

// CDN URL handling
const CDN_PATTERN = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\//;
const AUDIO_URL_PATTERN = /^https?:\/\/.+\.(mp3|mp4|wav|ogg|flac|aac|m4a|webm)(\?.*)?$/i;
const YT_PATTERN = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|watch\?.+&v=)|youtu\.be\/)([^&?/\s]{11})/;

interface Loop {
  a: number | null;
  b: number | null;
}

export interface PlayerHandle {
  getCurrentTime: () => number;
  isPlaying: () => boolean;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  adjustSpeed: (delta: number) => void;
  getSpeed: () => number;
  seek: (time: number) => void;
  getAudioBlob: () => Blob | null;
  loadLocalAudio: (file: File) => void;
  loadYouTube: (url?: string) => void;
  loadFromUrl: (url: string, title?: string) => void;
  setLoop: (a: number | null, b: number | null) => void;
  clearLoop: () => void;
  getLoop: () => Loop;
}

interface InitialMedia {
  type: string;
  url?: string;
  id?: string;
  title?: string;
  fileName?: string;
  publicId?: string | null;
  duration?: number | null;
}

export interface PlayerEngineProps {
  onTimeUpdate?: (t: number) => void;
  onPlayingChange?: (p: boolean) => void;
  onSpeedChange?: (s: number) => void;
  onDurationChange?: (d: number) => void;
  onMediaChange?: (m: unknown) => void;
  playerRef?: Ref<PlayerHandle> | null;
  mediaTitle?: string;
  onTitleChange?: (title: string) => void;
  initialMedia?: InitialMedia | null;
  onYtUrlChange?: (url: string) => void;
  initialSeek?: number;
  initialSpeed?: number | string;
  lines?: EditorLine[];
  activeLineIndex?: number;
  playbackPosition?: number;
  syncMode?: boolean;
  onMediaUpload?: (u: unknown) => void;
  viewerMode?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  projectMetadata?: any;
  projectCoverImage?: string;
  ref?: Ref<PlayerHandle>;
  children?: React.ReactNode;
}

function PlayerEngineInner(
  { onTimeUpdate, onPlayingChange, onSpeedChange, onDurationChange, onMediaChange, playerRef: _legacyRef = null, mediaTitle, onTitleChange, initialMedia, onYtUrlChange, initialSeek = 0, initialSpeed, lines, activeLineIndex = 0, playbackPosition, syncMode = false, onMediaUpload, viewerMode = false, projectMetadata, projectCoverImage, ref, children }: PlayerEngineProps,
) {
  const { t } = useTranslation();
  const { settings, updateSetting } = useSettings();
  const haptic = useHapticFeedback();

  const MIN_SPEED = settings.playback?.speedBounds?.min ?? 0.25;
  const MAX_SPEED = settings.playback?.speedBounds?.max ?? 3;
  const SPEED_PRESETS = useMemo(
    () =>
      // An empty/missing saved preset array must fall back to defaults — `[] || ALL`
      // would keep the empty array (arrays are truthy), leaving only the custom input.
      (settings.playback?.speedPresets?.length ? settings.playback.speedPresets : ALL_SPEED_PRESETS).filter(
        (s: number) => s >= MIN_SPEED && s <= MAX_SPEED,
      ),
    [MIN_SPEED, MAX_SPEED, settings.playback?.speedPresets],
  );

  const [source, setSource] = useState('local');
  const [playbackSpeed, setPlaybackSpeedRaw] = useState(() => {
    const s = parseFloat(String(initialSpeed ?? ''));
    return (isFinite(s) && s > 0) ? s : 1;
  });

  const setPlaybackSpeed = useCallback((s: number) => {
    setPlaybackSpeedRaw(s);
    onSpeedChange?.(s);
  }, [onSpeedChange]);

  const [isPlaying, setIsPlayingRaw] = useState(false);
  const setIsPlaying = useCallback((p: boolean) => {
    setIsPlayingRaw(p);
    onPlayingChange?.(p);
  }, [onPlayingChange]);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mediaUploads, setMediaUploads] = useState<UploadItem[]>([]);

  // A-B Loop state
  const [loop, setLoop] = useState<Loop>({ a: null, b: null });
  const loopA = loop.a;
  const loopB = loop.b;
  const loopARef = useRef<number | null>(null);
  const loopBRef = useRef<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const localBlobRef = useRef<Blob | null>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);

  const sourceRef = useRef(source);

  useLayoutEffect(() => { loopARef.current = loopA; });
  useLayoutEffect(() => { loopBRef.current = loopB; });
  useLayoutEffect(() => { sourceRef.current = source; });

  // Fetch uploads when opening the selector
  const fetchUploads = useCallback(async () => {
    if (!getAccessToken()) return;
    try {
      const uploads = await uploadsApi.listMedia();
      setMediaUploads((uploads as UploadItem[]) || []);
    } catch { /* ignore */ }
  }, []);

  const updateTime = useCallback(
    (time: number) => {
      // A-B loop enforcement
      const a = loopARef.current;
      const b = loopBRef.current;
      if (a != null && b != null && time >= b) {
        if (sourceRef.current === 'local' && audioRef.current) {
          audioRef.current.currentTime = a;
        }
        // YouTube loop is handled via yt.seek in the effect below
        setCurrentTime(a);
        onTimeUpdate?.(a);
        return;
      }
      setCurrentTime(time);
      onTimeUpdate?.(time);
    },
    [onTimeUpdate],
  );

  // Sync A-B loop with current line if loopCurrentLine is enabled
  useEffect(() => {
    if (settings.playback?.loopCurrentLine && lines?.[activeLineIndex] && lines[activeLineIndex].timestamp != null) {
      const currentLine = lines[activeLineIndex];
      const a = currentLine.timestamp ?? null;
      let b: number | null = currentLine.endTime ?? null;
      if (b == null) {
        const nextLine = lines.slice(activeLineIndex + 1).find(l => l.timestamp != null);
        b = nextLine ? (nextLine.timestamp ?? null) : duration;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoop({ a, b });
    } else if (!settings.playback?.loopCurrentLine) {
      // Only clear if it was an auto-loop. For simplicity, we'll just clear it when disabled.
      setLoop({ a: null, b: null });
    }
    // setLoop is a stable useState setter
  }, [settings.playback?.loopCurrentLine, activeLineIndex, lines, duration]);

  const updateDuration = useCallback(
    (d: number) => {
      setDuration(d);
      onDurationChange?.(d);
    },
    [onDurationChange],
  );

  const local = useLocalAudio({
    audioRef,
    blobRef: localBlobRef,
    t,
    settings,
    updateTime,
    updateDuration,
    setSource,
    setIsPlaying,
    setCurrentTime,
    onTitleChange,
    onMediaChange,
    onMediaUpload,
    initialSpeed,
    initialSeek,
  });

  const yt = useYouTubePlayer({
    containerRef: ytContainerRef,
    t,
    settings,
    updateTime,
    updateDuration,
    setIsPlaying,
    setCurrentTime,
    onTitleChange,
    onMediaChange,
    isPlaying,
    setSource,
    onYtUrlChange,
  });

  const detectedUrlType = useMemo(() => {
    const v = yt.ytUrl.trim().split(/\s+/)[0];
    if (!v) return 'none';
    if (CDN_PATTERN.test(v)) return 'cdn';
    if (AUDIO_URL_PATTERN.test(v)) return 'cdn';
    if (YT_PATTERN.test(v) || v.length === 11) return 'youtube';
    return 'unknown';
  }, [yt.ytUrl]);

  const [cdnLoading, setCdnLoading] = useState(false);

  const handleCdnUrlLoad = useCallback(async (url: string) => {
    // Extract filename from URL path (strip query string)
    const cleanUrl = url.split(/\s+/)[0];
    const pathOnly = cleanUrl.split('?')[0].split('#')[0];
    const lastSegment = pathOnly.split('/').pop() || 'audio';
    const dotIdx = lastSegment.lastIndexOf('.');
    const rawName = dotIdx > 0 ? lastSegment.slice(0, dotIdx) : lastSegment;
    const ext = dotIdx > 0 ? lastSegment.slice(dotIdx + 1).toLowerCase() : 'mp4';
    const fileName = `${rawName}.${ext}`;
    // Use rawName as display title (avoid showing hash-like IDs)
    const title = rawName.length > 30 ? 'Cloud Audio' : rawName;

    local.loadFromUrl(cleanUrl, title);
    yt.setYtError('');

    if (getAccessToken()) {
      setCdnLoading(true);
      try {
        const { upload } = await uploadsApi.saveMedia({
          source: 'cloudinary',
          uploadUrl: cleanUrl,
          fileName,
          title,
          duration: null,
        } as Parameters<typeof uploadsApi.saveMedia>[0]) as { upload: { id: string } };
        onMediaUpload?.({
          id: upload.id,
          uploadUrl: cleanUrl,
          publicId: null,
          fileName,
          duration: null,
        });
      } catch (err) {
        console.error('Failed to save CDN upload:', err);
        toast.error(t('player.saveMediaRefFailed') || 'Failed to save media reference');
      } finally {
        setCdnLoading(false);
      }
    }
  }, [local, onMediaUpload, yt, t]);

  const handleUrlLoad = useCallback(() => {
    const trimmed = yt.ytUrl.trim().split(/\s+/)[0];
    if (!trimmed) return;
    if (detectedUrlType === 'cdn') {
      handleCdnUrlLoad(trimmed);
      return;
    }
    const videoId = trimmed.match(YT_PATTERN)?.[1] || (trimmed.length === 11 ? trimmed : null);
    if (videoId) {
      yt.setYtError('');
      yt.loadYouTube(undefined);
      return;
    }
    yt.setYtError(t('player.invalidUrl') || 'Invalid URL. Paste a YouTube or Cloudinary CDN URL.');
  }, [yt, detectedUrlType, handleCdnUrlLoad, t]);

  const hasMedia = (source === 'local' && local.localUrl) || (source === 'youtube' && yt.ytReady);

  const handleSelectUpload = useCallback((upload: UploadItem) => {
    if (upload.source === 'youtube' && upload.uploadUrl) {
      yt.setYtUrl(upload.uploadUrl);
      setTimeout(() => yt.loadYouTube(undefined), 0);
    } else if (upload.source === 'cloudinary' && upload.uploadUrl) {
      fetch(upload.uploadUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], upload.fileName || 'audio.mp3', { type: blob.type || 'audio/mpeg' });
          (file as File & { isHosted?: boolean }).isHosted = true;
          local.handleFileChange(file);
        })
        .catch(() => { });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, yt, onTitleChange]);

  const handleClearMedia = useCallback(() => {
    local.remove();
    yt.remove();
    setSource('local');
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    onMediaChange?.(null);
  }, [local, yt, setIsPlaying, setCurrentTime, setDuration, onMediaChange]);

  const togglePlay = useCallback(() => {
    if (source === 'local' && audioRef.current) {
      if (isPlaying) local.pause();
      else local.play();
      setIsPlaying(!isPlaying);
    } else if (source === 'youtube' && yt.ytReady) {
      if (isPlaying) yt.pause();
      else yt.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, isPlaying, local, yt, haptic]);

  const seek = useCallback(
    (time: number) => {
      if (source === 'local') local.seek(time);
      else if (source === 'youtube') yt.seek(time);
    },
    [source, local, yt],
  );

  const applySpeed = useCallback(
    (speed: number | string) => {
      const clamped = Math.min(MAX_SPEED, Math.max(MIN_SPEED, parseFloat(String(speed)) || 1));
      setPlaybackSpeed(clamped);
      if (source === 'local') local.setSpeed(clamped);
      else if (source === 'youtube') yt.setSpeed(clamped);
    },
    [source, MIN_SPEED, MAX_SPEED, local, yt, setPlaybackSpeed],
  );

  // ——— A-B Loop helpers ———
  const handleLoopChange = useCallback((a: number | null, b: number | null) => {
    setLoop({ a, b });
  }, [setLoop]);

  const clearLoop = useCallback(() => {
    setLoop({ a: null, b: null });
  }, [setLoop]);

  // Refs so the keydown handler never needs to re-register when playback state changes
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const playbackSpeedRef = useRef(playbackSpeed);
  useLayoutEffect(() => { currentTimeRef.current = currentTime; });
  useLayoutEffect(() => { durationRef.current = duration; });
  useLayoutEffect(() => { playbackSpeedRef.current = playbackSpeed; });

  // Stable refs for callbacks — updated each render but handler registered once
  const togglePlayRef = useRef(togglePlay);
  const seekRef = useRef(seek);
  const applySpeedRef = useRef(applySpeed);
  useLayoutEffect(() => { togglePlayRef.current = togglePlay; });
  useLayoutEffect(() => { seekRef.current = seek; });
  useLayoutEffect(() => { applySpeedRef.current = applySpeed; });

  // ——— Player keyboard shortcuts ———
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement as HTMLElement | null)?.isContentEditable) return;

      const seekTime = settings.playback?.seekTime ?? 5;
      const speedStep = 0.25;

      if (matchKey(e, settings.shortcuts?.playPause?.[0] || 'Enter')) {
        e.preventDefault();
        togglePlayRef.current();
      } else if (matchKey(e, settings.shortcuts?.seekBackward?.[0] || 'ArrowLeft')) {
        e.preventDefault();
        seekRef.current(Math.max(0, currentTimeRef.current - seekTime));
      } else if (matchKey(e, settings.shortcuts?.seekForward?.[0] || 'ArrowRight')) {
        e.preventDefault();
        seekRef.current(Math.min(durationRef.current, currentTimeRef.current + seekTime));
      } else if (matchKey(e, settings.shortcuts?.mute?.[0] || 'm')) {
        e.preventDefault();
        updateSetting('playback.muted', !settings.playback?.muted);
      } else if (matchKey(e, settings.shortcuts?.speedUp?.[0] || '+')) {
        e.preventDefault();
        applySpeedRef.current(playbackSpeedRef.current + speedStep);
      } else if (matchKey(e, settings.shortcuts?.speedDown?.[0] || '-')) {
        e.preventDefault();
        applySpeedRef.current(playbackSpeedRef.current - speedStep);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // settings.shortcuts and settings.playback are stable config; update handler when they change
  }, [settings.shortcuts, settings.playback, updateSetting]);

  // ——— Expose player API via ref ———

  useImperativeHandle(
    ref ?? _legacyRef,
    () => ({
      getCurrentTime: () =>
        source === 'local' ? local.getCurrentTime() : yt.getCurrentTime(),
      isPlaying: () => isPlaying,
      play: () => {
        if (!isPlaying) togglePlay();
      },
      pause: () => {
        if (isPlaying) togglePlay();
      },
      togglePlay: () => togglePlay(),
      adjustSpeed: (delta: number) => applySpeed(Math.round((playbackSpeed + delta) * 1000) / 1000),
      getSpeed: () => playbackSpeed,
      seek,
      getAudioBlob: () => localBlobRef.current || null,
      loadLocalAudio: (file: File) => local.handleFileChange(file),
      loadYouTube: (url?: string) => yt.loadYouTube(url),
      loadFromUrl: (url: string, title?: string) => local.loadFromUrl(url, title),
      setLoop: handleLoopChange,
      clearLoop,
      getLoop: () => loop,
    }),
    [source, isPlaying, togglePlay, seek, local, yt, applySpeed, playbackSpeed, handleLoopChange, clearLoop, loop],
  );

  // ——— Apply restored seek/speed once after media is ready ———
  const restoredValuesAppliedRef = useRef(false);
  useEffect(() => {
    if (hasMedia && !restoredValuesAppliedRef.current) {
      restoredValuesAppliedRef.current = true;
      // Pause first to prevent any autoplay, then seek to the restored position
      if (source === 'youtube') yt.pause();
      else if (source === 'local') local.pause();
      if (initialSeek > 0) {
        seek(initialSeek);
      }
      if (initialSpeed && initialSpeed !== 1) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        applySpeed(initialSpeed);
      }
      // Re-pause after seek in case seekTo triggered playback (YouTube quirk)
      if (source === 'youtube') yt.pause();
    }
  }, [hasMedia, initialSeek, initialSpeed, seek, applySpeed, source, yt, local]);

  // ——— Unified auto-load effect ———
  // hydratedMediaKeyRef deduplicates within one Player mount so the same media
  // is never loaded twice. Resets to null on remount so a fresh mount always
  // hydrates even if the descriptor value hasn't changed.
  const hydratedMediaKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialMedia) {
      hydratedMediaKeyRef.current = null;
      return;
    }
    const key =
      initialMedia.type === 'youtube' ? initialMedia.url
        : initialMedia.type === 'cloudinary' ? initialMedia.id
          : null;
    if (!key) return;

    if (key === hydratedMediaKeyRef.current) return;
    hydratedMediaKeyRef.current = key;

    if (initialMedia.type === 'youtube') {
      yt.loadYouTube(initialMedia.url);
    } else if (initialMedia.type === 'cloudinary') {
      local.loadFromUrl(initialMedia.url!, initialMedia.title || initialMedia.fileName);
      onMediaUpload?.({
        id: initialMedia.id,
        uploadUrl: initialMedia.url,
        publicId: initialMedia.publicId,
        fileName: initialMedia.fileName,
        duration: initialMedia.duration,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMedia]);

  const mediaPopoverProps = useMemo(() => ({
    ytUrl: yt.ytUrl,
    onYtUrlChange: yt.setYtUrl,
    onYtErrorChange: yt.setYtError,
    onUrlLoad: handleUrlLoad,
    cdnLoading,
    onFileChange: local.handleFileChange as (e: ChangeEvent<HTMLInputElement>) => void,
    uploads: mediaUploads,
    onSelectUpload: handleSelectUpload,
    onClearMedia: handleClearMedia,
  }), [yt.ytUrl, yt.setYtUrl, yt.setYtError, handleUrlLoad, cdnLoading, local.handleFileChange, mediaUploads, handleSelectUpload, handleClearMedia]);

  /* eslint-disable react-hooks/refs -- audioRef is exposed as a stable ref OBJECT (never .current)
     through context so WaveformDisplay can read it; passing the ref identifier here is intentional. */
  const value = useMemo(() => ({
    source,
    isPlaying,
    currentTime,
    duration,
    playbackSpeed,
    hasMedia,
    loop,
    loopA,
    loopB,
    mediaTitle,
    songName: projectMetadata?.songName,
    projectCoverImage,
    local,
    yt,
    mediaUploads,
    cdnLoading,
    syncMode,
    viewerMode,
    speedPresets: SPEED_PRESETS,
    MIN_SPEED,
    MAX_SPEED,
    lines,
    playbackPosition,
    audioRef: audioRef as RefObject<HTMLAudioElement | null>,
    detectedUrlType,
    mediaPopoverProps,
    fetchUploads,
    togglePlay,
    seek,
    applySpeed,
    setLoop,
    handleLoopChange,
    clearLoop,
    handleUrlLoad,
    handleSelectUpload,
    handleClearMedia,
  }), [
    source, isPlaying, currentTime, duration, playbackSpeed, hasMedia, loop, loopA, loopB,
    mediaTitle, projectMetadata?.songName, projectCoverImage, local, yt, mediaUploads, cdnLoading,
    syncMode, viewerMode, SPEED_PRESETS, MIN_SPEED, MAX_SPEED,
    lines, playbackPosition, detectedUrlType, mediaPopoverProps, fetchUploads,
    togglePlay, seek, applySpeed, setLoop, handleLoopChange, clearLoop,
    handleUrlLoad, handleSelectUpload, handleClearMedia,
  ]);
  /* eslint-enable react-hooks/refs */

  return (
    <PlayerContext.Provider value={value}>
      {/* Always-rendered media elements — must survive layout switches */}
      {source === 'local' && local.localUrl && (
        <audio
          ref={audioRef}
          src={local.localUrl}
          onTimeUpdate={local.handleTimeUpdate}
          onLoadedMetadata={local.handleLoadedMetadata}
          onPause={local.handlePause}
          onEnded={() => setIsPlaying(false)}
          onError={(e) => console.error('[audio] load error:', (e.currentTarget as HTMLAudioElement).error, '| src:', (e.currentTarget as HTMLAudioElement).src?.slice(0, 80))}
          className="hidden"
        />
      )}
      <div
        ref={ytContainerRef}
        className={`fixed -top-[9999px] -left-[9999px] size-0 opacity-0 pointer-events-none ${source === 'youtube' && yt.ytReady ? '' : 'hidden'}`}
      />
      {children}
    </PlayerContext.Provider>
  );
}

export const PlayerEngineProvider = memo(PlayerEngineInner);
