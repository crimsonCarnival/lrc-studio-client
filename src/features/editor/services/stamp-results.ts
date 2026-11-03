import type { EditorLine } from '@/features/editor/editor.types';
import type { ConfidenceInfo } from '@/features/editor/hooks/useAutoStamp';
import type { StampResultDto } from './asr.service';
import { alignLineStart } from './editor.service';

export type StampOptions = {
  applyMode: 'all' | 'empty-only';
  editorMode: string;
  /** Maps a current line to its index in the lines the job was started on (see sentIndexResolver). */
  startIndexOf: (line: EditorLine) => number | undefined;
  /**
   * Ids for result lines that had none, keyed by object. Chosen once by the caller,
   * so applying the same results twice (a React updater may run twice) names a line
   * the same way both times.
   */
  minted: Map<EditorLine, string>;
};

/** The id-less lines `stampLines` will record a result for; the caller mints their ids. */
export function linesNeedingIds(lines: EditorLine[], result: StampResultDto[], startIndexOf: StampOptions['startIndexOf']): EditorLine[] {
  const indices = new Set(result.map((r) => r.index));
  return lines.filter((line) => {
    if (line.type === 'section' || (line.id != null && String(line.id))) return false;
    const i = startIndexOf(line);
    return i !== undefined && indices.has(i);
  });
}

/**
 * Applies Auto Stamp results to `lines`, matching each result to its line through
 * `startIndexOf` (never by current position), so lines inserted, removed or moved
 * while the job ran keep what they have. Pure: returns `lines` itself when nothing
 * changed, plus the confidence of every line a result was recorded for.
 */
export function stampLines(
  lines: EditorLine[],
  result: StampResultDto[],
  { applyMode, editorMode, startIndexOf, minted }: StampOptions,
): { lines: EditorLine[]; conf: Map<string, ConfidenceInfo> } {
  const byIndex = new Map(result.map((r) => [r.index, r]));
  const conf = new Map<string, ConfidenceInfo>();
  const isWordsMode = editorMode === 'words';
  let changed = false;

  // Returns the line's id and the line to keep (the original object when it already had one).
  const withId = (line: EditorLine): [string, EditorLine] | null => {
    const existing = line.id != null ? String(line.id) : '';
    if (existing) return [existing, line];
    const id = minted.get(line);
    return id ? [id, { ...line, id }] : null;
  };

  const next = lines.map((original) => {
    const startIndex = startIndexOf(original);
    const r = startIndex === undefined ? undefined : byIndex.get(startIndex);
    if (!r || original.type === 'section') return original;
    const named = withId(original);
    if (!named) return original;
    const [id, line] = named;
    if (r.timestamp === null) {
      // Unmatched line: never stamp, but surface it for review ('none' count/filter).
      conf.set(id, { confidence: r.confidence, status: r.status });
      if (line !== original) changed = true;
      return line;
    }
    // In Words mode "already stamped" has to mean the WORDS are stamped, not
    // the line. The normal workflow is: rough-sync the line first, switch to
    // Words mode, then run Auto Stamp to fill per-word times — at that point
    // every line already has line.timestamp, so gating on it here skipped
    // every line and merged no words at all.
    const alreadyStamped = isWordsMode
      ? (line.words?.some((w) => w.time != null) ?? false)
      : line.timestamp != null;
    if (applyMode === 'empty-only' && alreadyStamped) return original;
    conf.set(id, { confidence: r.confidence, status: r.status });

    // Merge word-level timestamps by position (only overwrite `time`, preserve reading/singerIndex).
    let mergedWords: EditorLine['words'] = line.words;
    if (isWordsMode && r.words && r.words.length > 0) {
      const existing = line.words ?? [];
      mergedWords = r.words.map((rw, pos) => ({
        ...(existing[pos] ?? {}),
        word: existing[pos]?.word ?? rw.word,
        time: rw.time ?? null,
      }));
    }

    // empty-only's promise is "fill what's missing, keep what's set" — in
    // Words mode that has to hold at the line level too. A line that was
    // already rough-synced must not have ITS timestamp silently replaced by the
    // ASR's own just because its words were the part that was actually missing.
    const keepOwnTiming = isWordsMode && applyMode === 'empty-only' && line.timestamp != null;

    const stamped: EditorLine = {
      ...line,
      ...(keepOwnTiming ? {} : { timestamp: r.timestamp, ...(r.endTime !== null ? { endTime: r.endTime } : {}) }),
      source: 'asr' as const,
      ...(mergedWords !== undefined ? { words: mergedWords } : {}),
    };
    changed = true;
    if (!isWordsMode) return stamped;
    // Words mode holds line.timestamp and words[0].time as one instant. Which
    // of the two wins depends on what empty-only promised: when the user's own
    // line timing is being kept, the first word moves onto it; otherwise the
    // line moves onto the ASR's (more precise) first-word time.
    const anchor = keepOwnTiming ? stamped.timestamp : (mergedWords?.[0]?.time ?? stamped.timestamp);
    return anchor != null ? alignLineStart(stamped, anchor) : stamped;
  });
  return { lines: changed ? next : lines, conf };
}
