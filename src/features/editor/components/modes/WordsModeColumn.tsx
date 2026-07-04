import { useTranslation } from 'react-i18next';
import type { MouseEvent, WheelEvent } from 'react';
import { hasCJK } from '@/shared/utils/furigana';
import { formatTime } from '@/shared/utils/format-time';
import { Tip } from '@ui/tip';
import { InlineTimestampEdit } from '../line/InlineTimestampEdit';
import { TimestampBadge } from '../line/TimestampBadge';
import { StampedWordChip } from './StampedWordChip';
import { Icon } from '@/shared/ui/Icon';

// Per-singer chip color sets [bg, border, text] for stamped and unstamped word chips
const WORD_SINGER_CHIP = [
  { stamped: 'bg-primary/15 border-primary/40 text-primary/80 hover:border-primary hover:bg-primary/25 hover:text-primary', unstamped: 'bg-primary/8 border-primary/25 text-primary/60 hover:bg-primary/15 hover:text-primary/80' },
  { stamped: 'bg-sky-500/15 border-sky-500/40 text-sky-400/80 hover:border-sky-400 hover:bg-sky-500/25 hover:text-sky-400', unstamped: 'bg-sky-500/8 border-sky-500/25 text-sky-400/60 hover:bg-sky-500/15 hover:text-sky-400/80' },
  { stamped: 'bg-violet-500/15 border-violet-500/40 text-violet-400/80 hover:border-violet-400 hover:bg-violet-500/25 hover:text-violet-400', unstamped: 'bg-violet-500/8 border-violet-500/25 text-violet-400/60 hover:bg-violet-500/15 hover:text-violet-400/80' },
  { stamped: 'bg-amber-500/15 border-amber-500/40 text-amber-400/80 hover:border-amber-400 hover:bg-amber-500/25 hover:text-amber-400', unstamped: 'bg-amber-500/8 border-amber-500/25 text-amber-400/60 hover:bg-amber-500/15 hover:text-amber-400/80' },
];

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
}

interface FocusedTimestamp {
  lineIndex: number;
  type: string;
  wordIndex?: number;
}

interface WordsModeColumnProps {
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
  activeWordIndex: number;
  handleSetTimestamp: (lineIndex: number, type: string, val: number) => void;
  handleTimestampWheel: (e: WheelEvent, lineIndex: number, type: string) => void;
  nudgeIndicator: string | null;
  handleWordClick: (e: MouseEvent, w: Word, wi: number, isSecondary?: boolean) => void;
  handleClearWordTimestamp: (lineIndex: number, wi: number, layer?: string) => void;
  onWordMenu?: (lineIndex: number, wi: number, w: Word, isSecondary: boolean) => void;
}

export default function WordsModeColumn({
  line,
  lineIndex,
  isSynced,
  isActive,
  isMobile,
  settings,
  editingTimestamp,
  setEditingTimestamp,
  focusedTimestamp,
  setFocusedTimestamp,
  stampTarget,
  handleStampTargetToggle,
  activeWordIndex,
  handleSetTimestamp,
  handleTimestampWheel,
  nudgeIndicator,
  handleWordClick,
  handleClearWordTimestamp,
  onWordMenu,
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
        {/* Layer toggle buttons — only for CJK lines with secondary text */}
        {hasCJK(line.text || '') && line.secondary && (
          <div className="flex items-center gap-0.5 bg-zinc-900 rounded-md p-0.5 shrink-0">
            <Tip content={t('editor.stampLayerMain')}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); if (stampTarget !== 'main') handleStampTargetToggle?.(); }}
                className={`inline-flex items-center justify-center text-[9px] px-1.5 py-0.5 rounded leading-none font-bold transition-all ${stampTarget === 'main'
                  ? 'bg-primary text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-300'
                  }`}
              >主</button>
            </Tip>
            <Tip content={t('editor.stampLayerSecondary')}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); if (stampTarget !== 'secondary') handleStampTargetToggle?.(); }}
                className={`inline-flex items-center justify-center text-[9px] px-1.5 py-0.5 rounded leading-none font-bold transition-all ${stampTarget === 'secondary'
                  ? 'bg-accent-blue text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-300'
                  }`}
              >ロ</button>
            </Tip>
          </div>
        )}
      </div>
      {/* Word chips */}
      {stampTarget !== 'secondary' && (
        <div className="flex flex-wrap gap-x-1 gap-y-1 w-full pr-2 min-h-[22px] items-end content-start">
          {(() => {
            let wcs = 0;
            return line.words?.map((w, wi) => {
            const wKey = wcs;
            wcs += w.word.length;
            const displayWord = w.word.replace(/^[()'"]+|[,;.!?()'"]+$/g, '');
            // In Words mode, only show the automatic "next word" cursor if no word is manually focused anywhere
            const isFocusedWord = focusedTimestamp?.lineIndex === lineIndex && focusedTimestamp?.type === 'word' && focusedTimestamp?.wordIndex === wi;
            const isActiveWord = wi === activeWordIndex && !focusedTimestamp;
            return (
              <div key={wKey} className="flex flex-col items-center gap-1">
                {/* Word chip */}
                {w.time != null ? (
                  <div className="group/word flex items-center gap-0.5">
                    <Tip content={t('editor.wordChipTitle', { word: w.word, time: formatTime(w.time) })}>
                      <StampedWordChip
                        time={w.time}
                        focusedTimestamp={focusedTimestamp}
                        lineIndex={lineIndex}
                        wi={wi}
                        onClick={(e) => handleWordClick(e, w, wi)}
                        className={`text-[11px] px-2.5 py-0.5 rounded-full border leading-none transition-all duration-200 cursor-pointer ${isActiveWord || isFocusedWord
                          ? 'bg-primary text-zinc-950 border-primary ring-2 ring-primary/40 shadow-[0_0_12px_rgba(var(--primary-rgb),0.5)] animate-pulse-glow'
                          : (w.singerIndex != null ? WORD_SINGER_CHIP[w.singerIndex % WORD_SINGER_CHIP.length].stamped : 'bg-zinc-800 border-primary/30 text-primary/70 hover:border-primary hover:bg-primary/20 hover:text-primary')
                          }`}
                      >
                        {displayWord}
                      </StampedWordChip>
                    </Tip>
                    {!isMobile && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleClearWordTimestamp(lineIndex, wi); }}
                        className="opacity-0 group-hover/word:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-0.5 -ml-0.5"
                      >
                        <Icon name="ink_eraser" size={10} />
                      </button>
                    )}
                    {isMobile && isFocusedWord && (
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
                      onClick={(e) => handleWordClick(e, w, wi)}
                      className={`text-[11px] px-2.5 py-0.5 rounded-full border leading-none transition-all cursor-pointer outline-none focus:ring-2 focus:ring-primary/40 ${isActiveWord || isFocusedWord
                        ? 'bg-primary text-zinc-950 border-primary shadow-[0_0_12px_rgba(var(--primary-rgb),0.5)] animate-pulse-glow'
                        : (w.singerIndex != null ? WORD_SINGER_CHIP[w.singerIndex % WORD_SINGER_CHIP.length].unstamped : 'bg-zinc-800/50 border-zinc-700/30 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400')
                        }`}
                    >
                      {displayWord}
                    </button>
                    {isMobile && isFocusedWord && (
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
      {stampTarget === 'secondary' && hasCJK(line.text || '') && line.secondary && (
        <div className="flex flex-wrap gap-x-1 gap-y-1 w-full pr-2 min-h-[22px] items-end content-start">
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
                    className={`text-[11px] px-2.5 py-0.5 rounded-full border leading-none transition-colors cursor-pointer ${isActiveSecondaryWord || isFocusedSecondaryWord
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
                  className={`text-[11px] px-2.5 py-0.5 rounded-full border leading-none transition-all cursor-pointer outline-none focus:ring-2 focus:ring-accent-blue/40 ${isActiveSecondaryWord || isFocusedSecondaryWord
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
