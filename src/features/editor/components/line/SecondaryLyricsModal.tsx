import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import ResponsiveModal from '@/shared/ui/ResponsiveModal';
import { Button } from '@ui/button';
import { formatSectionLabel } from '@features/editor/constants/section-types';
import { mainLineIndices, secondaryText, splitSecondaryText, translationLanguages, translationText } from '@/features/editor/utils/secondary-lines';
import { FloatingCombobox } from '@ui/floating-combobox';
import { Icon } from '@/shared/ui/Icon';
import { Tip } from '@ui/tip';
import { cn } from '@/shared/utils/utils';
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
   * 'translation' edits translations instead of the secondary lyrics: same pairing by position,
   * one tab per language. Apply calls onApply once per language (a removed tab with no values).
   */
  kind?: 'secondary' | 'translation';
}

const EMPTY_FOCUS = { current: null as HTMLElement | null };

/** Rendered only in translation mode, so the language list is not fetched for the secondary editor. */
function LanguagePicker({ onChange, used, exclude }: { onChange: (language: string) => void; used: string[]; exclude: string[] }) {
  const { t } = useTranslation();
  const options = useLanguageOptions();
  const merged = useMemo(() => {
    const known = new Set(options.map((o) => o.value));
    const taken = new Set(exclude);
    return [...used.filter((l) => l && !known.has(l)).map((l) => ({ value: l, label: l })), ...options]
      .filter((o) => !taken.has(o.value));
  }, [options, used, exclude]);
  // Shown only after "Add language", so taking focus (which opens its list) is what was asked for.
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => { wrapRef.current?.querySelector('input')?.focus(); }, []);
  return (
    <div ref={wrapRef} className="w-44 shrink-0">
    <FloatingCombobox
      label=""
      value=""
      onChange={onChange}
      options={merged}
      strict
      size="sm"
      placeholder={t('editor.langPlaceholder')}
    />
    </div>
  );
}

/** Lines with something on them, ignoring trailing blanks (a paste ending in a newline). */
function filledLineCount(text: string): number {
  const rows = text.split('\n');
  let n = rows.length;
  while (n > 0 && !rows[n - 1].trim()) n--;
  return n;
}

function caretLineOf(el: HTMLTextAreaElement): number {
  return el.value.slice(0, el.selectionStart).split('\n').length - 1;
}

export function SecondaryLyricsModal({ open, onOpenChange, lines, onApply, kind = 'secondary' }: SecondaryLyricsModalProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [secondary, setSecondary] = useState('');
  const [caretLine, setCaretLine] = useState(0);
  const [opened, setOpened] = useState<EditorLine[]>([]);
  const isTranslation = kind === 'translation';
  // Translation mode: one tab and one text buffer per language. Switching tabs keeps what was
  // typed in the others; Apply writes every tab, and clears the languages whose tab was removed.
  const [langs, setLangs] = useState<string[]>([]);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // The two editors share everything but their wording.
  const copy = isTranslation ? 'editor.translationBulk' : 'editor.secondaryBulk';
  const usedLanguages = useMemo(() => (isTranslation ? translationLanguages(lines) : []), [isTranslation, lines]);

  // Opens on what the project already has. A render-time adjustment, as FuriganaModal
  // does, so the previous session's text never paints for a frame.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      if (isTranslation) {
        // One tab per language the project already translates into.
        const existing = translationLanguages(lines);
        setLangs(existing);
        setTexts(Object.fromEntries(existing.map((l) => [l, translationText(lines, l)])));
        setRemoved([]);
        setActive(existing[0] ?? null);
        setAdding(false);
      } else {
        setSecondary(secondaryText(lines));
      }
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

  const text = isTranslation ? (active != null ? texts[active] ?? '' : '') : secondary;
  const setText = (next: string) => {
    if (!isTranslation) setSecondary(next);
    else if (active != null) setTexts((prev) => ({ ...prev, [active]: next }));
  };
  const textLines = text.split('\n');
  const filled = filledLineCount(text);
  const overflow = Math.max(0, filled - mainCount);
  // Apply waits until no tab has lines past the last lyric line, not only the one in view.
  const anyOverflow = isTranslation ? langs.some((l) => filledLineCount(texts[l] ?? '') > mainCount) : overflow > 0;
  const languageName = (l: string) => l || t('editor.translationBulk.unlabelled');

  const addLanguage = (language: string) => {
    setAdding(false);
    if (!language) return;
    if (!langs.includes(language)) {
      setLangs((prev) => [...prev, language]);
      // Re-adding a removed language brings back what the project had for it.
      setTexts((prev) => ({ ...prev, [language]: translationText(lines, language) }));
      setRemoved((prev) => prev.filter((l) => l !== language));
    }
    setActive(language);
    setCaretLine(0);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };
  const removeLanguage = (language: string) => {
    const at = langs.indexOf(language);
    const rest = langs.filter((l) => l !== language);
    setLangs(rest);
    // Only a language the project has needs clearing on Apply; a tab added this visit just goes.
    if (translationLanguages(lines).includes(language)) setRemoved((prev) => [...prev, language]);
    if (active === language) setActive(rest[Math.min(at, rest.length - 1)] ?? null);
    setCaretLine(0);
  };
  const apply = () => {
    if (isTranslation) {
      for (const l of langs) onApply(splitSecondaryText(texts[l] ?? ''), opened, l);
      for (const l of removed) onApply([], opened, l);
    } else {
      onApply(splitSecondaryText(secondary), opened, '');
    }
    onOpenChange(false);
  };
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
      dialogProps={{
        className: 'sm:max-w-3xl',
        // Radix focuses the first focusable element, which in translation mode was the language
        // picker: focusing it opens its list. Start where the typing happens instead.
        onOpenAutoFocus: (e: Event) => {
          e.preventDefault();
          (textareaRef.current && !textareaRef.current.disabled ? textareaRef : addButtonRef.current ? addButtonRef : EMPTY_FOCUS).current?.focus();
        },
      }}
    >
      <div className="flex flex-col gap-3 py-2">
        {isTranslation && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-hl pb-2">
            <div role="tablist" aria-label={t('editor.translationBulk.languages')} className="flex flex-wrap items-center gap-1.5">
              {langs.map((l) => {
                const selected = l === active;
                const over = filledLineCount(texts[l] ?? '') > mainCount;
                return (
                  <span
                    key={l || '_'}
                    className={cn(
                      'inline-flex h-9 items-center rounded-lg text-[13px] font-semibold transition-colors',
                      selected ? 'bg-primary-soft text-primary-ink inset-ring inset-ring-iris' : 'text-subtle hover:bg-raised hover:text-foreground',
                    )}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => { setActive(l); setCaretLine(0); }}
                      className="flex h-full items-center gap-1.5 rounded-lg pl-3 pr-1.5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus"
                    >
                      {over && <span aria-hidden className="size-1.5 rounded-full bg-love" />}
                      {languageName(l)}
                    </button>
                    <Tip content={t('editor.translationBulk.removeLanguage', { language: languageName(l) })}>
                      <button
                        type="button"
                        aria-label={t('editor.translationBulk.removeLanguage', { language: languageName(l) })}
                        onClick={() => removeLanguage(l)}
                        className="mr-1 grid size-6 place-items-center rounded-md opacity-60 hover:bg-overlay hover:opacity-100 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus"
                      >
                        <Icon name="close" size={12} />
                      </button>
                    </Tip>
                  </span>
                );
              })}
            </div>
            {adding ? (
              <LanguagePicker onChange={addLanguage} used={usedLanguages} exclude={langs} />
            ) : (
              <Button ref={addButtonRef} variant="ghost" size="sm" onClick={() => setAdding(true)} className="gap-1.5 text-subtle hover:text-foreground">
                <Icon name="add" size={14} />
                {t('editor.translationBulk.addLanguage')}
              </Button>
            )}
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
              ref={textareaRef}
              value={text}
              // No language yet, nowhere for the text to go.
              disabled={isTranslation && active == null}
              onChange={(e) => { setText(e.target.value); setCaretLine(caretLineOf(e.target)); }}
              onSelect={(e) => setCaretLine(caretLineOf(e.currentTarget))}
              onKeyDown={onKeyDown}
              wrap="off"
              spellCheck={false}
              placeholder={isTranslation && active == null ? t('editor.translationBulk.empty') : t('editor.secondaryBulk.placeholder')}
              aria-label={t(`${copy}.secondaryColumn`)}
              className="relative flex-1 min-w-0 resize-none overflow-hidden whitespace-pre bg-transparent px-3 text-[14px] text-foreground outline-none placeholder:text-faint disabled:cursor-not-allowed"
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
          <Button disabled={anyOverflow} onClick={apply}>
            {t('common.apply')}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}

export default SecondaryLyricsModal;
