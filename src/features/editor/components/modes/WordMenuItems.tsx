import { useTranslation } from 'react-i18next';
import { ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from '@ui/context-menu';
import { Icon } from '@/shared/ui/Icon';
import { formatTime } from '@/shared/utils/format-time';
import { hasKanji } from '@/shared/utils/furigana';
import type { EditorWord } from '@/features/editor/editor.types';
import { MenuShortcut } from '../line/EditorLineContextMenu';

interface WordMenuItemsProps {
  word: EditorWord;
  wordIndex: number;
  wordCount: number;
  playbackPosition: number;
  /** Seconds the fine nudge moves by. */
  fine: number;
  onPlayFrom?: (time: number) => void;
  onSetStartHere: () => void;
  onSetEndHere: () => void;
  onClearEnd: () => void;
  onNudgeStart: (delta: number) => void;
  onCopyTime: (time: number) => void;
  onRestampFrom: () => void;
  onDistributeFrom: () => void;
  onEditReading: () => void;
  onMergeNext?: () => void;
  onSplit?: () => void;
  onRegroup?: () => void;
  onEditLine: () => void;
  onClear: () => void;
}

/**
 * A word's right-click menu in words focus: what the word chip's drawer held, plus the timing
 * actions the timeline needs (start and end at the playhead, nudge, re-mark from here).
 */
export function WordMenuItems({
  word, wordIndex, wordCount, playbackPosition, fine,
  onPlayFrom, onSetStartHere, onSetEndHere, onClearEnd, onNudgeStart, onCopyTime, onRestampFrom,
  onDistributeFrom, onEditReading, onMergeNext, onSplit, onRegroup, onEditLine, onClear,
}: WordMenuItemsProps) {
  const { t } = useTranslation();
  const text = word.word ?? '';
  const timed = word.time != null;
  // Keeps the menu open, so a word can be nudged a few steps in one visit.
  const stayOpen = (e: Event) => e.preventDefault();

  return (
    <>
      <ContextMenuLabel className="flex items-center justify-between gap-3">
        <span className="truncate">{t('editor.words.wordActions', { word: text })}</span>
        {timed && <span className="font-mono text-xs font-normal tabular-nums text-subtle">{formatTime(word.time!)}</span>}
      </ContextMenuLabel>
      {timed && onPlayFrom && (
        <ContextMenuItem onClick={() => onPlayFrom(word.time!)}>
          <Icon name="play_arrow" />
          {t('editor.words.playFromHere')}
        </ContextMenuItem>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onSetStartHere}>
        <Icon name="first_page" />
        {t('editor.words.setStartHere')}
        <span className="ml-auto pl-3 font-mono text-[11px] tabular-nums text-subtle">{formatTime(playbackPosition)}</span>
      </ContextMenuItem>
      {timed && (
        <ContextMenuItem onClick={onSetEndHere} disabled={playbackPosition <= word.time!}>
          <Icon name="last_page" />
          {t('editor.words.setEndHere')}
          <span className="ml-auto pl-3 font-mono text-[11px] text-subtle">K</span>
        </ContextMenuItem>
      )}
      {word.end != null && (
        <ContextMenuItem onClick={onClearEnd}>
          <Icon name="link" />
          {t('editor.words.clearEnd')}
        </ContextMenuItem>
      )}
      {timed && (
        <>
          <ContextMenuItem onSelect={stayOpen} onClick={() => onNudgeStart(-fine)}>
            <Icon name="chevron_left" />
            {t('editor.words.nudgeStart', { delta: `−${fine}` })}
            <MenuShortcut shortcut="nudgeLeftFine" fallback="Shift+ArrowLeft" />
          </ContextMenuItem>
          <ContextMenuItem onSelect={stayOpen} onClick={() => onNudgeStart(fine)}>
            <Icon name="chevron_right" />
            {t('editor.words.nudgeStart', { delta: `+${fine}` })}
            <MenuShortcut shortcut="nudgeRightFine" fallback="Shift+ArrowRight" />
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onCopyTime(word.time!)}>
            <Icon name="content_copy" />
            {t('editor.words.copyTime')}
          </ContextMenuItem>
        </>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onRestampFrom}>
        <Icon name="replay" />
        {t('editor.words.restampFrom')}
      </ContextMenuItem>
      <ContextMenuItem onClick={onDistributeFrom} disabled={wordIndex >= wordCount - 1}>
        <Icon name="horizontal_distribute" />
        {t('editor.words.distributeFrom')}
      </ContextMenuItem>
      <ContextMenuSeparator />
      {hasKanji(text) && (
        <ContextMenuItem onClick={onEditReading}>
          <Icon name="translate" />
          {word.reading ? t('editor.editReading') : t('editor.addReading')}
        </ContextMenuItem>
      )}
      {onMergeNext && wordIndex < wordCount - 1 && (
        <ContextMenuItem onClick={onMergeNext}>
          <Icon name="link" />
          {t('editor.grouping.mergeNext')}
        </ContextMenuItem>
      )}
      {onSplit && [...text].length > 1 && (
        <ContextMenuItem onClick={onSplit}>
          <Icon name="call_split" />
          {t('editor.grouping.split')}
        </ContextMenuItem>
      )}
      {onRegroup && (
        <ContextMenuItem onClick={onRegroup}>
          <Icon name="auto_fix_high" />
          {t('editor.grouping.regroup')}
        </ContextMenuItem>
      )}
      <ContextMenuItem onClick={onEditLine}>
        <Icon name="edit" />
        {t('editor.editLine')}
      </ContextMenuItem>
      {timed && (
        <>
          <ContextMenuSeparator />
          {/* Gold: the time is lost, but the toast (and undo) bring it back. */}
          <ContextMenuItem variant="warning" onClick={onClear}>
            <Icon name="ink_eraser" />
            {t('editor.clearTimestamp')}
          </ContextMenuItem>
        </>
      )}
    </>
  );
}
