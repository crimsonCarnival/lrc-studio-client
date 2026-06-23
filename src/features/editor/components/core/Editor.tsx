import { useMemo, useEffect } from 'react';
import type { ComponentProps } from 'react';
import { useEditor } from '@features/editor/hooks/useEditor';
import { useEditorActionDrawer } from '@features/editor/hooks/useEditorActionDrawer';
import EditorToolbar from './EditorToolbar';
import EditorPasteArea from '../setup/EditorPasteArea';
import VirtualizedLineList from './VirtualizedLineList';
import EditorActionDrawer from './EditorActionDrawer';
import PlayerControls from '@/features/player/components/PlayerControls';
import DragPointerIsolate from '@/features/player/components/DragPointerIsolate';
import { Tip } from '@ui/tip';
import { Button } from '@ui/button';
import ResponsiveModal from '@/shared/ui/ResponsiveModal';
import { ArrowUpToLine, ArrowDownToLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { KEY_SYMBOLS } from '@features/settings/key-symbols';
import { buildSingerRoster } from '@features/editor/utils/singer-colors';
import type { EditorLine } from '@/features/editor/services/editor.service';
import type { AuthUser } from '@/features/auth/hooks/useAuth';
import type { PlayerSlot } from '@/features/player/hooks/usePlayerSlot';

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
  playerSlot?: PlayerSlot;
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
  playerSlot,
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
    handleToggleLineMode,
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

  const combinedSingers = useMemo(
    () => buildSingerRoster(lines, songArtists),
    [songArtists, lines],
  );

  const { activeDrawer, wordData, lineData, openWord, openLine, openBulk, close: closeDrawer } = useEditorActionDrawer();

  // #3: the in-editor player docks at the top (below the toolbar) or bottom, persisted
  // as a global editor setting. The same dock block renders in whichever slot is active.
  const playerPosition = settings.editor?.playerPosition === 'top' ? 'top' : 'bottom';
  const playerDock = playerSlot === 'editor' ? (
    <DragPointerIsolate
      className={`relative flex-shrink-0 border-zinc-800/50 -mx-3 sm:-mx-5 px-3 sm:px-5 ${
        playerPosition === 'top' ? 'mb-3 border-b pb-3' : 'mt-3 border-t pt-3'
      }`}
    >
      <Tip content={playerPosition === 'top' ? t('editor.player.moveToBottom') : t('editor.player.moveToTop')}>
        <button
          onClick={() => updateSetting('editor.playerPosition', playerPosition === 'top' ? 'bottom' : 'top')}
          aria-label={playerPosition === 'top' ? t('editor.player.moveToBottom') : t('editor.player.moveToTop')}
          className="absolute top-1 right-3 sm:right-5 z-raised size-6 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 flex items-center justify-center transition-colors"
        >
          {playerPosition === 'top' ? <ArrowDownToLine className="size-3" /> : <ArrowUpToLine className="size-3" />}
        </button>
      </Tip>
      <PlayerControls variant="editor" />
      {(() => {
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

        return (
          <p className="text-xs text-zinc-600 text-center mt-2 animate-fade-in pb-1">
            {selectedLines.size > 0
              ? selectionHintText
              : editorMode === 'srt'
                ? (awaitingEndMark != null ? t('editor.markEndInstruction').replace(/Space|Espacio/gi, settings.shortcuts?.mark?.[0] || 'Space') : t('editor.markInstructionSRT').replace(/Space|Espacio/gi, settings.shortcuts?.mark?.[0] || 'Space'))
                : editorMode === 'words'
                  ? t('editor.markInstructionWords').replace(/Space|Espacio/gi, settings.shortcuts?.mark?.[0] || 'Space')
                  : t('editor.markInstruction').replace(/Space|Espacio/gi, settings.shortcuts?.mark?.[0] || 'Space')
            }
          </p>
        );
      })()}
    </DragPointerIsolate>
  ) : null;


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
        handleApplyOffset={handleApplyOffset}
      />

      {playerPosition === 'top' && playerDock}

      {/* Visual separator between toolbar and lyrics list */}
      {syncMode && lines.length > 0 && (
        <div className="h-px bg-gradient-to-r from-transparent via-zinc-800/80 to-transparent mb-3 -mx-1 flex-shrink-0" />
      )}

      <div className="flex flex-col flex-1 min-h-0 min-w-0">
      <ResponsiveModal
        open={!syncMode}
        onOpenChange={(open) => {
          if (!open) {
            window.dispatchEvent(new CustomEvent('editor:start-syncing'));
          }
        }}
        title={t('editor.editRawText', 'Raw Lyrics')}
        dialogProps={{ className: 'max-w-3xl w-[90vw]' }}
      >
        <div className="h-[60vh] flex flex-col mt-2 min-h-0">
          <EditorPasteArea
            rawText={rawText}
            setRawText={setRawText}
            fileInputRef={fileInputRef}
            handleFileUpload={handleFileUpload}
            handleUrlImport={handleUrlImport as ComponentProps<typeof EditorPasteArea>['handleUrlImport']}
          />
          <div className="flex justify-end mt-4 pt-4 border-t border-zinc-800 shrink-0">
            <Button onClick={() => window.dispatchEvent(new CustomEvent('editor:start-syncing'))} className="font-semibold px-6 text-zinc-950 bg-primary hover:bg-primary/90">
              {t('editor.done', 'Done')}
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      {/* Sync Mode View */}
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
          onWordMenu={openWord}
          onLineMenu={openLine}
          onBulkMenu={openBulk}
          modifiedLines={modifiedLines}
          onToggleLineMode={handleToggleLineMode}
        />
      </div>
      </div>

      {playerPosition === 'bottom' && playerDock}

      {/* Action Drawer for Mobile Actions */}
      <EditorActionDrawer
        activeDrawer={activeDrawer}
        wordData={wordData}
        lineData={lineData}
        selectedCount={selectedLines.size}
        onClose={closeDrawer}
        playerRef={playerRef}
        handleClearWordTimestamp={handleClearWordTimestamp}
        handleSetWordReading={handleSetWordReading}
        handleClearLine={handleClearLine}
        handleDeleteLine={handleDeleteLine}
        handleBulkClearTimestamps={handleBulkClearTimestamps}
        handleBulkDelete={handleBulkDelete}
        clearSelection={clearSelection}
        lines={lines}
        handleMoveToSection={handleMoveToSection}
      />

      {confirmModal}
    </div>
  );
}
