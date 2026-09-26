import { useMemo, useEffect, useState, useCallback } from 'react';
import type { ComponentProps } from 'react';
import { useEditor } from '@features/editor/hooks/useEditor';
import { useEditorActionDrawer } from '@features/editor/hooks/useEditorActionDrawer';
import { useAutoStamp, type AutoStampPhase } from '@features/editor/hooks/useAutoStamp';
import EditorToolbar from './EditorToolbar';
import EditorPasteArea from '../setup/EditorPasteArea';
import VirtualizedLineList from './VirtualizedLineList';
import EditorActionDrawer from './EditorActionDrawer';
import SelectionActionBar from './SelectionActionBar';
import TaggingToolbar from './TaggingToolbar';
import AutoStampModal from './AutoStampModal';
import LyricsSearchBar from '../lyrics-search/LyricsSearchBar';
import { stripLrcTimestamps } from '@/features/editor/utils/lrc-text';
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
import { Icon } from '@/shared/ui/Icon';
import { linesToRawText, flatToSections, rawLineText } from '@/features/editor/utils/sections';
import { hasCJK } from '@/shared/utils/furigana';
import { Popover, PopoverContent, PopoverItem, PopoverSeparator, PopoverTrigger } from '@ui/popover';
// import LyricsSearchBar from '../lyrics-search/LyricsSearchBar';
import { savePendingProject } from '@/features/editor/services/guest-project-db';
import { useNavigate } from 'react-router-dom';

const EMPTY_ARTISTS: string[] = [];

const ActionsDropdown = ({ children, icon = 'more_horiz', label }: { children: React.ReactNode; icon?: string; label?: string }) => {
  const { t } = useTranslation();
  return (
    <Popover>
      <Tip content={label || t('editor.lineOptions')}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="size-9 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-full transition-colors">
            <Icon name={icon} size={18} />
          </Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent className="w-56 p-1 bg-zinc-900 border-zinc-800 shadow-xl" align="end">
        {children}
      </PopoverContent>
    </Popover>
  );
};

// Phases during which an Auto Stamp job is actively running server-side —
// the toolbar button stays disabled and re-clicking would race the in-flight job.
const AUTO_STAMP_RUNNING_PHASES: ReadonlySet<AutoStampPhase> = new Set(['starting', 'fetching_audio', 'extracting_audio', 'transcribing', 'aligning', 'applying']);

interface EditorProps {
  user?: AuthUser | null;
  lines: EditorLine[];
  setLines: React.Dispatch<React.SetStateAction<EditorLine[]>>;
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
  singerColors?: string[];
  /** Song-level singer roster from project metadata (project setup), offered as picker choices. */
  declaredSingers?: string[];
  playerSlot?: PlayerSlot;
  onHideEditor?: () => void;
  previewHidden?: boolean;
  onShowPreview?: () => void;
  // Auto Stamp (#9): the persisted Cloudinary upload (if any) and a media-availability
  // flag used as the render-time button-enable signal. The raw local File itself is
  // read imperatively off playerRef.getAudioBlob() at job start (see getLocalFile below).
  uploadedAudio?: UploadedAudio | null;
  hasMedia?: boolean;
  activepublicId?: string | null;
  onTogglePublicView?: () => void;
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
  singerColors,
  declaredSingers = EMPTY_ARTISTS,
  playerSlot,
  onHideEditor,
  previewHidden,
  onShowPreview,
  uploadedAudio,
  hasMedia,
  activepublicId,
  onTogglePublicView,
}: EditorProps) {
  "use no memo";
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Singers tagged in the lyrics first (their order drives color identity, shared with
  // the preview), then declared-but-unused singers appended so they're offered as choices
  // without shifting any existing singer's color. Also the roster the raw-text editor
  // recognizes in `Name: lyric` prefixes.
  const combinedSingers = useMemo(() => {
    const roster = buildSingerRoster(lines, songArtists);
    const extra = declaredSingers.filter((s) => s && !roster.includes(s));
    return extra.length ? [...roster, ...extra] : roster;
  }, [songArtists, lines, declaredSingers]);

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
    collapsedSections,
    collapsedView,
    toggleSectionCollapse,
    recordIndexMap,
    listRef,
    fileInputRef,
    handleFileUpload,
    handleUrlImport,
    handleTextImport,
    shiftTime,
    handleMark,
    handleClearLine,
    handleClearTimestamps,
    handleClearAllWordTimestamps,
    handleSaveLineText,
    handleToggleLineMode,
    handleDeleteLine,
    handleToggleAdLib,
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
    handleBulkSingTogether,
    handleBulkSplitSingers,
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
    singerRoster: combinedSingers,
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

  const { activeDrawer, wordData, lineData, openWord, openLine, close: closeDrawer } = useEditorActionDrawer();

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
  const [lyricsSearchOpen, setLyricsSearchOpen] = useState(false);

  /**
   * Replaces the project's lyrics with a search result. Goes through the shared
   * import path, so a synced (LRC) result lands with its timestamps intact and
   * the change is undoable and saved like any other import.
   */
  const applyLyricsSearchImport = useCallback(async (text: string, keepTimestamps: boolean) => {
    const ok = await handleTextImport(keepTimestamps ? text : stripLrcTimestamps(text));
    if (ok) setLyricsSearchOpen(false);
  }, [handleTextImport]);

  const handleLyricsSearchImport = useCallback((text: string, keepTimestamps: boolean) => {
    // Importing REPLACES every line. In the editor (unlike setup) that can throw
    // away real work, so confirm first whenever there is anything to lose. Undo
    // still covers it, but silently wiping a synced project is not acceptable.
    const hasWork = lines.some(l =>
      l.type !== 'section' && (l.timestamp != null || (typeof l.text === 'string' && l.text.trim() !== '')));
    if (hasWork) {
      requestConfirm(
        t('confirm.replaceLyrics'),
        () => { void applyLyricsSearchImport(text, keepTimestamps); },
        { title: t('confirm.replaceLyricsTitle'), variant: 'danger' },
      );
      return;
    }
    void applyLyricsSearchImport(text, keepTimestamps);
  }, [lines, requestConfirm, t, applyLyricsSearchImport]);

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
      data-tour="player-controls"
      className={`relative flex-shrink-0 border-zinc-800/50 -mx-3 sm:-mx-5 px-3 sm:px-5 ${playerPosition === 'top' ? 'mb-3 border-b pb-3' : 'mt-3 border-t pt-3'
        }`}
    >
      <PlayerControls variant="editor" youtubeAudioUrl={autoStamp.youtubeAudioUrl} />
      {(() => {
        const symbols = KEY_SYMBOLS as Record<string, string>;
        const rangeKey = settings.shortcuts?.rangeSelect?.[0] || 'Shift';
        const toggleKey = settings.shortcuts?.toggleSelect?.[0] || 'Ctrl';
        const deselectKey = settings.shortcuts?.deselect?.[0] || 'Escape';
        const selectionHintText = t('editor.selection.hint', {
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


  const syncProgress = useMemo(() => {
    const lyricLines = lines.filter(l => l.type !== 'section');
    if (!lyricLines.length) return null;
    const synced = lyricLines.filter(l => l.timestamp != null).length;
    const wordCount = lyricLines.reduce((acc, l) => acc + (l.text ? l.text.trim().split(/\s+/).filter(Boolean).length : 0), 0);
    const charCount = lyricLines.reduce((acc, l) => acc + (l.text ? l.text.length : 0), 0);
    const charCountNoSpaces = lyricLines.reduce((acc, l) => acc + (l.text ? l.text.replace(/\s+/g, '').length : 0), 0);
    const activeLine = lines[activeLineIndex];
    const activeWords = stampTarget === 'secondary' ? activeLine?.secondaryWords : activeLine?.words;
    const totalWordsInLine = activeWords?.length || 0;
    const currentWordNum = activeWordIndex !== -1 ? Math.min(activeWordIndex + 1, totalWordsInLine) : 0;
    return { synced, total: lyricLines.length, wordCount, charCount, charCountNoSpaces, totalWordsInLine, currentWordNum };
  }, [lines, activeLineIndex, activeWordIndex, stampTarget]);

  return (
    <div
      onMouseLeave={handleLineHoverEnd}
      className={`p-4 sm:p-6 flex ${compact ? 'flex-row gap-2' : 'flex-col'} flex-1 animate-fade-in min-h-0 relative`}
    >
      <div className="flex items-center justify-between gap-3 w-full mb-4 z-raised">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <h2 className="text-sm font-semibold tracking-widest text-zinc-400 flex items-center gap-2 mr-2">
            <span className="uppercase shrink-0 text-sm flex items-center gap-1.5">
              <Icon name="description" size={16} />
              {t('editor.title')}
            </span>
          </h2>
          {syncMode && lines.length > 0 && (
            <div data-tour="editor-undo-redo" className="flex items-center gap-1 shrink-0">
              <Tip content={t('editor.backToEdit')}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setRawText(linesToRawText(lines, rawLineText, combinedSingers));
                    setSyncMode(false);
                  }}
                  className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 flex-shrink-0 size-8 rounded-full"
                >
                  <Icon name="edit" size={16} />
                </Button>
              </Tip>
              {handleManualSave && (
                <Tip content={isSaving ? (t('project.saving')) : isAutosaving ? (t('project.saved')) : (t('project.save'))}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      if (!user) {
                        const payload = buildProjectPayload ? buildProjectPayload() : {};
                        const idbPayload = {
                          title: payload.title,
                          lyrics: { editorMode: payload.editorMode, sections: payload.sections || flatToSections(payload.lines || []) },
                          state: {
                            syncMode: payload.syncMode,
                            activeLineIndex: payload.activeLineIndex,
                            playbackPosition: payload.playbackPosition,
                            playbackSpeed: payload.playbackSpeed,
                            saveTime: payload.saveTime,
                            timezone: payload.timezone,
                            utcOffset: payload.utcOffset,
                          },
                          metadata: payload.metadata,
                          ...(payload.ytUrl ? { ytUrl: payload.ytUrl } : {}),
                          ...(payload.uploadedAudio ? {
                            uploadUrl: payload.uploadedAudio.uploadUrl,
                            uploadPublicId: payload.uploadedAudio.publicId || null,
                            fileName: payload.uploadedAudio.fileName || '',
                            duration: payload.uploadedAudio.duration || null,
                          } : {}),
                        };
                        try {
                          await savePendingProject(idbPayload);
                          navigate(`/auth?action=signin&redirect=${encodeURIComponent('/project/local?fromGuest=1')}`);
                        } catch {
                          import('react-hot-toast').then(({ default: toast }) => {
                            toast.error(t('editor.draftSaveFailed'));
                          });
                        }
                      } else {
                        handleManualSave();
                      }
                    }}
                    disabled={isSaving}
                    className={`size-8 rounded-full transition-colors ${isSaving ? 'text-zinc-400' : isAutosaving ? 'text-primary' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'}`}
                  >
                    {isSaving ? <Icon name="autorenew" size={16} className="animate-spin" /> : isAutosaving ? <Icon name="check" size={16} /> : <Icon name="save" size={16} />}
                  </Button>
                </Tip>
              )}
              <div className="w-px h-4 bg-zinc-700/50 mx-1 shrink-0" />
              <Tip content={t('editor.undoTitle')}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={undo}
                  disabled={!canUndo}
                  className="size-8 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 disabled:opacity-30 transition-colors"
                >
                  <Icon name="undo" size={16} />
                </Button>
              </Tip>
              <Tip content={t('editor.redoTitle')}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={redo}
                  disabled={!canRedo}
                  className="size-8 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 disabled:opacity-30 transition-colors"
                >
                  <Icon name="redo" size={16} />
                </Button>
              </Tip>
            </div>
          )}
        </div>

        <div className="hidden xl:block">
          <SelectionActionBar
            selectedLines={selectedLines}
            lines={lines}
            settings={settings}
            handleBulkClearTimestamps={handleBulkClearTimestamps as ComponentProps<typeof SelectionActionBar>['handleBulkClearTimestamps']}
            handleBulkShift={handleBulkShift as ComponentProps<typeof SelectionActionBar>['handleBulkShift']}
            handleBulkDelete={handleBulkDelete as ComponentProps<typeof SelectionActionBar>['handleBulkDelete']}
            handleBulkSingTogether={handleBulkSingTogether}
            handleBulkSplitSingers={handleBulkSplitSingers}
            clearSelection={clearSelection as ComponentProps<typeof SelectionActionBar>['clearSelection']}
            handleApplyOffset={handleApplyOffset as ComponentProps<typeof SelectionActionBar>['handleApplyOffset']}
            handleMoveToSection={handleMoveToSection as ComponentProps<typeof SelectionActionBar>['handleMoveToSection']}
            songArtists={combinedSingers}
          />
        </div>

        <div className="flex items-center gap-2">
          {!selectedLines.size && syncProgress && (
            <Tip content={t('editor.wordCharCount', { words: syncProgress.wordCount, chars: syncProgress.charCount, charsNoSp: syncProgress.charCountNoSpaces })}>
              <div className={`text-[10px] font-mono tabular-nums px-3 py-1 rounded-full border bg-zinc-900/50 flex items-center gap-1.5 cursor-default ${syncProgress.synced === syncProgress.total ? 'text-primary border-primary/20' : 'text-zinc-500 border-zinc-800/60'
                }`}>
                <div className={`size-1.5 rounded-full flex-shrink-0 ${syncProgress.synced === syncProgress.total ? 'bg-primary shadow-glow' : 'bg-zinc-700'
                  }`} />
                {editorMode === 'words' && syncProgress.totalWordsInLine > 0 ? (
                  <span>{syncProgress.currentWordNum}/{syncProgress.totalWordsInLine}</span>
                ) : (
                  <span>{syncProgress.synced}/{syncProgress.total}</span>
                )}
                <span className="text-zinc-600 hidden sm:inline">·</span>
                <span className="text-zinc-600 hidden sm:inline">{t('editor.wordCount', { count: syncProgress.wordCount })}</span>
              </div>
            </Tip>
          )}

          <div className="flex items-center gap-1 shrink-0 ml-2">
            {onHideEditor && onShowPreview && (
              <Tip content={previewHidden ? (t('editor.showPreview')) : (t('editor.hideEditor'))}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={previewHidden ? onShowPreview : onHideEditor}
                  className="size-9 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
                >
                  <Icon name={previewHidden ? 'visibility' : 'visibility_off'} size={18} />
                </Button>
              </Tip>
            )}

            {activepublicId && activepublicId !== 'local' && activepublicId !== 'new' && (
              <Tip content={t('editor.viewAsPublic')}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onTogglePublicView}
                  className="size-9 rounded-full text-zinc-400 hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Icon name="public" size={18} />
                </Button>
              </Tip>
            )}

            <Tip content={t('lyricsSearch.findLyrics')}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLyricsSearchOpen(true)}
                className="size-9 rounded-full text-zinc-400 hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Icon name="search" size={18} />
              </Button>
            </Tip>

            <ActionsDropdown icon="more_horiz">
              <div className="p-1 space-y-0.5">

                <PopoverItem onClick={() => setSelectedLines(new Set(lines.map((_, i) => i)))}>
                  <Icon name="checklist" size={16} />
                  {t('editor.selection.selectAll')}
                </PopoverItem>

                <PopoverItem onClick={handleClearTimestamps}>
                  <Icon name="ink_eraser" size={16} />
                  {t('editor.selection.clearTimestamps')}
                </PopoverItem>

                {editorMode === 'words' && (
                  <PopoverItem onClick={handleClearAllWordTimestamps}>
                    <Icon name="ink_eraser" size={16} />
                    {t('editor.clearWordTimestamps')}
                  </PopoverItem>
                )}

                {hasCJK(rawText) && (
                  <PopoverItem onClick={() => {
                    const current = settings.editor?.display?.readingFormat || 'hiragana';
                    updateSetting('editor.display.readingFormat', current === 'hiragana' ? 'katakana' : 'hiragana');
                  }}>
                    <Icon name="translate" size={16} />
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${settings.editor?.display?.readingFormat !== 'katakana' ? 'text-primary' : 'text-zinc-400'
                        }`}>
                        {t('editor.readingFormat.hiragana')}
                      </span>
                      <span className="text-zinc-600 text-[10px]">↔</span>
                      <span className={`text-xs font-bold ${settings.editor?.display?.readingFormat === 'katakana' ? 'text-primary' : 'text-zinc-400'
                        }`}>
                        {t('editor.readingFormat.katakana')}
                      </span>
                    </div>
                  </PopoverItem>
                )}

                <PopoverSeparator className="bg-zinc-800/50" />

                {onShowKeyboardHelp && (
                  <PopoverItem onClick={onShowKeyboardHelp} className="text-xs">
                    <Icon name="help" size={16} />
                    {t('shortcuts.title')}
                  </PopoverItem>
                )}

                <PopoverItem onClick={onNewProject} className="text-xs">
                  <Icon name="add" size={16} />
                  {t('home.newProject')}
                </PopoverItem>

                <PopoverItem
                  onClick={() => requestConfirm(t('confirm.removeAll'), handleRemoveAllLyrics, { title: t('confirm.removeAllTitle'), variant: 'danger' })}
                  className="text-xs text-red-400"
                >
                  <Icon name="delete" size={16} />
                  {t('editor.removeAll')}
                </PopoverItem>
              </div>
            </ActionsDropdown>
          </div>
        </div>
      </div>

      <EditorToolbar
        editorMode={editorMode}
        setEditorMode={setEditorMode}
        updateSetting={updateSetting}
        lines={lines}
        autoStampHasAudio={autoStampHasAudio}
        autoStampRunning={autoStampRunning}
        onAutoStamp={handleAutoStampStart}
        playerPosition={playerPosition}
      />

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
        <div data-tour="editor-lines" className="relative flex flex-col flex-1 min-h-0">
          <TaggingToolbar
            lines={lines}
            setLines={setLines}
            selectedLines={selectedLines}
            recordIndexMap={recordIndexMap}
            songArtists={combinedSingers}
            clearSelection={clearSelection as () => void}
          />
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
            singerColors={singerColors}
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
            handleToggleAdLib={handleToggleAdLib}
            listRef={listRef}
            handleMark={handleMarkWithConfidence}
            handleToggleLine={handleToggleLine}
            updateSetting={updateSetting}
            activeWordIndex={activeWordIndex}
            handleClearWordTimestamp={handleClearWordTimestamp}
            handleSetActiveWordIndex={handleSetActiveWordIndex}
            handleSetTimestamp={handleSetTimestampWithConfidence}
            handleSetWordReading={handleSetWordReading}
            handleCycleWordSinger={handleCycleWordSinger}
            stampTarget={stampTarget}
            handleStampTargetToggle={handleStampTargetToggle}
            playbackPosition={playbackPosition}
            onWordMenu={openWord}
            onLineMenu={openLine}
            modifiedLines={modifiedLines}
            onToggleLineMode={handleToggleLineMode}
            confidenceByIndex={autoStamp.confidenceByIndex}
            collapsedSections={collapsedSections}
            collapsedView={collapsedView}
            onToggleSectionCollapse={toggleSectionCollapse}
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
        handleBulkSingTogether={handleBulkSingTogether}
        handleBulkSplitSingers={handleBulkSplitSingers}
        clearSelection={clearSelection}
        lines={lines}
        handleMoveToSection={handleMoveToSection}
        songArtists={combinedSingers}
      />

      <ResponsiveModal
        open={lyricsSearchOpen}
        onOpenChange={setLyricsSearchOpen}
        title={t('lyricsSearch.findLyrics')}
        description={t('lyricsSearch.replaceDesc')}
      >
        <LyricsSearchBar onImport={handleLyricsSearchImport} />
      </ResponsiveModal>

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
