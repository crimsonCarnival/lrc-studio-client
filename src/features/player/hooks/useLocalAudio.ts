import { useState, useCallback, useEffect, useRef } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import type { TFunction } from 'i18next';
import toast from 'react-hot-toast';
import { uploads, getAccessToken } from '@/app/api';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import type { AppSettings } from '@/features/settings/settings.types';

type HostedFile = File & { isHosted?: boolean };

interface UseLocalAudioParams {
  audioRef: RefObject<HTMLAudioElement | null>;
  blobRef: RefObject<Blob | null>;
  t: TFunction;
  settings: AppSettings;
  updateTime: (t: number) => void;
  updateDuration: (d: number) => void;
  setSource: (s: string) => void;
  setIsPlaying: (p: boolean) => void;
  setCurrentTime: (t: number) => void;
  onTitleChange?: (title: string) => void;
  onMediaChange?: (v: unknown) => void;
  onMediaUpload?: (u: unknown) => void;
  initialSpeed?: number | string;
  initialSeek?: number;
}

export default function useLocalAudio({
  audioRef,
  blobRef,
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
  initialSeek = 0,
}: UseLocalAudioParams) {
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadAbortRef = useRef<boolean | null>(null);
  const { executeRecaptcha } = useGoogleReCaptcha();

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement> | File) => {
    const file = (e instanceof File ? e : e.target.files?.[0]) as HostedFile | undefined;
    if (!file) return;

    if (file.size > 150 * 1024 * 1024) {
      toast.error(t('import.tooLarge') || 'Audio file is too large (max 150MB).');
      return;
    }

    blobRef.current = file;
    const url = URL.createObjectURL(file);
    setSource('local');
    setLocalUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);
    onTitleChange?.(file.name.replace(/\.[^/.]+$/, ''));
    onMediaChange?.(true);

    // Upload to Cloudinary in background if authenticated and not already hosted there
    if (!file.isHosted && getAccessToken() && file.size <= 50 * 1024 * 1024) {
      uploadAbortRef.current = false;
      setIsUploading(true);
      
      const performUpload = async () => {
        if (uploadAbortRef.current) return;
        try {
          const result = await uploads.uploadMedia(
            file,
            executeRecaptcha ? await executeRecaptcha('upload_audio') : undefined
          ) as { secure_url: string; public_id: string; duration?: number | null };
          try {
            // Immediately persist to database before considering it successful
            const { upload } = await uploads.saveMedia({
              source: 'cloudinary',
              uploadUrl: result.secure_url,
              publicId: result.public_id,
              fileName: file.name,
              title: file.name.replace(/\.[^/.]+$/, ''),
              duration: result.duration || null,
            } as Parameters<typeof uploads.saveMedia>[0]) as { upload?: { id: string } };
            if (!upload) {
              console.warn('Upload not persisted - user may not be authenticated');
              // Assign a local: temp id so the session can track this upload
              // without sending a fake Mongo id to the server. The local: prefix
              // signals to save paths that a real DB record is still needed.
              onMediaUpload?.({
                id: `local:${crypto.randomUUID()}`,
                uploadUrl: result.secure_url,
                publicId: result.public_id,
                fileName: file.name,
                duration: result.duration,
              });
              return;
            }
            if (uploadAbortRef.current) return;
            onMediaUpload?.({
              id: upload.id,
              uploadUrl: result.secure_url,
              publicId: result.public_id,
              fileName: file.name,
              duration: result.duration,
            });
          } catch (err) {
            if (uploadAbortRef.current) return;
            console.error('Failed to persist upload to database:', err);
            // Don't show error toast - still allow playback from URL
            // Assign a local: temp id so the session knows this wasn't persisted
            onMediaUpload?.({
              id: `local:${crypto.randomUUID()}`,
              uploadUrl: result.secure_url,
              publicId: result.public_id,
              fileName: file.name,
              duration: result.duration,
            });
          }
        } catch (err) {
          if (uploadAbortRef.current) return;
          console.warn('Cloudinary upload failed:', (err as Error)?.message);
        } finally {
          if (!uploadAbortRef.current) setIsUploading(false);
        }
      };
      performUpload();
    }
  }, [blobRef, t, setSource, setIsPlaying, setCurrentTime, onTitleChange, onMediaChange, onMediaUpload, executeRecaptcha]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      updateTime(audioRef.current.currentTime);
    }
  }, [audioRef, updateTime]);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      if (!isFinite(d) || d <= 0) return;
      updateDuration(d);
      audioRef.current.volume = settings.playback?.muted ? 0 : settings.playback?.volume;
      const s = parseFloat(String(initialSpeed ?? ''));
      if (isFinite(s) && s > 0 && s !== 1) {
        audioRef.current.playbackRate = s;
      }
      if (initialSeek > 0) {
        audioRef.current.currentTime = initialSeek;
        updateTime(initialSeek);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioRef, updateDuration, settings.playback?.muted, settings.playback?.volume, initialSpeed]);

  const autoRewind = settings.playback?.autoRewindOnPause;
  const handlePause = useCallback(() => {
    if (
      autoRewind?.enabled &&
      audioRef.current &&
      audioRef.current.currentTime > 0 &&
      audioRef.current.currentTime < audioRef.current.duration
    ) {
      const newTime = Math.max(
        0,
        audioRef.current.currentTime - (autoRewind?.seconds || 2),
      );
      audioRef.current.currentTime = newTime;
      updateTime(newTime);
    }
  }, [audioRef, autoRewind?.enabled, autoRewind?.seconds, updateTime]);

  const remove = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (localUrl) URL.revokeObjectURL(localUrl);
    setLocalUrl(null);
    blobRef.current = null;
    uploadAbortRef.current = true;
    setIsUploading(false);
  }, [audioRef, blobRef, localUrl]);

  const play = useCallback(() => {
    const promise = audioRef.current?.play();
    promise?.catch((err: Error) => {
      console.error('[local.play] play() rejected:', err.name, err.message);
      if (err.name !== 'AbortError') {
        setIsPlaying(false);
      }
    });
  }, [audioRef, setIsPlaying]);
  const pause = useCallback(() => { audioRef.current?.pause(); }, [audioRef]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      updateTime(time);
    }
  }, [audioRef, updateTime]);

  const setSpeed = useCallback((speed: number) => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [audioRef]);

  const getCurrentTime = useCallback(() => audioRef.current?.currentTime || 0, [audioRef]);

  // Sync volume when settings change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = settings.playback?.muted ? 0 : settings.playback?.volume;
    }
  }, [audioRef, settings.playback?.volume, settings.playback?.muted]);

  return {
    localUrl,
    isUploading,
    handleFileChange,
    handleTimeUpdate,
    handleLoadedMetadata,
    handlePause,
    remove,
    play,
    pause,
    seek,
    setSpeed,
    getCurrentTime,
    loadFromUrl: useCallback((url: string, title?: string) => {
      // Abort any pending Cloudinary upload
      uploadAbortRef.current = true;
      // Set the URL directly — browser streams it without downloading the full blob
      setSource('local');
      setLocalUrl(url);
      setIsPlaying(false);
      setCurrentTime(0);
      if (title) onTitleChange?.(title);
      onMediaChange?.(true);
    }, [setSource, setIsPlaying, setCurrentTime, onTitleChange, onMediaChange]),
  };
}
