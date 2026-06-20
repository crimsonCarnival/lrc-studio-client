import { useMemo, useCallback, useState, useEffect } from 'react';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from '@features/editor/hooks/useEditor';
import EditorToolbar from './EditorToolbar';
import EditorPasteArea from '../setup/EditorPasteArea';
import VirtualizedLineList from './VirtualizedLineList';
import ActionDrawer, { DrawerItem } from '@/shared/ui/ActionDrawer';
import { Play, X, Pencil, Trash2, Eraser } from 'lucide-react';
import { formatTime } from '@/shared/utils/format-time';
import { hasKanji } from '@/shared/utils/furigana';
import { splitArtists } from '@/shared/utils/lrc';
import type { EditorLine, EditorWord } from '@/features/editor/services/editor.service';
import type { AuthUser } from '@/features/auth/hooks/useAuth';

const EMPTY_ARTISTS: string[] = [];

interface EditorProps {
  user?: AuthUser | null;
  lines: EditorLine[];
  setLines: (lines: EditorLine[]) => void;
  syncMode: boolean;
  setSyncMode: (v: boolean) => void;
  activeLineIndex: number;
  setActiveLineIndex: (i: number) => void;
  playbackPosition: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  playerRef?: any;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
  editorMode: string;
  setEditorMode: (m: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onImport?: (...args: any[]) => void;
  handleManualSave?: (() => void | Promise<void>) | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildProjectPayload?: () => Record<string, any>;
  handleRemoveAllLyrics: () => void;
  isAutosaving?: boolean;
  isSaving?: boolean;
  compact?: boolean;
  onNewProject: () => void;
  onShowKeyboardHelp?: () => void;
  onOpenProjectSettings?: () => void;
  registerAfterSave?: (cb: (() => void) | null) => void;
  songArtists?: string[];
}

interface WordMenuData {
  lineIndex: number | null;
  wordIndex: number | null;
  word: EditorWord | null;
  isSecondary: boolean;
}

interface LineMenuData {
  lineIndex: number | null;
  line: EditorLine | null;
}

export default function Editor({
  user,
  lines,
  setLines,
  syncMode,
  setSyncMode,
  activeLineIndex,
  setActiveLineIndex,
  playbackPosition,
  playerRef,
  undo,
  redo,
  canUndo,
  canRedo,
  clearHistory,
  editorMode,
  setEditorMode,
  onImport,
  handleManualSave,
  buildProjectPayload,
  handleRemoveAllLyrics,
  isAutosaving,
  isSaving,
  compact,
  onNewProject,
  onShowKeyboardHelp,
  registerAfterSave,
  songArtists = EMPTY_ARTISTS,
}: EditorProps) {
  "use no memo";
  const { t } = useTranslation();
  const {
    rawText,
    setRawText,
    editingLineIndex,
    setEditingLineIndex,
    editingText,
    setEditingText,
    editingSecondary,
    setEditingSecondary,
    editingTranslations,
    setEditingTranslations,
    editingSingers,
    setEditingSingers,
    handleInsertSection,
    handleToggleSectionDepth,
    handleMoveToSection,
    handleAssignSinger,
    handleCycleWordSinger,
    handleSetWordSinger,
    dragIndex,
    dragOverIndex,
    selectedLines,
    setSelectedLines,
    awaitingEndMark,
    focusedTimestamp,
    setFocusedTimestamp,
    displayedActiveIndex,
    isActiveLineLocked,
    handleLineHover,
    handleLineHoverEnd,
    listRef,
    fileInputRef,
    handleFileUpload,
    handleUrlImport,
    shiftTime,
    handleMark,
    handleClearLine,
    handleClearTimestamps,
    handleClearAllWordTimestamps,
    handleSaveLineText,
    handleDeleteLine,
    handleAddLine,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
    handleApplyOffset,
    handleLineClick,
    clearSelection,
    handleToggleLine,
    handleBulkClearTimestamps,
    handleBulkDelete,
    handleBulkShift,
    requestConfirm,
    confirmModal,
    settings,
    updateSetting,
    activeWordIndex,
    handleClearWordTimestamp,
    handleSetActiveWordIndex,
    handleSetTimestamp,
    handleSetWordReading,
    stampTarget,
    handleStampTargetToggle,
    overlappingLines,
    modifiedLines,
    clearModifiedLines,
  } = useEditor({
    lines,
    setLines,
    syncMode,
    setSyncMode,
    activeLineIndex,
    setActiveLineIndex,
    playbackPosition,
    playerRef,
    editorMode,
    setEditorMode,
    onImport,
    clearHistory,
  });

  // Register teardown / post-save hooks
  useEffect(() => {
    if (registerAfterSave) {
      registerAfterSave(clearModifiedLines);
    }
    return () => {
      if (registerAfterSave) registerAfterSave(null);
    };
  }, [registerAfterSave, clearModifiedLines]);

  const combinedSingers = useMemo(() => {
    const singersSet = new Set<string>();
    // Split each artist entry in case any contain comma/feat separators (e.g. old data joins)
    for (const artist of songArtists || EMPTY_ARTISTS) {
      for (const name of splitArtists(artist)) {
        if (name) singersSet.add(name);
      }
    }
    (lines || []).forEach(line => {
      if (line.singers) {
        line.singers.forEach(s => {
          if (s && s.trim()) singersSet.add(s.trim());
        });
      }
    });
    return Array.from(singersSet);
  }, [songArtists, lines]);

  const [activeDrawer, setActiveDrawer] = useState<'word' | 'bulk' | 'line' | null>(null);
  const [activeWordMenuData, setActiveWordMenuData] = useState<WordMenuData>({ lineIndex: null, wordIndex: null, word: null, isSecondary: false });
  const [activeLineMenuData, setActiveLineMenuData] = useState<LineMenuData>({ lineIndex: null, line: null });

  const handleWordMenuOpen = useCallback((lineIndex: number, wordIndex: number, word: EditorWord, isSecondary: boolean) => {
    setActiveWordMenuData({ lineIndex, wordIndex, word, isSecondary });
    setActiveDrawer('word');
  }, []);

  const handleLineMenuOpen = useCallback((lineIndex: number, line: EditorLine) => {
    setActiveLineMenuData({ lineIndex, line });
    setActiveDrawer('line');
  }, []);

  const handleBulkMenuOpen = useCallback(() => {
    setActiveDrawer('bulk');
  }, []);


  return (
    <div
      onMouseLeave={handleLineHoverEnd}
      className={`lg:glass lg:rounded-2xl lg:overflow-hidden rounded-none p-3 sm:p-5 flex ${compact ? 'flex-row gap-2' : 'flex-col'} flex-1 animate-fade-in min-h-0 relative`}
    >

      <EditorToolbar
        user={user}
        editorMode={editorMode}
        setEditorMode={setEditorMode}
        updateSetting={updateSetting}
        settings={settings}
        syncMode={syncMode}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        lines={lines}
        setSelectedLines={setSelectedLines}
        selectedLines={selectedLines}
        handleClearTimestamps={handleClearTimestamps}
        handleClearAllWordTimestamps={handleClearAllWordTimestamps}
        requestConfirm={requestConfirm}
        setLines={setLines}
        setRawText={setRawText}
        setSyncMode={setSyncMode}
        handleManualSave={handleManualSave}
        buildProjectPayload={buildProjectPayload}
        handleRemoveAllLyrics={handleRemoveAllLyrics}
        isAutosaving={isAutosaving}
        isSaving={isSaving}
        overlappingLines={overlappingLines}
        onNewProject={onNewProject}
        onShowKeyboardHelp={onShowKeyboardHelp}
        activeLineIndex={activeLineIndex}
        activeWordIndex={activeWordIndex}
        stampTarget={stampTarget}
      />

      {/* Visual separator between toolbar and lyrics list */}
      {syncMode && lines.length > 0 && (
        <div className="h-px bg-gradient-to-r from-transparent via-zinc-800/80 to-transparent mb-3 -mx-1 flex-shrink-0" />
      )}

      <div className="flex flex-col flex-1 min-h-0 min-w-0">
      {/* Edit Mode */}
      {!syncMode && (
        <EditorPasteArea
          rawText={rawText}
          setRawText={setRawText}
          fileInputRef={fileInputRef}
          handleFileUpload={handleFileUpload}
          handleUrlImport={handleUrlImport as ComponentProps<typeof EditorPasteArea>['handleUrlImport']}
        />
      )}

      {/* Sync Mode */}
      {syncMode && (
        <div className="relative flex flex-col flex-1 min-h-0">
        <VirtualizedLineList
          lines={lines}
          displayedActiveIndex={displayedActiveIndex}
          activeLineIndex={activeLineIndex}
          isActiveLineLocked={isActiveLineLocked}
          editorMode={editorMode}
          awaitingEndMark={awaitingEndMark}
          focusedTimestamp={focusedTimestamp}
          setFocusedTimestamp={setFocusedTimestamp}
          handleLineClick={handleLineClick}
          handleLineHover={handleLineHover}
          handleLineHoverEnd={handleLineHoverEnd}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleDragEnd={handleDragEnd}
          handleDrop={handleDrop}
          dragOverIndex={dragOverIndex}
          dragIndex={dragIndex}
          projectSingers={combinedSingers}
          selectedLines={selectedLines}
          settings={settings}
          editingLineIndex={editingLineIndex}
          setEditingLineIndex={setEditingLineIndex}
          editingText={editingText}
          setEditingText={setEditingText}
          editingSecondary={editingSecondary}
          setEditingSecondary={setEditingSecondary}
          editingTranslations={editingTranslations as unknown[]}
          setEditingTranslations={setEditingTranslations as (v: unknown[]) => void}
          editingSingers={editingSingers}
          setEditingSingers={setEditingSingers}
          handleSaveLineText={handleSaveLineText}
          handleInsertSection={handleInsertSection}
          handleToggleSectionDepth={handleToggleSectionDepth}
          handleMoveToSection={handleMoveToSection}
          handleAssignSinger={handleAssignSinger}
          songArtists={combinedSingers}
          playerRef={playerRef}
          shiftTime={shiftTime}
          handleAddLine={handleAddLine}
          handleClearLine={handleClearLine}
          handleDeleteLine={handleDeleteLine}
          listRef={listRef}
          handleApplyOffset={handleApplyOffset}
          handleMark={handleMark}
          handleBulkClearTimestamps={handleBulkClearTimestamps}
          handleBulkShift={handleBulkShift}
          handleBulkDelete={handleBulkDelete}
          clearSelection={clearSelection}
          handleToggleLine={handleToggleLine}
          updateSetting={updateSetting}
          activeWordIndex={activeWordIndex}
          handleClearWordTimestamp={handleClearWordTimestamp}
          handleSetActiveWordIndex={handleSetActiveWordIndex}
          handleSetTimestamp={handleSetTimestamp}
          handleSetWordReading={handleSetWordReading}
          handleCycleWordSinger={handleCycleWordSinger}
          handleSetWordSinger={handleSetWordSinger}
          stampTarget={stampTarget}
          handleStampTargetToggle={handleStampTargetToggle}
          playbackPosition={playbackPosition}
          onWordMenu={handleWordMenuOpen}
          onLineMenu={handleLineMenuOpen}
          onBulkMenu={handleBulkMenuOpen}
          modifiedLines={modifiedLines}
        />
        </div>
      )}
      </div>

      {/* Action Drawer for Mobile Actions */}
      <ActionDrawer
        isOpen={activeDrawer !== null}
        onClose={() => setActiveDrawer(null)}
        title={activeDrawer === 'word'
          ? (activeWordMenuData.word?.word ? t('editor.wordDrawerTitle', { word: activeWordMenuData.word.word }) : t('editor.wordDrawerTitleNoWord'))
          : activeDrawer === 'line'
            ? t('editor.lineDrawerTitle', { n: (activeLineMenuData.lineIndex ?? 0) + 1 })
            : t('editor.selectionDrawerTitle', { n: selectedLines.size })
        }
      >
        {activeDrawer === 'word' && (
          <>
            <DrawerItem
              icon={Play}
              label={activeWordMenuData.word?.time != null ? t('editor.jumpToTime', { time: formatTime(activeWordMenuData.word.time) }) : t('editor.jumpToWord')}
              onClick={() => {
                if (activeWordMenuData.word?.time != null && playerRef?.current?.seek) {
                  playerRef.current.seek(activeWordMenuData.word.time);
                  if (playerRef.current.play) playerRef.current.play();
                }
                setActiveDrawer(null);
              }}
            />

            {activeWordMenuData.word?.time != null && (
              <DrawerItem
                icon={Eraser}
                label={t('editor.clearTimestamp')}
                variant="danger"
                onClick={() => {
                  handleClearWordTimestamp(activeWordMenuData.lineIndex!, activeWordMenuData.wordIndex!, activeWordMenuData.isSecondary ? 'secondaryWords' : 'words');
                  setActiveDrawer(null);
                }}
              />
            )}

            {hasKanji(activeWordMenuData.word?.word || '') && (
              <DrawerItem
                icon={Pencil}
                label={activeWordMenuData.word?.reading ? t('editor.editReading') : t('editor.addReading')}
                onClick={() => {
                  setActiveDrawer(null);
                  const currentReading = activeWordMenuData.word?.reading || '';
                  const newReading = window.prompt(t('editor.enterReadingPrompt'), currentReading);
                  if (newReading !== null) {
                    handleSetWordReading(activeWordMenuData.lineIndex!, activeWordMenuData.wordIndex!, newReading);
                  }
                }}
              />
            )}
          </>
        )}

        {activeDrawer === 'line' && (
          <>
            <DrawerItem
              icon={Play}
              label={activeLineMenuData.line?.timestamp != null ? t('editor.jumpToTime', { time: formatTime(activeLineMenuData.line.timestamp) }) : t('editor.jumpToLine')}
              onClick={() => {
                if (activeLineMenuData.line?.timestamp != null && playerRef?.current?.seek) {
                  playerRef.current.seek(activeLineMenuData.line.timestamp);
                  if (playerRef.current.play) playerRef.current.play();
                }
                setActiveDrawer(null);
              }}
            />
            {activeLineMenuData.line?.timestamp != null && (
              <DrawerItem
                icon={Eraser}
                label={t('editor.clearTimestamp')}
                variant="danger"
                onClick={() => {
                  handleClearLine(activeLineMenuData.lineIndex!);
                  setActiveDrawer(null);
                }}
              />
            )}
            <DrawerItem
              icon={Trash2}
              label={t('editor.removeLine')}
              variant="danger"
              onClick={() => {
                handleDeleteLine(activeLineMenuData.lineIndex!);
                setActiveDrawer(null);
              }}
            />
          </>
        )}

        {activeDrawer === 'bulk' && (
          <>
            <DrawerItem
              icon={Eraser}
              label={t('editor.selection.clearTimestamps')}
              variant="danger"
              onClick={() => {
                handleBulkClearTimestamps();
                setActiveDrawer(null);
              }}
            />
            <DrawerItem
              icon={Trash2}
              label={t('editor.selection.deleteSelected')}
              variant="danger"
              onClick={() => {
                handleBulkDelete();
                setActiveDrawer(null);
              }}
            />
            <DrawerItem
              icon={X}
              label={t('editor.selection.deselectAll')}
              onClick={() => {
                clearSelection();
                setActiveDrawer(null);
              }}
            />
          </>
        )}
      </ActionDrawer>

      {confirmModal}
    </div>
  );
}
