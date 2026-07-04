import { useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { Separator } from '@ui/separator';
import { Icon } from '@/shared/ui/Icon';
import { Tip } from '@ui/tip';
import { formatSectionLabel } from '@features/editor/constants/sectionTypes';
import { getSingerOptionsForSelection } from '@features/editor/utils/sections';

const ROLE_LABELS_SHORT = ['1', '2', '3', '4'];
const SINGER_CHIP_COLORS = [
  'bg-primary/20 text-primary border-primary/30',
  'bg-sky-500/20 text-sky-400 border-sky-500/30',
  'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'bg-amber-500/20 text-amber-400 border-amber-500/30',
];
const ROLE_STYLE_CLASSES = ['', 'italic', 'font-bold', 'font-bold italic'];

interface SectionLine {
  type?: string;
  label?: string;
  [key: string]: unknown;
}

interface SelectionActionBarProps {
  selectedLines: Set<number>;
  lines?: SectionLine[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: Record<string, any>;
  handleBulkClearTimestamps: () => void;
  handleBulkShift: (delta: number) => void;
  handleBulkDelete: () => void;
  clearSelection: () => void;
  handleApplyOffset?: (offset: number) => void;
  handleAssignSinger?: (name: string, indices: number[], slot: number) => void;
  handleMoveToSection?: (indices: number[], sectionIndex: number) => void;
  songArtists?: string[];
}

export default function SelectionActionBar({
  selectedLines,
  lines,
  settings,
  handleBulkClearTimestamps,
  handleBulkShift,
  handleBulkDelete,
  clearSelection,
  handleApplyOffset,
  handleAssignSinger,
  handleMoveToSection,
  songArtists,
}: SelectionActionBarProps) {
  const { t } = useTranslation();

  if (selectedLines.size === 0) return null;

  const shiftAmount = settings.editor?.shiftAllAmount || 0.5;

  return (
    <div className="flex items-center justify-center gap-1 px-2 py-1.5 bg-zinc-900/95 border border-primary/30 rounded-lg shadow-lg animate-fade-in backdrop-blur-md">
      <Badge variant="outline" className="text-[10px] font-bold text-primary border-0 bg-transparent tabular-nums px-1.5">
        {selectedLines.size}
      </Badge>
      <Separator orientation="vertical" className="h-4 bg-zinc-700/50" />
      <Tip content={t('editor.selection.clearTimestamps') || 'Clear timestamps'}>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleBulkClearTimestamps}
          className="text-orange-400 hover:bg-orange-500/15 hover:text-orange-300"
        >
          <Icon name="ink_eraser" size={14} />
        </Button>
      </Tip>
      <Tip content={`(-${settings.editor?.nudge?.default || 0.1}s)`}>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => handleBulkShift(-(settings.editor?.nudge?.default || 0.1))}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
        >
          <Icon name="chevron_left" size={14} />
        </Button>
      </Tip>
      <Tip content={`(+${settings.editor?.nudge?.default || 0.1}s)`}>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => handleBulkShift((settings.editor?.nudge?.default || 0.1))}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
        >
          <Icon name="chevron_right" size={14} />
        </Button>
      </Tip>
      {/* Shift All (larger offset) */}
      {settings.editor?.showShiftAll && handleApplyOffset && (
        <>
          <Separator orientation="vertical" className="h-4 bg-zinc-700/50" />
          <Tip content={`${t('editor.shiftAll')} (-${shiftAmount}s)`}>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleApplyOffset(-shiftAmount)}
              className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
            >
              <Icon name="keyboard_double_arrow_left" size={14} />
            </Button>
          </Tip>
          <Tip content={`${t('editor.shiftAll')} (+${shiftAmount}s)`}>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleApplyOffset(shiftAmount)}
              className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
            >
              <Icon name="keyboard_double_arrow_right" size={14} />
            </Button>
          </Tip>
        </>
      )}

      {/* Singer bulk assignment */}
      {handleAssignSinger && (
        <>
          <Separator orientation="vertical" className="h-4 bg-zinc-700/50" />
          <SingerBulkButton
            selectedLines={selectedLines}
            handleAssignSinger={handleAssignSinger}
            songArtists={lines ? getSingerOptionsForSelection(lines, [...selectedLines], songArtists) : songArtists}
          />
        </>
      )}

      {handleMoveToSection && lines && (
        <>
          <Separator orientation="vertical" className="h-4 bg-zinc-700/50" />
          <SectionAssignButton
            selectedLines={selectedLines}
            lines={lines}
            handleMoveToSection={handleMoveToSection}
          />
        </>
      )}
      <Separator orientation="vertical" className="h-4 bg-zinc-700/50" />
      <Tip content={t('editor.selection.deleteSelected') || 'Delete selected'}>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleBulkDelete}
          className="text-red-400 hover:bg-red-500/15 hover:text-red-300"
        >
          <Icon name="delete" size={14} />
        </Button>
      </Tip>
      <Separator orientation="vertical" className="h-4 bg-zinc-700/50" />
      <Tip content={t('editor.selection.deselectAll') || 'Deselect all (Esc)'}>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={clearSelection}
          className="text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60"
        >
          <Icon name="close" size={14} />
        </Button>
      </Tip>
    </div>
  );
}

function SectionAssignButton({ selectedLines, lines, handleMoveToSection }: { selectedLines: Set<number>; lines: SectionLine[]; handleMoveToSection: (indices: number[], sectionIndex: number) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const sections = lines
    .map((l, i) => ({ line: l, index: i }))
    .filter(({ line }) => line.type === 'section');

  if (sections.length === 0) return null;

  const assign = (sectionIndex: number) => {
    handleMoveToSection([...selectedLines], sectionIndex);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Tip content={t('editor.assignToSection')}>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => { e.stopPropagation(); setOpen(p => !p); }}
          className="text-zinc-400 hover:text-primary hover:bg-primary/10"
        >
          <Icon name="layers" size={14} />
        </Button>
      </Tip>
      {open && (
        <div
          className="absolute bottom-full right-0 mb-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 py-1 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="px-3 py-1 text-[10px] text-zinc-600 border-b border-zinc-800 mb-1">
            {t('editor.moveToSection')}
          </p>
          {sections.map(({ line, index }) => (
            <button
              key={index}
              type="button"
              onClick={() => assign(index)}
              className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 hover:text-primary truncate"
            >
              {formatSectionLabel(line.label, t)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SingerBulkButton({ selectedLines, handleAssignSinger, songArtists }: { selectedLines: Set<number>; handleAssignSinger: (name: string, indices: number[], slot: number) => void; songArtists?: string[] }) {
  const { t } = useTranslation();
  // singerN uses a default-value string + interpolation.
  const tk = t as (key: string, defaultValue?: string, options?: Record<string, unknown>) => string;
  const [open, setOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [custom, setCustom] = useState('');
  const indices = [...selectedLines];

  const assignName = (name: string) => {
    handleAssignSinger(name, indices, selectedSlot);
    setOpen(false);
    setCustom('');
  };

  return (
    <div className="relative">
      <Tip content={t('editor.assignSingerToLines', { count: indices.length })}>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => { e.stopPropagation(); setOpen(p => !p); }}
          className="text-zinc-400 hover:text-primary hover:bg-primary/10"
        >
          <Icon name="person" size={14} />
        </Button>
      </Tip>
      {open && (
        <div
          className="absolute bottom-full right-0 mb-2 w-52 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 py-1.5 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Role slot selector */}
          <div className="flex gap-1 px-2 pb-1.5 border-b border-zinc-800 mb-1.5">
            {ROLE_LABELS_SHORT.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedSlot(idx)}
                className={`flex-1 py-1 rounded text-[10px] font-bold border transition-colors ${
                  selectedSlot === idx
                    ? SINGER_CHIP_COLORS[idx]
                    : 'text-zinc-600 border-transparent hover:text-zinc-400'
                } ${ROLE_STYLE_CLASSES[idx]}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          <p className="px-3 pb-1 text-[10px] text-zinc-600">
            {selectedSlot === 0
              ? t('editor.singer')
              : tk('editor.singerN', 'Singer {{n}}', { n: selectedSlot + 1 })}
          </p>
          {(songArtists?.length ? songArtists : []).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => assignName(a)}
              className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 hover:text-primary truncate"
            >
              {a}
            </button>
          ))}
          <div className="border-t border-zinc-800 mt-1 pt-1 px-2 flex gap-1">
            <input
              value={custom}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCustom(e.target.value)}
              onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter' && custom.trim()) assignName(custom.trim()); }}
              placeholder={t('editor.singerCustomPlaceholder')}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-zinc-200 text-xs focus:outline-none focus:border-primary/60"
            />
            <button
              type="button"
              onClick={() => { if (custom.trim()) assignName(custom.trim()); }}
              className="px-2 py-1 rounded bg-primary/20 text-primary text-xs hover:bg-primary/30"
            >✓</button>
          </div>
          <button
            type="button"
            onClick={() => { handleAssignSinger('', indices, selectedSlot); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400 text-[10px] mt-1 border-t border-zinc-800"
          >
            {t('editor.clearSingers')}
          </button>
        </div>
      )}
    </div>
  );
}
