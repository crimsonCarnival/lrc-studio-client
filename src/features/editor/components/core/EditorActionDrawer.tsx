import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ActionDrawer, { DrawerItem } from '@/shared/ui/ActionDrawer';
import { Play, X, Pencil, Trash2, Eraser, FolderInput, ChevronLeft } from 'lucide-react';
import { formatTime } from '@/shared/utils/format-time';
import { hasKanji } from '@/shared/utils/furigana';
import { formatSectionLabel } from '@features/editor/constants/sectionTypes';
import type { EditorLine } from '@/features/editor/services/editor.service';
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
  handleClearLine: (lineIndex: number) => void;
  handleDeleteLine: (lineIndex: number) => void;
  handleBulkClearTimestamps: () => void;
  handleBulkDelete: () => void;
  clearSelection: () => void;
  lines?: EditorLine[];
  handleMoveToSection?: (indices: number[], sectionIndex: number) => void;
}

export default function EditorActionDrawer({
  activeDrawer,
  wordData,
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
  clearSelection,
  lines,
  handleMoveToSection,
}: EditorActionDrawerProps) {
  const { t } = useTranslation();
  const [showSections, setShowSections] = useState(false);

  // Section markers a line can be moved into (excluding the line itself) (#)
  const sections = (lines || [])
    .map((line, index) => ({ line, index }))
    .filter(({ line, index }) => line.type === 'section' && index !== lineData.lineIndex);

  const handleClose = () => {
    setShowSections(false);
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
            icon={Play}
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
              icon={Eraser}
              label={t('editor.clearTimestamp')}
              variant="danger"
              onClick={() => {
                handleClearWordTimestamp(wordData.lineIndex!, wordData.wordIndex!, wordData.isSecondary ? 'secondaryWords' : 'words');
                onClose();
              }}
            />
          )}

          {hasKanji(wordData.word?.word || '') && (
            <DrawerItem
              icon={Pencil}
              label={wordData.word?.reading ? t('editor.editReading') : t('editor.addReading')}
              onClick={() => {
                onClose();
                const currentReading = wordData.word?.reading || '';
                const newReading = window.prompt(t('editor.enterReadingPrompt'), currentReading);
                if (newReading !== null) {
                  handleSetWordReading(wordData.lineIndex!, wordData.wordIndex!, newReading);
                }
              }}
            />
          )}
        </>
      )}

      {activeDrawer === 'line' && (
        showSections ? (
          <>
            <DrawerItem
              icon={ChevronLeft}
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
              icon={Play}
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
                icon={Eraser}
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
                icon={FolderInput}
                label={t('editor.moveToSection')}
                onClick={() => setShowSections(true)}
              />
            )}
            <DrawerItem
              icon={Trash2}
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
          <DrawerItem
            icon={Eraser}
            label={t('editor.selection.clearTimestamps')}
            variant="danger"
            onClick={() => {
              handleBulkClearTimestamps();
              onClose();
            }}
          />
          <DrawerItem
            icon={Trash2}
            label={t('editor.selection.deleteSelected')}
            variant="danger"
            onClick={() => {
              handleBulkDelete();
              onClose();
            }}
          />
          <DrawerItem
            icon={X}
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
