import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Tip } from '@ui/tip';
import { KEY_SYMBOLS } from '@features/settings/key-symbols';

interface EditorSyncControlsProps {
  settings: {
    shortcuts?: Record<string, string[] | undefined>;
    editor?: { shiftAllAmount?: number; showShiftAll?: boolean };
  };
  handleApplyOffset: (direction: number) => void;
  selectedLines: Set<number>;
  editorMode?: string;
  awaitingEndMark?: number | null;
  onBulkMenu?: () => void;
  // Editor (still untyped JS) passes this through; unused here.
  updateSetting?: unknown;
}

export default function EditorSyncControls({
  settings,
  handleApplyOffset,
  selectedLines,
  editorMode,
  awaitingEndMark,
  onBulkMenu,
}: EditorSyncControlsProps) {
  const { t } = useTranslation();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  const symbols = KEY_SYMBOLS as Record<string, string>;
  const rangeKey = settings.shortcuts?.rangeSelect?.[0] || 'Shift';
  const toggleKey = settings.shortcuts?.toggleSelect?.[0] || 'Ctrl';
  const deselectKey = settings.shortcuts?.deselect?.[0] || 'Escape';
  const selectionHintText = t('editor.selection.hint', {
    defaultValue: '{{range}}+Click: range · {{toggle}}+Click: toggle · {{deselect}}: deselect',
    range: symbols[rangeKey] ?? rangeKey,
    toggle: symbols[toggleKey] ?? toggleKey,
    deselect: symbols[deselectKey] ?? deselectKey
  });
  const shiftAmount = settings.editor?.shiftAllAmount ?? 0.5;

  return (
    <>
      <div className="flex flex-row gap-2 pt-2 border-t border-zinc-800/50 items-center justify-between">
        <div className="flex items-center gap-2">
          {isMobile && selectedLines.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBulkMenu}
              className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 text-xs h-8 rounded-full px-3"
            >
              <MoreHorizontal className="size-3.5 mr-1.5" />
              {t('editor.selection.actions') || 'Selection Actions'}
              <span className="ml-1.5 bg-primary/20 px-1.5 rounded-full text-[10px] font-bold">
                {selectedLines.size}
              </span>
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
        {settings.editor?.showShiftAll && (<>
          <span className="text-xs text-zinc-500 whitespace-nowrap flex-shrink-0">{t('editor.shiftAll')}</span>
          <div className="flex items-center gap-1">
            <Tip content={`-${shiftAmount}s`}>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleApplyOffset(-1)}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 size-7"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
            </Tip>
            <span className="text-xs font-mono text-zinc-500 tabular-nums w-10 text-center select-none">
              {shiftAmount}s
            </span>
            <Tip content={`+${shiftAmount}s`}>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleApplyOffset(1)}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 size-7"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </Tip>
          </div>
        </>)}
        </div>
      </div>


      <p className="text-xs text-zinc-600 text-center">
        {selectedLines.size > 0
          ? selectionHintText
          : editorMode === 'srt'
            ? (awaitingEndMark != null ? t('editor.markEndInstruction').replace(/Space|Espacio/gi, settings.shortcuts?.mark?.[0] || 'Space') : t('editor.markInstructionSRT').replace(/Space|Espacio/gi, settings.shortcuts?.mark?.[0] || 'Space'))
            : editorMode === 'words'
              ? t('editor.markInstructionWords').replace(/Space|Espacio/gi, settings.shortcuts?.mark?.[0] || 'Space')
              : t('editor.markInstruction').replace(/Space|Espacio/gi, settings.shortcuts?.mark?.[0] || 'Space')
        }
      </p>
    </>
  );
}
