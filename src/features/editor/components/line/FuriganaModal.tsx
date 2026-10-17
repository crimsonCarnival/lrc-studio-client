import { useMemo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ResponsiveModal from '@/shared/ui/ResponsiveModal';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { ReadingInput } from './ReadingInput';
import { toHiragana, toKatakana, rubyRatioClass, splitOkurigana, rubyFitStyle } from '@/shared/utils/furigana';
import { collectFuriganaTargets, setTextAtomReading } from '@/features/editor/utils/furigana-targets';
import type { EditorLine } from '@/features/editor/services/editor.service';

interface FuriganaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: EditorLine[];
  /** Where to start: the modal opens on the first target at or after this line. */
  startLineIndex?: number;
  readingFormat?: string;
  onSetReading: (lineIndex: number, wordIndex: number, reading: string) => void;
  /** Write path for lines that keep readings inline in the text rather than on words. */
  onSetLineText?: (lineIndex: number, text: string) => void;
  /** Moves the editor's cursor so the list follows along with the modal. */
  onFocusLine?: (lineIndex: number) => void;
  /** Regrouping, for when the automatic split put a boundary in the wrong place. */
  onMergeWithNext?: (lineIndex: number, wordIndex: number) => void;
  onSplitWord?: (lineIndex: number, wordIndex: number) => void;
}

export function FuriganaModal({
  open,
  onOpenChange,
  lines,
  startLineIndex = 0,
  readingFormat = 'hiragana',
  onSetReading,
  onSetLineText,
  onFocusLine,
  onMergeWithNext,
  onSplitWord,
}: FuriganaModalProps) {
  const { t } = useTranslation();
  const targets = useMemo(() => collectFuriganaTargets(lines), [lines]);
  const [cursor, setCursor] = useState(0);

  const fmt = useCallback(
    (r?: string | null) => (r ? (readingFormat === 'katakana' ? toKatakana(r) : toHiragana(r)) : ''),
    [readingFormat],
  );

  // Opening lands on the word the editor was already sitting on rather than at
  // the top of the song, so the button is a continuation and not a jump. Done as
  // a render-time adjustment rather than an effect: an effect would paint the
  // previous word for one frame before correcting itself.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const at = targets.findIndex((tg) => tg.lineIndex >= startLineIndex);
      setCursor(at === -1 ? 0 : at);
    }
  }

  // Default is the kanji on its own: that is what is being annotated, and the
  // surrounding kana only make it smaller. The line is one toggle away for when
  // the reading depends on context.
  const [showLine, setShowLine] = useState(false);

  const current = targets[cursor];
  const currentSplit = splitOkurigana(current?.word);
  const lineRomaji = current ? (lines[current.lineIndex]?.secondary ?? null) : null;

  useEffect(() => {
    if (open && current) onFocusLine?.(current.lineIndex);
  }, [open, current, onFocusLine]);

  const move = useCallback((direction: number) => {
    setCursor((c) => Math.min(targets.length - 1, Math.max(0, c + direction)));
  }, [targets.length]);

  /** Jump to the next word that still has no reading — the usual way through a song. */
  const nextUnread = useCallback(() => {
    const at = targets.findIndex((tg, i) => i > cursor && !tg.reading);
    if (at !== -1) setCursor(at);
  }, [targets, cursor]);

  const commit = useCallback((value: string, direction: number) => {
    if (!current) return;
    if (value !== (current.reading ?? '')) {
      if (current.source === 'text') {
        onSetLineText?.(current.lineIndex, setTextAtomReading(lines[current.lineIndex]?.text, current.index, value));
      } else {
        onSetReading(current.lineIndex, current.index, value);
      }
    }
    if (direction !== 0) move(direction);
  }, [current, onSetReading, onSetLineText, lines, move]);

  const remaining = useMemo(() => targets.filter((tg) => !tg.reading).length, [targets]);

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('editor.furigana.title')}
      description={t('editor.furigana.description')}
      dialogProps={{ className: 'sm:max-w-xl' }}
    >
      {!current ? (
        <p className="py-10 text-center text-sm text-subtle">{t('editor.furigana.empty')}</p>
      ) : (
        <div className="flex flex-col gap-5 py-2">
          {/* Position + how much is left */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.1em] text-subtle">
            <span>{t('editor.furigana.position', { current: cursor + 1, total: targets.length })}</span>
            <span>{t('editor.furigana.remaining', { count: remaining })}</span>
          </div>

          {/* The kanji being annotated, at a size where it is actually readable.
              Only the kanji by default — the kana around it add nothing to the
              decision and only force the glyph smaller. */}
          <div className="flex flex-col items-center gap-2 rounded-xl bg-raised py-7 px-4">
            {showLine ? (
              <p lang="ja" className="ruby-host cjk-reserve-list text-[26px] font-semibold leading-relaxed text-center">
                {current.lineWords.map((w, i) => {
                  const part = splitOkurigana(w.word);
                  const isCurrent = i === current.index;
                  const body = part.kanji && w.reading ? (
                    <>
                      {part.lead}
                      <ruby className={rubyRatioClass(part.kanji, w.reading)} style={rubyFitStyle(part.kanji, w.reading)}>
                        {part.kanji}
                        <rt>{fmt(w.reading)}</rt>
                      </ruby>
                      {part.tail}
                    </>
                  ) : w.word;
                  return (
                    <span key={i} className={isCurrent ? 'rounded bg-primary/25 text-primary-ink' : 'text-subtle'}>
                      {body}
                      {/\w$/.test(w.word) ? ' ' : ''}
                    </span>
                  );
                })}
              </p>
            ) : (
              <p lang="ja" className="ruby-host cjk-reserve-preview text-[56px] font-semibold leading-none">
                <ruby
                  className={rubyRatioClass(currentSplit.kanji, current.reading)}
                  style={rubyFitStyle(currentSplit.kanji, current.reading)}
                >
                  {currentSplit.kanji || current.word}
                  <rt>{fmt(current.reading) || '　'}</rt>
                </ruby>
              </p>
            )}

            {/* Romaji, when the two layers pair up */}
            {(showLine ? lineRomaji : current.romaji) && (
              <p className="font-mono text-[12px] text-subtle text-center">
                {showLine ? lineRomaji : current.romaji}
              </p>
            )}

            <button
              type="button"
              onClick={() => setShowLine((v) => !v)}
              className="mt-1 text-[11px] font-medium text-subtle underline-offset-2 hover:text-foreground hover:underline"
            >
              {showLine ? t('editor.furigana.showKanjiOnly') : t('editor.furigana.showWholeLine')}
            </button>
          </div>

          {/* Reading field. Keyed so moving to another word remounts it with that
              word's value and refocuses it. */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">
              {t('editor.furigana.readingLabel')}
            </label>
            <ReadingInput
              key={`${current.lineIndex}:${current.source}:${current.index}`}
              defaultValue={fmt(current.reading)}
              onCommit={commit}
              onCancel={() => onOpenChange(false)}
              readingFormat={readingFormat}
              selectOnFocus
              placeholder={t('editor.furigana.placeholder')}
              className="w-full rounded-lg border border-hl bg-background px-3 py-2.5 text-center text-2xl outline-none focus:border-primary"
            />
            <p className="text-[11px] text-subtle">{t('editor.furigana.hint')}</p>
          </div>

          {/* Regrouping. Automatic grouping puts the boundary in the wrong place
              often enough — a kana prefix, a compound the singer holds apart —
              that the fix has to be reachable from where the mistake is visible.
              Only lines with a words array can be regrouped; a line still kept as
              raw text has no boundaries to move. */}
          {current.source === 'words' && (onMergeWithNext || onSplitWord) && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">
                {t('editor.furigana.regroupHint')}
              </span>
              <div className="flex items-center gap-2">
                {onMergeWithNext && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={current.index >= current.lineWords.length - 1}
                    onClick={() => onMergeWithNext(current.lineIndex, current.index)}
                  >
                    <Icon name="link" size={15} />
                    {t('editor.grouping.mergeNext')}
                  </Button>
                )}
                {onSplitWord && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={[...current.word].length < 2}
                    onClick={() => onSplitWord(current.lineIndex, current.index)}
                  >
                    <Icon name="call_split" size={15} />
                    {t('editor.grouping.split')}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* The line it belongs to, with this word marked */}
          <div lang="ja" className="ruby-host cjk-reserve-list rounded-lg bg-raised/60 px-3 py-2 text-[15px] leading-relaxed">
            {current.lineWords.map((w, i) => (
              <span
                key={i}
                className={i === current.index ? 'rounded bg-primary/25 text-primary-ink' : 'text-subtle'}
              >
                {w.word}
                {/\w$/.test(w.word) ? ' ' : ''}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => move(-1)} disabled={cursor === 0}>
              <Icon name="chevron_left" size={16} />
              {t('editor.furigana.prev')}
            </Button>
            <Button variant="ghost" size="sm" onClick={nextUnread} disabled={remaining === 0}>
              {t('editor.furigana.nextUnread')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => move(1)} disabled={cursor >= targets.length - 1}>
              {t('editor.furigana.next')}
              <Icon name="chevron_right" size={16} />
            </Button>
          </div>
        </div>
      )}
    </ResponsiveModal>
  );
}

export default FuriganaModal;
