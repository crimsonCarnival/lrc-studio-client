import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { captureCounterpart, moveCounterpart, isCounterpart } from '../services/counterparts';
import type { Dispatch, SetStateAction, RefObject } from 'react';
import type { EditorLine } from '../services/editor.service';
import type { PlayerHandle } from '@/types/app-state';

interface UseCounterpartsParams {
  setLines: Dispatch<SetStateAction<EditorLine[]>>;
  setActiveLineIndex: Dispatch<SetStateAction<number>>;
  playerRef: RefObject<PlayerHandle | null>;
  /**
   * Shared with useEditor rather than owned here: handleCaptureCounterpart both reads the current
   * lines and writes the captured result straight back, ahead of the setLines round trip, so
   * a second capture landing in the same tick sees the first one. That only holds if it is
   * the same ref instance the rest of the editor reads.
   */
  linesRef: RefObject<EditorLine[]>;
  playbackPositionRef: RefObject<number>;
  isPlayingRef: RefObject<boolean>;
}

/**
 * Counterpart handlers, split out of useEditor.
 *
 * They were already the most self-contained cluster in that hook: none of them read any of
 * its local state, the real work lives in the counterparts service (which has its own tests), and
 * everything they need arrives through the parameters above.
 */
export function useCounterparts({
  setLines,
  setActiveLineIndex,
  playerRef,
  linesRef,
  playbackPositionRef,
  isPlayingRef,
}: UseCounterpartsParams) {
  const { t } = useTranslation();

  const handleToggleCounterpart = useCallback((index: number) => {
    setLines((prev) => {
      const line = prev[index];
      if (!line || line.type === 'section') return prev;
      if (line.adLibOf != null) {
        const next = [...prev];
        next[index] = { ...line, adLibOf: null };
        return next;
      }
      let parentTs: number | null = null;
      for (let j = index - 1; j >= 0; j--) {
        const c = prev[j];
        if (c.type === 'section' || c.adLibOf != null) continue;
        parentTs = c.timestamp ?? 0;
        break;
      }
      const next = [...prev];
      next[index] = { ...line, adLibOf: parentTs ?? 0 };
      return next;
    });
  }, [setLines]);

  /**
   * Live capture (redesign sheet 20): drops an unnamed counterpart at the playhead and returns
   * its id, so the caller can ask for its text. Works outside sync mode too: hearing an
   * counterpart and tapping is the whole gesture.
   */
  const handleCaptureCounterpart = useCallback((): string | null => {
    const time = isPlayingRef.current
      ? (playerRef?.current?.getCurrentTime?.() ?? playbackPositionRef.current)
      : playbackPositionRef.current;
    const id = crypto.randomUUID();
    const result = captureCounterpart(linesRef.current, time ?? 0, id);
    if (!result) {
      toast.error(t('editor.counterpart.needsSyncedLine'), { id: 'counterpart-needs-line' });
      return null;
    }
    linesRef.current = result.lines;
    setLines(result.lines);
    return id;
  }, [playerRef, setLines, t, linesRef, playbackPositionRef, isPlayingRef]);

  const handleMoveCounterpart = useCallback((index: number, time: number) => {
    setLines((prev) => moveCounterpart(prev, index, time));
  }, [setLines]);

  /** Removes a counterpart without asking: it is one tap to make and undo brings it back. */
  const handleRemoveCounterpart = useCallback((index: number) => {
    setLines((prev) => (isCounterpart(prev[index]) ? prev.filter((_, i) => i !== index) : prev));
    setActiveLineIndex((prevIdx) => (prevIdx > index ? prevIdx - 1 : prevIdx));
  }, [setLines, setActiveLineIndex]);

  const handleNameCounterpart = useCallback((index: number, text: string) => {
    setLines((prev) => {
      if (!isCounterpart(prev[index]) || prev[index].text === text) return prev;
      const next = [...prev];
      next[index] = { ...prev[index], text };
      return next;
    });
  }, [setLines]);

  return {
    handleToggleCounterpart,
    handleCaptureCounterpart,
    handleMoveCounterpart,
    handleRemoveCounterpart,
    handleNameCounterpart,
  };
}
