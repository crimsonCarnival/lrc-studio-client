import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { MouseEvent, WheelEvent } from 'react';
import { hasCJK } from '@/shared/utils/furigana';
import { formatTime } from '@/shared/utils/format-time';
import { usePlayer } from '@/features/player/PlayerContext';
import { wordSpan } from '../../utils/word-span';
import { Tip } from '@ui/tip';
import { InlineTimestampEdit } from '../line/InlineTimestampEdit';
import { TimestampBadge } from '../line/TimestampBadge';
import { StampedWordChip } from './StampedWordChip';
import { Icon } from '@/shared/ui/Icon';
import { singerColorIndex } from '@features/editor/utils/singer-colors';
import { chipWidthStep } from '../../utils/chip-width';

// Per-singer chip color sets [bg, border, text] for stamped and unstamped word chips.
// Index-aligned with WORD_SINGER_COLORS in LineTextContent.tsx / SINGER_GRADIENT_STOPS
// so a given singer's global roster index resolves to the same hue everywhere.
const WORD_SINGER_CHIP = [
  { stamped: 'bg-primary/15 border-primary/40 text-primary/80 hover:border-primary hover:bg-primary/25 hover:text-primary', unstamped: 'bg-primary/8 border-primary/25 text-primary/60 hover:bg-primary/15 hover:text-primary/80' },
  { stamped: 'bg-sky-500/15 border-sky-500/40 text-sky-400/80 hover:border-sky-400 hover:bg-sky-500/25 hover:text-sky-400', unstamped: 'bg-sky-500/8 border-sky-500/25 text-sky-400/60 hover:bg-sky-500/15 hover:text-sky-400/80' },
  { stamped: 'bg-violet-500/15 border-violet-500/40 text-violet-400/80 hover:border-violet-400 hover:bg-violet-500/25 hover:text-violet-400', unstamped: 'bg-violet-500/8 border-violet-500/25 text-violet-400/60 hover:bg-violet-500/15 hover:text-violet-400/80' },
  { stamped: 'bg-amber-500/15 border-amber-500/40 text-amber-400/80 hover:border-amber-400 hover:bg-amber-500/25 hover:text-amber-400', unstamped: 'bg-amber-500/8 border-amber-500/25 text-amber-400/60 hover:bg-amber-500/15 hover:text-amber-400/80' },
  { stamped: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400/80 hover:border-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-400', unstamped: 'bg-emerald-500/8 border-emerald-500/25 text-emerald-400/60 hover:bg-emerald-500/15 hover:text-emerald-400/80' },
  { stamped: 'bg-rose-500/15 border-rose-500/40 text-rose-400/80 hover:border-rose-400 hover:bg-rose-500/25 hover:text-rose-400', unstamped: 'bg-rose-500/8 border-rose-500/25 text-rose-400/60 hover:bg-rose-500/15 hover:text-rose-400/80' },
  { stamped: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400/80 hover:border-cyan-400 hover:bg-cyan-500/25 hover:text-cyan-400', unstamped: 'bg-cyan-500/8 border-cyan-500/25 text-cyan-400/60 hover:bg-cyan-500/15 hover:text-cyan-400/80' },
  { stamped: 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-400/80 hover:border-fuchsia-400 hover:bg-fuchsia-500/25 hover:text-fuchsia-400', unstamped: 'bg-fuchsia-500/8 border-fuchsia-500/25 text-fuchsia-400/60 hover:bg-fuchsia-500/15 hover:text-fuchsia-400/80' },
];

// Word chips are small cards. On the line being worked on they grow and show
// each word's time under it; elsewhere they stay compact so a long song still
// fits on screen.
const CHIP_BASE = 'flex flex-col items-start gap-1 border font-medium transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
const CHIP_COMPACT = 'px-2.5 py-1.5 coarse:py-2.5 rounded-lg text-[13px] leading-none';
// On the line being worked on the chip is one component for both layers, sized
// off the 32px step grid rather than its text, and centred: its width no longer
// tracks the word, so left-aligning would scatter the faces across the row.
const CHIP_LARGE = 'px-3 py-2 rounded-xl items-center justify-center text-center';
// A line that carries a romaji layer reserves the row for it whether or not that
// layer is the one being marked, so switching layer never changes the chip's
// height nor shifts anything below it.
const CHIP_H_WITH_ROMAJI = 86;
const CHIP_H_PLAIN = 68;
const CHIP_NOW = 'border-2 border-primary bg-primary-soft text-foreground';
// The sung word keeps a neutral body: the karaoke fill (KaraokeFill) is what shows progress.
const CHIP_PLAYING = 'border-2 border-primary bg-raised text-foreground';
const CHIP_COLLISION = 'border-gold bg-gold-soft text-foreground hover:border-gold';
const CHIP_DONE = 'border-hl bg-raised text-foreground hover:border-faint';
const CHIP_TODO = 'border-dashed border-hl bg-transparent text-faint hover:border-faint hover:text-subtle';

// Same formatter as the chip's tooltip and the timestamp badges, so a word never
// shows two different times; the "00:" minutes are dropped while they are zero.
function shortTime(time: number): string {
  const label = formatTime(time);
  return label.startsWith('00:') ? label.slice(3) : label;
}

/**
 * Accent-coloured copy of the sung word, unmasked left to right over the span the word
 * lasts. It is a CSS animation, so playback does not re-render the chip per frame.
 * Keyed per word by the caller, so each word mounts a fresh fill; the offset into the
 * word is read once on mount (a seek lands on a different word, which remounts).
 */
function KaraokeFill({ label, start, end }: { label: string; start: number; end: number }) {
  const { currentTime, playbackSpeed } = usePlayer();
  const [offset] = useState(() => Math.max(0, currentTime - start));
  // Media seconds -> wall-clock seconds at the current playback speed.
  const speed = playbackSpeed || 1;
  return (
    <span
      aria-hidden="true"
      className="karaoke-fill absolute left-0 top-0 overflow-hidden whitespace-nowrap text-primary-ink"
      style={{ animation: `karaoke-fill ${Math.max(end - start, 0.05) / speed}s linear forwards`, animationDelay: `${-offset / speed}s` }}
    >
      {label}
    </span>
  );
}

/** Resolves a per-word singer chip's class + optional custom-hex inline style, mirroring LineTextContent's logic. */
function resolveWordSingerChip(
  w: Word,
  appliedSingers: string[] | undefined,
  roster: string[],
  singerColors: string[] | undefined,
  settingsSingerColors: string[] | undefined,
  stamped: boolean,
): { className: string; style?: { color: string } } {
  const wordSingerIdx = w.singerIndex ?? (appliedSingers?.length === 1 ? 0 : null);
  const singerName = wordSingerIdx !== null ? appliedSingers?.[wordSingerIdx] : undefined;
  if (!singerName) {
    return { className: stamped ? '' : '' };
  }
  const globalIdx = singerColorIndex(singerName, roster);
  const customHex = singerColors?.[globalIdx] || settingsSingerColors?.[globalIdx];
  if (customHex) {
    return { className: '', style: { color: customHex } };
  }
  const chip = WORD_SINGER_CHIP[globalIdx % WORD_SINGER_CHIP.length];
  return { className: stamped ? chip.stamped : chip.unstamped };
}

interface Word {
  word: string;
  time?: number | null;
  singerIndex?: number | null;
}

interface WordLine {
  timestamp?: number | null;
  text?: string;
  secondary?: string;
  words?: Word[];
  secondaryWords?: Word[];
  singers?: string[];
}

interface FocusedTimestamp {
  lineIndex: number;
  type: string;
  wordIndex?: number;
}

export interface WordsModeColumnProps {
  line: WordLine;
  lineIndex: number;
  isSynced: boolean;
  isActive: boolean;
  isMobile: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: Record<string, any>;
  editingTimestamp: string | null;
  setEditingTimestamp: (value: string | null) => void;
  focusedTimestamp: FocusedTimestamp | null;
  setFocusedTimestamp: (value: FocusedTimestamp | null) => void;
  stampTarget: string;
  handleStampTargetToggle?: () => void;
  handleSetStampTarget?: (target: 'main' | 'secondary' | 'both') => void;
  activeWordIndex: number;
  handleSetTimestamp: (lineIndex: number, type: string, val: number) => void;
  handleTimestampWheel: (e: WheelEvent, lineIndex: number, type: string) => void;
  nudgeIndicator: string | null;
  handleWordClick: (e: MouseEvent, w: Word, wi: number, isSecondary?: boolean) => void;
  handleClearWordTimestamp: (lineIndex: number, wi: number, layer?: string) => void;
  onWordMenu?: (lineIndex: number, wi: number, w: Word, isSecondary: boolean) => void;
  songSingers?: string[];
  singerColors?: string[];
  activeSingers?: string[];
  /**
   * While the line is playing: index of the word being sung (-1 before the first
   * one). The highlight follows it instead of the stamping cursor. Null when paused.
   */
  playingWordIndex?: number | null;
}

export function WordsModeTimestamp({
  line,
  lineIndex,
  isSynced,
  isActive,
  settings,
  editingTimestamp,
  setEditingTimestamp,
  focusedTimestamp,
  setFocusedTimestamp,
  stampTarget,
  handleSetStampTarget,
  handleSetTimestamp,
  handleTimestampWheel,
  nudgeIndicator,
}: WordsModeColumnProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1">
      {/* Line-level timestamp + layer toggle */}
      <div className="flex items-center gap-1">
        {editingTimestamp === 'start' && isSynced ? (
          <InlineTimestampEdit
            value={line.timestamp}
            precision={settings.editor?.timestampPrecision || 'hundredths'}
            onChange={(val) => { handleSetTimestamp(lineIndex, 'start', val); setEditingTimestamp(null); }}
            onCancel={() => setEditingTimestamp(null)}
          />
        ) : (
          <TimestampBadge
            value={line.timestamp}
            isSynced={isSynced}
            isFocused={focusedTimestamp?.lineIndex === lineIndex && focusedTimestamp?.type === 'start'}
            isActive={isActive}
            precision={settings.editor?.timestampPrecision || 'hundredths'}
            onClick={() => setFocusedTimestamp(focusedTimestamp?.lineIndex === lineIndex && focusedTimestamp?.type === 'start' ? null : { lineIndex: lineIndex, type: 'start' })}
            onDoubleClick={(e) => { e.stopPropagation(); if (isSynced) setEditingTimestamp('start'); }}
            onWheel={(e) => { if (isSynced) handleTimestampWheel(e, lineIndex, 'start'); }}
            nudgeIndicator={isSynced ? nudgeIndicator : null}
          />
        )}
        {/* Layer control. Rendered only on lines that actually contain Japanese —
            a permanently greyed-out control on every English line is just noise —
            and each glyph carries its label, because 主 and ロ alone do not read. */}
        {hasCJK(line.text || '') && (
          <div className="flex items-center gap-0.5 bg-zinc-900 rounded-md p-0.5 shrink-0">
            {([
              { key: 'main', glyph: '主', label: t('editor.stampLayerMainShort'), hint: t('editor.stampLayerMain') },
              { key: 'secondary', glyph: 'ロ', label: t('editor.stampLayerSecondaryShort'), hint: t('editor.stampLayerSecondary') },
              { key: 'both', glyph: null, label: t('editor.stampLayerBoth'), hint: t('editor.stampLayerBothHint') },
            ] as const).map(({ key, glyph, label, hint }) => (
              <button
                key={key}
                type="button"
                title={hint}
                aria-pressed={stampTarget === key}
                onClick={(e) => { e.stopPropagation(); handleSetStampTarget?.(key); }}
                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded leading-none font-semibold transition-all ${stampTarget === key
                  ? 'bg-primary text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-200'
                  }`}
              >
                {glyph && <span aria-hidden="true" className="font-bold">{glyph}</span>}
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function WordsModeChips({
  line,
  lineIndex,
  isActive,
  isMobile,
  focusedTimestamp,
  stampTarget,
  activeWordIndex,
  handleWordClick,
  handleClearWordTimestamp,
  onWordMenu,
  settings,
  songSingers,
  singerColors,
  activeSingers,
  playingWordIndex = null,
}: WordsModeColumnProps) {
  const { t } = useTranslation();
  const playing = playingWordIndex != null;
  const roster = songSingers ?? [];
  const appliedSingers = activeSingers || line.singers;
  const settingsSingerColors = settings?.editor?.display?.singerColors;
  const chipSize = isActive ? CHIP_LARGE : CHIP_COMPACT;

  // The romaji layer can only be paired chip-for-chip when both layers tokenize to
  // the same number of words. They usually do once the text is grouped by morpheme;
  // when they don't, pairing by index would put the wrong reading under a word, so
  // the layer is left off rather than guessed.
  //
  // secondaryWords only exists once the romaji layer has been stamped against, so
  // the romaji is derived from the raw secondary text until then — otherwise the
  // paired layer would stay invisible until the user happened to switch to it.
  const romajiWords = useMemo(() => {
    const wordCount = line.words?.length ?? 0;
    if (!wordCount) return null;
    if (line.secondaryWords?.length) {
      return line.secondaryWords.length === wordCount ? line.secondaryWords : null;
    }
    const derived = (line.secondary || '').trim().split(/\s+/).filter(Boolean);
    return derived.length === wordCount ? derived.map((word) => ({ word, time: null })) : null;
  }, [line.words?.length, line.secondaryWords, line.secondary]);
  const reservesRomaji = isActive && hasCJK(line.text || '') && !!romajiWords;

  const chipBody = (
    label: string,
    time: number | null | undefined,
    extras: { collision?: boolean; fill?: { start: number; end: number } | null; romaji?: string | null } = {},
  ) => (
    <>
      {/* nowrap: the chip is sized for the whole word, so letting a hyphenated one
          like "low-key" break at its hyphen would spill it out of the box. */}
      <span className={`${isActive ? 'font-heading text-[18px] font-bold leading-none whitespace-nowrap' : ''} ${extras.fill ? 'relative whitespace-nowrap' : ''}`}>
        {label}
        {extras.fill && <KaraokeFill key={extras.fill.start} label={label} start={extras.fill.start} end={extras.fill.end} />}
      </span>
      {reservesRomaji && (
        // Rendered even when its text is hidden: the reserved row is what keeps the
        // chip the same height across layers, so picking a layer never moves the
        // block bar underneath.
        <span className="font-mono text-[11.5px] leading-none text-subtle truncate max-w-full">
          {(stampTarget !== 'main' && extras.romaji) || ' '}
        </span>
      )}
      {isActive && (
        <span className={`flex items-center gap-1 font-mono text-[11px] leading-none tabular-nums ${extras.collision ? 'text-gold-ink' : 'opacity-80'}`}>
          {extras.collision && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4L2.8 19.5h18.4z M12 10v4 M12 17h.01" />
            </svg>
          )}
          {time != null ? shortTime(time) : '--:--'}
        </span>
      )}
    </>
  );

  // Fixed geometry for the active line's chips: width off the 32px step grid, height
  // constant per line. Inactive rows stay compact so a long song still fits on screen.
  const chipGeometry = (word: string, romaji?: string | null) => isActive
    ? { width: chipWidthStep(word, romaji), height: reservesRomaji ? CHIP_H_WITH_ROMAJI : CHIP_H_PLAIN }
    : undefined;
  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Word chips */}
      {(reservesRomaji || stampTarget !== 'secondary') && (
        <div className={`flex flex-wrap w-full pr-2 min-h-[26px] items-center content-start ${isActive ? 'gap-2.5' : 'gap-1.5'}`}>
          {(() => {
            let wcs = 0;
            return line.words?.map((w, wi) => {
            const wKey = wcs;
            wcs += w.word.length;
            const displayWord = w.word.replace(/^[()'"]+|[,;.!?()'"]+$/g, '');
            // In Words mode, only show the automatic "next word" cursor if no word is manually focused anywhere
            // Playing: only the sung word is highlighted, with the solid look the
            // focused word has when paused. Paused: the focused word, else the cursor.
            const isFocusedWord = !playing && focusedTimestamp?.lineIndex === lineIndex && focusedTimestamp?.type === 'word' && focusedTimestamp?.wordIndex === wi;
            const isActiveWord = playing ? wi === playingWordIndex : wi === activeWordIndex && !focusedTimestamp;
            const nowClass = playing ? CHIP_PLAYING : CHIP_NOW;
            const singerChip = resolveWordSingerChip(w, appliedSingers, roster, singerColors, settingsSingerColors, w.time != null);
            // Two words showing the same time are almost always a double mark. Compared by
            // what the chip displays, so it flags exactly what the user would see twice.
            const prevTime = line.words?.[wi - 1]?.time;
            const sameAsPrev = w.time != null && prevTime != null && shortTime(w.time) === shortTime(prevTime);
            const fill = playing && isActiveWord ? wordSpan(line.words ?? [], wi) : null;
            const romaji = romajiWords?.[wi]?.word ?? null;
            const geometry = chipGeometry(displayWord, romaji);
            // With both layers in one chip the layer control no longer swaps which
            // component is on screen — it only picks which layer a mark lands on, so
            // the chip's click and its time slot follow that choice.
            const markingSecondary = reservesRomaji && stampTarget === 'secondary';
            const layerWord = markingSecondary ? (romajiWords![wi] ?? w) : w;
            return (
              <div key={wKey} className="flex flex-col items-center gap-1">
                {/* Word chip */}
                {layerWord.time != null ? (
                  <div className="group/word flex items-center gap-0.5">
                    <Tip content={`${t('editor.wordChipTitle', { word: w.word, time: formatTime(layerWord.time) })}${sameAsPrev ? ` · ${t('editor.wordSameTime')}` : ''}`}>
                      <StampedWordChip
                        time={layerWord.time}
                        focusedTimestamp={playing ? null : focusedTimestamp}
                        lineIndex={lineIndex}
                        wi={wi}
                        onClick={(e) => handleWordClick(e, layerWord, wi, markingSecondary)}
                        className={`${CHIP_BASE} ${chipSize} ${isActiveWord || isFocusedWord
                          ? nowClass
                          : sameAsPrev
                            ? CHIP_COLLISION
                            : (w.singerIndex != null ? (singerChip.className || CHIP_DONE) : CHIP_DONE)
                          }`}
                        style={{ ...geometry, ...(!(isActiveWord || isFocusedWord || sameAsPrev) ? singerChip.style : undefined) }}
                      >
                        {chipBody(displayWord, layerWord.time, { collision: sameAsPrev, fill, romaji })}
                      </StampedWordChip>
                    </Tip>
                    {!isMobile && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleClearWordTimestamp(lineIndex, wi, markingSecondary ? 'secondaryWords' : undefined); }}
                        className="opacity-0 group-hover/word:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-0.5 -ml-0.5"
                      >
                        <Icon name="ink_eraser" size={10} />
                      </button>
                    )}
                    {isFocusedWord && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onWordMenu?.(lineIndex, wi, w, false); }}
                        className="text-primary-dim bg-primary/10 rounded-full p-1 -ml-1 animate-in fade-in zoom-in-50 duration-200"
                      >
                        <Icon name="more_horiz" size={12} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => handleWordClick(e, layerWord, wi, markingSecondary)}
                      className={`${CHIP_BASE} ${chipSize} ${isActiveWord || isFocusedWord
                        ? nowClass
                        : (w.singerIndex != null ? (singerChip.className || CHIP_TODO) : CHIP_TODO)
                        }`}
                      style={{ ...geometry, ...(!(isActiveWord || isFocusedWord) ? singerChip.style : undefined) }}
                    >
                      {chipBody(displayWord, layerWord.time, { romaji })}
                    </button>
                    {isFocusedWord && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onWordMenu?.(lineIndex, wi, w, false); }}
                        className="text-primary-dim bg-primary/10 rounded-full p-1 -ml-1 animate-in fade-in zoom-in-50 duration-200"
                      >
                        <Icon name="more_horiz" size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          });
          })()}
        </div>
      )}
      {/* Secondary word chips — shown only when stampTarget is 'secondary' */}
      {!reservesRomaji && stampTarget === 'secondary' && hasCJK(line.text || '') && line.secondary && (
        <div className="flex flex-wrap gap-x-1.5 gap-y-1.5 w-full pr-2 min-h-[26px] items-center content-start">
          {(() => {
            const secondaryWords: Word[] = line.secondaryWords?.length
              ? line.secondaryWords
              : line.secondary!.trim().split(/\s+/).reduce<Word[]>((acc, word) => {
                if (word) acc.push({ word, time: null });
                return acc;
              }, []);
            let swcs = 0;
            return secondaryWords.map((w, wi) => {
            const wKey = swcs;
            swcs += w.word.length;
            const isFocusedSecondaryWord = focusedTimestamp?.lineIndex === lineIndex && focusedTimestamp?.type === 'secondaryWord' && focusedTimestamp?.wordIndex === wi;
            const isActiveSecondaryWord = wi === activeWordIndex && !focusedTimestamp;
            return w.time != null ? (
              <div key={wKey} className="group/sword flex items-center gap-0.5">
                <Tip content={`${w.word} @ ${formatTime(w.time)}`}>
                  <StampedWordChip
                    time={w.time}
                    focusedTimestamp={focusedTimestamp}
                    lineIndex={lineIndex}
                    wi={wi}
                    isSecondary={true}
                    onClick={(e) => handleWordClick(e, w, wi, true)}
                    className={`text-[13px] px-3 py-1 rounded-full border leading-none font-medium transition-colors cursor-pointer ${isActiveSecondaryWord || isFocusedSecondaryWord
                      ? 'bg-accent-blue text-zinc-950 border-accent-blue ring-2 ring-accent-blue/40 shadow-[0_0_12px_rgba(var(--accent-blue-rgb),0.5)] animate-pulse-glow'
                      : 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue/70 hover:bg-accent-blue/20 hover:text-accent-blue hover:border-accent-blue'
                      }`}
                  >
                    {w.word}
                  </StampedWordChip>
                </Tip>
                {!isMobile && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleClearWordTimestamp(lineIndex, wi, 'secondaryWords'); }}
                    className="opacity-0 group-hover/sword:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-0.5 -ml-0.5"
                  >
                    <Icon name="ink_eraser" size={10} />
                  </button>
                )}
                {isMobile && isFocusedSecondaryWord && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onWordMenu?.(lineIndex, wi, w, true); }}
                    className="text-accent-blue bg-accent-blue/10 rounded-full p-1 -ml-1 animate-in fade-in zoom-in-50 duration-200"
                  >
                    <Icon name="more_horiz" size={12} />
                  </button>
                )}
              </div>
            ) : (
              <div key={wKey} className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={(e) => handleWordClick(e, w, wi, true)}
                  className={`text-[13px] px-3 py-1 rounded-full border leading-none font-medium transition-all cursor-pointer outline-none focus:ring-2 focus:ring-accent-blue/40 ${isActiveSecondaryWord || isFocusedSecondaryWord
                    ? 'bg-accent-blue text-zinc-900 border-accent-blue shadow-[0_0_12px_rgba(var(--accent-blue-rgb),0.5)] animate-pulse-glow'
                    : 'bg-zinc-800/50 border-zinc-700/30 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-400'
                    }`}
                >
                  {w.word}
                </button>
                {isMobile && isFocusedSecondaryWord && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onWordMenu?.(lineIndex, wi, w, true); }}
                    className="text-accent-blue bg-accent-blue/10 rounded-full p-1 -ml-1 animate-in fade-in zoom-in-50 duration-200"
                  >
                    <Icon name="more_horiz" size={12} />
                  </button>
                )}
              </div>
            );
          });
          })()}
        </div>
      )}
    </div>
  );
}
