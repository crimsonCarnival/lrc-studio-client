import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { captureAdLib, moveAdLib, isAdLib } from '../services/ad-libs';
import type { Dispatch, SetStateAction, RefObject } from 'react';
import type { EditorLine } from '../services/editor.service';
import type { PlayerHandle } from '@/shared/hooks/useAppState';

interface UseAdLibsParams {
  setLines: Dispatch<SetStateAction<EditorLine[]>>;
  setActiveLineIndex: Dispatch<SetStateAction<number>>;
  playerRef: RefObject<PlayerHandle | null>;
  /**
   * Shared with useEditor rather than owned here: handleCaptureAdLib both reads the current
   * lines and writes the captured result straight back, ahead of the setLines round trip, so
   * a second capture landing in the same tick sees the first one. That only holds if it is
   * the same ref instance the rest of the editor reads.
   */
  linesRef: RefObject<EditorLine[]>;
  playbackPositionRef: RefObject<number>;
  isPlayingRef: RefObject<boolean>;
}

/**
 * Ad-lib handlers, split out of useEditor.
 *
 * They were already the most self-contained cluster in that hook: none of them read any of
 * its local state, the real work lives in the ad-libs service (which has its own tests), and
 * everything they need arrives through the parameters above.
 */
export function useAdLibs({
  setLines,
  setActiveLineIndex,
  playerRef,
  linesRef,
  playbackPositionRef,
  isPlayingRef,
}: UseAdLibsParams) {
  const { t } = useTranslation();

  const handleToggleAdLib = useCallback((index: number) => {
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
   * Live capture (redesign sheet 20): drops an unnamed ad-lib at the playhead and returns
   * its id, so the caller can ask for its text. Works outside sync mode too: hearing an
   * ad-lib and tapping is the whole gesture.
   */
  const handleCaptureAdLib = useCallback((): string | null => {
    const time = isPlayingRef.current
      ? (playerRef?.current?.getCurrentTime?.() ?? playbackPositionRef.current)
      : playbackPositionRef.current;
    const id = crypto.randomUUID();
    const result = captureAdLib(linesRef.current, time ?? 0, id);
    if (!result) {
      toast.error(t('editor.adLib.needsSyncedLine'), { id: 'adlib-needs-line' });
      return null;
    }
    linesRef.current = result.lines;
    setLines(result.lines);
    return id;
  }, [playerRef, setLines, t, linesRef, playbackPositionRef, isPlayingRef]);

  const handleMoveAdLib = useCallback((index: number, time: number) => {
    setLines((prev) => moveAdLib(prev, index, time));
  }, [setLines]);

  /** Removes an ad-lib without asking: it is one tap to make and undo brings it back. */
  const handleRemoveAdLib = useCallback((index: number) => {
    setLines((prev) => (isAdLib(prev[index]) ? prev.filter((_, i) => i !== index) : prev));
    setActiveLineIndex((prevIdx) => (prevIdx > index ? prevIdx - 1 : prevIdx));
  }, [setLines, setActiveLineIndex]);

  const handleNameAdLib = useCallback((index: number, text: string) => {
    setLines((prev) => {
      if (!isAdLib(prev[index]) || prev[index].text === text) return prev;
      const next = [...prev];
      next[index] = { ...prev[index], text };
      return next;
    });
  }, [setLines]);

  return {
    handleToggleAdLib,
    handleCaptureAdLib,
    handleMoveAdLib,
    handleRemoveAdLib,
    handleNameAdLib,
  };
}
