import { useCallback, useEffect, useRef, useState } from 'react';

type DemoClock = {
  time: number;
  playing: boolean;
  play: () => void;
  pause: () => void;
  reset: () => void;
  seek: (t: number) => void;
  ref: (el: HTMLElement | null) => void;
  reducedMotion: boolean;
};

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

// Fake playhead shared by the Guide demos. Nothing here touches audio or the
// player: `time` is just seconds advanced by requestAnimationFrame. It pauses
// itself when the demo scrolls out of view or the tab is hidden, so an idle
// demo never keeps a frame loop alive.
export function useDemoClock({ duration = 30 }: { duration?: number } = {}): DemoClock {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const timeRef = useRef(0);

  const seek = useCallback((t: number) => {
    timeRef.current = Math.min(Math.max(t, 0), duration);
    setTime(timeRef.current);
  }, [duration]);

  const play = useCallback(() => {
    if (timeRef.current >= duration) seek(0);
    setPlaying(true);
  }, [duration, seek]);
  const pause = useCallback(() => setPlaying(false), []);
  const reset = useCallback(() => {
    setPlaying(false);
    seek(0);
  }, [seek]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last: number | null = null;
    const frame = (now: number) => {
      if (last !== null) timeRef.current = Math.min(timeRef.current + (now - last) / 1000, duration);
      last = now;
      setTime(timeRef.current);
      if (timeRef.current >= duration) setPlaying(false);
      else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Callback ref: demos live inside lazy bodies, so the element can mount after the hook's first render.
  const ref = useCallback((el: HTMLElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => { if (entry && !entry.isIntersecting) setPlaying(false); });
    io.observe(el);
    observerRef.current = io;
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  return { time, playing, play, pause, reset, seek, ref, reducedMotion };
}
