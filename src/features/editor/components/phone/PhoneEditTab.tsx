import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEventHandler, Dispatch, FocusEvent, RefObject, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { SegmentedControl } from '@ui/segmented-control';
import { FloatingCombobox } from '@ui/floating-combobox';
import { Icon } from '@/shared/ui/Icon';
import { serializeToRubyMarkup } from '@/shared/utils/furigana';
import { useLanguageOptions } from '@features/editor/hooks/useLanguageOptions';
import { useKeyboardInset } from '@features/editor/hooks/useKeyboardInset';
import EditorPasteArea from '../setup/EditorPasteArea';
import type { EditorLine } from '@/features/editor/editor.types';

export type EditView = 'text' | 'line';
type Translation = { text?: string; language?: string };

type PhoneEditTabProps = {
  view: EditView;
  onViewChange: (view: EditView) => void;
  // All text: the raw-text flow, exactly as the desktop's raw editor.
  rawText: string;
  setRawText: (text: string) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileUpload: ChangeEventHandler<HTMLInputElement>;
  handleUrlImport: (url: string) => Promise<{ success: boolean; error?: string }>;
  singers: string[];
  /** Applies the raw text to the lines and returns to the Sync tab. */
  onApplyText: () => void;
  // One line: the editing* state useEditor owns, saved by handleSaveLineText.
  lines: EditorLine[];
  lineIndex: number;
  onLineIndexChange: (index: number) => void;
  editingText: string;
  setEditingText: (v: string) => void;
  editingSecondary: string;
  setEditingSecondary: (v: string) => void;
  editingTranslations: Translation[];
  setEditingTranslations: Dispatch<SetStateAction<Translation[]>>;
  setEditingLineIndex: (v: number | null) => void;
  onSaveLine: (index: number, text: string, secondary: string, translations: Translation[]) => void;
};

/** Keeps the field in view once the keyboard has finished opening (focus fires before it does). */
const revealOnFocus = (e: FocusEvent<HTMLElement>, timer: { current: ReturnType<typeof setTimeout> | undefined }) => {
  const el = e.currentTarget;
  clearTimeout(timer.current);
  timer.current = setTimeout(() => el.scrollIntoView?.({ block: 'center', behavior: 'smooth' }), 300);
};

/** Reveal-on-focus whose pending timeout is cleared when the tab unmounts. */
function useRevealOnFocus() {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return useCallback((e: FocusEvent<HTMLElement>) => revealOnFocus(e, timer), []);
}

/**
 * The Edit tab. "All text" is the raw-text editor with the same import controls; "One line"
 * edits the cursor line's text, secondary text and translations. The Save row is the bottom
 * of the screen, lifted above the on-screen keyboard while it is open, so the field and its
 * Save button are always visible together.
 */
export default function PhoneEditTab(p: PhoneEditTabProps) {
  const { t } = useTranslation();
  const keyboard = useKeyboardInset();
  const revealOnFocus = useRevealOnFocus();
  return (
    <div className="flex flex-1 min-h-0 flex-col" style={keyboard ? { paddingBottom: keyboard } : undefined} data-keyboard-inset={keyboard}>
      <div className="flex shrink-0 justify-center px-3 py-2">
        <SegmentedControl<EditView>
          label={t('editor.phone.edit.views')}
          value={p.view}
          onChange={p.onViewChange}
          options={[
            { value: 'text', label: t('editor.phone.edit.text') },
            { value: 'line', label: t('editor.phone.edit.line') },
          ]}
        />
      </div>
      {p.view === 'text' ? (
        <>
          <div className="flex min-h-0 flex-1 flex-col px-3" onFocusCapture={revealOnFocus}>
            <EditorPasteArea
              rawText={p.rawText}
              setRawText={p.setRawText}
              fileInputRef={p.fileInputRef}
              handleFileUpload={p.handleFileUpload}
              handleUrlImport={p.handleUrlImport}
              singers={p.singers}
            />
          </div>
          <SaveRow label={t('editor.phone.edit.save')} onClick={p.onApplyText} bottomSafe={keyboard === 0} />
        </>
      ) : (
        <LineEditor {...p} bottomSafe={keyboard === 0} />
      )}
    </div>
  );
}

function SaveRow({ label, onClick, bottomSafe, children }: { label: string; onClick: () => void; bottomSafe: boolean; children?: React.ReactNode }) {
  return (
    <div className={`flex shrink-0 items-center gap-2 border-t border-zinc-800 bg-background px-3 pt-3 ${bottomSafe ? 'pb-safe' : 'pb-3'}`}>
      {children}
      <Button onClick={onClick} className="h-11 flex-1 gap-2 px-5 font-semibold text-zinc-950 bg-primary hover:bg-primary-dim">
        <Icon name="check" size={18} />
        {label}
      </Button>
    </div>
  );
}

function LineEditor(p: PhoneEditTabProps & { bottomSafe: boolean }) {
  const { t } = useTranslation();
  const languageOptions = useLanguageOptions();
  const line = p.lines[p.lineIndex];
  const isLyric = !!line && line.type !== 'section';
  const lyricIndices = p.lines.flatMap((l, i) => (l.type === 'section' ? [] : [i]));
  const position = lyricIndices.indexOf(p.lineIndex);
  const [justSaved, setJustSaved] = useState(false);
  const revealOnFocus = useRevealOnFocus();

  // Load the line into the shared editing state whenever the cursor lands on a different
  // line. Keyed on the line's id, so typing is never overwritten by an unrelated update.
  const lineId = line?.id;
  const latest = useRef(p);
  useLayoutEffect(() => { latest.current = p; });
  useEffect(() => {
    const cur = latest.current;
    const l = cur.lines[cur.lineIndex];
    if (!l || l.type === 'section') return;
    cur.setEditingLineIndex(cur.lineIndex);
    cur.setEditingText(serializeToRubyMarkup(l.words) || l.text || '');
    cur.setEditingSecondary(l.secondary || '');
    cur.setEditingTranslations(l.translations ? [...l.translations] : []);
    setJustSaved(false);
    return () => cur.setEditingLineIndex(null);
  }, [p.lineIndex, lineId]);

  if (!isLyric) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="max-w-sm text-[15px] text-subtle">{line ? t('editor.phone.edit.sectionNote') : t('editor.phone.edit.noLine')}</p>
      </div>
    );
  }

  const save = () => {
    p.onSaveLine(p.lineIndex, p.editingText, p.editingSecondary, p.editingTranslations);
    setJustSaved(true);
  };
  const go = (delta: -1 | 1) => {
    const target = lyricIndices[position + delta];
    if (target == null) return;
    // Moving on keeps what was typed: leaving a line never silently drops an edit.
    const dirty = p.editingText !== (serializeToRubyMarkup(line.words) || line.text || '')
      || p.editingSecondary !== (line.secondary || '')
      || JSON.stringify(p.editingTranslations) !== JSON.stringify(line.translations ?? []);
    if (dirty) save();
    p.onLineIndexChange(target);
  };
  const updateTranslation = (idx: number, field: keyof Translation, value: string) =>
    p.setEditingTranslations((prev) => prev.map((tr, i) => (i === idx ? { ...tr, [field]: value } : tr)));

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 pb-3" onFocusCapture={revealOnFocus}>
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" aria-label={t('editor.phone.edit.previous')} disabled={position <= 0} onClick={() => go(-1)} className="size-11 lg:size-11">
            <Icon name="chevron_left" size={22} />
          </Button>
          <p role="status" className="text-sm font-medium text-subtle">
            {t('editor.phone.edit.lineOf', { n: position + 1, count: lyricIndices.length })}
          </p>
          <Button variant="ghost" size="icon" aria-label={t('editor.phone.edit.next')} disabled={position >= lyricIndices.length - 1} onClick={() => go(1)} className="size-11 lg:size-11">
            <Icon name="chevron_right" size={22} />
          </Button>
        </div>
        <label className="flex flex-col gap-1 text-[13px] text-zinc-400/80">
          {t('editor.primaryText')}
          <Input
            type="text"
            value={p.editingText}
            onChange={(e) => p.setEditingText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) save(); }}
            enterKeyHint="done"
            className="text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-zinc-400/80">
          {t('editor.secondaryText')}
          <Input type="text" value={p.editingSecondary} onChange={(e) => p.setEditingSecondary(e.target.value)} className="text-foreground" />
        </label>
        {p.editingTranslations.map((tr, idx) => (
          <div key={idx} className="flex flex-col gap-2 rounded-lg border border-zinc-800 p-2">
            <div className="flex items-start gap-2">
              <FloatingCombobox
                label={t('editor.langPlaceholder')}
                value={tr.language || ''}
                onChange={(v) => updateTranslation(idx, 'language', v)}
                options={languageOptions}
                strict
                className="min-w-0 flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('common.actions.removeTranslation')}
                onClick={() => p.setEditingTranslations((prev) => prev.filter((_, i) => i !== idx))}
                className="size-11 lg:size-11 shrink-0"
              >
                <Icon name="close" size={18} />
              </Button>
            </div>
            <Input
              type="text"
              aria-label={t('editor.translationText')}
              placeholder={t('editor.translationText')}
              value={tr.text || ''}
              onChange={(e) => updateTranslation(idx, 'text', e.target.value)}
              className="italic text-foreground"
            />
          </div>
        ))}
        <Button
          variant="outline"
          onClick={() => p.setEditingTranslations((prev) => [...prev, { text: '', language: '' }])}
          className="h-11 gap-2 self-start"
        >
          <Icon name="add" size={16} />
          {t('editor.addTranslation')}
        </Button>
      </div>
      <SaveRow label={t('editor.phone.edit.save')} onClick={save} bottomSafe={p.bottomSafe}>
        {justSaved && <span role="status" className="text-sm text-foam">{t('editor.phone.edit.saved')}</span>}
      </SaveRow>
    </>
  );
}
