import { memo, useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { computeCurrentIndex } from '@/features/preview/lyrics-position';
import { formatTimestamp } from '@/shared/utils/lrc';
import { KEY_SYMBOLS } from '@features/settings/key-symbols';
import { formatSectionLabel } from '@features/editor/constants/sectionTypes';
import type { EditorLine } from '@/features/editor/services/editor.service';
import type { AppSettings } from '@/features/settings/settings.types';

const CARD = 'rounded-2xl border border-zinc-800 bg-zinc-900';
const CAPTION = 'text-xs font-bold uppercase tracking-[0.08em] text-foreground/65';
const FIELD = 'h-10 w-full rounded-[10px] border border-zinc-700 bg-zinc-800 px-2.5 text-sm text-foreground disabled:opacity-60';
const UNTIMED = '--:--.--';

interface EditorSidePanelProps {
  lines: EditorLine[];
  playbackPosition: number;
  duration?: number;
  editorMode: string;
  /** The line marking acts on. */
  activeLineIndex: number;
  /** Singer names offered in the inspector. */
  singers: string[];
  settings: AppSettings;
  onMoveToSection: (lineIndex: number, sectionIndex: number) => void;
  onAssignSinger: (name: string, lineIndex: number) => void;
}

/** Splits a line into the part already sung and the rest, at word granularity. */
function splitSung(line: EditorLine, position: number, lineEnd: number | null): [string, string] {
  const text = line.text ?? '';
  if (line.timestamp == null || position < line.timestamp) return ['', text];
  const timed = line.words?.filter((w) => w.time != null) ?? [];
  if (timed.length > 0 && line.words) {
    // Per-word times: a word is sung once its own time has passed.
    let cut = 0;
    for (const w of line.words) {
      if (w.time != null && w.time > position) break;
      cut++;
    }
    return [line.words.slice(0, cut).map((w) => w.word).join(' '), line.words.slice(cut).map((w) => w.word).join(' ')];
  }
  // Line-level time only: spread the words evenly over the line's duration.
  const words = text.split(/\s+/).filter(Boolean);
  if (lineEnd == null || lineEnd <= line.timestamp) return [text, ''];
  const cut = Math.min(words.length, Math.ceil(((position - line.timestamp) / (lineEnd - line.timestamp)) * words.length));
  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
}

function LiveCard({ lines, playbackPosition, duration, editorMode }: Pick<EditorSidePanelProps, 'lines' | 'playbackPosition' | 'duration' | 'editorMode'>) {
  const { t } = useTranslation();
  const currentIndex: number = computeCurrentIndex(lines, playbackPosition, editorMode);

  const { previous, current, next, currentEnd } = useMemo(() => {
    const isLyric = (l: EditorLine | undefined) => !!l && l.type !== 'section' && !!l.text?.trim();
    let previous: EditorLine | null = null;
    for (let i = currentIndex - 1; i >= 0 && !previous; i--) if (isLyric(lines[i])) previous = lines[i];
    let next: EditorLine | null = null;
    let currentEnd: number | null = currentIndex >= 0 ? (lines[currentIndex].endTime ?? null) : null;
    for (let i = currentIndex + 1; i < lines.length; i++) {
      if (!isLyric(lines[i])) continue;
      if (!next) next = lines[i];
      if (currentEnd == null && lines[i].timestamp != null) currentEnd = lines[i].timestamp as number;
      if (next && currentEnd != null) break;
    }
    return { previous, current: currentIndex >= 0 ? lines[currentIndex] : null, next, currentEnd: currentEnd ?? duration ?? null };
  }, [lines, currentIndex, duration]);

  const [sung, rest] = current ? splitSung(current, playbackPosition, currentEnd) : ['', ''];

  return (
    <section aria-label={t('editor.live.title')} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={CAPTION}>{t('editor.live.title')}</span>
        <span className="font-mono text-xs tabular-nums text-foreground/65">{formatTimestamp(playbackPosition)}</span>
      </div>
      <div className={`${CARD} p-6 flex flex-col gap-3.5 min-h-[168px] justify-center`}>
        {previous && <p className="text-[15px] text-foreground/45 break-words">{previous.text}</p>}
        {current ? (
          <p className="font-heading font-bold text-[28px] leading-[1.15] break-words">
            <span className="text-primary">{sung}{sung && rest ? ' ' : ''}</span>
            <span className="text-foreground">{rest}</span>
          </p>
        ) : (
          <p className="text-sm italic text-foreground/65">{t('editor.live.waiting')}</p>
        )}
        {next && <p className="text-[15px] text-foreground/65 break-words">{next.text}</p>}
      </div>
    </section>
  );
}

function LineInspector({ lines, activeLineIndex, duration, singers, onMoveToSection, onAssignSinger }: Pick<EditorSidePanelProps, 'lines' | 'activeLineIndex' | 'duration' | 'singers' | 'onMoveToSection' | 'onAssignSinger'>) {
  const { t } = useTranslation();
  const id = useId();
  const line: EditorLine | undefined = lines[activeLineIndex];

  const { sections, currentSection, lyricNumber, end } = useMemo(() => {
    const sections: { index: number; label: string }[] = [];
    let currentSection = -1;
    let lyricNumber = 0;
    let end: number | null = null;
    lines.forEach((l, i) => {
      if (l.type === 'section') {
        sections.push({ index: i, label: l.label ?? '' });
        if (i < activeLineIndex) currentSection = i;
      } else {
        if (i <= activeLineIndex) lyricNumber++;
        else if (end == null && l.timestamp != null) end = l.timestamp;
      }
    });
    return { sections, currentSection, lyricNumber, end };
  }, [lines, activeLineIndex]);

  if (!line || line.type === 'section') return null;

  const lineEnd = line.endTime ?? end ?? duration ?? null;
  const length = line.timestamp != null && lineEnd != null && lineEnd > line.timestamp ? lineEnd - line.timestamp : null;
  // The inspector edits the first singer slot; a custom name not in the roster still shows.
  const singer = line.singers?.[0] ?? '';
  const singerOptions = singer && !singers.includes(singer) ? [singer, ...singers] : singers;

  return (
    <section aria-label={t('editor.inspector.title', { number: lyricNumber })} className={`${CARD} p-[18px] flex flex-col gap-3.5`}>
      <h3 className="font-sans text-sm font-bold text-foreground">{t('editor.inspector.title', { number: lyricNumber })}</h3>

      <label htmlFor={`${id}-section`} className="flex flex-col gap-1.5 text-xs text-foreground/65">
        {t('editor.inspector.section')}
        <select
          id={`${id}-section`}
          value={currentSection}
          disabled={sections.length === 0}
          onChange={(e) => onMoveToSection(activeLineIndex, Number(e.target.value))}
          className={FIELD}
        >
          {currentSection === -1 && <option value={-1}>{t('editor.inspector.noSection')}</option>}
          {sections.map((s) => (
            <option key={s.index} value={s.index}>{formatSectionLabel(s.label, t)}</option>
          ))}
        </select>
      </label>

      <label htmlFor={`${id}-singer`} className="flex flex-col gap-1.5 text-xs text-foreground/65">
        {t('editor.inspector.singer')}
        <select
          id={`${id}-singer`}
          value={singer}
          disabled={singerOptions.length === 0}
          onChange={(e) => onAssignSinger(e.target.value, activeLineIndex)}
          className={FIELD}
        >
          <option value="">{t('editor.tagging.noSinger')}</option>
          {singerOptions.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>

      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-[10px] bg-zinc-800 px-3 py-2.5">
          <dt className="text-xs text-foreground/65">{t('editor.inspector.start')}</dt>
          <dd className="font-mono text-sm tabular-nums text-foreground">{line.timestamp != null ? formatTimestamp(line.timestamp) : UNTIMED}</dd>
        </div>
        <div className="rounded-[10px] bg-zinc-800 px-3 py-2.5">
          <dt className="text-xs text-foreground/65">{t('editor.inspector.duration')}</dt>
          <dd className="font-mono text-sm tabular-nums text-foreground">{length != null ? `${length.toFixed(2)} s` : '—'}</dd>
        </div>
      </dl>
    </section>
  );
}

function ShortcutsLegend({ settings }: Pick<EditorSidePanelProps, 'settings'>) {
  const { t } = useTranslation();
  const symbols: Record<string, string> = KEY_SYMBOLS;
  // "Alt+ArrowLeft" → "Alt ←"
  const show = (binding: string | undefined, fallback: string) =>
    (binding || fallback).split('+').map((k) => (symbols[k] ?? k).trim()).join(' ');
  const keys = settings.shortcuts ?? {};
  const items = [
    { key: show(keys.mark?.[0], 'Enter'), label: t('editor.shortcutHints.mark') },
    { key: show(keys.playPause?.[0], 'Space'), label: t('editor.shortcutHints.play') },
    { key: `${show(keys.nudgeLeftFine?.[0], 'Shift+ArrowLeft')} / ${show(keys.nudgeRightFine?.[0], 'Shift+ArrowRight')}`, label: t('editor.shortcutHints.nudge') },
    { key: `${show(keys.seekBackward?.[0], 'ArrowLeft')} / ${show(keys.seekForward?.[0], 'ArrowRight')}`, label: t('editor.shortcutHints.seek') },
  ];
  return (
    <section aria-label={t('editor.shortcutHints.title')} className="mt-auto flex flex-col gap-2 text-xs text-foreground/65">
      <span className={CAPTION}>{t('editor.shortcutHints.title')}</span>
      <div className="flex flex-wrap gap-x-3 gap-y-2">
        {items.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-foreground whitespace-nowrap">{item.key}</kbd>
            {item.label}
          </span>
        ))}
      </div>
    </section>
  );
}

/** The editor's right-hand column: live karaoke line, inspector for the cursor line, key hints. */
function EditorSidePanel(props: EditorSidePanelProps) {
  const { t } = useTranslation();
  return (
    <aside
      aria-label={t('editor.sidePanel')}
      className="lrc-scroll max-lg:hidden w-[360px] xl:w-[400px] shrink-0 min-h-0 overflow-y-auto flex flex-col gap-4 p-5 border-l border-zinc-800 bg-zinc-950/40"
    >
      <LiveCard lines={props.lines} playbackPosition={props.playbackPosition} duration={props.duration} editorMode={props.editorMode} />
      <LineInspector
        lines={props.lines}
        activeLineIndex={props.activeLineIndex}
        duration={props.duration}
        singers={props.singers}
        onMoveToSection={props.onMoveToSection}
        onAssignSinger={props.onAssignSinger}
      />
      <ShortcutsLegend settings={props.settings} />
    </aside>
  );
}

export default memo(EditorSidePanel);
