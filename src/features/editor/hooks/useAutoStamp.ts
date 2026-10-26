import { useCallback, useEffect, useRef, useState } from 'react';
import { connectSocket } from '@/app/socket.client';
import { startStamp, startStampWithFile, getStampJob, cancelStampJob, getJobAudio, type StampResultDto, type AsrJobDto } from '../services/asr.service';
import type { EditorLine } from '../services/editor.service';
import { alignLineStart } from '../services/editor.service';
import { NoTabAudioError, recordTabAudio } from '@/features/visualizer/audio-source';
import type { TabRecording } from '@/features/visualizer/audio-source';

export type AutoStampPhase =
  | 'idle'
  | 'starting'
  | 'recording'
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

/** How the hook drives the YouTube player while it records the tab. */
export type TabPlayback = {
  getState: () => { currentTime: number; duration: number; isPlaying: boolean };
  /** Seek to 0, normal speed, paused: the recording's clock must equal the song's. */
  prepare: () => void;
  setPlaying: (playing: boolean) => void;
};

// Matches the server's yt-dlp cap, so a recording can't outlast what a normal job would accept.
const MAX_RECORD_SECONDS = 20 * 60;
const RECORD_POLL_MS = 250;
// Playback moves ~RECORD_POLL_MS per poll; anything far outside that is a seek, which would
// leave a hole (or a repeat) in the recording and shift every timestamp after it.
const MAX_POLL_DRIFT_SECONDS = 1.5;
// play() is asynchronous; give the player a moment to actually start before treating
// "not playing" as a pause.
const PLAY_START_GRACE_MS = 4000;
// Within this many seconds of the end, a stop or rewind counts as the video finishing.
const END_TOLERANCE_SECONDS = 3;

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
  /** Enables startFromTab; without it the tab-recording fallback is unavailable. */
  tabPlayback?: TabPlayback;
};

export function useAutoStamp({ lines, setLines, uploadId, getLocalFile, getYoutubeUrl, fuzzyTolerance, applyMode, editorMode, tabPlayback }: Params) {
  const [phase, setPhase] = useState<AutoStampPhase>('idle');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [pendingResult, setPendingResult] = useState<StampResultDto[] | null>(null);
  // Keyed by line id, not by position: a badge must stay on its own line after a
  // drag reorder, an insert or a delete. Position keys silently mislabelled lines.
  const [confidenceById, setConfidenceById] = useState<Map<string, ConfidenceInfo>>(new Map());
  const [youtubeAudioUrl, setYoutubeAudioUrl] = useState<string | null>(null);
  const [recordProgress, setRecordProgress] = useState(0);
  const recordingRef = useRef<{ recording: TabRecording; end: (reason: 'cancelled' | 'interrupted') => void } | null>(null);
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
      const conf = new Map<string, ConfidenceInfo>();
      const isWordsMode = editorMode === 'words';

      // `id` is optional on EditorLine (server-parsed lines can arrive without
      // one), so mint one here for any line we're about to record confidence
      // for. Returns the id plus the line to keep, which is the original object
      // whenever it already had an id.
      const ensureId = (line: EditorLine): [string, EditorLine] => {
        const existing = line.id != null ? String(line.id) : '';
        if (existing) return [existing, line];
        const id = crypto.randomUUID();
        return [id, { ...line, id }];
      };

      const next = current.map((line, i) => {
        const r = byIndex.get(i);
        if (!r || line.type === 'section') return line;
        if (r.timestamp === null) {
          // Unmatched line: never stamp, but surface it for review ('none' count/filter).
          const [id, withId] = ensureId(line);
          conf.set(id, { confidence: r.confidence, status: r.status });
          return withId;
        }
        // In Words mode "already stamped" has to mean the WORDS are stamped, not
        // the line. The normal workflow is: rough-sync the line first, switch to
        // Words mode, then run Auto Stamp to fill per-word times — at that point
        // every line already has line.timestamp, so gating on it here skipped
        // every line and merged no words at all. Auto Stamp looked like it did
        // nothing for the entire mode.
        const alreadyStamped = isWordsMode
          ? (line.words?.some((w) => w.time != null) ?? false)
          : line.timestamp != null;
        if (applyMode === 'empty-only' && alreadyStamped) return line;
        const [id, withId] = ensureId(line);
        line = withId;
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
        // already rough-synced (the normal pre-condition for running this at
        // all) must not have ITS timestamp silently replaced by the ASR's own
        // just because its words were the part that was actually missing.
        const keepOwnTiming = isWordsMode && applyMode === 'empty-only' && line.timestamp != null;

        const stamped: EditorLine = {
          ...line,
          ...(keepOwnTiming ? {} : { timestamp: r.timestamp, ...(r.endTime !== null ? { endTime: r.endTime } : {}) }),
          source: 'asr' as const,
          ...(mergedWords !== undefined ? { words: mergedWords } : {}),
        };
        if (!isWordsMode) return stamped;
        // Words mode holds line.timestamp and words[0].time as one instant. Which
        // of the two wins depends on what empty-only promised: when the user's own
        // line timing is being kept, the first word moves onto it; otherwise the
        // line moves onto the ASR's (more precise) first-word time.
        const anchor = keepOwnTiming ? stamped.timestamp : (mergedWords?.[0]?.time ?? stamped.timestamp);
        return anchor != null ? alignLineStart(stamped, anchor) : stamped;
      });
      setLines(next); // single call → single undo entry
      setConfidenceById(conf);
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

  const start = useCallback(async (recordedFile?: File) => {
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
      if (recordedFile) {
        jobSourceRef.current = 'local';
        res = await startStampWithFile({ lines: payload, file: recordedFile, fuzzyTolerance });
      } else if (youtubeUrl) {
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

  /**
   * Fallback for when the server cannot fetch the YouTube audio: records this tab while the
   * video plays from 0:00 to the end, then stamps that recording like an uploaded file.
   * Must be called straight from a click handler (the share prompt needs the gesture).
   */
  const startFromTab = useCallback(async () => {
    if (!tabPlayback) return;
    const { duration } = tabPlayback.getState();
    setErrorCode(null);
    if (!(duration > 0) || duration > MAX_RECORD_SECONDS) {
      setErrorCode(duration > 0 ? 'asr_youtube_too_long' : 'asr_no_audio');
      setPhase('failed');
      return;
    }
    cancelRequestedRef.current = false;
    setRecordProgress(0);
    setPhase('recording');

    let recording: TabRecording;
    try {
      recording = await recordTabAudio();
    } catch (err) {
      setErrorCode(
        err instanceof NoTabAudioError ? 'asr_recording_no_audio'
          : err instanceof DOMException && err.name === 'NotAllowedError' ? 'asr_recording_denied'
            : 'asr_recording_failed',
      );
      setPhase('failed');
      return;
    }

    // Resolves with why the recording ended; 'ended' means the song played through.
    const outcome = await new Promise<'ended' | 'cancelled' | 'interrupted'>((resolve) => {
      let settled = false;
      let timer = 0;
      const end = (reason: 'ended' | 'cancelled' | 'interrupted') => {
        if (settled) return;
        settled = true;
        window.clearInterval(timer);
        recording.track.removeEventListener('ended', onTrackEnded);
        resolve(reason);
      };
      const onTrackEnded = () => end('interrupted'); // the browser's own "Stop sharing"
      recording.track.addEventListener('ended', onTrackEnded);
      recordingRef.current = { recording, end };

      tabPlayback.prepare();
      const startedAt = Date.now();
      let last = 0;
      let furthest = 0;
      tabPlayback.setPlaying(true);
      timer = window.setInterval(() => {
        const { currentTime, duration: total, isPlaying } = tabPlayback.getState();
        setRecordProgress(total > 0 ? Math.min(1, currentTime / total) : 0);
        // Until the player has caught up with prepare(), its reported position may still be
        // wherever the user left it, including the end of the song.
        const graceOver = Date.now() - startedAt > PLAY_START_GRACE_MS;
        if (graceOver) furthest = Math.max(furthest, currentTime);
        // The last polled position can sit short of the duration when the video ends, and the
        // player then reports "not playing" or rewinds to 0. Having played to the end, that is
        // the song finishing, not a pause or a seek.
        const playedToEnd = graceOver && furthest >= total - END_TOLERANCE_SECONDS;
        if (graceOver && currentTime >= total - 0.3) { end('ended'); return; }
        if (playedToEnd && (!isPlaying || currentTime < furthest - 1)) { end('ended'); return; }
        const jumped = Math.abs(currentTime - last) > MAX_POLL_DRIFT_SECONDS;
        // A pause or seek leaves a hole in the audio; stamps would be plausible but wrong.
        if (jumped && graceOver) { end('interrupted'); return; }
        if (!isPlaying && graceOver) { end('interrupted'); return; }
        last = currentTime;
      }, RECORD_POLL_MS);
    });
    recordingRef.current = null;
    tabPlayback.setPlaying(false);

    if (outcome !== 'ended') {
      recording.abort();
      if (outcome === 'interrupted') {
        setErrorCode('asr_recording_interrupted');
        setPhase('failed');
      } else setPhase('cancelled');
      return;
    }
    const blob = await recording.stop();
    // The server picks the decoder from the extension.
    await start(new File([blob], 'tab-recording.webm', { type: 'audio/webm' }));
  }, [tabPlayback, start]);

  const cancel = useCallback(async () => {
    if (recordingRef.current) {
      recordingRef.current.end('cancelled');
      return;
    }
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

  /** Omit `lineId` to clear every badge. Unknown ids are a no-op. */
  const clearConfidence = useCallback((lineId?: string) => {
    setConfidenceById((prev) => {
      if (lineId === undefined) return new Map();
      if (!prev.has(lineId)) return prev;
      const next = new Map(prev);
      next.delete(lineId);
      return next;
    });
  }, []);

  return { phase, errorCode, pendingResult, confidenceById, youtubeAudioUrl, recordProgress, start, startFromTab, cancel, applyPending, discardPending, clearConfidence };
}
