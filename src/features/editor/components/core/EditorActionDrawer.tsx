import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ActionDrawer, { DrawerItem } from '@/shared/ui/ActionDrawer';
import { formatTime } from '@/shared/utils/format-time';
import { hasKanji } from '@/shared/utils/furigana';
import { ReadingInput } from '@features/editor/components/line/ReadingInput';
import { formatSectionLabel } from '@features/editor/constants/section-types';
import type { EditorLine } from '@/features/editor/editor.types';
import type { DrawerKind, WordMenuData, LineMenuData } from '@/features/editor/hooks/useEditorActionDrawer';

interface PlayerRefLike {
  current?: { seek?: (t: number) => void; play?: () => void } | null;
}

interface EditorActionDrawerProps {
  activeDrawer: DrawerKind;
  wordData: WordMenuData;
  lineData: LineMenuData;
  selectedCount: number;
  onClose: () => void;
  playerRef?: PlayerRefLike | null;
  handleClearWordTimestamp: (lineIndex: number, wordIndex: number, layer: string) => void;
  handleSetWordReading: (lineIndex: number, wordIndex: number, val: string) => void;
  handleMergeWordWithNext?: (lineIndex: number, wordIndex: number) => void;
  handleSplitWord?: (lineIndex: number, wordIndex: number) => void;
  handleRegroupLine?: (lineIndex: number) => void;
  /** Words of the owning line, so the drawer knows whether a merge target exists. */
  lineWordCount?: number;
  handleClearLine: (lineIndex: number) => void;
  handleDeleteLine: (lineIndex: number) => void;
  handleBulkClearTimestamps: () => void;
  handleBulkDelete: () => void;
  handleBulkSingTogether?: () => void;
  handleBulkSplitSingers?: () => void;
  clearSelection: () => void;
  lines?: EditorLine[];
  handleMoveToSection?: (indices: number[], sectionIndex: number) => void;
  songArtists?: string[];
}

export default function EditorActionDrawer({
  activeDrawer,
  wordData,
  handleMergeWordWithNext,
  handleSplitWord,
  handleRegroupLine,
  lineWordCount = 0,
  lineData,
  selectedCount,
  onClose,
  playerRef,
  handleClearWordTimestamp,
  handleSetWordReading,
  handleClearLine,
  handleDeleteLine,
  handleBulkClearTimestamps,
  handleBulkDelete,
  handleBulkSingTogether,
  handleBulkSplitSingers,
  clearSelection,
  lines,
  handleMoveToSection,
  songArtists,
}: EditorActionDrawerProps) {
  const { t } = useTranslation();
  const [showSections, setShowSections] = useState(false);
  const [editingReading, setEditingReading] = useState(false);

  const sections = (lines || [])
    .map((line, index) => ({ line, index }))
    .filter(({ line, index }) => line.type === 'section' && index !== lineData.lineIndex);

  const handleClose = () => {
    setShowSections(false);
    setEditingReading(false);
    onClose();
  };

  return (
    <ActionDrawer
      isOpen={activeDrawer !== null}
      onClose={handleClose}
      title={activeDrawer === 'word'
        ? (wordData.word?.word ? t('editor.wordDrawerTitle', { word: wordData.word.word }) : t('editor.wordDrawerTitleNoWord'))
        : activeDrawer === 'line'
          ? t('editor.lineDrawerTitle', { n: (lineData.lineIndex ?? 0) + 1 })
          : t('editor.selectionDrawerTitle', { n: selectedCount })
      }
    >
      {activeDrawer === 'word' && (
        <>
          <DrawerItem
            iconName="play_arrow"
            label={wordData.word?.time != null ? t('editor.jumpToTime', { time: formatTime(wordData.word.time) }) : t('editor.jumpToWord')}
            onClick={() => {
              if (wordData.word?.time != null && playerRef?.current?.seek) {
                playerRef.current.seek(wordData.word.time);
                if (playerRef.current.play) playerRef.current.play();
              }
              onClose();
            }}
          />

          {wordData.word?.time != null && (
            <DrawerItem
              iconName="ink_eraser"
              label={t('editor.clearTimestamp')}
              variant="danger"
              onClick={() => {
                handleClearWordTimestamp(wordData.lineIndex!, wordData.wordIndex!, wordData.isSecondary ? 'secondaryWords' : 'words');
                onClose();
              }}
            />
          )}

          {hasKanji(wordData.word?.word || '') && (
            editingReading ? (
              <div className="flex items-center gap-2 px-4 py-2.5">
                <span className="text-sm text-zinc-400 shrink-0">{t('editor.editReading')}</span>
                <ReadingInput
                  defaultValue={wordData.word?.reading || ''}
                  selectOnFocus
                  onCommit={(val) => {
                    handleSetWordReading(wordData.lineIndex!, wordData.wordIndex!, val);
                    setEditingReading(false);
                    onClose();
                  }}
                  onCancel={() => setEditingReading(false)}
                  className="flex-1 min-w-0 bg-transparent border-b border-primary outline-none text-primary text-sm px-1 py-0.5"
                />
              </div>
            ) : (
              <DrawerItem
                iconName="edit"
                label={wordData.word?.reading ? t('editor.editReading') : t('editor.addReading')}
                onClick={() => setEditingReading(true)}
              />
            )
          )}

          {/* Grouping repairs. Automatic grouping gets the ordinary line right but
              cannot settle a kana prefix, a 熟字訓, or a word the singer holds
              apart, so the chips stay editable by hand. */}
          {handleMergeWordWithNext && wordData.wordIndex != null && wordData.wordIndex < lineWordCount - 1 && (
            <DrawerItem
              iconName="link"
              label={t('editor.grouping.mergeNext')}
              onClick={() => {
                onClose();
                handleMergeWordWithNext(wordData.lineIndex!, wordData.wordIndex!);
              }}
            />
          )}

          {handleSplitWord && [...(wordData.word?.word || '')].length > 1 && (
            <DrawerItem
              iconName="call_split"
              label={t('editor.grouping.split')}
              onClick={() => {
                onClose();
                handleSplitWord(wordData.lineIndex!, wordData.wordIndex!);
              }}
            />
          )}

          {handleRegroupLine && (
            <DrawerItem
              iconName="auto_fix_high"
              label={t('editor.grouping.regroup')}
              onClick={() => {
                onClose();
                handleRegroupLine(wordData.lineIndex!);
              }}
            />
          )}
        </>
      )}

      {activeDrawer === 'line' && (
        showSections ? (
          <>
            <DrawerItem
              iconName="chevron_left"
              label={t('editor.moveToSection')}
              onClick={() => setShowSections(false)}
            />
            {sections.map(({ line: sl, index }) => (
              <DrawerItem
                key={index}
                label={formatSectionLabel(sl.label, t)}
                onClick={() => {
                  handleMoveToSection?.([lineData.lineIndex!], index);
                  handleClose();
                }}
              />
            ))}
          </>
        ) : (
          <>
            <DrawerItem
              iconName="play_arrow"
              label={lineData.line?.timestamp != null ? t('editor.jumpToTime', { time: formatTime(lineData.line.timestamp) }) : t('editor.jumpToLine')}
              onClick={() => {
                if (lineData.line?.timestamp != null && playerRef?.current?.seek) {
                  playerRef.current.seek(lineData.line.timestamp);
                  if (playerRef.current.play) playerRef.current.play();
                }
                onClose();
              }}
            />
            {lineData.line?.timestamp != null && (
              <DrawerItem
                iconName="ink_eraser"
                label={t('editor.clearTimestamp')}
                variant="danger"
                onClick={() => {
                  handleClearLine(lineData.lineIndex!);
                  onClose();
                }}
              />
            )}
            {handleMoveToSection && sections.length > 0 && (
              <DrawerItem
                iconName="folder_open"
                label={t('editor.moveToSection')}
                onClick={() => setShowSections(true)}
              />
            )}
            <DrawerItem
              iconName="delete"
              label={t('editor.removeLine')}
              variant="danger"
              onClick={() => {
                handleDeleteLine(lineData.lineIndex!);
                onClose();
              }}
            />
          </>
        )
      )}

      {activeDrawer === 'bulk' && (
        <>
          {handleBulkSingTogether && songArtists && songArtists.length > 1 && (
            <DrawerItem
              iconName="group"
              label={t('editor.duetMode')}
              onClick={() => {
                handleBulkSingTogether();
                onClose();
              }}
            />
          )}
          {handleBulkSplitSingers && songArtists && songArtists.length > 1 && (
            <DrawerItem
              iconName="call_split"
              label={t('editor.splitMode')}
              onClick={() => {
                handleBulkSplitSingers();
                onClose();
              }}
            />
          )}
          <DrawerItem
            iconName="ink_eraser"
            label={t('editor.selection.clearTimestamps')}
            variant="danger"
            onClick={() => {
              handleBulkClearTimestamps();
              onClose();
            }}
          />
          <DrawerItem
            iconName="delete"
            label={t('editor.selection.deleteSelected')}
            variant="danger"
            onClick={() => {
              handleBulkDelete();
              onClose();
            }}
          />
          <DrawerItem
            iconName="close"
            label={t('editor.selection.deselectAll')}
            onClick={() => {
              clearSelection();
              onClose();
            }}
          />
        </>
      )}
    </ActionDrawer>
  );
}
