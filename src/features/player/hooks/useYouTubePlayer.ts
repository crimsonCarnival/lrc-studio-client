declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import type { RefObject } from 'react';
import type { TFunction } from 'i18next';
import { extractVideoId } from '../services/player.service';
import type { AppSettings } from '@/features/settings/settings.types';
import type { PlaybackEntry } from '../playback-history';

// Module-level WeakMap: stores raw YouTube player objects outside React's
// tracking system so React DevTools never walks the cross-origin iframe.
const ytPlayerStore = new WeakMap();

interface UseYouTubePlayerParams {
  containerRef: RefObject<HTMLDivElement | null>;
  t: TFunction;
  settings: AppSettings;
  updateTime: (t: number) => void;
  updateDuration: (d: number) => void;
  setIsPlaying: (p: boolean) => void;
  setCurrentTime: (t: number) => void;
  onTitleChange?: (title: string) => void;
  onMediaChange?: (v: unknown) => void;
  isPlaying: boolean;
  setSource: (s: string) => void;
  onYtUrlChange?: (url: string) => void;
  onTrackLoad?: (entry: PlaybackEntry) => void;
}

export default function useYouTubePlayer({
  containerRef,
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
  onTrackLoad,
}: UseYouTubePlayerParams) {
  // useRef gives a stable identity ESLint recognises as safe in dep arrays.
  // On first render we redefine `current` as a non-enumerable WeakMap-backed
  // accessor so React DevTools' property-walker never reaches the raw YT player
  // object (which would throw a cross-origin SecurityError).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ytPlayerRef = useRef<any>(null);
  const _ytRefInitialized = useRef(false);
  // eslint-disable-next-line react-hooks/refs -- one-time init guard: singleton ref property redefinition
  if (!_ytRefInitialized.current) {
    _ytRefInitialized.current = true;
    const _ref = ytPlayerRef; // capture stable reference for the closure
    Object.defineProperty(ytPlayerRef, 'current', { // eslint-disable-line react-hooks/refs
      enumerable: false, // hidden from DevTools enumeration
      configurable: true,
      get: () => {
        const raw = ytPlayerStore.get(_ref) ?? null;
        if (!raw) return null;
        // Wrap in a Proxy so React DevTools can never walk into the YT player's
        // cross-origin iframe properties (e.g. contentWindow) that throw SecurityError.
        // ownKeys/getOwnPropertyDescriptor return nothing → DevTools sees an opaque
        // object and stops; our own code still reaches all API methods via the get trap.
        return new Proxy(raw, {
          get(target, prop) {
            try {
              const val = target[prop];
              return typeof val === 'function' ? val.bind(target) : val;
            } catch {
              return undefined;
            }
          },
          ownKeys() { return []; },
          getOwnPropertyDescriptor() { return undefined; },
          getPrototypeOf() { return null; },
          has() { return false; },
        });
      },
      set: (v) => { if (v == null) ytPlayerStore.delete(_ref); else ytPlayerStore.set(_ref, v); },
    });
  }
  const ytInnerRef = useRef<HTMLDivElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const apiLoadedRef = useRef(false);
  const onYtUrlChangeRef = useRef(onYtUrlChange);
  useLayoutEffect(() => { onYtUrlChangeRef.current = onYtUrlChange; });
  const onTrackLoadRef = useRef(onTrackLoad);
  useLayoutEffect(() => { onTrackLoadRef.current = onTrackLoad; });

  const [ytUrl, setYtUrl] = useState('');
  const [ytReady, setYtReady] = useState(false);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState('');
  const [ytEmbedBlocked, setYtEmbedBlocked] = useState(false);

  // Load YouTube IFrame API
  useEffect(() => {
    if (apiLoadedRef.current) return;
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      apiLoadedRef.current = true;
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => {
      setYtError('Failed to load YouTube player. Check your connection or ad-blocker.');
    };
    document.head.appendChild(tag);
    apiLoadedRef.current = true;
    const timeout = setTimeout(() => {
      if (!window.YT) {
        setYtError('YouTube API took too long to load.');
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, []);

  // Create inner div for YT player on mount
  useEffect(() => {
    if (containerRef.current && !ytInnerRef.current) {
      const inner = document.createElement('div');
      inner.id = 'yt-player-inner';
      containerRef.current.appendChild(inner);
      ytInnerRef.current = inner;
    }
  }, [containerRef]);

  const loadYouTube = useCallback((urlOverride?: string) => {
    const urlToLoad = (typeof urlOverride === 'string') ? urlOverride : ytUrl;
    const videoId = extractVideoId(urlToLoad);
    if (!videoId) {
      setYtError(t('player.invalidUrl') || 'Invalid YouTube URL');
      return;
    }
    setYtError('');
    setYtEmbedBlocked(false);
    setSource('youtube');
    setYtLoading(true);
    if (typeof urlOverride === 'string') setYtUrl(urlOverride);

    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy(); } catch { /* ignore */ }
      ytPlayerRef.current = null;
    }

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      const inner = document.createElement('div');
      inner.id = 'yt-player-inner';
      containerRef.current.appendChild(inner);
      ytInnerRef.current = inner;
    }

    setYtReady(false);
    setIsPlaying(false);
    setCurrentTime(0);

    const initPlayer = () => {
      if (!ytInnerRef.current) return;
      ytPlayerRef.current = new window.YT.Player(ytInnerRef.current, {
        videoId,
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            setYtReady(true);
            setYtLoading(false);
            const d = e.target.getDuration();
            updateDuration(d);
            e.target.setVolume(settings.playback?.muted ? 0 : (settings.playback?.volume * 100));
            const title = e.target.getVideoData()?.title;
            if (title) onTitleChange?.(title);
            onMediaChange?.(true);
            onYtUrlChangeRef.current?.(urlToLoad);
            onTrackLoadRef.current?.({ url: urlToLoad, title: title ?? '', type: 'youtube' });
          },
          onStateChange: (e) => {
            const playing = e.data === window.YT.PlayerState.PLAYING;
            setIsPlaying(playing);
            if (e.data === window.YT.PlayerState.PAUSED && settings.playback?.autoRewindOnPause?.enabled) {
              const current = ytPlayerRef.current.getCurrentTime();
              const dur = ytPlayerRef.current.getDuration();
              if (current > 0 && current < dur) {
                const newTime = Math.max(0, current - (settings.playback?.autoRewindOnPause?.seconds || 2));
                ytPlayerRef.current.seekTo(newTime, true);
                updateTime(newTime);
              }
            }
          },
          onError: (e) => {
            const errorCodes = {
              2: 'Invalid video ID',
              5: 'HTML5 player error',
              100: 'Video not found or private',
              101: 'Video cannot be embedded',
              150: 'Video cannot be embedded',
            };
            const isEmbedBlock = e.data === 101 || e.data === 150;
            setYtEmbedBlocked(isEmbedBlock);
            setYtError(errorCodes[e.data] || `YouTube error (code ${e.data})`);
            setYtLoading(false);
            setYtReady(false);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }
  }, [containerRef, ytUrl, t, settings.playback?.volume, settings.playback?.muted, settings.playback?.autoRewindOnPause?.enabled, settings.playback?.autoRewindOnPause?.seconds, updateDuration, updateTime, setIsPlaying, setCurrentTime, onTitleChange, onMediaChange, setSource]);


  // Poll YouTube time with requestAnimationFrame
  useEffect(() => {
    if (!ytReady || !isPlaying) {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      return;
    }

    let lastPoll = 0;
    const poll = (timestamp: number) => {
      if (timestamp - lastPoll >= 50) {
        lastPoll = timestamp;
        if (ytPlayerRef.current?.getCurrentTime) {
          updateTime(ytPlayerRef.current.getCurrentTime());
        }
      }
      rafIdRef.current = requestAnimationFrame(poll);
    };
    rafIdRef.current = requestAnimationFrame(poll);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [ytReady, isPlaying, updateTime]);

  const remove = useCallback(() => {
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy(); } catch { /* ignore */ }
      ytPlayerRef.current = null;
    }
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      const inner = document.createElement('div');
      inner.id = 'yt-player-inner';
      containerRef.current.appendChild(inner);
      ytInnerRef.current = inner;
    }
    setYtReady(false);
    setYtLoading(false);
    setYtUrl('');
    setYtError('');
    setSource('local');
    onYtUrlChangeRef.current?.('');
  }, [containerRef, setSource]);

  const play = useCallback(() => { ytPlayerRef.current?.playVideo(); }, []);
  const pause = useCallback(() => { ytPlayerRef.current?.pauseVideo(); }, []);

  const seek = useCallback((time: number) => {
    if (ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(time, true);
      updateTime(time);
    }
  }, [updateTime]);

  const setSpeed = useCallback((speed: number) => {
    if (ytPlayerRef.current?.setPlaybackRate) {
      ytPlayerRef.current.setPlaybackRate(speed);
    }
  }, []);

  const getCurrentTime = useCallback(() => ytPlayerRef.current?.getCurrentTime?.() || 0, []);

  // Sync volume when settings change
  useEffect(() => {
    if (ytPlayerRef.current?.setVolume) {
      ytPlayerRef.current.setVolume(settings.playback?.muted ? 0 : (settings.playback?.volume * 100));
    }
  }, [settings.playback?.volume, settings.playback?.muted, ytReady]);

  return {
    ytUrl,
    setYtUrl,
    ytReady,
    ytLoading,
    ytError,
    ytEmbedBlocked,
    setYtError,
    loadYouTube,
    remove,
    play,
    pause,
    seek,
    setSpeed,
    getCurrentTime,
  };
}
