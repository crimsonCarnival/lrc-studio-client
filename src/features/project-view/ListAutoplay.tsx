import { useEffect, useRef } from 'react';
import { usePlayer } from '@features/player/PlayerContext';

/**
 * How close to the end a stop has to be to count as the track ending. The
 * player has no "ended" signal of its own: local audio and YouTube both just
 * stop playing, and YouTube's last polled time can trail its duration slightly.
 */
const END_SLACK_S = 0.75;

type ListAutoplayProps = {
  /** Called once when the current track plays through to its end. Omit to stop listening. */
  onEnded?: () => void;
  /** Start playback once the media is ready (this track was reached by autoplay). */
  startOnReady: boolean;
};

/**
 * List-context autoplay for the public view. Renders nothing; lives inside the
 * PlayerEngineProvider so it can read the clock without re-rendering the page.
 */
export default function ListAutoplay({ onEnded, startOnReady }: ListAutoplayProps) {
  const { isPlaying, currentTime, duration, hasMedia, loopA, loopB, togglePlay } = usePlayer();

  const wasPlayingRef = useRef(false);
  useEffect(() => {
    const was = wasPlayingRef.current;
    wasPlayingRef.current = isPlaying;
    // An A-B loop never reaches the end on purpose; a stop there is the user's.
    if (!was || isPlaying || !onEnded || loopA != null || loopB != null) return;
    if (duration > 0 && currentTime >= duration - END_SLACK_S) onEnded();
  }, [isPlaying, currentTime, duration, loopA, loopB, onEnded]);

  // The provider pauses freshly loaded media in its own effect (parents' effects
  // run after children's), so the play call waits a tick to land after it.
  const startedRef = useRef(false);
  const toggleRef = useRef(togglePlay);
  const playingRef = useRef(isPlaying);
  useEffect(() => { toggleRef.current = togglePlay; playingRef.current = isPlaying; });
  useEffect(() => {
    if (!startOnReady || !hasMedia || startedRef.current) return;
    // Marked inside the timer, not here: StrictMode's mount-unmount-mount would
    // otherwise clear the timer and leave the flag set, and nothing would play.
    const id = window.setTimeout(() => {
      startedRef.current = true;
      if (!playingRef.current) toggleRef.current();
    }, 0);
    return () => window.clearTimeout(id);
  }, [startOnReady, hasMedia]);

  return null;
}
