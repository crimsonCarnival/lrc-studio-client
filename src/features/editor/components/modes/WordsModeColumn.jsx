import { useTranslation } from 'react-i18next';
import { hasCJK } from '@/shared/utils/furigana';
import { formatTime } from '@/shared/utils/format-time';
import { Tip } from '@ui/tip';
import { InlineTimestampEdit } from '../line/InlineTimestampEdit';
import { TimestampBadge } from '../line/TimestampBadge';
import { StampedWordChip } from './StampedWordChip';
import { MoreHorizontal, Eraser } from 'lucide-react';

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
}) {
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
                          : 'bg-zinc-800 border-primary/30 text-primary/70 hover:border-primary hover:bg-primary/20 hover:text-primary'
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
                        <Eraser className="size-2.5" />
                      </button>
                    )}
                    {isMobile && isFocusedWord && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onWordMenu?.(lineIndex, wi, w, false); }}
                        className="text-primary-dim bg-primary/10 rounded-full p-1 -ml-1 animate-in fade-in zoom-in-50 duration-200"
                      >
                        <MoreHorizontal className="size-3" />
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
                        : 'bg-zinc-800/50 border-zinc-700/30 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400'
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
                        <MoreHorizontal className="size-3" />
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
            const secondaryWords = line.secondaryWords?.length
              ? line.secondaryWords
              : line.secondary.trim().split(/\s+/).reduce((acc, word) => {
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
                    <Eraser className="size-2.5" />
                  </button>
                )}
                {isMobile && isFocusedSecondaryWord && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onWordMenu?.(lineIndex, wi, w, true); }}
                    className="text-accent-blue bg-accent-blue/10 rounded-full p-1 -ml-1 animate-in fade-in zoom-in-50 duration-200"
                  >
                    <MoreHorizontal className="size-3" />
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
                    <MoreHorizontal className="size-3" />
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
