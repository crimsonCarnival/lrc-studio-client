import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { usePlayer } from '@/features/player/PlayerContext';
import { ISSUE_LIMITS, YOUTUBE_RULES } from '../subtitle-cues';
import { formatClock, parseClock } from '../subtitle-clock';
import { CueMenu, CueMenuButton, type CueActions } from './CueMenu';
import type { Cue, CueIssue } from '../subtitles.types';

type CueListProps = {
  cues: Cue[];
  /** The line's own text for each cue, as typed (a cue's `text` is the cleaned export form). */
  texts: string[];
  issuesByCue: Map<number, CueIssue[]>;
  /** Show only the cues that have a problem. */
  onlyIssues: boolean;
  selectedLine: number | null;
  onSelect: (cueIndex: number) => void;
  onTimes: (cueIndex: number, edit: { start?: number; end?: number }) => void;
  onText: (cueIndex: number, text: string) => void;
  actions: CueActions;
};

const FIELD = 'h-8 w-[92px] rounded-lg border bg-background px-2 font-mono text-xs tabular-nums text-foreground select-text focus:outline-none focus:ring-1 focus:ring-primary/40';
const ACTION = 'grid size-8 coarse:size-11 place-items-center rounded-lg border border-zinc-700 bg-transparent text-foreground hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

/** A time typed freely and applied on blur or Enter; Escape or an unreadable value restores it. */
function TimeField({ value, label, onCommit, onInvalid }: { value: number; label: string; onCommit: (seconds: number) => void; onInvalid: (invalid: boolean) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const invalid = draft != null && parseClock(draft) == null;
  const commit = () => {
    if (draft == null) return;
    const parsed = parseClock(draft);
    setDraft(null);
    onInvalid(false);
    if (parsed != null && Math.abs(parsed - value) >= 0.0005) onCommit(parsed);
  };
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      aria-invalid={invalid}
      value={draft ?? formatClock(value)}
      onChange={(e) => {
        setDraft(e.target.value);
        onInvalid(parseClock(e.target.value) == null);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        else if (e.key === 'Escape') { setDraft(null); onInvalid(false); }
      }}
      className={`${FIELD} ${invalid ? 'border-destructive' : 'border-zinc-700 focus:border-primary/50'}`}
    />
  );
}

type CueRowProps = {
  index: number;
  cue: Cue;
  text: string;
  issues?: CueIssue[];
  selected: boolean;
  playing: boolean;
  hasNext: boolean;
  onSelect: (cueIndex: number) => void;
  onTimes: (cueIndex: number, edit: { start?: number; end?: number }) => void;
  onText: (cueIndex: number, text: string) => void;
  actions: CueActions;
};

const CueRow = memo(function CueRow({ index, cue, text, issues, selected, playing, hasNext, onSelect, onTimes, onText, actions }: CueRowProps) {
  const { t } = useTranslation();
  const tx = t as (key: string, options?: Record<string, unknown>) => string;
  const rowRef = useRef<HTMLLIElement>(null);
  // Applied on blur: typing a sentence is then one undo step, not one per keystroke.
  const [draft, setDraft] = useState<string | null>(null);
  const [timeInvalid, setTimeInvalid] = useState(false);

  useEffect(() => {
    if (selected) rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const textLines = cue.text.split('\n');
  const longest = Math.max(...textLines.map((l) => [...l].length));
  const hasError = issues?.some((i) => i.severity === 'error');
  const note = timeInvalid
    ? tx('editor.studio.timeHint')
    : issues?.map((i) => tx(`editor.studio.issue.${i.code}`, { limit: ISSUE_LIMITS[i.code] })).join(' · ');
  const noteTone = timeInvalid || hasError ? 'text-destructive' : 'text-warning-dim dark:text-warning';
  const lengthFlagged = !!issues?.some((i) => i.code === 'too_short' || i.code === 'too_long');

  return (
    <CueMenu cue={cue} index={index} hasNext={hasNext} actions={actions}>
    <li
      ref={rowRef}
      className={`flex gap-3 rounded-xl border p-3 ${selected ? 'border-primary bg-primary/10' : 'border-zinc-800 bg-zinc-900/60'}`}
    >
      <button
        type="button"
        onClick={() => onSelect(index)}
        aria-label={tx('editor.studio.cueN', { n: index + 1 })}
        aria-pressed={selected}
        className={`size-8 shrink-0 rounded-lg font-mono text-xs font-semibold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
          selected || playing ? 'bg-primary text-zinc-950' : 'bg-zinc-800 text-foreground hover:bg-zinc-700'
        }`}
      >
        {index + 1}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <TimeField value={cue.start} label={tx('editor.studio.start')} onCommit={(v) => onTimes(index, { start: v })} onInvalid={setTimeInvalid} />
          <Icon name="arrow_forward" size={14} className="text-foreground/65" />
          <TimeField value={cue.end} label={tx('editor.studio.end')} onCommit={(v) => onTimes(index, { end: v })} onInvalid={setTimeInvalid} />
          <span className={`whitespace-nowrap font-mono text-xs tabular-nums ${lengthFlagged ? 'text-warning-dim dark:text-warning' : 'text-foreground/65'}`}>
            {(cue.end - cue.start).toFixed(1)} s
          </span>
          <span className="ml-auto flex gap-1">
            {selected && (
              <>
                <button type="button" aria-label={tx('editor.studio.stampIn')} title={tx('editor.studio.stampIn')} onClick={() => actions.onStamp(index, 'start')} className={`${ACTION} font-mono text-[11px] font-semibold`}>
                  [
                </button>
                <button type="button" aria-label={tx('editor.studio.stampOut')} title={tx('editor.studio.stampOut')} onClick={() => actions.onStamp(index, 'end')} className={`${ACTION} font-mono text-[11px] font-semibold`}>
                  ]
                </button>
              </>
            )}
            <CueMenuButton cue={cue} index={index} hasNext={hasNext} actions={actions} className={ACTION} />
          </span>
        </div>
        <textarea
          rows={2}
          aria-label={tx('editor.studio.text')}
          value={draft ?? text}
          onFocus={() => onSelect(index)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft != null && draft !== text) onText(index, draft);
            setDraft(null);
          }}
          className="w-full resize-none rounded-lg border border-zinc-700 bg-background px-2.5 py-2 text-sm leading-snug text-foreground select-text focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/40"
        />
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-foreground/65">
            {tx('editor.studio.charCount', { count: textLines.length, chars: longest, limit: YOUTUBE_RULES.maxLineChars })}
          </span>
          {note && (
            <span className={`flex items-center gap-1.5 text-right ${noteTone}`}>
              <Icon name="warning" size={14} className="shrink-0" />
              {note}
            </span>
          )}
        </div>
      </div>
    </li>
    </CueMenu>
  );
});

/**
 * The cues as editable rows. It reads the playback clock itself, so a tick re-renders
 * this list's shell and only the rows whose "playing" state flipped.
 */
export const CueList = memo(function CueList({ cues, texts, issuesByCue, onlyIssues, selectedLine, onSelect, onTimes, onText, actions }: CueListProps) {
  const { currentTime } = usePlayer();
  return (
    <ol className="lrc-scroll m-0 flex min-h-0 flex-1 list-none flex-col gap-2 overflow-y-auto p-3 pt-1">
      {cues.map((cue, i) => {
        if (onlyIssues && !issuesByCue.has(i)) return null;
        const selected = cue.lineIndex === selectedLine;
        return (
          <CueRow
            key={cue.lineIndex}
            index={i}
            cue={cue}
            text={texts[i]}
            issues={issuesByCue.get(i)}
            selected={selected}
            playing={currentTime >= cue.start && currentTime < cue.end}
            hasNext={i < cues.length - 1}
            onSelect={onSelect}
            onTimes={onTimes}
            onText={onText}
            actions={actions}
          />
        );
      })}
    </ol>
  );
});
