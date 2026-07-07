import { useMemo, useEffect, useState, useCallback } from 'react';
import type { ComponentProps } from 'react';
import { useEditor } from '@features/editor/hooks/useEditor';
import { useEditorActionDrawer } from '@features/editor/hooks/useEditorActionDrawer';
import { useAutoStamp, type AutoStampPhase } from '@features/editor/hooks/useAutoStamp';
import EditorToolbar from './EditorToolbar';
import EditorPasteArea from '../setup/EditorPasteArea';
import VirtualizedLineList from './VirtualizedLineList';
import EditorActionDrawer from './EditorActionDrawer';
import AutoStampModal from './AutoStampModal';
import PlayerControls from '@/features/player/components/PlayerControls';
import DragPointerIsolate from '@/features/player/components/DragPointerIsolate';
import { Tip } from '@ui/tip';
import { Button } from '@ui/button';
import ResponsiveModal from '@/shared/ui/ResponsiveModal';
import { useTranslation } from 'react-i18next';
import { KEY_SYMBOLS } from '@features/settings/key-symbols';
import { buildSingerRoster } from '@features/editor/utils/singer-colors';
import type { EditorLine } from '@/features/editor/services/editor.service';
import type { AuthUser } from '@/features/auth/hooks/useAuth';
import type { PlayerSlot } from '@/features/player/hooks/usePlayerSlot';
import type { UploadedAudio } from '@/shared/hooks/useAppState';

const EMPTY_ARTISTS: string[] = [];

// Phases during which an Auto Stamp job is actively running server-side —
// the toolbar button stays disabled and re-clicking would race the in-flight job.
const AUTO_STAMP_RUNNING_PHASES: ReadonlySet<AutoStampPhase> = new Set(['starting', 'fetching_audio', 'extracting_audio', 'transcribing', 'aligning', 'applying']);

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
  pendingSyncs?: number;
  isSaving?: boolean;
  compact?: boolean;
  onNewProject: () => void;
  onShowKeyboardHelp?: () => void;
  onOpenProjectSettings?: () => void;
  registerAfterSave?: (cb: (() => void) | null) => void;
  songArtists?: string[];
  playerSlot?: PlayerSlot;
  onHideEditor?: () => void;
  previewHidden?: boolean;
  onShowPreview?: () => void;
  // Auto Stamp (#9): the persisted Cloudinary upload (if any) and a media-availability
  // flag used as the render-time button-enable signal. The raw local File itself is
  // read imperatively off playerRef.getAudioBlob() at job start (see getLocalFile below).
  uploadedAudio?: UploadedAudio | null;
  hasMedia?: boolean;
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
  pendingSyncs,
  isSaving,
  compact,
  onNewProject,
  onShowKeyboardHelp,
  registerAfterSave,
  songArtists = EMPTY_ARTISTS,
  playerSlot,
  onHideEditor,
  previewHidden,
  onShowPreview,
  uploadedAudio,
  hasMedia,
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

  // ——— Auto Stamp (#9) ———
  // uploadId: the persisted Cloudinary Upload id. `local:*` ids are client-side
  // placeholders assigned while a background upload hasn't been persisted yet
  // (see useLocalAudio) — the server can't resolve them, so they're treated as absent.
  const uploadId = useMemo(() => {
    const id = uploadedAudio?.id;
    return id && !id.startsWith('local:') ? id : null;
  }, [uploadedAudio]);

  // getLocalFile: reads the raw local audio File imperatively off the player's
  // exposed blob ref (PlayerEngine's getAudioBlob() returns the File set by
  // useLocalAudio, or null for YouTube). A getter instead of a cached value so
  // useAutoStamp.start() always sees the freshest blob at job start — same-type
  // media swaps don't change any reactive state a cache could be keyed on.
  const getLocalFile = useCallback(
    () => (playerRef?.current?.getAudioBlob?.() as File | undefined) ?? null,
    [playerRef],
  );

  // getYoutubeUrl: same imperative pattern as getLocalFile — read the loaded
  // YouTube URL off the player at job start (null when source isn't YouTube).
  const getYoutubeUrl = useCallback(
    () => (playerRef?.current?.getYoutubeUrl?.() as string | null) ?? null,
    [playerRef],
  );

  const autoStamp = useAutoStamp({
    lines,
    setLines,
    uploadId,
    getLocalFile,
    getYoutubeUrl,
    fuzzyTolerance: settings.autoStamp?.fuzzyTolerance ?? 0.75,
    applyMode: (settings.autoStamp?.applyMode as 'all' | 'empty-only') ?? 'empty-only',
    editorMode,
  });

  const [autoStampDismissed, setAutoStampDismissed] = useState(false);

  const handleAutoStampStart = useCallback(() => {
    setAutoStampDismissed(false);
    autoStamp.start();
    // autoStamp is a fresh object every render (its own methods are individually
    // memoized) — depending on the whole object would defeat that stability.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStamp.start]);

  const handleAutoStampCancel = useCallback(() => {
    autoStamp.cancel();
    setAutoStampDismissed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStamp.cancel]);

  const handleAutoStampClose = useCallback(() => {
    setAutoStampDismissed(true);
  }, []);

  const handleAutoStampJump = useCallback((index: number) => {
    setActiveLineIndex(index);
  }, [setActiveLineIndex]);

  // If the user closed/dismissed the modal while a job was still running in the
  // background, a result requiring explicit confirmation (overwrite conflict or
  // index-drift) must not be silently stranded: force the modal back open so the
  // user isn't stuck unable to apply or discard it. Derived directly at render
  // time (not via an effect + setState) to avoid an extra render pass.
  const autoStampOpen = (autoStamp.phase !== 'idle' && !autoStampDismissed) || autoStamp.pendingResult != null;
  // Button-enable signal: `hasMedia` is the freshest render-time approximation for
  // "a local file might exist" (refs can't be read during render). It's true for
  // YouTube-only media too, but that's acceptable — start() re-checks the actual
  // sources and fails safely with asr_no_audio if no bytes are available.
  const autoStampHasAudio = !!uploadId || !!hasMedia;
  const autoStampRunning = AUTO_STAMP_RUNNING_PHASES.has(autoStamp.phase);

  // Manual timestamp edits invalidate a line's Auto Stamp confidence badge —
  // clear it so the highlight doesn't linger on a value the user has since fixed.
  const handleSetTimestampWithConfidence = useCallback((index: number, type: string, value: number) => {
    handleSetTimestamp(index, type, value);
    autoStamp.clearConfidence(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSetTimestamp, autoStamp.clearConfidence]);

  const shiftTimeWithConfidence = useCallback((index: number, delta: number) => {
    shiftTime(index, delta);
    autoStamp.clearConfidence(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftTime, autoStamp.clearConfidence]);

  const handleMarkWithConfidence = useCallback((opts?: { forceAdvance?: boolean }) => {
    handleMark(opts);
    autoStamp.clearConfidence(activeLineIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleMark, autoStamp.clearConfidence, activeLineIndex]);

  // #3: the in-editor player docks at the top (below the toolbar) or bottom, persisted
  // as a global editor setting. The same dock block renders in whichever slot is active.
  const playerPosition = settings.editor?.playerPosition === 'top' ? 'top' : 'bottom';
  const playerDock = playerSlot === 'editor' ? (
    <DragPointerIsolate
      className={`relative flex-shrink-0 border-zinc-800/50 -mx-3 sm:-mx-5 px-3 sm:px-5 ${
        playerPosition === 'top' ? 'mb-3 border-b pb-3' : 'mt-3 border-t pt-3'
      }`}
    >
      <PlayerControls variant="editor" youtubeAudioUrl={autoStamp.youtubeAudioUrl} />
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
                ? (awaitingEndMark != null ? t('editor.markEndInstruction').replace(/Space|Espacio/gi, settings.shortcuts?.mark?.[0] || 'Enter') : t('editor.markInstructionSRT').replace(/Space|Espacio/gi, settings.shortcuts?.mark?.[0] || 'Enter'))
                : editorMode === 'words'
                  ? t('editor.markInstructionWords').replace(/Space|Espacio/gi, settings.shortcuts?.mark?.[0] || 'Enter')
                  : t('editor.markInstruction').replace(/Space|Espacio/gi, settings.shortcuts?.mark?.[0] || 'Enter')
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
        pendingSyncs={pendingSyncs}
        isSaving={isSaving}
        overlappingLines={overlappingLines}
        onNewProject={onNewProject}
        onShowKeyboardHelp={onShowKeyboardHelp}
        activeLineIndex={activeLineIndex}
        activeWordIndex={activeWordIndex}
        stampTarget={stampTarget}
        handleApplyOffset={handleApplyOffset}
        onHideEditor={onHideEditor}
        previewHidden={previewHidden}
        onShowPreview={onShowPreview}
        autoStampHasAudio={autoStampHasAudio}
        autoStampRunning={autoStampRunning}
        onAutoStamp={handleAutoStampStart}
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
        title={t('editor.editRawText')}
        dialogProps={{ className: 'max-w-3xl w-[90vw]' }}
      >
        <div className="h-[60vh] flex flex-col mt-2 min-h-0">
          <EditorPasteArea
            rawText={rawText}
            setRawText={setRawText}
            fileInputRef={fileInputRef}
            handleFileUpload={handleFileUpload}
            handleUrlImport={handleUrlImport as ComponentProps<typeof EditorPasteArea>['handleUrlImport']}
            singers={combinedSingers}
          />
          <div className="flex justify-end mt-4 pt-4 border-t border-zinc-800 shrink-0">
            <Button onClick={() => window.dispatchEvent(new CustomEvent('editor:start-syncing'))} className="font-semibold px-6 text-zinc-950 bg-primary hover:bg-primary/90">
              {t('editor.done')}
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
          shiftTime={shiftTimeWithConfidence}
          handleAddLine={handleAddLine}
          handleClearLine={handleClearLine}
          handleDeleteLine={handleDeleteLine}
          listRef={listRef}
          handleApplyOffset={handleApplyOffset}
          handleMark={handleMarkWithConfidence}
          handleBulkClearTimestamps={handleBulkClearTimestamps}
          handleBulkShift={handleBulkShift}
          handleBulkDelete={handleBulkDelete}
          clearSelection={clearSelection}
          handleToggleLine={handleToggleLine}
          updateSetting={updateSetting}
          activeWordIndex={activeWordIndex}
          handleClearWordTimestamp={handleClearWordTimestamp}
          handleSetActiveWordIndex={handleSetActiveWordIndex}
          handleSetTimestamp={handleSetTimestampWithConfidence}
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
          confidenceByIndex={autoStamp.confidenceByIndex}
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

      <AutoStampModal
        open={autoStampOpen}
        phase={autoStamp.phase}
        errorCode={autoStamp.errorCode}
        pendingResult={autoStamp.pendingResult}
        confidenceByIndex={autoStamp.confidenceByIndex}
        lines={lines}
        confidenceThreshold={settings.autoStamp?.confidenceThreshold ?? 0.8}
        onCancel={handleAutoStampCancel}
        onApply={autoStamp.applyPending}
        onDiscard={autoStamp.discardPending}
        onClose={handleAutoStampClose}
        onJumpToLine={handleAutoStampJump}
      />
    </div>
  );
}
