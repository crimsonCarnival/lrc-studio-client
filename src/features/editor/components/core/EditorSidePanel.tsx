import { memo, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { computeCurrentIndex } from '@/features/preview/lyrics-position';
import { formatTimestamp } from '@/shared/utils/lrc';
import { shortcutParts } from '@features/settings/key-symbols';
import { formatSectionLabel } from '@features/editor/constants/section-types';
import { SINGER_GRADIENT_STOPS, singerColorIndex } from '@features/editor/utils/singer-colors';
import { formatNameList } from '@features/editor/utils/sections';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { Kbd, KbdGroup } from '@ui/kbd';
import { Icon } from '@/shared/ui/Icon';
import { cn } from '@/shared/utils/utils';
import type { EditorLine } from '@/features/editor/editor.types';
import type { AppSettings } from '@/features/settings/settings.types';

// Sections sit flush in the docked column, split by hairlines: cards floating on a
// translucent strip read as loose, not as part of the workspace.
const SECTION = 'border-b border-hl px-5 py-4';
const COLLAPSED_KEY = 'lrc_editor_side_panel_collapsed';
const CAPTION = 'font-mono text-xs font-semibold uppercase tracking-[0.14em] text-subtle';
const LABEL = 'text-sm font-semibold text-subtle';
const FIELD = 'flex h-10 items-center rounded-[var(--radius-control)] bg-background inset-ring inset-ring-hl';
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
  /** Ticks or unticks one singer on the line; an empty name removes them all. */
  onToggleSinger: (name: string, lineIndex: number) => void;
  /** Opens the full shortcut list. */
  onShowKeyboardHelp?: () => void;
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
    <section aria-label={t('editor.lineReview.title')} className={SECTION}>
      <div className="flex flex-col gap-2.5 min-h-[124px]">
        <div className="flex items-center justify-between">
          <span className={CAPTION}>{t('editor.lineReview.title')}</span>
          <span className="font-mono text-[13px] font-medium tabular-nums text-subtle">{formatTimestamp(playbackPosition)}</span>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-2">
          {previous && <p className="text-sm text-faint truncate">{previous.text}</p>}
          {current ? (
            <p className="font-heading font-extrabold text-2xl leading-[1.1] tracking-[-0.03em] break-words">
              <span className="text-primary-ink [text-shadow:0_0_20px_var(--primary-strong)]">{sung}{sung && rest ? ' ' : ''}</span>
              <span className="text-foreground">{rest}</span>
            </p>
          ) : (
            <p className="text-sm italic text-subtle">{t('editor.lineReview.waiting')}</p>
          )}
          {next && <p className="text-sm font-medium text-subtle truncate">{next.text}</p>}
        </div>
      </div>
    </section>
  );
}

const SINGER_BUTTON = 'flex h-9 items-center justify-center px-3 rounded-[calc(var(--radius)*1)] text-sm font-semibold transition-shadow duration-[var(--duration-state)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus coarse:h-11';

function LineInspector({ lines, activeLineIndex, duration, singers, singerColors, settings, onMoveToSection, onToggleSinger, onNudge }: Pick<EditorSidePanelProps, 'lines' | 'activeLineIndex' | 'duration' | 'singers' | 'singerColors' | 'settings' | 'onMoveToSection' | 'onToggleSinger' | 'onNudge'>) {
  const { t, i18n } = useTranslation();
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
  // Every singer on the line is a pressed button; names not in the roster still show.
  const lineSingers = (line.singers ?? []).filter(Boolean);
  const singerOptions = [...lineSingers.filter((name) => !singers.includes(name)), ...singers];
  const timed = line.timestamp != null;
  const step = NUDGE_STEP.toFixed(1);

  return (
    <section aria-label={t('editor.inspector.title', { number: lyricNumber })} className={`${SECTION} flex flex-col gap-3`}>
      <h3 className="font-heading text-lg font-bold tracking-[-0.02em] text-foreground">{t('editor.inspector.title', { number: lyricNumber })}</h3>

      <div className="flex flex-col gap-1.5">
        <span id={`${id}-section`} className={LABEL}>{t('editor.inspector.section')}</span>
        <Select
          value={String(currentSection)}
          disabled={sections.length === 0}
          onValueChange={(value) => onMoveToSection(activeLineIndex, Number(value))}
        >
          <SelectTrigger aria-labelledby={`${id}-section`} className="h-10 w-full px-3.5 text-[15px] data-[size=default]:h-10">
            <span className="flex min-w-0 items-center gap-2">
              <Icon name="layers" size={16} className="shrink-0 text-label" />
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            {currentSection === -1 && <SelectItem value="-1">{t('editor.inspector.noSection')}</SelectItem>}
            {sections.map((s) => {
              const meta = s.singers[0]
                ? t('editor.inspector.sectionMetaWithSinger', { count: s.lineCount, singer: formatNameList(s.singers, i18n.language) })
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
        <span id={`${id}-singer`} className={`${LABEL} flex items-baseline justify-between gap-2`}>
          {t('editor.inspector.singer')}
          {singerOptions.length > 1 && <span className="text-xs font-normal text-faint">{t('editor.inspector.singerHint')}</span>}
        </span>
        {/* One button per singer, named and coloured like the badge on the line. */}
        <div role="group" aria-labelledby={`${id}-singer`} className="flex flex-wrap gap-1.5">
          <Tip content={t('editor.tagging.noSinger')}>
            <button
              type="button"
              aria-pressed={lineSingers.length === 0}
              aria-label={t('editor.tagging.noSinger')}
              onClick={() => onToggleSinger('', activeLineIndex)}
              className={cn(SINGER_BUTTON, lineSingers.length === 0 ? 'bg-raised text-foreground inset-ring-[1.5px] inset-ring-iris' : 'bg-background text-subtle inset-ring inset-ring-hl hover:inset-ring-faint')}
            >
              ∅
            </button>
          </Tip>
          {singerOptions.map((name) => {
            const idx = singerColorIndex(name, singers);
            const color = singerColors?.[idx] || settings.editor?.display?.singerColors?.[idx] || SINGER_GRADIENT_STOPS[idx];
            const on = lineSingers.includes(name);
            return (
              <Tip key={name} content={name}>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={name}
                  onClick={() => onToggleSinger(name, activeLineIndex)}
                  className={cn(SINGER_BUTTON, 'gap-1.5', on ? 'text-primary-foreground' : 'bg-background inset-ring inset-ring-hl hover:inset-ring-faint')}
                  // The singer's own colour: as the fill when chosen, as the text otherwise.
                  style={on ? { background: color, boxShadow: `0 0 0 2px var(--background), 0 0 0 3.5px ${color}` } : { color }}
                >
                  {/* The tick says "on this line" without relying on the fill colour alone. */}
                  {on && <Icon name="check" size={14} />}
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

function ShortcutsLegend({ settings, onShowKeyboardHelp }: Pick<EditorSidePanelProps, 'settings' | 'onShowKeyboardHelp'>) {
  const { t } = useTranslation();
  const keys = settings.shortcuts ?? {};
  const bound = (id: string, fallback: string): string => keys[id]?.[0] || fallback;
  // The keys used while syncing, most used first. Pairs share a row: [⇧ ←] / [⇧ →].
  const rows: { label: string; bindings: string[] }[] = [
    { label: t('editor.shortcutHints.mark'), bindings: [bound('mark', 'Enter')] },
    { label: t('editor.shortcutHints.play'), bindings: [bound('playPause', 'Space')] },
    { label: t('editor.shortcutHints.line'), bindings: [bound('prevLine', 'ArrowUp'), bound('nextLine', 'ArrowDown')] },
    { label: t('editor.shortcutHints.seek'), bindings: [bound('seekBackward', 'ArrowLeft'), bound('seekForward', 'ArrowRight')] },
    { label: t('editor.shortcutHints.nudge'), bindings: [bound('nudgeLeftFine', 'Shift+ArrowLeft'), bound('nudgeRightFine', 'Shift+ArrowRight')] },
    { label: t('editor.shortcutHints.loop'), bindings: [bound('loopLine', 'l')] },
  ];
  return (
    <section aria-label={t('editor.shortcutHints.title')} className="shrink-0 border-t border-hl px-5 py-3.5 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className={CAPTION}>{t('editor.shortcutHints.title')}</span>
        {onShowKeyboardHelp && (
          <button
            type="button"
            onClick={onShowKeyboardHelp}
            className="inline-flex items-center gap-1.5 rounded-md text-xs font-semibold text-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus"
          >
            {t('editor.shortcutHints.all')}
            <Kbd className="h-5 min-w-5 text-[11px]">{bound('showHelp', '?')}</Kbd>
          </button>
        )}
      </div>
      {/* Two columns, key caps right-aligned: labels line up and so do the keys. */}
      <dl className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-[13px] text-subtle">
        {rows.map((row) => (
          <div key={row.label} className="flex min-w-0 items-center justify-between gap-2">
            <dt className="truncate">{row.label}</dt>
            <dd className="flex shrink-0 items-center gap-1">
              {row.bindings.map((binding, n) => (
                <KbdGroup key={n}>
                  {shortcutParts(binding).map((cap, k) => (
                    <Kbd key={k} className="h-5 min-w-5 px-1 text-[11px] whitespace-nowrap">{cap.trim().length === 1 ? cap.trim().toUpperCase() : cap.replace('Shift', '').trim() || cap.trim()}</Kbd>
                  ))}
                </KbdGroup>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * The editor's right-hand column: live karaoke line, inspector for the cursor line, key hints.
 * Open, it is docked: a solid surface joined to the workspace by its border, running from the
 * header to the player. Collapsed, it lets go of the edge: no column and no surface, only a
 * floating handle that brings it back.
 */
function EditorSidePanel(props: EditorSidePanelProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === '1'; } catch { return false; }
  });
  const toggle = () => {
    setCollapsed((was) => {
      try { localStorage.setItem(COLLAPSED_KEY, was ? '0' : '1'); } catch { /* still applies for this session */ }
      return !was;
    });
  };

  if (collapsed) {
    return (
      <aside aria-label={t('editor.sidePanel')} className="max-lg:hidden shrink-0 w-14 flex justify-center pt-4">
        <Tip side="left" content={t('editor.sidePanelExpand')}>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={false}
            aria-label={t('editor.sidePanelExpand')}
            className="grid size-10 place-items-center rounded-pill bg-card text-subtle shadow-lg inset-ring inset-ring-hl transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus"
          >
            <Icon name="chevron_left" size={18} />
          </button>
        </Tip>
      </aside>
    );
  }

  return (
    <aside
      aria-label={t('editor.sidePanel')}
      className="max-lg:hidden shrink-0 min-h-0 w-[380px] xl:w-[420px] flex flex-col border-l border-hl bg-card animate-in slide-in-from-right-4 fade-in duration-200"
    >
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-hl pl-5 pr-1.5">
        <span className={CAPTION}>{t('editor.sidePanel')}</span>
        <Tip side="left" content={t('editor.sidePanelCollapse')}>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-expanded
            aria-label={t('editor.sidePanelCollapse')}
            className="size-8 lg:size-8 rounded-lg text-subtle hover:text-foreground"
          >
            <Icon name="chevron_right" size={18} />
          </Button>
        </Tip>
      </div>
      {/* Only this part scrolls, and only on a short window: the shortcuts stay pinned below. */}
      <div className="lrc-scroll min-h-0 flex-1 overflow-y-auto">
        <LiveCard lines={props.lines} playbackPosition={props.playbackPosition} duration={props.duration} editorMode={props.editorMode} />
        <LineInspector
          lines={props.lines}
          activeLineIndex={props.activeLineIndex}
          duration={props.duration}
          singers={props.singers}
          singerColors={props.singerColors}
          settings={props.settings}
          onMoveToSection={props.onMoveToSection}
          onToggleSinger={props.onToggleSinger}
          onNudge={props.onNudge}
        />
      </div>
      <ShortcutsLegend settings={props.settings} onShowKeyboardHelp={props.onShowKeyboardHelp} />
    </aside>
  );
}

export default memo(EditorSidePanel);
