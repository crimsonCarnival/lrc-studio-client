import { useCallback, useEffect, useRef, useState } from 'react';
import { connectSocket } from '@/app/socket.client';
import { startStamp, startStampWithFile, getStampJob, cancelStampJob, getJobAudio, type StampResultDto, type AsrJobDto } from '../services/asr.service';
import type { EditorLine } from '../services/editor.service';

export type AutoStampPhase =
  | 'idle'
  | 'starting'
  | 'fetching_audio'
  | 'extracting_audio'
  | 'transcribing'
  | 'aligning'
  | 'applying'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ConfidenceInfo = { confidence: number; status: 'matched' | 'partial' | 'low' | 'none' };

/** Phases during which the job is still running server-side and worth re-querying after a reconnect. */
const ACTIVE_PHASES: ReadonlySet<AutoStampPhase> = new Set(['starting', 'fetching_audio', 'extracting_audio', 'transcribing', 'aligning']);

type Params = {
  lines: EditorLine[];
  setLines: (lines: EditorLine[]) => void;
  uploadId: string | null;
  /**
   * Called at start() time to grab the raw local audio File. A getter (not a
   * File value) so the freshest blob is read at job start — a cached File prop
   * would go stale when the user swaps media without changing derived state.
   */
  getLocalFile: () => File | null;
  /** Called at start() time; returns the loaded YouTube URL when the active player source is YouTube, else null. */
  getYoutubeUrl: () => string | null;
  fuzzyTolerance: number;
  applyMode: 'all' | 'empty-only';
  /** When 'words', word-level timestamps are merged into each line's words array. */
  editorMode: string;
};

export function useAutoStamp({ lines, setLines, uploadId, getLocalFile, getYoutubeUrl, fuzzyTolerance, applyMode, editorMode }: Params) {
  const [phase, setPhase] = useState<AutoStampPhase>('idle');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [pendingResult, setPendingResult] = useState<StampResultDto[] | null>(null);
  const [confidenceByIndex, setConfidenceByIndex] = useState<Map<number, ConfidenceInfo>>(new Map());
  const [youtubeAudioUrl, setYoutubeAudioUrl] = useState<string | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const jobSourceRef = useRef<'youtube' | 'upload' | 'local' | null>(null);

  const linesRef = useRef(lines);
  const phaseRef = useRef(phase);
  // Lines length at job start — if it drifts before the result lands (insert/remove/
  // reorder mid-job), index-based results would land on the wrong lines.
  const startLinesLengthRef = useRef<number>(0);
  // Set when cancel() is called while still in 'starting' (no jobId yet); consumed
  // once start() resolves so the just-created job is cancelled instead of applied.
  const cancelRequestedRef = useRef(false);
  // Ref mirrors kept in effects (not during render) per react-hooks lint rules.
  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (youtubeAudioUrl) URL.revokeObjectURL(youtubeAudioUrl);
    };
  }, [youtubeAudioUrl]);


  // NOTE: results are index-based against the flat lines array captured at start().
  // The consuming UI must prevent line insert/remove/reorder while a job is active,
  // otherwise stamps land on the wrong lines.
  const applyResult = useCallback(
    (result: StampResultDto[]) => {
      const current = linesRef.current;
      const byIndex = new Map(result.map((r) => [r.index, r]));
      const conf = new Map<number, ConfidenceInfo>();
      const isWordsMode = editorMode === 'words';
      const next = current.map((line, i) => {
        const r = byIndex.get(i);
        if (!r || line.type === 'section') return line;
        if (r.timestamp === null) {
          // Unmatched line: never stamp, but surface it for review ('none' count/filter).
          conf.set(i, { confidence: r.confidence, status: r.status });
          return line;
        }
        if (applyMode === 'empty-only' && line.timestamp != null) return line;
        conf.set(i, { confidence: r.confidence, status: r.status });

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

        return {
          ...line,
          timestamp: r.timestamp,
          source: 'asr' as const,
          ...(r.endTime !== null ? { endTime: r.endTime } : {}),
          ...(mergedWords !== undefined ? { words: mergedWords } : {}),
        };
      });
      setLines(next); // single call → single undo entry
      setConfidenceByIndex(conf);
      setPendingResult(null);
      setPhase('completed');
    },
    [applyMode, editorMode, setLines],
  );

  const onResult = useCallback(
    (result: StampResultDto[]) => {
      setPhase('applying');
      const linesDrifted = linesRef.current.length !== startLinesLengthRef.current;
      const wouldOverwrite =
        applyMode === 'all' &&
        linesRef.current.some((l, i) => l.timestamp != null && result.some((r) => r.index === i && r.timestamp !== null));
      if (linesDrifted || wouldOverwrite) {
        setPendingResult(result);
        return; // wait for user confirmation
      }
      applyResult(result);
    },
    [applyMode, applyResult],
  );

  const handleJobUpdate = useCallback((evt: Pick<AsrJobDto, 'phase' | 'result' | 'errorCode'>) => {
    if (evt.phase === 'completed' && evt.result) {
      if (jobSourceRef.current === 'youtube' && jobIdRef.current) {
        // Fetch the cached audio buffer in the background so WaveSurfer can render the waveform
        getJobAudio(jobIdRef.current)
          .then(blob => setYoutubeAudioUrl(URL.createObjectURL(blob)))
          .catch(() => { /* non-fatal */ });
      }
      onResult(evt.result);
    }
    else if (evt.phase === 'failed') {
      setErrorCode(evt.errorCode ?? 'asr_network');
      setPhase('failed');
    } else if (evt.phase === 'cancelled') setPhase('cancelled');
    else setPhase(evt.phase as AutoStampPhase);
  }, [onResult]);

  useEffect(() => {
    // Idempotent: reuses the live socket, reconnects a stale one, creates if absent.
    const socket = connectSocket();

    const onProgress = (evt: AsrJobDto) => {
      if (evt.jobId !== jobIdRef.current) return;
      handleJobUpdate(evt);
    };

    // Missed-event recovery: progress events emitted while the socket was down are
    // gone forever, so on (re)connect re-query the job and replay its current state.
    const onConnect = async () => {
      const jobId = jobIdRef.current;
      if (!jobId || !ACTIVE_PHASES.has(phaseRef.current)) return;
      try {
        const job = await getStampJob(jobId);
        handleJobUpdate(job);
      } catch (err) {
        const { status, code } = err as { status?: number; code?: string };
        if (status === 404 || code === 'asr_job_not_found') {
          setErrorCode('asr_job_not_found'); // job swept server-side
          setPhase('failed');
        }
        // Other errors (network blip): keep current phase; next reconnect retries.
      }
    };

    socket.on('asr:progress', onProgress);
    socket.on('connect', onConnect);
    return () => {
      socket.off('asr:progress', onProgress);
      socket.off('connect', onConnect);
    };
  }, [handleJobUpdate]);

  const start = useCallback(async () => {
    setErrorCode(null);
    setPhase('starting');
    cancelRequestedRef.current = false;
    jobIdRef.current = null; // a stale previous job id must never be cancelled by mistake
    jobSourceRef.current = null;
    startLinesLengthRef.current = linesRef.current.length;
    if (youtubeAudioUrl) {
      URL.revokeObjectURL(youtubeAudioUrl);
      setYoutubeAudioUrl(null);
    }
    const isWordsMode = editorMode === 'words';
    const payload = linesRef.current
      .map((line, index) => {
        if (line.type === 'section') return null;
        const text = String(line.text ?? '');
        if (!text.trim()) return null;
        const entry: { index: number; text: string; wordTokens?: string[] } = { index, text };
        // In Words mode, send the client's pre-segmented word tokens so the server aligns
        // against the exact same word boundaries and result.words[pos] maps 1:1 to line.words[pos].
        if (isWordsMode && line.words && line.words.length > 0) {
          entry.wordTokens = line.words.map(w => w.word ?? '');
        }
        return entry;
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);
    try {
      let res: { jobId: string } | null = null;
      // getYoutubeUrl is the only SOURCE-GATED getter (non-null strictly when the
      // active player source is a ready YouTube video), so when it returns a URL
      // it must win — a stale uploadId or lingering local blob from previously
      // loaded media would otherwise shadow the audio actually playing.
      const youtubeUrl = getYoutubeUrl(); // read at invocation time — never cached
      if (youtubeUrl) {
        jobSourceRef.current = 'youtube';
        res = await startStamp({ lines: payload, youtubeUrl, fuzzyTolerance });
      } else if (uploadId) {
        jobSourceRef.current = 'upload';
        res = await startStamp({ lines: payload, uploadId, fuzzyTolerance });
      } else {
        jobSourceRef.current = 'local';
        const file = getLocalFile(); // read at invocation time — never cached
        if (file) res = await startStampWithFile({ lines: payload, file, fuzzyTolerance });
      }
      if (!res) {
        setErrorCode('asr_no_audio');
        setPhase('failed');
        return;
      }
      if (cancelRequestedRef.current) {
        // User cancelled while the job was still 'starting' (no jobId yet) — the job
        // now exists server-side, so cancel it instead of tracking/applying its result.
        void cancelStampJob(res.jobId);
        return;
      }
      jobIdRef.current = res.jobId;
      
      // Catch up on missed socket events: if the server transitioned the job phase 
      // synchronously before responding to this HTTP request, the socket event arrived 
      // when jobIdRef was null and was ignored.
      try {
        const job = await getStampJob(res.jobId);
        handleJobUpdate(job);
      } catch {
        // ignore, socket will catch up on reconnect or it's terminal
      }
    } catch (err) {
      setErrorCode((err as { code?: string }).code ?? 'asr_network');
      setPhase('failed');
    }
  }, [uploadId, getLocalFile, getYoutubeUrl, fuzzyTolerance, editorMode, handleJobUpdate, youtubeAudioUrl]);

  const cancel = useCallback(async () => {
    if (!jobIdRef.current) {
      if (phaseRef.current === 'starting') {
        cancelRequestedRef.current = true;
        setPhase('cancelled');
        return;
      }
      setPhase('idle');
      return;
    }
    try {
      await cancelStampJob(jobIdRef.current);
    } catch {
      /* already terminal */
    }
  }, []);

  const applyPending = useCallback(() => {
    if (pendingResult) applyResult(pendingResult);
  }, [pendingResult, applyResult]);

  const discardPending = useCallback(() => {
    setPendingResult(null);
    setPhase('idle');
  }, []);

  const clearConfidence = useCallback((lineIndex?: number) => {
    setConfidenceByIndex((prev) => {
      if (lineIndex === undefined) return new Map();
      if (!prev.has(lineIndex)) return prev;
      const next = new Map(prev);
      next.delete(lineIndex);
      return next;
    });
  }, []);

  return { phase, errorCode, pendingResult, confidenceByIndex, youtubeAudioUrl, start, cancel, applyPending, discardPending, clearConfidence };
}
