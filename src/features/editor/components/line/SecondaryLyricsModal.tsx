import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import ResponsiveModal from '@/shared/ui/ResponsiveModal';
import { Button } from '@ui/button';
import { formatSectionLabel } from '@features/editor/constants/section-types';
import { mainLineIndices, secondaryText, splitSecondaryText, translationLanguages, translationText } from '@/features/editor/utils/secondary-lines';
import { FloatingCombobox } from '@ui/floating-combobox';
import { useLanguageOptions } from '@features/editor/hooks/useLanguageOptions';
import type { EditorLine } from '@/features/editor/editor.types';

/** Row height shared by the lyric column and the textarea, so row N and text line N line up. */
const ROW = 28;
const PAD = 8;

interface SecondaryLyricsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: EditorLine[];
  /**
   * values[n] becomes the secondary of opened[n], the n-th main (non-section) line
   * as it was when the modal opened. The caller matches those back to the current
   * lines, which collaborators may have changed while the modal was open.
   */
  onApply: (values: string[], opened: EditorLine[], language: string) => void;
  /**
   * 'translation' edits one translation language per visit instead of the secondary lyrics:
   * same pairing by position, plus a language picker (the text reloads when it changes).
   */
  kind?: 'secondary' | 'translation';
}

/** Rendered only in translation mode, so the language list is not fetched for the secondary editor. */
function LanguagePicker({ value, onChange, used }: { value: string; onChange: (language: string) => void; used: string[] }) {
  const { t } = useTranslation();
  const options = useLanguageOptions();
  const merged = useMemo(() => {
    const known = new Set(options.map((o) => o.value));
    return [...used.filter((l) => l && !known.has(l)).map((l) => ({ value: l, label: l })), ...options];
  }, [options, used]);
  return (
    <FloatingCombobox
      label=""
      value={value}
      onChange={onChange}
      options={merged}
      strict
      size="sm"
      placeholder={t('editor.langPlaceholder')}
      className="w-44 shrink-0"
    />
  );
}

function caretLineOf(el: HTMLTextAreaElement): number {
  return el.value.slice(0, el.selectionStart).split('\n').length - 1;
}

export function SecondaryLyricsModal({ open, onOpenChange, lines, onApply, kind = 'secondary' }: SecondaryLyricsModalProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [caretLine, setCaretLine] = useState(0);
  const [opened, setOpened] = useState<EditorLine[]>([]);
  const isTranslation = kind === 'translation';
  const [language, setLanguage] = useState('');
  // What the textarea was loaded with, to tell typed text from text the project already had.
  const [loadedText, setLoadedText] = useState('');
  // The two editors share everything but their wording.
  const copy = isTranslation ? 'editor.translationBulk' : 'editor.secondaryBulk';
  const usedLanguages = useMemo(() => (isTranslation ? translationLanguages(lines) : []), [isTranslation, lines]);

  // Opens on what the project already has. A render-time adjustment, as FuriganaModal
  // does, so the previous session's text never paints for a frame.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      // Opens on the language the project already translates into, if any.
      const first = isTranslation ? (translationLanguages(lines)[0] ?? '') : '';
      setLanguage(first);
      const initial = isTranslation ? translationText(lines, first) : secondaryText(lines);
      setText(initial);
      setLoadedText(initial);
      setOpened(mainLineIndices(lines).map((i) => lines[i]));
      setCaretLine(0);
    }
  }

  const mains = useMemo(() => mainLineIndices(lines), [lines]);
  const mainCount = mains.length;

  // The section a main line opens, shown as a tag on that row only.
  const sectionStarts = useMemo(() => {
    const out = new Map<number, string>();
    let pending: string | null = null;
    lines.forEach((line, i) => {
      if (line.type === 'section') pending = line.label ?? '';
      else if (pending != null) { out.set(i, pending); pending = null; }
    });
    return out;
  }, [lines]);

  const textLines = text.split('\n');
  // Trailing blank lines (a paste ending in a newline) say nothing, so they never count as extra.
  let filled = textLines.length;
  while (filled > 0 && !textLines[filled - 1].trim()) filled--;
  const overflow = Math.max(0, filled - mainCount);
  const rowCount = Math.max(mainCount, textLines.length, 1);

  // Keep the caret's row in view: the textarea is as tall as its content, so the
  // scrolling happens on the shared container, which the browser does not follow.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const top = PAD + caretLine * ROW;
    if (top < el.scrollTop) el.scrollTop = top - PAD;
    else if (top + ROW > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW - el.clientHeight + PAD;
  }, [caretLine]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    const el = e.currentTarget;
    const after = el.value.slice(0, el.selectionStart) + '\n' + el.value.slice(el.selectionEnd);
    // A new line past the last lyric line has nowhere to go.
    if (after.split('\n').length > mainCount) e.preventDefault();
  };

  const target = caretLine < mainCount ? lines[mains[caretLine]] : null;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t(`${copy}.title`)}
      description={t(`${copy}.description`)}
      dialogProps={{ className: 'sm:max-w-3xl' }}
    >
      <div className="flex flex-col gap-3 py-2">
        {isTranslation && (
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-subtle">
            <span>{t('editor.translationBulk.language')}</span>
            <LanguagePicker
              value={language}
              used={usedLanguages}
              onChange={(next) => {
                // Each language has its own text, and only Apply writes it, so switching
                // reloads from the project. The exception: text typed before a language was
                // picked, going to a language with nothing yet, is kept rather than wiped.
                setLanguage(next);
                const existing = translationText(lines, next);
                const typed = text !== loadedText;
                if (typed && !existing.trim()) return;
                setText(existing);
                setLoadedText(existing);
                setCaretLine(0);
              }}
            />
            <span className="text-faint">{t('editor.translationBulk.languageHint')}</span>
          </div>
        )}
        <div className="flex items-center text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">
          <span className="w-[45%] shrink-0 pl-3">{t('editor.secondaryBulk.mainColumn')}</span>
          <span className="pl-3">{t(`${copy}.secondaryColumn`)}</span>
          <span className={`ml-auto font-mono tabular-nums normal-case tracking-normal ${overflow ? 'text-love' : ''}`}>
            {t('editor.secondaryBulk.count', { count: filled, total: mainCount })}
          </span>
        </div>

        <div ref={scrollRef} className="lrc-scroll h-[min(50vh,420px)] overflow-y-auto rounded-lg bg-background inset-ring inset-ring-hl">
          <div className="relative flex" style={{ height: rowCount * ROW + PAD * 2 }}>
            {/* Row bands behind both columns: the caret's row, and any row past the last lyric line. */}
            {Array.from({ length: rowCount }, (_, n) => {
              const extra = n >= mainCount && n < filled;
              if (n !== caretLine && !extra) return null;
              return (
                <div
                  key={n}
                  aria-hidden
                  className={`absolute inset-x-0 pointer-events-none ${extra ? 'bg-love/10' : 'bg-primary/10'}`}
                  style={{ top: PAD + n * ROW, height: ROW }}
                />
              );
            })}

            <div className="relative w-[45%] shrink-0 border-r border-hl select-none" style={{ paddingTop: PAD }}>
              {mains.map((lineIndex, n) => {
                const section = sectionStarts.get(lineIndex);
                return (
                  <div key={lineIndex} className="flex items-center gap-2 px-3" style={{ height: ROW }}>
                    <span className={`w-6 shrink-0 text-right font-mono text-[11px] tabular-nums ${n === caretLine ? 'text-primary' : 'text-subtle'}`}>
                      {n + 1}
                    </span>
                    <span className={`truncate text-[14px] ${n === caretLine ? 'text-foreground' : 'text-foreground/65'}`}>
                      {lines[lineIndex].text || '♪'}
                    </span>
                    {section != null && (
                      <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-label">
                        {formatSectionLabel(section, t)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setCaretLine(caretLineOf(e.target)); }}
              onSelect={(e) => setCaretLine(caretLineOf(e.currentTarget))}
              onKeyDown={onKeyDown}
              wrap="off"
              spellCheck={false}
              placeholder={t('editor.secondaryBulk.placeholder')}
              aria-label={t(`${copy}.secondaryColumn`)}
              className="relative flex-1 min-w-0 resize-none overflow-hidden whitespace-pre bg-transparent px-3 text-[14px] text-foreground outline-none placeholder:text-faint"
              style={{ lineHeight: `${ROW}px`, paddingTop: PAD, paddingBottom: PAD }}
            />
          </div>
        </div>

        {/* Where the line being typed will land. */}
        <p className={`truncate text-[13px] ${target ? 'text-subtle' : 'text-love'}`}>
          {target
            ? t('editor.secondaryBulk.target', { number: caretLine + 1, text: target.text || '♪' })
            : t('editor.secondaryBulk.targetNone')}
        </p>

        {overflow > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-love/10 px-3 py-2 text-[13px] text-love">
            <span className="flex-1">{t('editor.secondaryBulk.overflow', { count: overflow })}</span>
            <Button variant="outline" size="sm" onClick={() => setText(textLines.slice(0, mainCount).join('\n'))}>
              {t('editor.secondaryBulk.trim')}
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button
            // A translation needs a language: unlabelled ones cannot be told apart later.
            disabled={overflow > 0 || (isTranslation && !language)}
            onClick={() => { onApply(splitSecondaryText(text), opened, language); onOpenChange(false); }}
          >
            {t('common.apply')}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}

export default SecondaryLyricsModal;
