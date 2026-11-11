import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { formatTime } from '@/shared/utils/format-time';
import PhoneMarkBar from './PhoneMarkBar';

export type PhoneWordsChip = {
  word: string;
  time: number | null;
  /** Index into the line's singers, when the word is attributed. */
  singerIndex?: number | null;
  /** The singer's name, for the accessible name (the numbered badge is decorative). */
  singer?: string;
};

export type StampLayer = 'main' | 'secondary' | 'both';

export type PhoneWordsTabProps = {
  id?: string;
  labelledBy?: string;
  /** The compact lyric list: the editor's own VirtualizedLineList, used to jump between lines. */
  list: ReactNode;
  banner?: ReactNode;
  player: ReactNode;
  /** 1-based lyric number of the cursor line and how many lyric lines there are; null when there is no line. */
  lineNumber: { number: number; total: number } | null;
  words: PhoneWordsChip[];
  /** The word the next Mark stamps, or null when a different timestamp is focused. */
  activeIndex: number | null;
  onWordTap: (index: number) => void;
  /** The line has no start yet: its first Mark must stamp word 1, so the chips only show state. */
  chipsLocked?: boolean;
  onWordMenu: (index: number) => void;
  /** Absent unless the line has two or more singers. */
  onCycleSinger?: (index: number) => void;
  onPrevLine: () => void;
  onNextLine: () => void;
  canPrev: boolean;
  canNext: boolean;
  /** Absent unless the line has Japanese text, the only case with a second layer to stamp. */
  layer?: { value: StampLayer; onChange: (layer: StampLayer) => void };
  /** Absent for a read-only viewer. */
  mark?: { onMark: () => void; onUndo: () => void; canUndo: boolean; label: string; disabled: boolean };
};

type PhoneWordsTabViewProps = PhoneWordsTabProps & {
  /** The row under the player: the Mark bar, or the select bar while lines are being selected. */
  markBar?: ReactNode;
};

const ROUND_BTN = 'size-11 shrink-0 grid place-items-center rounded-[calc(var(--radius)*1.2)] border border-zinc-800 text-foreground/80 transition-colors duration-[var(--duration-state)] disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus';

/**
 * Sync tab body for Words mode on a phone. The lyric list becomes navigation only, and the
 * cursor line's words sit as large chips above the Mark bar. Holds no editor state: Editor
 * passes the words and the handlers it already uses on desktop (handleMark, the focused
 * timestamp, stamp target, singer cycling), so a tap here stamps exactly what Enter does.
 */
export default function PhoneWordsTab(p: PhoneWordsTabViewProps) {
  const { t } = useTranslation();
  const activeChip = useRef<HTMLButtonElement | null>(null);
  // Keep the word being stamped in view when the line is long enough to scroll.
  useEffect(() => {
    activeChip.current?.scrollIntoView?.({ block: 'nearest' });
  }, [p.activeIndex, p.lineNumber?.number]);

  const done = p.words.filter((w) => w.time != null).length;
  const selected = p.activeIndex != null ? p.words[p.activeIndex] : undefined;
  const lineLabel = p.lineNumber ? t('editor.phone.words.panel', { number: p.lineNumber.number }) : t('editor.phone.focus.none');
  const sectionLabel = p.lineNumber ? t('editor.phone.words.section', { number: p.lineNumber.number }) : t('editor.phone.focus.none');
  const chipName = (w: PhoneWordsChip, isActive: boolean) => {
    let name = w.time != null ? t('editor.phone.words.chipStamped', { word: w.word, time: formatTime(w.time) }) : t('editor.phone.words.unstamped', { word: w.word });
    if (w.singer) name = t('editor.phone.words.chipSinger', { name, singer: w.singer });
    if (isActive) name = t('editor.phone.words.chipNext', { name });
    return name;
  };

  return (
    <div role="tabpanel" id={p.id} aria-labelledby={p.labelledBy} className="flex flex-1 min-h-0 flex-col short-landscape:flex-row">
      <div data-testid="phone-list-pane" data-tour="phone-lines" className="flex flex-1 min-h-0 min-w-0 flex-col">
        {p.banner}
        {p.list}
      </div>
      <div className="flex min-h-0 shrink-0 flex-col border-t border-zinc-800 bg-zinc-950/60 short-landscape:w-[min(24rem,48%)] short-landscape:border-t-0 short-landscape:border-l">
        <section aria-label={sectionLabel} className="flex min-h-0 flex-col gap-1.5 px-3 pt-1.5 short-landscape:flex-1">
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={p.onPrevLine} disabled={!p.canPrev} aria-label={t('editor.phone.focus.previous')} className={ROUND_BTN}>
              <Icon name="chevron_left" size={22} />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-semibold leading-tight">
                {p.lineNumber ? t('editor.phone.words.lineOf', p.lineNumber) : t('editor.phone.focus.none')}
              </p>
              {p.words.length > 0 && (
                <p className="font-mono text-[11px] leading-tight tabular-nums text-subtle">
                  {t('editor.phone.words.wordCount', { done, total: p.words.length })}
                </p>
              )}
            </div>
            {selected && p.onCycleSinger && p.activeIndex != null && (
              <button
                type="button"
                onClick={() => p.onCycleSinger!(p.activeIndex!)}
                aria-label={selected.singer ? t('editor.phone.words.changeSingerFrom', { word: selected.word, singer: selected.singer }) : t('editor.phone.words.changeSinger', { word: selected.word })}
                className={ROUND_BTN}
              >
                <Icon name="mic" size={20} />
              </button>
            )}
            {selected && (
              <button type="button" onClick={() => p.onWordMenu(p.activeIndex!)} aria-label={t('common.actions.wordActions')} className={ROUND_BTN}>
                <Icon name="more_horiz" size={20} />
              </button>
            )}
            <button type="button" onClick={p.onNextLine} disabled={!p.canNext} aria-label={t('editor.phone.focus.next')} className={ROUND_BTN}>
              <Icon name="chevron_right" size={22} />
            </button>
          </div>

          {p.layer && (
            <div role="group" aria-label={t('editor.phone.words.layerGroup')} className="flex gap-1 rounded-pill bg-raised p-1">
              {([
                { key: 'main', label: t('editor.stampLayerMainShort') },
                { key: 'secondary', label: t('editor.stampLayerSecondaryShort') },
                { key: 'both', label: t('editor.stampLayerBoth') },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={p.layer!.value === key}
                  onClick={() => p.layer!.onChange(key)}
                  className={`h-9 flex-1 rounded-pill text-[13px] font-semibold transition-colors duration-[var(--duration-state)] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus ${p.layer!.value === key ? 'bg-primary text-zinc-950' : 'text-subtle'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {p.words.length === 0 ? (
            <p role="note" className="py-3 text-center text-sm text-subtle">{t('editor.phone.words.noWords')}</p>
          ) : (
            <ul className="lrc-scroll flex min-h-0 max-h-[7.5rem] flex-wrap content-start gap-1.5 overflow-y-auto pb-1 short-landscape:max-h-none short-landscape:flex-1" aria-label={lineLabel}>
              {p.words.map((w, wi) => {
                const isActive = wi === p.activeIndex;
                const stamped = w.time != null;
                return (
                  <li key={wi} className="contents">
                    <button
                      ref={isActive ? activeChip : undefined}
                      type="button"
                      aria-pressed={isActive}
                      aria-label={chipName(w, isActive)}
                      aria-disabled={p.chipsLocked || undefined}
                      onClick={() => { if (!p.chipsLocked) p.onWordTap(wi); }}
                      className={`relative flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-2.5 py-1 text-center transition-colors duration-[var(--duration-state)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus ${isActive
                        ? 'border-primary bg-primary-soft text-foreground'
                        : stamped
                          ? 'border-hl bg-raised text-foreground'
                          : 'border-dashed border-hl bg-transparent text-faint'}`}
                    >
                      <span className="font-heading text-lg font-bold leading-none">{w.word}</span>
                      <span aria-hidden className="font-mono text-[11px] leading-none tabular-nums opacity-80">
                        {stamped ? formatTime(w.time!) : '--:--'}
                      </span>
                      {w.singerIndex != null && (
                        <span aria-hidden className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-pill bg-raised font-mono text-[10px] font-bold inset-ring inset-ring-hl">
                          {w.singerIndex + 1}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {p.chipsLocked && p.words.length > 0 && (
            <p className="text-center text-xs text-subtle">{t('editor.phone.words.startFirst')}</p>
          )}
        </section>
        {p.player}
        {p.markBar ?? (p.mark ? <PhoneMarkBar {...p.mark} /> : null)}
      </div>
    </div>
  );
}
