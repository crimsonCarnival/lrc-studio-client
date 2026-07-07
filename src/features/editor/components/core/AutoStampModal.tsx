import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ResponsiveModal from '@/shared/ui/ResponsiveModal';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { Icon } from '@/shared/ui/Icon';
import { formatTime } from '@/shared/utils/format-time';
import type { AutoStampPhase, ConfidenceInfo } from '@/features/editor/hooks/useAutoStamp';
import type { StampResultDto } from '@/features/editor/services/asr.service';
import type { EditorLine } from '@/features/editor/services/editor.service';

interface AutoStampModalProps {
  open: boolean;
  phase: AutoStampPhase;
  errorCode: string | null;
  pendingResult: StampResultDto[] | null;
  confidenceByIndex: Map<number, ConfidenceInfo>;
  lines: EditorLine[];
  confidenceThreshold: number;
  onCancel: () => void;
  onApply: () => void;
  onDiscard: () => void;
  onClose: () => void;
  onJumpToLine: (index: number) => void;
}

const RUNNING_PHASE_KEYS: Partial<Record<AutoStampPhase, string>> = {
  starting: 'phaseStarting',
  fetching_audio: 'phaseFetching',
  extracting_audio: 'phaseExtracting',
  transcribing: 'phaseTranscribing',
  aligning: 'phaseAligning',
  applying: 'phaseApplying',
};

// Every error code the server can emit that has a matching locale key. Anything
// else (unrecognized/future codes) falls back to a generic message instead of
// rendering a raw, untranslated 'editor.autoStamp.errors.<code>' key path.
const KNOWN_ERRORS = new Set([
  'asr_no_audio',
  'asr_not_configured',
  'asr_invalid_key',
  'asr_rate_limited',
  'asr_timeout',
  'asr_network',
  'asr_empty_transcript',
  'asr_unsupported_audio',
  'asr_youtube_blocked',
  'asr_youtube_unavailable',
  'asr_youtube_too_long',
  'asr_malformed_response',
  'asr_job_active',
  'asr_job_not_found',
  'not_found',
]);

function lyricNumber(lines: EditorLine[], index: number): number {
  return lines.slice(0, index).filter((l) => l.type !== 'section').length + 1;
}

export default function AutoStampModal({
  open,
  phase,
  errorCode,
  pendingResult,
  confidenceByIndex,
  lines,
  confidenceThreshold,
  onCancel,
  onApply,
  onDiscard,
  onClose,
  onJumpToLine,
}: AutoStampModalProps) {
  const { t } = useTranslation();

  const overwriteCount = useMemo(() => {
    if (!pendingResult) return 0;
    return pendingResult.filter((r) => r.timestamp !== null && lines[r.index]?.timestamp != null).length;
  }, [pendingResult, lines]);

  const statusCounts = useMemo(() => {
    const counts = { matched: 0, partial: 0, low: 0, none: 0 };
    confidenceByIndex.forEach((info) => {
      counts[info.status] += 1;
    });
    return counts;
  }, [confidenceByIndex]);

  const uncertainLines = useMemo(() => {
    const entries: { index: number; info: ConfidenceInfo }[] = [];
    confidenceByIndex.forEach((info, index) => {
      if (info.confidence < confidenceThreshold) entries.push({ index, info });
    });
    return entries.sort((a, b) => a.index - b.index);
  }, [confidenceByIndex, confidenceThreshold]);

  const appliedLines = useMemo(() => {
    const entries: { index: number; info: ConfidenceInfo }[] = [];
    confidenceByIndex.forEach((info, index) => {
      entries.push({ index, info });
    });
    return entries.sort((a, b) => a.index - b.index);
  }, [confidenceByIndex]);


  const runningPhaseKey = RUNNING_PHASE_KEYS[phase];
  const isConfirming = pendingResult != null;
  const isCompleted = !isConfirming && phase === 'completed';
  const isFailed = !isConfirming && phase === 'failed';
  const isRunning = !isConfirming && !isCompleted && !isFailed && !!runningPhaseKey;

  let title = '';
  if (isConfirming) title = t('editor.autoStamp.confirmOverwriteTitle');
  else if (isCompleted) title = t('editor.autoStamp.completedTitle');
  else if (isFailed) {
    const knownCode = errorCode && KNOWN_ERRORS.has(errorCode) ? errorCode : 'generic';
    title = t(('editor.autoStamp.errors.' + knownCode) as 'editor.autoStamp.errors.asr_network');
  }
  else if (isRunning) title = t(('editor.autoStamp.' + runningPhaseKey) as 'editor.autoStamp.phaseStarting');

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(next) => { if (!next) onClose(); }}
      title={title}
      dialogProps={{ className: 'max-w-md w-[90vw]' }}
    >
      <div className="flex flex-col gap-4 mt-1">
        {isRunning && (() => {
          const progressMap: Partial<Record<AutoStampPhase, number>> = {
            starting: 5,
            fetching_audio: 15,
            extracting_audio: 30,
            transcribing: 60,
            aligning: 90,
            applying: 99,
          };
          const pct = progressMap[phase] || 0;

          return (
            <div className="flex flex-col gap-4 items-center py-4">
              <Icon name="progress_activity" size={32} className="animate-spin text-primary" />
              
              <div className="w-full flex flex-col gap-1.5 mt-2">
                <div className="flex justify-between items-center text-xs font-mono text-zinc-400 px-1">
                  <span className="uppercase tracking-wider">{title}</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden relative">
                  <div 
                    className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-700 ease-in-out" 
                    style={{ width: `${pct}%` }} 
                  />
                  <div className="absolute top-0 left-0 h-full w-full bg-white/20 rounded-full animate-pulse opacity-0 transition-opacity" style={{ opacity: pct > 0 ? 1 : 0 }} />
                </div>
              </div>

              <Button
                variant="outline"
                onClick={onCancel}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 mt-2"
              >
                {t('editor.autoStamp.cancel')}
              </Button>
            </div>
          );
        })()}

        {isConfirming && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-400">
              {t('editor.autoStamp.confirmOverwriteBody', { count: overwriteCount })}
            </p>

            {pendingResult && pendingResult.length > 0 && (
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1 -mr-1">
                {pendingResult.map((r) => r.timestamp !== null && (
                  <div
                    key={r.index}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs bg-zinc-900/60 border border-zinc-800"
                  >
                    <span className="font-mono tabular-nums text-zinc-500 shrink-0 w-8">
                      #{lyricNumber(lines, r.index)}
                    </span>
                    <span className="font-mono tabular-nums text-primary shrink-0 w-16">
                      {formatTime(r.timestamp)}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-zinc-300">
                      {lines[r.index]?.text || t('editor.emptyLine')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onDiscard} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                {t('editor.autoStamp.discard')}
              </Button>
              <Button onClick={onApply} className="bg-primary text-zinc-950 hover:bg-primary/90">
                {t('editor.autoStamp.apply')}
              </Button>
            </div>
          </div>
        )}


        {isCompleted && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {statusCounts.matched > 0 && (
                <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
                  {t('editor.autoStamp.summaryMatched', { count: statusCounts.matched })}
                </Badge>
              )}
              {statusCounts.partial > 0 && (
                <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
                  {t('editor.autoStamp.summaryPartial', { count: statusCounts.partial })}
                </Badge>
              )}
              {statusCounts.low > 0 && (
                <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
                  {t('editor.autoStamp.summaryLow', { count: statusCounts.low })}
                </Badge>
              )}
              {statusCounts.none > 0 && (
                <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
                  {t('editor.autoStamp.summaryNone', { count: statusCounts.none })}
                </Badge>
              )}
            </div>

            {uncertainLines.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2 border-t border-zinc-800/60 pt-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  {t('editor.autoStamp.uncertainLines')}
                </span>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                  {uncertainLines.map(({ index, info }) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => onJumpToLine(index)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs bg-zinc-900/60 border border-zinc-800 hover:border-warning/40 hover:bg-warning/5 transition-colors"
                    >
                      <span className="font-mono tabular-nums text-zinc-600 shrink-0 w-8">
                        #{lyricNumber(lines, index)}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-zinc-300">
                        {lines[index]?.text || t('editor.emptyLine')}
                      </span>
                      <span className="shrink-0 text-warning font-mono tabular-nums">
                        {Math.round(info.confidence * 100)}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {appliedLines.length > 0 && uncertainLines.length === 0 && (
              <div className="flex flex-col gap-1.5 mt-2 border-t border-zinc-800/60 pt-4">
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1 -mr-1">
                  {appliedLines.map(({ index, info: _info }) => lines[index]?.timestamp !== null && (
                    <button
                      key={index}
                      type="button"
                      onClick={() => onJumpToLine(index)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs bg-zinc-900/60 border border-zinc-800 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      <span className="font-mono tabular-nums text-zinc-500 shrink-0 w-8">
                        #{lyricNumber(lines, index)}
                      </span>
                      <span className="font-mono tabular-nums text-primary shrink-0 w-16">
                        {formatTime(lines[index]?.timestamp ?? 0)}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-zinc-300">
                        {lines[index]?.text || t('editor.emptyLine')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}


            <div className="flex justify-end">
              <Button onClick={onClose} className="bg-primary text-zinc-950 hover:bg-primary/90">
                {t('editor.autoStamp.close')}
              </Button>
            </div>
          </div>
        )}

        {isFailed && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-end">
              <Button onClick={onClose} className="bg-primary text-zinc-950 hover:bg-primary/90">
                {t('editor.autoStamp.close')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
}
