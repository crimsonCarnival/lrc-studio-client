import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { usePlayer } from '@/features/player/PlayerContext';
import { ISSUE_LIMITS, YOUTUBE_RULES } from '../subtitle-cues';
import { formatClock, parseClock } from '../subtitle-clock';
import { CueMenu, CueMenuButton, type CueActions } from './CueMenu';
import type { TranslationSlot } from '../subtitle-bundle';
import type { Cue, CueIssue, StudioRow } from '../subtitles.types';

type CueListProps = {
  rows: StudioRow[];
  cues: Cue[];
  /** Each line's own text as typed, by line index (a cue's `text` is the cleaned export form). */
  lineTexts: string[];
  /** The project's translation languages; every row has a field for each. */
  languages: TranslationSlot[];
  /** Each line's text in each language, by line index then slot. */
  translationTexts: string[][];
  issuesByCue: Map<number, CueIssue[]>;
  /** Show only the cues that have a problem. */
  onlyIssues: boolean;
  selectedLine: number | null;
  /** The line the Mark button will stamp next. */
  markTarget: number | null;
  onSelect: (cueIndex: number) => void;
  onSelectLine: (lineIndex: number) => void;
  onTimes: (cueIndex: number, edit: { start?: number; end?: number }) => void;
  onText: (cueIndex: number, text: string) => void;
  onLineText: (lineIndex: number, text: string) => void;
  onTranslation: (lineIndex: number, slot: number, text: string) => void;
  onMark: () => void;
  onAddLine: () => void;
  actions: CueActions;
};

const FIELD = 'h-8 w-[92px] rounded-lg border bg-background px-2 font-mono text-xs tabular-nums text-foreground select-text focus:outline-none focus:ring-1 focus:ring-primary/40';
const ACTION = 'grid size-8 coarse:size-11 place-items-center rounded-lg border border-zinc-700 bg-transparent text-foreground hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';
const LABELED = 'h-8 coarse:h-11 rounded-lg border border-zinc-700 bg-transparent px-2.5 text-[11px] font-semibold text-foreground hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';
const NO_TEXTS: string[] = [];
const TEXT_AREA = 'w-full resize-none rounded-lg border border-zinc-700 bg-background px-2.5 py-2 text-sm leading-snug text-foreground select-text focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/40';

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

type TranslationFieldsProps = {
  lineIndex: number;
  languages: TranslationSlot[];
  texts: string[];
  onTranslation: (lineIndex: number, slot: number, text: string) => void;
};

/** One field per translation language, under the line's own text. Applied on blur, like the text above it. */
function TranslationFields({ lineIndex, languages, texts, onTranslation }: TranslationFieldsProps) {
  const { t } = useTranslation();
  const tx = t as (key: string, options?: Record<string, unknown>) => string;
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  if (languages.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {languages.map((lang) => {
        const text = texts[lang.index] ?? '';
        return (
          <label key={lang.index} className="flex items-start gap-2">
            <span className="mt-2 w-[72px] shrink-0 truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground/65" title={lang.label}>{lang.label}</span>
            <textarea
              rows={1}
              aria-label={tx('editor.studio.translationOf', { language: lang.label })}
              value={drafts[lang.index] ?? text}
              onChange={(e) => setDrafts((d) => ({ ...d, [lang.index]: e.target.value }))}
              onBlur={() => {
                const draft = drafts[lang.index];
                if (draft != null && draft !== text) onTranslation(lineIndex, lang.index, draft);
                setDrafts((d) => Object.fromEntries(Object.entries(d).filter(([k]) => Number(k) !== lang.index)));
              }}
              className={`${TEXT_AREA} min-w-0 flex-1`}
            />
          </label>
        );
      })}
    </div>
  );
}

type CueRowProps = {
  index: number;
  /** Its place among the lines, as the user reads the list. */
  number: number;
  cue: Cue;
  text: string;
  languages: TranslationSlot[];
  translations: string[];
  issues?: CueIssue[];
  selected: boolean;
  playing: boolean;
  hasNext: boolean;
  onSelect: (cueIndex: number) => void;
  onTimes: (cueIndex: number, edit: { start?: number; end?: number }) => void;
  onText: (cueIndex: number, text: string) => void;
  onTranslation: (lineIndex: number, slot: number, text: string) => void;
  actions: CueActions;
};

const CueRow = memo(function CueRow({ index, number, cue, text, languages, translations, issues, selected, playing, hasNext, onSelect, onTimes, onText, onTranslation, actions }: CueRowProps) {
  const { t } = useTranslation();
  const tx = t as (key: string, options?: Record<string, unknown>) => string;
  const rowRef = useRef<HTMLLIElement>(null);
  // Applied on blur: typing a sentence is then one undo step, not one per keystroke.
  const [draft, setDraft] = useState<string | null>(null);
  const [timeInvalid, setTimeInvalid] = useState(false);

  useEffect(() => {
    if (selected) rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);
  // Follow the video, but never pull the list away from a row being typed into.
  useEffect(() => {
    if (!playing) return;
    const row = rowRef.current;
    if (row && !row.closest('ol')?.contains(document.activeElement)) row.scrollIntoView({ block: 'nearest' });
  }, [playing]);

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
        aria-label={tx('editor.studio.cueN', { n: number })}
        aria-pressed={selected}
        className={`size-8 shrink-0 rounded-lg font-mono text-xs font-semibold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
          selected || playing ? 'bg-primary text-zinc-950' : 'bg-zinc-800 text-foreground hover:bg-zinc-700'
        }`}
      >
        {number}
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
                <button type="button" title={tx('editor.studio.stampIn')} aria-label={tx('editor.studio.stampIn')} onClick={() => actions.onStamp(index, 'start')} className={LABELED}>
                  {tx('editor.studio.stampInShort')}
                </button>
                <button type="button" title={tx('editor.studio.stampOut')} aria-label={tx('editor.studio.stampOut')} onClick={() => actions.onStamp(index, 'end')} className={LABELED}>
                  {tx('editor.studio.stampOutShort')}
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
          className={TEXT_AREA}
        />
        <TranslationFields lineIndex={cue.lineIndex} languages={languages} texts={translations} onTranslation={onTranslation} />
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

type UntimedRowProps = {
  lineIndex: number;
  number: number;
  text: string;
  languages: TranslationSlot[];
  translations: string[];
  selected: boolean;
  isTarget: boolean;
  onSelectLine: (lineIndex: number) => void;
  onLineText: (lineIndex: number, text: string) => void;
  onTranslation: (lineIndex: number, slot: number, text: string) => void;
  onMark: () => void;
};

/** A line that has no time yet. It is listed so the user can see what is still left to sync. */
const UntimedRow = memo(function UntimedRow({ lineIndex, number, text, languages, translations, selected, isTarget, onSelectLine, onLineText, onTranslation, onMark }: UntimedRowProps) {
  const { t } = useTranslation();
  const tx = t as (key: string, options?: Record<string, unknown>) => string;
  const [draft, setDraft] = useState<string | null>(null);
  const rowRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (selected) rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  return (
    <li ref={rowRef} className={`flex gap-3 rounded-xl border border-dashed p-3 ${selected ? 'border-primary bg-primary/10' : 'border-zinc-700 bg-transparent'}`}>
      <button
        type="button"
        onClick={() => onSelectLine(lineIndex)}
        aria-label={tx('editor.studio.lineN', { n: number })}
        aria-pressed={selected}
        className="size-8 shrink-0 rounded-lg bg-zinc-800 font-mono text-xs font-semibold tabular-nums text-foreground/65 hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        {number}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <textarea
          rows={2}
          aria-label={tx('editor.studio.text')}
          value={draft ?? text}
          onFocus={() => onSelectLine(lineIndex)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft != null && draft !== text) onLineText(lineIndex, draft);
            setDraft(null);
          }}
          className={TEXT_AREA}
        />
        <TranslationFields lineIndex={lineIndex} languages={languages} texts={translations} onTranslation={onTranslation} />
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-foreground/65">{tx('editor.studio.notTimed')}</span>
          {isTarget && text.trim() !== '' && (
            <Button onClick={onMark} className="h-8 coarse:h-11 rounded-lg bg-primary px-3 text-xs font-bold text-zinc-950 hover:bg-primary-dim">
              {tx('editor.studio.markStart')}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
});

/**
 * Every subtitle as a row, in lyrics order and timed or not, so the list shows what is being
 * synced and what is left. It reads the playback clock itself, so a tick re-renders this
 * list's shell and only the rows whose "playing" state flipped.
 */
export const CueList = memo(function CueList({ rows, cues, lineTexts, languages, translationTexts, issuesByCue, onlyIssues, selectedLine, markTarget, onSelect, onSelectLine, onTimes, onText, onLineText, onTranslation, onMark, onAddLine, actions }: CueListProps) {
  const { t } = useTranslation();
  const { currentTime } = usePlayer();
  let number = 0;
  return (
    <ol className="lrc-scroll m-0 flex min-h-0 flex-1 list-none flex-col gap-2 overflow-y-auto p-3 pt-1">
      {rows.map((row) => {
        if (row.kind === 'section') {
          if (onlyIssues) return null;
          return (
            <li key={`section-${row.lineIndex}`} className="px-1 pt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/65">
              {row.label}
            </li>
          );
        }
        number++;
        if (row.kind === 'untimed') {
          if (onlyIssues) return null;
          return (
            <UntimedRow
              key={row.lineIndex}
              lineIndex={row.lineIndex}
              number={number}
              text={lineTexts[row.lineIndex] ?? ''}
              languages={languages}
              translations={translationTexts[row.lineIndex] ?? NO_TEXTS}
              selected={row.lineIndex === selectedLine}
              isTarget={row.lineIndex === markTarget}
              onSelectLine={onSelectLine}
              onLineText={onLineText}
              onTranslation={onTranslation}
              onMark={onMark}
            />
          );
        }
        const cue = cues[row.cueIndex];
        if (onlyIssues && !issuesByCue.has(row.cueIndex)) return null;
        return (
          <CueRow
            key={row.lineIndex}
            index={row.cueIndex}
            number={number}
            cue={cue}
            text={lineTexts[cue.lineIndex] ?? ''}
            languages={languages}
            translations={translationTexts[cue.lineIndex] ?? NO_TEXTS}
            issues={issuesByCue.get(row.cueIndex)}
            selected={cue.lineIndex === selectedLine}
            playing={currentTime >= cue.start && currentTime < cue.end}
            hasNext={row.cueIndex < cues.length - 1}
            onSelect={onSelect}
            onTimes={onTimes}
            onText={onText}
            onTranslation={onTranslation}
            actions={actions}
          />
        );
      })}
      {number === 0 && <li className="p-6 text-center text-sm text-foreground/65">{t('editor.studio.noLines')}</li>}
      {!onlyIssues && (
        <li className="pt-1">
          <Button variant="outline" onClick={onAddLine} className="h-11 w-full gap-2 rounded-[calc(var(--radius)*1)] border-dashed border-zinc-700 bg-transparent text-[13px] font-semibold text-foreground">
            <Icon name="add" size={16} />
            {t('editor.studio.addLine')}
          </Button>
        </li>
      )}
    </ol>
  );
});
