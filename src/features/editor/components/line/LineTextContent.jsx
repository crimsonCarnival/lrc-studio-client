import React from 'react';
import { parseRubyMarkup, hasKanji, isKanji, hasCJK, toHiragana, toKatakana } from '@/shared/utils/furigana';
import { ReadingInput } from './ReadingInput';
import { Tip } from '@ui/tip';
import { useTranslation } from 'react-i18next';

const LineTextContent = React.memo(({
  line,
  lineIndex,
  isActive,
  isSynced,
  editorMode,
  settings,
  activeWordIndex,
  editingReadingWordIndex,
  setEditingReadingWordIndex,
  handleReadingCommit,
  selection,
  setSelection,
  onCharClick,
  handleWordClick,
  wordClickTimerRef,
  handleSaveLineText,
}) => {
  const { t } = useTranslation();

  return (
    <div className={`flex flex-col gap-1 group/text min-w-0 w-full ${editorMode === 'words' ? 'pt-0.5' : ''}`}>
      <div className="flex items-center gap-2">
        <p
          className={`text-[13px] lg:text-xs transition-all duration-300 ease-out ${(line.words?.some(w => w.reading) || (editorMode !== 'words' && (editingReadingWordIndex != null || selection.start != null || selection.range != null))) ? 'overflow-hidden' : 'break-words whitespace-pre-wrap'} ${isActive
            ? 'text-zinc-100 font-medium'
            : isSynced
              ? line.words?.some(w => w.time != null) ? 'text-zinc-300' : 'text-zinc-100'
              : 'text-zinc-500'
            }`}
          style={(line.words?.some(w => w.reading) || (editorMode !== 'words' && (editingReadingWordIndex != null || selection.start != null || selection.range != null)))
            ? { lineHeight: '2.4' }
            : { lineHeight: '1.6' }}
        >
          {line.words?.length > 0
            ? (() => {
              let wordCharStart = 0;
              return line.words.map((w, wi) => {
              const wKey = wordCharStart;
              wordCharStart += w.word.length;
              const canHaveReading = hasKanji(w.word || '');
              const isEditing = editingReadingWordIndex === wi;
              const rubyFmt = settings?.editor?.display?.readingFormat || 'hiragana';
              const fmtR = (r) => r ? (rubyFmt === 'katakana' ? toKatakana(r) : toHiragana(r)) : r;
              const trailingSpace = /[a-zA-Z0-9]/.test(w.word) ? ' ' : null;

              const spanClass = editorMode === 'words'
                ? `transition-all px-0.5 rounded ${isActive && wi === activeWordIndex
                  ? 'bg-primary/20 text-primary [text-shadow:0_0_0.8px_currentColor] underline decoration-dotted underline-offset-2'
                  : w.time != null
                    ? 'text-primary/70 hover:bg-zinc-800'
                    : isActive || isSynced ? 'text-zinc-100 hover:bg-zinc-800' : 'hover:bg-zinc-800'
                }`
                : `transition-colors px-0.5 rounded ${canHaveReading ? 'hover:bg-white/5' : ''}`;

              const content = (
                <span className={spanClass}>
                  {w.word}
                </span>
              );

              if (isEditing) {
                return (
                  <React.Fragment key={wKey}>
                    <ruby>
                      {content}
                      <rt>
                        <ReadingInput
                          defaultValue={fmtR(w.reading) || ''}
                          onCommit={(val, direction) => handleReadingCommit(val, wi, direction)}
                          onCancel={() => setEditingReadingWordIndex(null)}
                          readingFormat={rubyFmt}
                          className="text-[9px] font-mono text-center bg-transparent border-b border-primary outline-none text-primary p-0.5"
                          style={{ width: `${Math.max(30, (w.reading || w.word).length * 10)}px` }}
                        />
                      </rt>
                    </ruby>
                    {trailingSpace}
                  </React.Fragment>
                );
              }

              return (
                <React.Fragment key={wi}>
                  <ruby
                    className={`group/ruby ${editorMode === 'words' || canHaveReading ? 'cursor-pointer' : 'cursor-default'} ${canHaveReading ? 'hover:text-primary' : ''}`}
                    role={editorMode === 'words' || canHaveReading ? 'button' : undefined}
                    tabIndex={editorMode === 'words' || canHaveReading ? 0 : undefined}
                    onClick={(e) => {
                      if (editorMode !== 'words' && !canHaveReading) return;
                      e.stopPropagation();
                      if (editorMode === 'words') {
                        handleWordClick(e, w, wi);
                      } else if (canHaveReading) {
                        setEditingReadingWordIndex(wi);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (editorMode !== 'words' && !canHaveReading) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault(); e.stopPropagation();
                        if (editorMode === 'words') handleWordClick(e, w, wi);
                        else setEditingReadingWordIndex(wi);
                      }
                    }}
                    onDoubleClick={(e) => {
                      if (canHaveReading) {
                        e.stopPropagation();
                        e.preventDefault();
                        clearTimeout(wordClickTimerRef.current);
                        setEditingReadingWordIndex(wi);
                      }
                    }}
                  >
                    {content}
                    {canHaveReading && (editorMode !== 'words' || w.reading) && (
                      <rt
                        role="button"
                        aria-label={w.reading || 'Add reading'}
                        className={`select-none transition-colors ${w.reading ? 'text-[10px] font-mono text-zinc-400 group-hover/ruby:text-primary' : 'border-b-2 border-zinc-700/30 border-dashed min-h-[4px] group-hover/ruby:border-primary/40'}`}
                        tabIndex={editorMode !== 'words' ? 0 : undefined}
                        onClick={editorMode !== 'words' ? (e) => {
                          e.stopPropagation();
                          setEditingReadingWordIndex(wi);
                        } : undefined}
                        onKeyDown={editorMode !== 'words' ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault(); e.stopPropagation();
                            setEditingReadingWordIndex(wi);
                          }
                        } : undefined}
                      >
                        {w.reading ? fmtR(w.reading) : '　'}
                      </rt>
                    )}
                  </ruby>
                  {trailingSpace}
                </React.Fragment>
              );
            });
            })()
            : (() => {
              const { plainText, segments } = parseRubyMarkup(line.text || '♪');
              const textChars = [...plainText];
              const rubyFmt = settings?.editor?.display?.readingFormat || 'hiragana';

              let currentCi = 0;
              return segments.map((seg) => {
                const segmentChars = [...seg.text];
                const startCi = currentCi;
                currentCi += segmentChars.length;

                if (seg.reading) {
                  return (
                    <ruby
                      key={startCi}
                      className="text-primary font-medium cursor-pointer group/ruby relative"
                      role="button"
                      aria-label={seg.reading || seg.text}
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCharClick(startCi);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault(); e.stopPropagation();
                          onCharClick(startCi);
                        }
                      }}
                    >
                      {seg.text}
                      <rt className="text-[10px] font-mono text-zinc-400 select-none group-hover/ruby:text-primary transition-colors">
                        {rubyFmt === 'katakana' ? toKatakana(seg.reading) : toHiragana(seg.reading)}
                      </rt>
                    </ruby>
                  );
                }

                return segmentChars.map((ch, ci_off) => {
                  const ci = startCi + ci_off;
                  const isNonCJK = !hasCJK(ch);

                  const handleCharClick = (e) => {
                    e.stopPropagation();
                    onCharClick(ci);
                  };

                  if (isNonCJK) return (
                    <span key={ci} className="text-zinc-300/90">{ch}</span>
                  );

                  if (selection.range) {
                    const { s, e } = selection.range;
                    if (ci === s) {
                      const selectedText = textChars.slice(s, e + 1).join('');
                      return (
                        <ruby key={ci} className="text-primary font-medium">
                          {selectedText}
                          <rt>
                            <ReadingInput
                              defaultValue=""
                              onCommit={(val) => {
                                const charReadings = [];
                                segments.forEach(s2 => {
                                  const chars = [...s2.text];
                                  chars.forEach(c => charReadings.push({ char: c, reading: s2.reading }));
                                });

                                for (let k = s; k <= e; k++) {
                                  charReadings[k].reading = val || null;
                                }

                                let resultText = "";
                                let j = 0;
                                while (j < charReadings.length) {
                                  const start = j;
                                  const r = charReadings[j].reading;
                                  j++;
                                  if (r) {
                                    while (j < charReadings.length && charReadings[j].reading === r) {
                                      j++;
                                    }
                                    const groupText = charReadings.slice(start, j).map(x => x.char).join('');
                                    resultText += `{${groupText}|${r}}`;
                                  } else {
                                    resultText += charReadings[start].char;
                                  }
                                }

                                handleSaveLineText?.(lineIndex, resultText, line.secondary, line.translations, line.singers);
                                setSelection({ start: null, end: null, range: null });
                              }}
                              onCancel={() => setSelection({ start: null, end: null, range: null })}
                              readingFormat={rubyFmt}
                              className="text-[9px] font-mono text-center bg-transparent border-b border-primary outline-none text-primary p-0.5"
                              style={{ width: `${Math.max(30, selectedText.length * 12)}px` }}
                            />
                          </rt>
                        </ruby>
                      );
                    }
                    if (ci > s && ci <= e) return null;
                  }

                  const sIdx = selection.start;
                  const eIdx = selection.end !== null ? selection.end : sIdx;
                  const inSelection = sIdx !== null && ci >= Math.min(sIdx, eIdx) && ci <= Math.max(sIdx, eIdx);
                  const isCharKanji = isKanji(ch);

                  if (isNonCJK || !isCharKanji) {
                    return (
                      <span
                        key={ci}
                        className={`transition-colors px-0.5 ${inSelection ? 'bg-primary/20 text-primary rounded-sm' : 'text-zinc-400/80'}`}
                      >
                        {ch}
                      </span>
                    );
                  }

                  return (
                    <ruby
                      key={ci}
                      onClick={handleCharClick}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault(); e.stopPropagation();
                          handleCharClick(e);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className={`cursor-pointer transition-all duration-200 group/ruby outline-none ${inSelection ? 'bg-primary/20 text-primary rounded-sm shadow-[0_1px_0_0_rgba(var(--primary-rgb),0.2)]' : 'hover:text-primary focus:text-primary'
                        }`}
                    >
                      {ch}
                      <rt className={`min-h-[4px] text-[8px] ${inSelection
                          ? 'border-b-2 border-primary/40 border-dashed'
                          : 'border-b-2 border-zinc-700/30 border-dashed group-hover/ruby:border-primary/40'
                        }`}>
                        {'　'}
                      </rt>
                    </ruby>
                  );
                });
              });
            })()
          }
        </p>
        {editorMode !== 'words' && line.words?.some((w) => w.time != null) && (
          <Tip content={t('editor.wordBadgeHint', { count: line.words.filter(w => w.time != null).length })}>
            <button
              type="button"
              className="flex-shrink-0 text-[9px] font-mono text-accent-blue/60 px-1 py-0.5 bg-accent-blue/10 rounded border border-accent-blue/20 leading-none cursor-pointer hover:bg-accent-blue/20 hover:text-accent-blue transition-colors focus:ring-1 focus:ring-accent-blue/40 outline-none"
              onClick={(e) => { e.stopPropagation(); }}
            >
              W
            </button>
          </Tip>
        )}
      </div>
      {line.secondary && (
        <p className="text-[10px] text-zinc-500 leading-tight pl-0.5 truncate">{line.secondary}</p>
      )}
      {line.translations?.map((tr, idx) => tr.text ? (
        <p key={idx} className="text-[10px] text-zinc-500/70 italic leading-tight pl-0.5 truncate">
          {tr.language ? <span className="text-zinc-600 not-italic">{tr.language}: </span> : null}{tr.text}
        </p>
      ) : null)}
    </div>
  );
});

export default LineTextContent;
