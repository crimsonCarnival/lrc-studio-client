import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Popover, PopoverTrigger, PopoverContent, PopoverItem, PopoverSeparator } from '@ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@ui/toggle-group';
import { Button } from '@ui/button';
import { SECTION_TYPES, getDefaultDepthForLabel, formatSectionLabel } from '../../constants/sectionTypes';
import { parseSectionHeader } from '../../utils/sections';
import {
  selectionToLineRange,
  targetHeaderIndex,
  insertSectionAt,
  setHeaderDepth,
  setHeaderSingers,
} from '../../utils/paste-toolbar';

interface PasteSelectionToolbarProps {
  /** Current textarea value. */
  value: string;
  /** Active non-empty selection, as char offsets into `value`. */
  selection: { start: number; end: number };
  /** Project singer roster offered for section-level assignment. */
  singers: string[];
  /** Commit a new textarea value (parent also clears the selection). */
  onApply: (next: string) => void;
}

/**
 * Contextual pill shown just above the selection in the Raw Lyrics textarea.
 * Lets the user structure pasted lyrics without typing bracket syntax: insert a
 * section before the selection, and — when the selection's governing line is a
 * section header (`[Label]`, `[Label: A & B]` or `[Label | A, B]`) — flip it
 * between main/regular and assign section-level singers. Per-line singers are
 * handled in the structured editor; a textarea can't carry per-line metadata.
 */
export default function PasteSelectionToolbar({ value, selection, singers, onApply }: PasteSelectionToolbarProps) {
  const { t } = useTranslation();
  const [customLabel, setCustomLabel] = useState('');
  const [singerDraft, setSingerDraft] = useState<string[] | null>(null);

  const range = selectionToLineRange(value, selection.start, selection.end);
  const targetIdx = targetHeaderIndex(range.lines, range.startLine, range.endLine);
  const targetHeader = targetIdx >= 0 ? parseSectionHeader(range.lines[targetIdx]) : null;
  const rosterEmpty = singers.length === 0;

  const apply = (lines: string[]) => onApply(lines.join('\n'));

  const insertSection = (label: string, depth: number) => {
    apply(insertSectionAt(range.lines, range.startLine, label, depth));
    setCustomLabel('');
  };
  const insertCustom = () => {
    const label = customLabel.trim();
    if (label) insertSection(label, getDefaultDepthForLabel(label));
  };

  const draft = singerDraft ?? targetHeader?.singers ?? [];
  const toggleSinger = (name: string) =>
    setSingerDraft(draft.includes(name) ? draft.filter((s) => s !== name) : [...draft, name]);

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-zinc-700/70 bg-zinc-900/95 px-2 py-1 shadow-lg shadow-black/40 backdrop-blur-sm">
      {/* Insert a section before the selected line(s) */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 text-zinc-200 rounded-full transition-colors outline-none"
          >
            <Icon name="add" size={14} /> {t('editor.insertSectionAbove')}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="lg:min-w-56">
          {SECTION_TYPES.map((s) => (
            <PopoverItem key={s.id} onClick={() => insertSection(s.id, s.depth)}>
              {formatSectionLabel(s.id, t)}
            </PopoverItem>
          ))}
          <PopoverSeparator />
          <div className="flex gap-1.5 px-1.5 py-1">
            <input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  insertCustom();
                }
              }}
              placeholder={t('editor.sectionLabelPlaceholder')}
              className="flex-1 min-w-0 bg-zinc-800/60 border border-zinc-700/60 text-zinc-200 text-xs rounded-md px-2 py-1 placeholder:text-zinc-600 focus:outline-none focus:border-primary/50"
            />
            <Button
              disabled={!customLabel.trim()}
              onClick={insertCustom}
              className="h-auto py-1 px-2.5 text-xs bg-primary hover:bg-primary/90 text-zinc-950 rounded-md"
            >
              {t('editor.paste.add')}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Header-only controls: shown when the selection's governing line is a section header */}
      {targetHeader && (
        <>
          <span className="w-px self-stretch bg-zinc-700/70" />
          <ToggleGroup
            type="single"
            value={targetHeader.depth > 0 ? 'regular' : 'main'}
            variant="outline"
            size="sm"
            onValueChange={(v) => {
              if (v) apply(setHeaderDepth(range.lines, targetIdx, v === 'regular' ? 1 : 0));
            }}
            className="h-7"
          >
            <ToggleGroupItem value="main" className="text-xs px-2.5">{t('editor.paste.depthMain')}</ToggleGroupItem>
            <ToggleGroupItem value="regular" className="text-xs px-2.5">{t('editor.paste.depthRegular')}</ToggleGroupItem>
          </ToggleGroup>

          {!rosterEmpty && (
            <Popover onOpenChange={(open) => setSingerDraft(open ? (targetHeader.singers ?? []) : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 text-zinc-200 rounded-full transition-colors outline-none"
                >
                  <Icon name="group" size={14} /> {t('editor.assignSinger')}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start">
                {singers.map((name) => (
                  <PopoverItem key={name} onClick={() => toggleSinger(name)}>
                    <Icon name="check" size={14} className={draft.includes(name) ? 'opacity-100' : 'opacity-0'} />
                    {name}
                  </PopoverItem>
                ))}
                <PopoverSeparator />
                <Button
                  onClick={() => apply(setHeaderSingers(range.lines, targetIdx, draft))}
                  className="w-full h-auto py-1.5 text-xs bg-primary hover:bg-primary/90 text-zinc-950 rounded-md"
                >
                  {t('editor.paste.apply')}
                </Button>
              </PopoverContent>
            </Popover>
          )}
        </>
      )}
    </div>
  );
}
