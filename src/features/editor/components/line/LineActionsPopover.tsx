import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Popover, PopoverContent, PopoverItem, PopoverTrigger } from '@ui/popover';
import { Tip } from '@ui/tip';
import { Icon } from '@/shared/ui/Icon';
import { formatSectionLabel } from '@features/editor/constants/sectionTypes';

interface LineData {
  type?: string;
  label?: string;
  timestamp?: number | null;
  id?: string;
  [key: string]: unknown;
}

interface LineActionsPopoverProps {
  lineIndex: number;
  line: LineData;
  handleAddLine: (index: number, line?: LineData | null, opts?: { before?: boolean }) => void;
  handleClearLine: (index: number) => void;
  handleDeleteLine: (index: number) => void;
  handleMoveToSection?: (indices: number[], target: number) => void;
  sectionLines?: LineData[];
}

function LineActionsPopover({ lineIndex, line, handleAddLine, handleClearLine, handleDeleteLine, handleMoveToSection, sectionLines }: LineActionsPopoverProps) {
  const { t } = useTranslation();
  const [showSections, setShowSections] = useState(false);
  const sections = (sectionLines || [])
    .map((l, i) => ({ line: l, index: i }))
    .filter(({ line: l, index }) => l.type === 'section' && index !== lineIndex);

  return (
    <Popover>
      <Tip content={t('editor.lineOptions')}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => e.stopPropagation()}
            className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/60"
          >
            <Icon name="more_horiz" size={12} />
          </Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent
        className="min-w-[180px]"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <PopoverItem
          onClick={() => handleAddLine(lineIndex, null, { before: true })}
          className="hover:bg-sky-500/10 hover:text-sky-400"
        >
          <Icon name="vertical_align_top" size={14} />
          {t('editor.insertLineAbove')}
        </PopoverItem>
        <PopoverItem
          onClick={() => handleAddLine(lineIndex)}
          className="hover:bg-primary/10 hover:text-primary"
        >
          <Icon name="vertical_align_bottom" size={14} />
          {t('editor.insertLineBelow')}
        </PopoverItem>
        <PopoverItem
          onClick={() => handleAddLine(lineIndex, { ...line, id: crypto.randomUUID() })}
          className="hover:bg-zinc-700/60"
        >
          <Icon name="post_add" size={14} />
          {t('editor.duplicateLine')}
        </PopoverItem>
        {line.timestamp != null && (
          <PopoverItem
            onClick={() => handleClearLine(lineIndex)}
            className="hover:bg-orange-500/10 hover:text-orange-400"
          >
            <Icon name="ink_eraser" size={14} />
            {t('editor.clearTimestamp')}
          </PopoverItem>
        )}
        {handleMoveToSection && sections.length > 0 && (
          showSections ? (
            <>
              <div className="px-3 py-1 text-[10px] text-zinc-500 border-t border-zinc-800 mt-1 pt-1.5">
                {t('editor.moveToSection')}
              </div>
              {sections.map(({ line: sl, index }) => (
                <PopoverItem
                  key={index}
                  onClick={() => { handleMoveToSection([lineIndex], index); setShowSections(false); }}
                  className="hover:bg-primary/10 hover:text-primary pl-5"
                >
                  <Icon name="layers" size={12} />
                  {formatSectionLabel(sl.label, t)}
                </PopoverItem>
              ))}
            </>
          ) : (
            <PopoverItem
              onClick={() => setShowSections(true)}
              className="hover:bg-primary/10 hover:text-primary"
            >
              <Icon name="layers" size={14} />
              {t('editor.moveToSection')}
              <Icon name="chevron_right" size={12} className="ml-auto" />
            </PopoverItem>
          )
        )}
        <PopoverItem
          onClick={() => handleDeleteLine(lineIndex)}
          className="hover:bg-red-500/10 hover:text-red-400"
        >
          <Icon name="delete" size={14} />
          {t('editor.removeLine')}
        </PopoverItem>
      </PopoverContent>
    </Popover>
  );
}

export default LineActionsPopover;
