import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { usePlayer } from '@features/player/PlayerContext';
import { isReadableAudioUrl } from '@features/player/media-cors';
import { captureTabAudio, NoTabAudioError, tabAudioSupported, tapMediaElement } from './audio-source';
import type { TabAudioCapture } from './audio-source';
import { VisualizerContext } from './visualizer-context';
import type { AudioFeed, TabAudioError, VisualizerContextValue } from './visualizer-context';
import { isVisualizerKind } from './visualizer-presets';
import type { VisualizerKind } from './visualizer-presets';

// A viewer preference, like the lyric alignment: remembered on this device only.
const KIND_KEY = 'lrc_visualizer_kind';

function readStoredKind(): VisualizerKind {
  try {
    const saved = localStorage.getItem(KIND_KEY);
    return isVisualizerKind(saved) ? saved : 'off';
  } catch {
    return 'off';
  }
}

/** Must sit inside PlayerEngineProvider: it listens to whatever that player is playing. */
export function VisualizerProvider({ children }: { children: ReactNode }) {
  const { source, isPlaying, audioRef, local } = usePlayer();
  const localUrl = (local?.localUrl as string | null | undefined) ?? null;

  const [kind, setKindState] = useState<VisualizerKind>(readStoredKind);
  const [tab, setTab] = useState<TabAudioCapture | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [tabError, setTabError] = useState<TabAudioError | null>(null);
  const [canShareTab] = useState(tabAudioSupported);

  const tabRef = useRef<TabAudioCapture | null>(null);
  const elementTapRef = useRef<{ el: HTMLMediaElement; node: AnalyserNode } | null>(null);
  const aliveRef = useRef(true);
  useLayoutEffect(() => { tabRef.current = tab; });

  const feed: AudioFeed = tab
    ? 'tab'
    : source === 'youtube'
      ? (canShareTab ? 'tab-available' : 'tab-unsupported')
      : (isReadableAudioUrl(localUrl) ? 'element' : 'element-sealed');

  const stopTabAudio = useCallback(() => {
    tabRef.current?.stop();
    setTab(null);
  }, []);

  const setKind = useCallback((next: VisualizerKind) => {
    setKindState(next);
    // Nothing left to draw; release the capture so the browser's sharing bar goes away.
    if (next === 'off') stopTabAudio();
    try { localStorage.setItem(KIND_KEY, next); } catch { /* still applies for this session */ }
  }, [stopTabAudio]);

  const shareTabAudio = useCallback(() => {
    setTabError(null);
    setConnecting(true);
    captureTabAudio()
      .then((capture) => {
        if (!aliveRef.current) { capture.stop(); return; }
        tabRef.current?.stop();
        setTab(capture);
      })
      .catch((err: unknown) => {
        if (!aliveRef.current) return;
        setTabError(
          err instanceof NoTabAudioError ? 'noAudio'
            : err instanceof DOMException && err.name === 'NotAllowedError' ? 'denied'
              : 'failed',
        );
      })
      .finally(() => { if (aliveRef.current) setConnecting(false); });
  }, []);

  // Sharing can end from outside: the browser's own "Stop sharing" bar.
  useEffect(() => {
    if (!tab) return;
    const onEnded = () => {
      tab.stop();
      setTab((current) => (current === tab ? null : current));
    };
    tab.track.addEventListener('ended', onEnded);
    return () => tab.track.removeEventListener('ended', onEnded);
  }, [tab]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      tabRef.current?.stop();
    };
  }, []);

  // Route the <audio> element only once playback has started: by then the viewer has clicked
  // play, so the AudioContext is allowed to run and the song keeps sounding through it.
  useEffect(() => {
    if (kind === 'off' || feed !== 'element' || !isPlaying) return;
    const el = audioRef.current;
    if (!el || elementTapRef.current?.el === el) return;
    let cancelled = false;
    tapMediaElement(el).then((node) => {
      if (!cancelled && node) elementTapRef.current = { el, node };
    });
    return () => { cancelled = true; };
  }, [kind, feed, isPlaying, localUrl, audioRef]);

  const getAnalyser = useCallback((): AnalyserNode | null => {
    const capture = tabRef.current;
    if (capture) return capture.analyser;
    const tap = elementTapRef.current;
    // A remounted or removed element (source switched) leaves the old tap behind.
    return tap && tap.el === audioRef.current ? tap.node : null;
  }, [audioRef]);

  const value = useMemo<VisualizerContextValue>(() => ({
    kind, setKind, feed, getAnalyser, connecting, tabError, shareTabAudio, stopTabAudio,
  }), [kind, setKind, feed, getAnalyser, connecting, tabError, shareTabAudio, stopTabAudio]);

  return <VisualizerContext.Provider value={value}>{children}</VisualizerContext.Provider>;
}
