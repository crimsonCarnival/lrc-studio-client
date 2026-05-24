import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Popover, PopoverContent, PopoverItem, PopoverTrigger } from '@ui/popover';
import { Tip } from '@ui/tip';
import { MoreHorizontal, ArrowUpToLine, ArrowDownToLine, CopyPlus, Eraser, Trash2 } from 'lucide-react';

function LineActionsPopover({ lineIndex, line, handleAddLine, handleClearLine, handleDeleteLine }) {
  const { t } = useTranslation();

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
            <MoreHorizontal className="size-3" />
          </Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent
        className="min-w-[180px]"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <PopoverItem
          onClick={() => handleAddLine(lineIndex - 1 >= 0 ? lineIndex - 1 : lineIndex)}
          className="hover:bg-sky-500/10 hover:text-sky-400"
        >
          <ArrowUpToLine className="size-3.5" />
          {t('editor.insertLineAbove', 'Insert Above')}
        </PopoverItem>
        <PopoverItem
          onClick={() => handleAddLine(lineIndex)}
          className="hover:bg-primary/10 hover:text-primary"
        >
          <ArrowDownToLine className="size-3.5" />
          {t('editor.insertLineBelow', 'Insert Below')}
        </PopoverItem>
        <PopoverItem
          onClick={() => handleAddLine(lineIndex, { ...line, id: crypto.randomUUID() })}
          className="hover:bg-zinc-700/60"
        >
          <CopyPlus className="size-3.5" />
          {t('editor.duplicateLine', 'Duplicate')}
        </PopoverItem>
        {line.timestamp != null && (
          <PopoverItem
            onClick={() => handleClearLine(lineIndex)}
            className="hover:bg-orange-500/10 hover:text-orange-400"
          >
            <Eraser className="size-3.5" />
            {t('editor.clearTimestamp')}
          </PopoverItem>
        )}
        <PopoverItem
          onClick={() => handleDeleteLine(lineIndex)}
          className="hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="size-3.5" />
          {t('editor.removeLine')}
        </PopoverItem>
      </PopoverContent>
    </Popover>
  );
}

export default LineActionsPopover;
