import { memo, useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { computeCurrentIndex } from '@/features/preview/lyrics-position';
import { formatTimestamp } from '@/shared/utils/lrc';
import { KEY_SYMBOLS } from '@features/settings/key-symbols';
import { formatSectionLabel } from '@features/editor/constants/section-types';
import { SINGER_GRADIENT_STOPS, singerColorIndex } from '@features/editor/utils/singer-colors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { Kbd } from '@ui/kbd';
import { Icon } from '@/shared/ui/Icon';
import { cn } from '@/shared/utils/utils';
import type { EditorLine } from '@/features/editor/services/editor.service';
import type { AppSettings } from '@/features/settings/settings.types';

const CARD = 'rounded-[var(--radius-card)] bg-background inset-ring inset-ring-hl';
const CAPTION = 'font-mono text-xs font-semibold uppercase tracking-[0.14em] text-subtle';
const LABEL = 'text-sm font-semibold text-subtle';
const FIELD = 'flex h-11 items-center rounded-[var(--radius-control)] bg-card inset-ring inset-ring-hl';
const UNTIMED = '—:—';
// The inspector's nudge step. Finer steps stay on the wheel and the keyboard shortcuts.
const NUDGE_STEP = 0.1;

interface EditorSidePanelProps {
  lines: EditorLine[];
  playbackPosition: number;
  duration?: number;
  editorMode: string;
  /** The line marking acts on. */
  activeLineIndex: number;
  /** Singer names offered in the inspector. */
  singers: string[];
  /** Per-project colour overrides, index-aligned with the singer palette. */
  singerColors?: string[];
  settings: AppSettings;
  onMoveToSection: (lineIndex: number, sectionIndex: number) => void;
  onAssignSinger: (name: string, lineIndex: number) => void;
  /** Shifts the line's start time by `delta` seconds. */
  onNudge: (lineIndex: number, delta: number) => void;
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
    <section aria-label={t('editor.lineReview.title')}>
      <div className={`${CARD} px-5 py-[18px] flex flex-col gap-3 min-h-[168px]`}>
        <div className="flex items-center justify-between">
          <span className={CAPTION}>{t('editor.lineReview.title')}</span>
          <span className="font-mono text-[13px] font-medium tabular-nums text-subtle">{formatTimestamp(playbackPosition)}</span>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-3">
          {previous && <p className="text-[15px] text-faint break-words">{previous.text}</p>}
          {current ? (
            <p className="font-heading font-extrabold text-[28px] leading-[1.08] tracking-[-0.03em] break-words">
              <span className="text-primary-ink [text-shadow:0_0_20px_var(--primary-strong)]">{sung}{sung && rest ? ' ' : ''}</span>
              <span className="text-foreground">{rest}</span>
            </p>
          ) : (
            <p className="text-sm italic text-subtle">{t('editor.lineReview.waiting')}</p>
          )}
          {next && <p className="text-base font-medium text-subtle break-words">{next.text}</p>}
        </div>
      </div>
    </section>
  );
}

const SINGER_BUTTON = 'flex h-10 items-center justify-center px-3 rounded-[10px] text-sm font-semibold transition-shadow duration-[var(--duration-state)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus coarse:h-11';

function LineInspector({ lines, activeLineIndex, duration, singers, singerColors, settings, onMoveToSection, onAssignSinger, onNudge }: Pick<EditorSidePanelProps, 'lines' | 'activeLineIndex' | 'duration' | 'singers' | 'singerColors' | 'settings' | 'onMoveToSection' | 'onAssignSinger' | 'onNudge'>) {
  const { t } = useTranslation();
  const id = useId();
  const line: EditorLine | undefined = lines[activeLineIndex];

  const { sections, currentSection, lyricNumber, end } = useMemo(() => {
    const sections: { index: number; label: string; singers: string[]; lineCount: number }[] = [];
    let currentSection = -1;
    let lyricNumber = 0;
    let end: number | null = null;
    let openSection: typeof sections[number] | null = null;
    lines.forEach((l, i) => {
      if (l.type === 'section') {
        openSection = { index: i, label: l.label ?? '', singers: Array.isArray(l.singers) ? (l.singers as string[]) : [], lineCount: 0 };
        sections.push(openSection);
        if (i < activeLineIndex) currentSection = i;
      } else {
        if (openSection) openSection.lineCount++;
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
  const timed = line.timestamp != null;
  const step = NUDGE_STEP.toFixed(1);

  return (
    <section aria-label={t('editor.inspector.title', { number: lyricNumber })} className={`${CARD} px-5 py-[18px] flex flex-col gap-3.5`}>
      <h3 className="font-heading text-xl font-bold tracking-[-0.02em] text-foreground">{t('editor.inspector.title', { number: lyricNumber })}</h3>

      <div className="flex flex-col gap-1.5">
        <span id={`${id}-section`} className={LABEL}>{t('editor.inspector.section')}</span>
        <Select
          value={String(currentSection)}
          disabled={sections.length === 0}
          onValueChange={(value) => onMoveToSection(activeLineIndex, Number(value))}
        >
          <SelectTrigger aria-labelledby={`${id}-section`} className="h-11 w-full px-3.5 text-base data-[size=default]:h-11">
            <span className="flex min-w-0 items-center gap-2">
              <Icon name="layers" size={16} className="shrink-0 text-label" />
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            {currentSection === -1 && <SelectItem value="-1">{t('editor.inspector.noSection')}</SelectItem>}
            {sections.map((s) => {
              const meta = s.singers[0]
                ? t('editor.inspector.sectionMetaWithSinger', { count: s.lineCount, singer: s.singers[0] })
                : t('editor.inspector.sectionMeta', { count: s.lineCount });
              return (
                <SelectItem key={s.index} value={String(s.index)}>
                  {formatSectionLabel(s.label, t)} <span className="text-subtle">· {meta}</span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span id={`${id}-singer`} className={LABEL}>{t('editor.inspector.singer')}</span>
        {/* One button per singer, named and coloured like the badge on the line. */}
        <div role="group" aria-labelledby={`${id}-singer`} className="flex flex-wrap gap-1.5">
          <Tip content={t('editor.tagging.noSinger')}>
            <button
              type="button"
              aria-pressed={!singer}
              aria-label={t('editor.tagging.noSinger')}
              onClick={() => onAssignSinger('', activeLineIndex)}
              className={cn(SINGER_BUTTON, !singer ? 'bg-raised text-foreground inset-ring-[1.5px] inset-ring-iris' : 'bg-card text-subtle inset-ring inset-ring-hl hover:inset-ring-faint')}
            >
              ∅
            </button>
          </Tip>
          {singerOptions.map((name) => {
            const idx = singerColorIndex(name, singers);
            const color = singerColors?.[idx] || settings.editor?.display?.singerColors?.[idx] || SINGER_GRADIENT_STOPS[idx];
            const on = name === singer;
            return (
              <Tip key={name} content={name}>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={name}
                  onClick={() => onAssignSinger(name, activeLineIndex)}
                  className={cn(SINGER_BUTTON, on ? 'text-primary-foreground' : 'bg-card inset-ring inset-ring-hl hover:inset-ring-faint')}
                  // The singer's own colour: as the fill when chosen, as the text otherwise.
                  style={on ? { background: color, boxShadow: `0 0 0 2px var(--background), 0 0 0 3.5px ${color}` } : { color }}
                >
                  <span className="max-w-[96px] truncate">{name}</span>
                </button>
              </Tip>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className={LABEL}>{t('editor.inspector.start')}</span>
          <div className={`${FIELD} justify-between pr-1 pl-3.5`}>
            <span className="truncate font-mono text-[15px] font-medium tabular-nums text-foreground">
              {timed ? formatTimestamp(line.timestamp as number) : UNTIMED}
            </span>
            <span className="flex shrink-0">
              <Tip content={t('editor.inspector.earlier', { amount: step })}>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!timed}
                  aria-label={t('editor.inspector.earlier', { amount: step })}
                  onClick={() => onNudge(activeLineIndex, -NUDGE_STEP)}
                  className="size-8 rounded-lg font-mono text-base lg:size-8"
                >
                  −
                </Button>
              </Tip>
              <Tip content={t('editor.inspector.later', { amount: step })}>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!timed}
                  aria-label={t('editor.inspector.later', { amount: step })}
                  onClick={() => onNudge(activeLineIndex, NUDGE_STEP)}
                  className="size-8 rounded-lg font-mono text-base lg:size-8"
                >
                  +
                </Button>
              </Tip>
            </span>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className={LABEL}>{t('editor.inspector.duration')}</span>
          <div className={`${FIELD} justify-between gap-2 px-3.5`}>
            <span className="font-mono text-[15px] font-medium tabular-nums text-foreground">{length != null ? `${length.toFixed(2)} s` : '—'}</span>
            {length != null && lineEnd != null && (
              <span className="truncate text-[13px] text-subtle">{t('editor.inspector.until', { time: lineEnd.toFixed(2) })}</span>
            )}
          </div>
        </div>
      </div>
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
            <Kbd className="whitespace-nowrap">{item.key}</Kbd>
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
      className="lrc-scroll max-lg:hidden w-[400px] xl:w-[460px] shrink-0 min-h-0 overflow-y-auto flex flex-col gap-4 p-5 border-l border-hl bg-zinc-950/40"
    >
      <LiveCard lines={props.lines} playbackPosition={props.playbackPosition} duration={props.duration} editorMode={props.editorMode} />
      <LineInspector
        lines={props.lines}
        activeLineIndex={props.activeLineIndex}
        duration={props.duration}
        singers={props.singers}
        singerColors={props.singerColors}
        settings={props.settings}
        onMoveToSection={props.onMoveToSection}
        onAssignSinger={props.onAssignSinger}
        onNudge={props.onNudge}
      />
      <ShortcutsLegend settings={props.settings} />
    </aside>
  );
}

export default memo(EditorSidePanel);
