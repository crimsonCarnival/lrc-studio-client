import { useMemo, useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ComponentProps } from 'react';
import { useEditor } from '@features/editor/hooks/useEditor';
import { useEditorActionDrawer } from '@features/editor/hooks/useEditorActionDrawer';
import { useAutoStamp, type AutoStampPhase, type TabPlayback } from '@features/editor/hooks/useAutoStamp';
import EditorToolbar from './EditorToolbar';
import { WordsModeLayerControl } from '../modes/WordsModeColumn';
import EditorSidePanel from './EditorSidePanel';
import { CounterpartStrip } from '../counterparts/CounterpartStrip';
import { matchKey } from '@/shared/utils/keyboard';
import { CountDot } from '@ui/count-dot';
import { isPendingCounterpart } from '@features/editor/services/counterparts';
import { WordsLineNav, WordTimeline } from '../modes/WordsFocus';
import { WordsFocusLine } from '../modes/WordsFocusLine';
import { usePlayer } from '@/features/player/PlayerContext';
import { useBreakpoint } from '@/shared/hooks/useBreakpoint';
import { formatTimestamp } from '@/shared/utils/lrc';
import { formatSectionLabel } from '@features/editor/constants/section-types';
import { useHeaderSlot } from '@/shared/hooks/useHeaderSlot';
import EditorPasteArea from '../setup/EditorPasteArea';
import VirtualizedLineList from './VirtualizedLineList';
import PhoneEditor from '../phone/PhoneEditor';
import type { PhoneTab } from '../phone/PhoneEditor';
import PhoneToolsSheet from '../phone/PhoneToolsSheet';
import PhoneLineSheet from '../phone/PhoneLineSheet';
import PhoneSelectBar from '../phone/PhoneSelectBar';
import PhoneEditTab from '../phone/PhoneEditTab';
import PhoneFocusView from '../phone/PhoneFocusView';
import { focusLines } from '../phone/focus-lines';
import { usePhoneFocus } from '../phone/usePhoneFocus';
import type { EditView } from '../phone/PhoneEditTab';
import EditorActionDrawer from './EditorActionDrawer';
import SelectionActionBar from './SelectionActionBar';
import TaggingToolbar from './TaggingToolbar';
import AutoStampModal from './AutoStampModal';
import { VisibilityChip } from '@/features/projects/components/VisibilityChip';
import { PublishDialog } from '@/features/projects/components/PublishDialog';
import { PublishPrompt } from '@/features/projects/components/PublishPrompt';
import { usePublishPrompt } from '@/features/projects/hooks/usePublishPrompt';
import { getPublishReadiness } from '@/features/projects/publish-readiness';
import { tabAudioSupported } from '@/features/visualizer/audio-source';
import FuriganaModal from '../line/FuriganaModal';
import SecondaryLyricsModal from '../line/SecondaryLyricsModal';
import LyricsSearchBar from '../lyrics-search/LyricsSearchBar';
import { stripLrcTimestamps } from '@/features/editor/utils/lrc-text';
import PlayerControls from '@/features/player/components/PlayerControls';
import { ChangeMediaDialog } from '@/features/player/components/ChangeMediaDialog';
import DragPointerIsolate from '@/features/player/components/DragPointerIsolate';
import { Tip } from '@ui/tip';
import { Kbd } from '@ui/kbd';
import { Button } from '@ui/button';
import { SegmentedControl } from '@ui/segmented-control';
import ResponsiveModal from '@/shared/ui/ResponsiveModal';
import { useTranslation } from 'react-i18next';
import { KEY_SYMBOLS, keyCap } from '@features/settings/key-symbols';
import { buildSingerRoster } from '@features/editor/utils/singer-colors';
import type { EditorLine } from '@/features/editor/editor.types';
import type { CollabLockInput } from '@/features/collab/collab.types';
import { usePresenceView } from '@/features/collab/collab-presence-context';
import { ParticipantsBar } from '@/features/collab/components/ParticipantsBar';
import { SessionControl, SessionStartShield, type SessionOwnerControl } from '@/features/collab/components/SessionControl';
import { SessionSettingsModal } from '@/features/collab/components/SessionSettingsModal';
import { useSessionStart } from '@/features/collab/useSessionStart';
import type { AuthUser } from '@/features/auth/auth.types';
import type { PlayerSlot } from '@/features/player/hooks/usePlayerSlot';
import type { UploadedAudio } from '@/types/app-state';
import { Icon } from '@/shared/ui/Icon';
import { MorphIcon } from '@/shared/ui/MorphIcon';
import { getSingerOptionsForSelection, applyTagToSelection, linesToRawText, flatToSections, rawLineText } from '@/features/editor/utils/sections';
import { hasCJK, hasKanji } from '@/shared/utils/furigana';
import { Popover, PopoverContent, PopoverItem, PopoverSeparator, PopoverTrigger } from '@ui/popover';
// import LyricsSearchBar from '../lyrics-search/LyricsSearchBar';
import { savePendingProject } from '@/features/editor/services/guest-project-db';
import { useNavigate } from 'react-router-dom';
import { LogoLoader } from '@ui/LogoLoader';

const EMPTY_ARTISTS: string[] = [];
const WORDS_LOOP_KEY = 'lrc_words_loop_line';
const PHONE_LINE_HINT_KEY = 'lrc_phone_line_hint';

// Teal is `success`; in the light theme that token is too pale to read as text,
// so it is mixed toward the foreground there.
const TEAL_TEXT = 'text-[color-mix(in_srgb,var(--color-success)_50%,var(--foreground))] dark:text-success';
const HEADER_ICON_BTN = 'size-10 lg:size-10 coarse:size-11 rounded-[calc(var(--radius)*1)] border-zinc-800 bg-transparent text-foreground/65 hover:text-foreground disabled:opacity-30';
const EDITOR_SPEEDS = [0.25, 0.5, 1].map((speed) => ({ value: speed, label: `${speed}×` }));

const ActionsDropdown = ({ children, icon = 'more_horiz', label }: { children: React.ReactNode; icon?: string; label?: string }) => {
  const { t } = useTranslation();
  return (
    <Popover>
      <Tip content={label || t('editor.lineOptions')}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" aria-label={label || t('editor.lineOptions')} className="size-10 lg:size-10 coarse:size-11 rounded-[calc(var(--radius)*1)] border-zinc-800 bg-transparent text-foreground/65 hover:text-foreground">
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
const AUTO_STAMP_RUNNING_PHASES: ReadonlySet<AutoStampPhase> = new Set(['starting', 'fetching_audio', 'extracting_audio', 'transcribing', 'aligning', 'applying', 'recording']);

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
  /** Resolves whether the project was persisted (see useManualSave). */
  handleManualSave?: (() => Promise<boolean>) | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildProjectPayload?: () => Record<string, any>;
  handleRemoveAllLyrics: () => void;
  isAutosaving?: boolean;
  pendingSyncs?: number;
  isSaving?: boolean;
  /** The last manual save was rejected by the server. */
  saveFailed?: boolean;
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
  duration?: number;
  /** Switches the workspace to the preview ("Revisar"). */
  onShowPreview?: () => void;
  // Auto Stamp (#9): the persisted Cloudinary upload (if any) and a media-availability
  // flag used as the render-time button-enable signal. The raw local File itself is
  // read imperatively off playerRef.getAudioBlob() at job start (see getLocalFile below).
  uploadedAudio?: UploadedAudio | null;
  hasMedia?: boolean;
  activepublicId?: string | null;
  onTogglePublicView?: () => void;
  isPlaying?: boolean;
  /** Inside a collaborative session: provider, own identity and the lock table. */
  collab?: CollabLockInput;
  /** Set only for the owner of a saved project: shows Start / Manage session. */
  sessionOwner?: SessionOwnerControl;
  /** The live session's public id; the phone header lists its participants, as the desktop app header does. */
  sessionPublicId?: string | null;
  /** Project title and cover, for the publish confirmation and its readiness check. */
  mediaTitle?: string;
  coverImage?: string;
  isPublic?: boolean;
  /** Reports a visibility change the server accepted. */
  onVisibilityChange?: (isPublic: boolean) => void;
  /** False on someone else's project: no visibility chip. */
  canChangeVisibility?: boolean;
  /** Below `lg` (EditorPage decides): render the phone layout instead of the desktop one. */
  phone?: boolean;
  /** Leaves the editor for home, through the unsaved-changes guard. */
  onExit?: () => void;
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
  isSaving,
  saveFailed,
  compact,
  onNewProject,
  onShowKeyboardHelp,
  onOpenProjectSettings,
  registerAfterSave,
  songArtists = EMPTY_ARTISTS,
  singerColors,
  declaredSingers = EMPTY_ARTISTS,
  playerSlot,
  duration,
  onShowPreview,
  uploadedAudio,
  hasMedia,
  activepublicId,
  onTogglePublicView,
  isPlaying,
  collab,
  sessionOwner,
  sessionPublicId,
  mediaTitle,
  coverImage,
  isPublic = false,
  onVisibilityChange,
  canChangeVisibility = true,
  phone = false,
  onExit,
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
    handleSetSecondaryLines,
    handleToggleLineMode,
    handleDeleteLine,
    handleToggleCounterpart,
    handleCaptureCounterpart,
    handleMoveCounterpart,
    handleNameCounterpart,
    handleRemoveCounterpart,
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
    handleMergeWordWithNext,
    handleSplitWord,
    handleRegroupLine,
    stampTarget,
    handleStampTargetToggle,
    handleSetStampTarget,
    modifiedLines,
    clearModifiedLines,
    othersLocks,
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
    isPlaying,
    collab,
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

  // Drives the YouTube player for the tab-recording fallback. Everything is read through
  // refs so tabPlayback keeps one identity while the player state changes every tick.
  const player = usePlayer();
  const playbackRef = useRef({ currentTime: player.currentTime, duration: player.duration, isPlaying: player.isPlaying });
  const playerCtlRef = useRef(player);
  useLayoutEffect(() => {
    playbackRef.current = { currentTime: player.currentTime, duration: player.duration, isPlaying: player.isPlaying };
    playerCtlRef.current = player;
  });
  const tabPlayback = useMemo<TabPlayback>(() => {
    // togglePlay is a toggle and the ref only catches up on the next render, so record the
    // intended state right away for the calls that follow in the same tick.
    const setPlaying = (playing: boolean) => {
      if (playbackRef.current.isPlaying === playing) return;
      playerCtlRef.current.togglePlay();
      playbackRef.current = { ...playbackRef.current, isPlaying: playing };
    };
    return {
      getState: () => playbackRef.current,
      prepare: () => {
        setPlaying(false);
        playerCtlRef.current.applySpeed(1);
        playerCtlRef.current.seek(0);
      },
      setPlaying,
    };
  }, []);

  const autoStamp = useAutoStamp({
    tabPlayback,
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
  const [changeMediaOpen, setChangeMediaOpen] = useState(false);
  // Inside a live session the doc is the project: solo save, the public view and the
  // project's media are not the participant's to change (the server refuses solo saves anyway).
  const inSession = collab !== undefined;

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
  const [furiganaOpen, setFuriganaOpen] = useState(false);
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  // Button-enable signal: `hasMedia` is the freshest render-time approximation for
  // "a local file might exist" (refs can't be read during render). It's true for
  // YouTube-only media too, but that's acceptable — start() re-checks the actual
  // sources and fails safely with asr_no_audio if no bytes are available.
  const autoStampHasAudio = !!uploadId || !!hasMedia;
  const autoStampRunning = AUTO_STAMP_RUNNING_PHASES.has(autoStamp.phase);

  // Manual timestamp edits invalidate a line's Auto Stamp confidence badge —
  // clear it so the highlight doesn't linger on a value the user has since fixed.
  // Confidence is keyed by line id, so resolve the index to an id before clearing.
  const confidenceIdAt = useCallback((index: number): string | undefined => {
    const id = lines[index]?.id;
    return id != null ? String(id) : undefined;
  }, [lines]);

  const handleSetTimestampWithConfidence = useCallback((index: number, type: string, value: number) => {
    handleSetTimestamp(index, type, value);
    const id = confidenceIdAt(index);
    if (id) autoStamp.clearConfidence(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSetTimestamp, confidenceIdAt, autoStamp.clearConfidence]);

  const shiftTimeWithConfidence = useCallback((index: number, delta: number) => {
    shiftTime(index, delta);
    const id = confidenceIdAt(index);
    if (id) autoStamp.clearConfidence(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftTime, confidenceIdAt, autoStamp.clearConfidence]);

  const handleMarkWithConfidence = useCallback((opts?: { forceAdvance?: boolean }) => {
    handleMark(opts);
    const id = confidenceIdAt(activeLineIndex);
    if (id) autoStamp.clearConfidence(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleMark, confidenceIdAt, autoStamp.clearConfidence, activeLineIndex]);

  // #3: the in-editor player docks at the top (below the toolbar) or bottom, persisted
  // as a global editor setting. The same dock block renders in whichever slot is active.
  const playerPosition = settings.editor?.playerPosition === 'top' ? 'top' : 'bottom';
  const playerDock = playerSlot === 'editor' ? (
    <DragPointerIsolate
      data-tour="player-controls"
      className={`relative flex-shrink-0 border-zinc-800 px-4 sm:px-6 ${playerPosition === 'top' ? 'border-b pt-1 pb-3' : 'border-t pt-3.5 pb-3'
        }`}
    >
      <PlayerControls variant="editor" />
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
          <p className="text-xs text-foreground/45 text-center mt-2 animate-fade-in pb-1">
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

  // The phone layout draws its own header, so it leaves the app header's slots empty.
  const statusSlot = useHeaderSlot('status', !phone);
  const [publishOpen, setPublishOpen] = useState(false);
  const serverProjectId = activepublicId && activepublicId !== 'local' && activepublicId !== 'new' ? activepublicId : null;
  const readiness = useMemo(
    () => getPublishReadiness(lines, { title: mediaTitle, artists: songArtists, coverImage }),
    [lines, mediaTitle, songArtists, coverImage],
  );
  const publishPrompt = usePublishPrompt(serverProjectId, readiness.complete && !isPublic && !!user && !user.isGuest && canChangeVisibility && !inSession);
  const actionsSlot = useHeaderSlot('actions', !phone);

  // 'failed' only while there is still something unsaved: a later autosave that gets the
  // changes through clears the markers, and with them the error.
  const saveState = isSaving ? 'saving' : modifiedLines.size > 0 ? (saveFailed ? 'failed' : 'unsaved') : 'saved';

  const handleSaveClick = async () => {
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
      handleManualSave?.();
    }
  };

  // ── Mode tabs: Lines / Words / Review ──
  const isWordsMode = editorMode === 'words';
  // Words mode needs at least one line timestamp to anchor against.
  const wordsLocked = useMemo(() => !lines.some((l) => l.timestamp != null), [lines]);
  const selectMode = (mode: string) => {
    setEditorMode(mode);
    const exportFormat = mode === 'words' ? 'lrc' : mode;
    updateSetting('export.copyFormat', exportFormat);
    updateSetting('export.downloadFormat', exportFormat);
  };
  // "Lines" covers both line modes; coming back from Words returns to whichever was in use.
  const lineModeRef = useRef(editorMode === 'srt' ? 'srt' : 'lrc');
  useLayoutEffect(() => {
    if (editorMode !== 'words') lineModeRef.current = editorMode;
  }, [editorMode]);

  // "review" is never the current value: it leaves the editor instead of switching mode.
  const modeTabs = (
    <SegmentedControl<'lines' | 'words' | 'review'>
      semantics="tabs"
      label={t('editor.modeGroup')}
      value={isWordsMode ? 'words' : 'lines'}
      onChange={(tab) => {
        if (tab === 'review') onShowPreview?.();
        else if (tab === 'words') selectMode('words');
        else selectMode(lineModeRef.current);
      }}
      options={[
        { value: 'lines', label: t('editor.tabLines') },
        {
          value: 'words',
          label: t('editor.modeWords'),
          disabled: wordsLocked,
          tip: wordsLocked ? t('editor.modeWordsLocked') : t('editor.modeTooltipWords'),
        },
        ...(onShowPreview ? [{ value: 'review' as const, label: t('editor.tabReview') }] : []),
      ]}
    />
  );

  // ── "Unmarked" filter ──
  // View-only, like section collapsing: `lines` and every index-based action are
  // untouched; only which rows the list renders changes. The cursor line always
  // stays visible so marking it does not make the list jump.
  const [lineFilter, setLineFilter] = useState<'all' | 'unmarked'>('all');
  const unmarkedCount = syncProgress ? syncProgress.total - syncProgress.synced : 0;
  // Words mode on a wide screen works on one line at a time: the list shows just
  // the cursor line and the sidebar is how you move between lines. Below lg the
  // sidebar is not shown, so the full list stays.
  const isLg = useBreakpoint('lg');
  const wordsFocus = isWordsMode && isLg;
  usePresenceView(phone ? 'mobile' : wordsFocus ? 'words-focus' : 'editor');

  // Counterpart capture (redesign sheet 20). The strip opens itself the first time one is
  // captured, so the shortcut works without finding the button first.
  const [counterpartOpen, setCounterpartOpen] = useState(false);
  const [counterpartSelected, setCounterpartSelected] = useState<string | null>(null);
  const [counterpartNaming, setCounterpartNaming] = useState<string | null>(null);
  const captureKeyRaw = settings.shortcuts?.captureAdLib?.[0] || 'a';
  const pendingCounterparts = useMemo(() => lines.filter((l) => isPendingCounterpart(l)).length, [lines]);
  const captureCounterpartHere = useCallback(() => {
    const id = handleCaptureCounterpart();
    if (!id) return;
    setCounterpartOpen(true);
    setCounterpartSelected(id);
    setCounterpartNaming(id);
  }, [handleCaptureCounterpart]);
  useEffect(() => {
    // The strip is not rendered on the phone, so capturing there would leave hidden state behind.
    if (wordsFocus || phone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
      if (!matchKey(e, captureKeyRaw)) return;
      e.preventDefault();
      captureCounterpartHere();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [wordsFocus, phone, captureKeyRaw, captureCounterpartHere]);
  const listView = useMemo(() => {
    if (lineFilter === 'all') return collapsedView;
    const rows = collapsedView.rows.filter((i) => lines[i].type === 'section' || lines[i].timestamp == null || i === activeLineIndex);
    const rowOfLine = new Int32Array(lines.length).fill(-1);
    rows.forEach((lineIndex, row) => { rowOfLine[lineIndex] = row; });
    return { ...collapsedView, rows, rowOfLine };
  }, [lineFilter, collapsedView, lines, activeLineIndex]);

  // ── Inspector ──
  const handleInspectorSection = useCallback((lineIndex: number, sectionIndex: number) => {
    handleMoveToSection([lineIndex], sectionIndex);
    // The line lands right after the section marker; keep the cursor on it.
    setActiveLineIndex(sectionIndex < lineIndex ? sectionIndex + 1 : sectionIndex);
  }, [handleMoveToSection, setActiveLineIndex]);
  const handleInspectorSinger = useCallback((name: string, lineIndex: number) => {
    handleAssignSinger(name, [lineIndex]);
  }, [handleAssignSinger]);

  // ── Words focus ──
  const { seek, togglePlay, isPlaying: playerIsPlaying, applySpeed, playbackSpeed, setLoopActiveLine } = usePlayer();
  // Words focus keeps playback inside the line being worked on. On by default;
  // the choice is a per-browser convenience, so it lives in localStorage.
  const [loopFocusLine, setLoopFocusLine] = useState(() => {
    try { return localStorage.getItem(WORDS_LOOP_KEY) !== '0'; } catch { return true; }
  });
  const toggleLoopFocusLine = () => {
    setLoopFocusLine((on) => {
      try { localStorage.setItem(WORDS_LOOP_KEY, on ? '0' : '1'); } catch { /* still applies for this session */ }
      return !on;
    });
  };
  useEffect(() => {
    setLoopActiveLine(wordsFocus && loopFocusLine);
    return () => setLoopActiveLine(false);
  }, [wordsFocus, loopFocusLine, setLoopActiveLine]);
  const focusLine: EditorLine | undefined = lines[activeLineIndex];
  const focusInfo = useMemo(() => {
    let lyricNumber = 0;
    let sectionLabel = '';
    let end: number | null = null;
    lines.forEach((l, i) => {
      if (l.type === 'section') {
        if (i < activeLineIndex) sectionLabel = l.label ?? '';
      } else if (i <= activeLineIndex) {
        lyricNumber++;
      } else if (end == null && l.timestamp != null) {
        end = l.timestamp;
      }
    });
    const line = lines[activeLineIndex];
    return { lyricNumber, sectionLabel, end: line?.endTime ?? end ?? duration ?? null };
  }, [lines, activeLineIndex, duration]);
  const focusStart = focusLine?.timestamp ?? null;
  const focusLength = focusStart != null && focusInfo.end != null && focusInfo.end > focusStart ? focusInfo.end - focusStart : null;

  // While the focused line plays, the highlight follows the word being sung
  // (chips and timeline alike) instead of sitting on the stamping cursor.
  const playingWordIndex = useMemo(() => {
    if (!wordsFocus || !playerIsPlaying || !focusLine?.words) return null;
    let index = -1;
    focusLine.words.forEach((w, i) => { if (w.time != null && w.time <= playbackPosition) index = i; });
    return index;
  }, [wordsFocus, playerIsPlaying, focusLine, playbackPosition]);

  const handleSetWordTime = useCallback((wordIndex: number, time: number) => {
    setLines((prev) => {
      const line = prev[activeLineIndex];
      if (!line?.words?.[wordIndex]) return prev;
      const next = [...prev];
      next[activeLineIndex] = { ...line, words: line.words.map((w, i) => (i === wordIndex ? { ...w, time } : w)) };
      return next;
    });
  }, [setLines, activeLineIndex]);

  // Spreads the line's words evenly between its start and where it ends.
  const distributeWords = () => {
    if (focusStart == null || focusLength == null) return;
    setLines((prev) => {
      const line = prev[activeLineIndex];
      if (!line?.words?.length) return prev;
      const step = focusLength / line.words.length;
      const next = [...prev];
      next[activeLineIndex] = { ...line, words: line.words.map((w, i) => ({ ...w, time: Number((focusStart + i * step).toFixed(3)) })) };
      return next;
    });
  };
  const handleDistributeWords = () => {
    // Replacing times someone stamped by hand is confirmed first.
    if (focusLine?.words?.some((w) => w.time != null)) {
      requestConfirm(t('editor.words.distributeConfirm'), distributeWords, { title: t('editor.words.distribute') });
    } else {
      distributeWords();
    }
  };
  // Words focus has no transport footer, so this one button both starts the line
  // and pauses playback.
  const handlePlayLine = () => {
    if (playerIsPlaying) {
      togglePlay();
      return;
    }
    if (focusStart == null) return;
    seek(focusStart);
    togglePlay();
  };

  // ── Phone layout state ──
  // Held here, not in PhoneEditor, because the sheets drive handlers that live in this component
  // and Tools can switch tabs. None of it touches marking or the cursor.
  const [phoneTab, setPhoneTab] = useState<PhoneTab>(() => (phone && !syncMode ? 'edit' : 'sync'));
  const [editView, setEditView] = useState<EditView>('text');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [phoneFocus, setPhoneFocus] = usePhoneFocus();
  const [selecting, setSelecting] = useState(false);
  // Line ids, not indices: a collaborator's insert or delete while the sheet is open must not
  // retarget it, and if a line vanishes the sheet closes.
  const [lineSheet, setLineSheet] = useState<{ open: boolean; ids: string[]; view?: 'tag' }>({ open: false, ids: [] });
  const linesRef = useRef(lines);
  useLayoutEffect(() => { linesRef.current = lines; });
  const lineSheetIndices = useMemo(() => {
    const out: number[] = [];
    for (const id of lineSheet.ids) {
      const at = lines.findIndex((l) => l.id === id);
      if (at >= 0) out.push(at);
    }
    return out.sort((a, b) => a - b);
  }, [lineSheet.ids, lines]);
  const lineSheetValid = lineSheet.ids.length > 0 && lineSheetIndices.length === lineSheet.ids.length;
  // Adjusted during render (not in an effect) so a vanished line never leaves the sheet armed to reappear.
  if (lineSheet.open && !lineSheetValid) setLineSheet({ open: false, ids: [] });
  const openLineSheetFor = useCallback((indices: number[], view?: 'tag') => {
    const ids = indices.map((i) => linesRef.current[i]?.id).filter((id): id is string => !!id);
    if (ids.length > 0 && ids.length === indices.length) setLineSheet({ open: true, ids, view });
  }, []);
  const { starting: sessionStarting, start: startSessionFlow } = useSessionStart(sessionOwner?.publicId, handleManualSave ?? undefined);
  const [sessionManageOpen, setSessionManageOpen] = useState(false);
  // Where the cursor was before the Edit tab moved it; Mark must keep stamping that line.
  const cursorBeforeEditRef = useRef<number | null>(null);
  const restoreCursor = () => {
    const at = cursorBeforeEditRef.current;
    cursorBeforeEditRef.current = null;
    if (at != null) setActiveLineIndex(Math.min(at, Math.max(linesRef.current.length - 1, 0)));
  };
  const [lineHintSeen, setLineHintSeen] = useState(() => {
    try { return localStorage.getItem(PHONE_LINE_HINT_KEY) === '1'; } catch { return false; }
  });
  const dismissLineHint = useCallback(() => {
    setLineHintSeen(true);
    try { localStorage.setItem(PHONE_LINE_HINT_KEY, '1'); } catch { /* the hint just shows again next visit */ }
  }, []);
  const nudgeFine = settings.editor?.nudge?.fine || 0.01;
  const nudgeDefault = settings.editor?.nudge?.default || 0.1;
  const hasKanjiAnywhere = useMemo(
    () => lines.some((l) => l.type !== 'section' && (hasKanji(l.text) || l.words?.some((w) => hasKanji(w.word)))),
    [lines],
  );
  const hasCjkAnywhere = useMemo(() => lines.some((l) => l.type !== 'section' && hasCJK(l.text ?? '')), [lines]);
  const hasLyricLines = useMemo(() => lines.some((l) => l.type !== 'section'), [lines]);

  // Raw-text editing is the syncMode=false state of useEditor: rawText holds the draft and the
  // 'editor:start-syncing' event applies it (keeping timestamps for unchanged lines). The draft
  // is applied only if it changed, so merely visiting the tab rewrites nothing.
  const rawBaselineRef = useRef<string | null>(null);
  const beginRawEdit = () => {
    const text = linesToRawText(lines, rawLineText, combinedSingers);
    rawBaselineRef.current = text;
    setRawText(text);
    setSyncMode(false);
  };
  const endRawEdit = () => {
    if (syncMode) return;
    const changed = rawBaselineRef.current == null || rawText !== rawBaselineRef.current;
    rawBaselineRef.current = null;
    if (changed) window.dispatchEvent(new CustomEvent('editor:start-syncing'));
    else setSyncMode(true);
  };
  const openPhoneEdit = (view: EditView) => {
    if (view === 'line' && cursorBeforeEditRef.current == null) cursorBeforeEditRef.current = activeLineIndex;
    if (view === 'text') restoreCursor();
    const inRaw = phoneTab === 'edit' && editView === 'text';
    if (view === 'text' && !inRaw) beginRawEdit();
    if (view === 'line' && inRaw) endRawEdit();
    setEditView(view);
    setPhoneTab('edit');
  };
  const changePhoneTab = (next: PhoneTab) => {
    if (next === phoneTab) return;
    if (next === 'edit') openPhoneEdit(editView);
    else {
      if (phoneTab === 'edit' && editView === 'text') endRawEdit();
      restoreCursor();
      setPhoneTab(next);
    }
  };
  const showPhonePreview = onShowPreview ? () => {
    restoreCursor();
    if (phoneTab === 'edit' && editView === 'text') endRawEdit();
    onShowPreview();
  } : undefined;
  const exitSelecting = () => {
    clearSelection();
    setSelecting(false);
  };
  const openPhoneLineSheet = useCallback((index: unknown) => {
    if (typeof index === 'number') openLineSheetFor([index]);
  }, [openLineSheetFor]);
  // Nothing to sync once the lyrics are gone (e.g. removed all): the Sync tab has nothing to show.
  if (phone && phoneTab === 'sync' && !syncMode && !hasLyricLines) {
    setEditView('text');
    setPhoneTab('edit');
  }
  // Delete and Clear (both confirmed, then change the lines and empty the selection) end Select mode.
  const [prevSelection, setPrevSelection] = useState({ size: selectedLines.size, lines });
  if (prevSelection.size !== selectedLines.size || prevSelection.lines !== lines) {
    setPrevSelection({ size: selectedLines.size, lines });
    if (selecting && prevSelection.size > 0 && selectedLines.size === 0 && prevSelection.lines !== lines) setSelecting(false);
  }
  // In select mode a tap toggles the line; otherwise it is the ordinary click.
  const phoneLineClick = useCallback((i: number, e: unknown) => {
    if (selecting) handleToggleLine(i);
    else (handleLineClick as (i: number, e: unknown) => void)(i, e);
  }, [selecting, handleToggleLine, handleLineClick]);

  // One list, wired identically for both layouts: the phone layout reuses it as is.
  const lineList = (
    <VirtualizedLineList
      lines={lines}
      displayedActiveIndex={displayedActiveIndex}
      activeLineIndex={activeLineIndex}
      isActiveLineLocked={isActiveLineLocked}
      editorMode={editorMode}
      awaitingEndMark={awaitingEndMark}
      focusedTimestamp={focusedTimestamp}
      setFocusedTimestamp={setFocusedTimestamp}
      handleLineClick={phone && selecting ? phoneLineClick : handleLineClick}
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
      setActiveLineIndex={setActiveLineIndex}
      shiftTime={shiftTimeWithConfidence}
      handleAddLine={handleAddLine}
      handleClearLine={handleClearLine}
      handleDeleteLine={handleDeleteLine}
      handleToggleCounterpart={handleToggleCounterpart}
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
      handleSetStampTarget={handleSetStampTarget}
      playbackPosition={playbackPosition}
      onWordMenu={openWord}
      onLineMenu={phone ? openPhoneLineSheet : openLine}
      modifiedLines={modifiedLines}
      lockedByOthers={othersLocks}
      onToggleLineMode={handleToggleLineMode}
      confidenceById={autoStamp.confidenceById}
      collapsedSections={collapsedSections}
      collapsedView={listView}
      onToggleSectionCollapse={toggleSectionCollapse}
      compactRows={phone}
      selectMode={phone && selecting}
    />
  );

  const publishPromptNode = publishPrompt.show && !publishOpen ? (
    <PublishPrompt onPublish={() => { publishPrompt.dismiss(); setPublishOpen(true); }} onDismiss={publishPrompt.dismiss} />
  ) : null;

  // Dialogs and sheets both layouts open. They portal out, so where they sit in the tree
  // does not matter, only that they stay mounted whichever layout is showing.
  const overlays = (
    <>
      <ChangeMediaDialog open={changeMediaOpen} onOpenChange={setChangeMediaOpen} />

      {canChangeVisibility && !inSession && (
        <PublishDialog
          open={publishOpen}
          onOpenChange={setPublishOpen}
          project={{ publicId: serverProjectId, isPublic, title: mediaTitle, artists: songArtists, coverImage, lines }}
          onPublished={onVisibilityChange}
          onSave={handleManualSave ?? undefined}
        />
      )}

      <ResponsiveModal
        open={!syncMode && !phone}
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
        handleMergeWordWithNext={handleMergeWordWithNext}
        handleSplitWord={handleSplitWord}
        handleRegroupLine={handleRegroupLine}
        lineWordCount={wordData.lineIndex != null ? (lines[wordData.lineIndex]?.words?.length ?? 0) : 0}
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
        <LyricsSearchBar onImport={handleLyricsSearchImport} publicId={activepublicId} />
      </ResponsiveModal>

      {confirmModal}

      <FuriganaModal
        open={furiganaOpen}
        onOpenChange={setFuriganaOpen}
        lines={lines}
        startLineIndex={activeLineIndex}
        readingFormat={settings.editor?.display?.readingFormat || 'hiragana'}
        onSetReading={handleSetWordReading}
        onSetLineText={(lineIndex, text) => {
          const line = lines[lineIndex];
          handleSaveLineText(lineIndex, text, line?.secondary, line?.translations, line?.singers);
        }}
        onFocusLine={setActiveLineIndex}
        onMergeWithNext={handleMergeWordWithNext}
        onSplitWord={handleSplitWord}
      />

      <SecondaryLyricsModal
        open={secondaryOpen}
        onOpenChange={setSecondaryOpen}
        lines={lines}
        onApply={handleSetSecondaryLines}
      />

      <AutoStampModal
        open={autoStampOpen}
        phase={autoStamp.phase}
        errorCode={autoStamp.errorCode}
        recordProgress={autoStamp.recordProgress}
        canRecordTab={player.source === 'youtube' && tabAudioSupported()}
        onRecordTab={autoStamp.startFromTab}
        pendingResult={autoStamp.pendingResult}
        confidenceById={autoStamp.confidenceById}
        lines={lines}
        confidenceThreshold={settings.autoStamp?.confidenceThreshold ?? 0.8}
        onCancel={handleAutoStampCancel}
        onApply={autoStamp.applyPending}
        onDiscard={autoStamp.discardPending}
        onClose={handleAutoStampClose}
        onJumpToLine={handleAutoStampJump}
      />
    </>
  );

  if (phone) {
    const markLabel = editorMode === 'srt' && awaitingEndMark != null
      ? t('editor.markEndNumber', { number: focusInfo.lyricNumber })
      : t('editor.markLineNumber', { number: focusInfo.lyricNumber });
    const readOnly = collab?.me?.role === 'viewer';
    const canPublish = canChangeVisibility && !inSession;
    const openPublish = () => { publishPrompt.dismiss(); setPublishOpen(true); };
    const autoStampBlocked = !autoStampHasAudio ? 'noAudio' as const
      : autoStampRunning ? 'running' as const
        : player.source === 'youtube' && !tabAudioSupported() ? 'youtube' as const : null;
    const lineSheetSingers = lineSheetIndices.length > 1
      ? getSingerOptionsForSelection(lines, lineSheetIndices, combinedSingers)
      : combinedSingers;
    const hint = !lineHintSeen && hasLyricLines && !selecting && !readOnly && phoneTab === 'sync' ? (
      <div role="note" className="flex shrink-0 items-center gap-2 border-b border-zinc-800 bg-raised pl-3 text-sm text-subtle">
        <span className="min-w-0 flex-1 py-1.5">{t('editor.phone.line.hint')}</span>
        <button type="button" onClick={dismissLineHint} className="h-11 shrink-0 px-3 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-focus">
          {t('editor.phone.line.hintDismiss')}
        </button>
      </div>
    ) : null;
    return (
      <>
        <PhoneEditor
          title={mediaTitle ?? ''}
          saveState={inSession ? null : saveState}
          sessionBar={inSession && sessionPublicId ? <ParticipantsBar me={collab?.me ?? null} publicId={sessionPublicId} provider={collab?.provider} maxVisible={2} /> : null}
          visibility={canPublish ? <VisibilityChip isPublic={isPublic} onOpen={openPublish} /> : null}
          onBack={onExit}
          list={lineList}
          banner={<>{publishPromptNode}{hint}</>}
          onShowPreview={showPhonePreview}
          tab={phoneTab}
          onTabChange={changePhoneTab}
          onOpenTools={() => setToolsOpen(true)}
          edit={(
            <PhoneEditTab
              view={editView}
              onViewChange={openPhoneEdit}
              rawText={rawText}
              setRawText={setRawText}
              fileInputRef={fileInputRef}
              handleFileUpload={handleFileUpload}
              handleUrlImport={handleUrlImport as ComponentProps<typeof PhoneEditTab>['handleUrlImport']}
              singers={combinedSingers}
              onApplyText={() => { endRawEdit(); restoreCursor(); setPhoneTab('sync'); }}
              lines={lines}
              lineIndex={activeLineIndex}
              onLineIndexChange={setActiveLineIndex}
              editingText={editingText}
              setEditingText={setEditingText}
              editingSecondary={editingSecondary}
              setEditingSecondary={setEditingSecondary}
              editingTranslations={editingTranslations as ComponentProps<typeof PhoneEditTab>['editingTranslations']}
              setEditingTranslations={setEditingTranslations as ComponentProps<typeof PhoneEditTab>['setEditingTranslations']}
              setEditingLineIndex={setEditingLineIndex}
              onSaveLine={(index, text, secondary, translations) => handleSaveLineText(index, text, secondary, translations, undefined)}
            />
          )}
          selectBar={selecting ? (
            <PhoneSelectBar
              count={selectedLines.size}
              onDone={exitSelecting}
              onSelectAll={() => setSelectedLines(new Set(lines.map((_, i) => i)))}
              onShiftEarlier={() => handleBulkShift(-nudgeDefault)}
              onShiftLater={() => handleBulkShift(nudgeDefault)}
              onClearTimestamps={handleBulkClearTimestamps}
              onDelete={handleBulkDelete}
              onMore={() => openLineSheetFor([...selectedLines].sort((a, b) => a - b))}
              onTag={() => openLineSheetFor([...selectedLines].sort((a, b) => a - b), 'tag')}
            />
          ) : undefined}
          onAddMedia={inSession ? undefined : () => setChangeMediaOpen(true)}
          focus={readOnly ? undefined : {
            on: phoneFocus,
            onToggle: () => setPhoneFocus(!phoneFocus),
            inert: toolsOpen || (lineSheet.open && lineSheetValid),
            // Marks through the very handler the Mark bar uses (no forceAdvance), so
            // autoAdvance, SRT end marks and session locks behave the same.
            view: (
              <PhoneFocusView
                {...focusLines(lines, activeLineIndex)}
                onMark={() => handleMarkWithConfidence()}
                onUndo={undo}
                canUndo={canUndo}
                label={markLabel}
                disabled={!syncMode || lines.length === 0}
                disabledHint={!syncMode ? t('editor.phone.focus.syncOff') : undefined}
                onClose={() => setPhoneFocus(false)}
                onAddMedia={inSession ? undefined : () => setChangeMediaOpen(true)}
              />
            ),
          }}
          // A session viewer never reaches the editor (AppRouter shows them the preview);
          // this keeps Mark away from them even if that ever changes.
          mark={readOnly ? null : {
            // The same handler the desktop list uses, without forceAdvance, so the
            // autoAdvance setting and SRT end marks behave exactly as they do there.
            onMark: () => handleMarkWithConfidence(),
            onUndo: undo,
            canUndo,
            label: markLabel,
            disabled: !syncMode || lines.length === 0,
          }}
        />
        <PhoneToolsSheet
          open={toolsOpen}
          onClose={() => setToolsOpen(false)}
          readOnly={readOnly}
          focusView={{
            on: phoneFocus,
            onToggle: () => {
              if (phoneTab !== 'sync') changePhoneTab('sync');
              setPhoneFocus(!phoneFocus);
            },
          }}
          editorMode={editorMode}
          hasLines={hasLyricLines}
          autoStamp={{ blocked: autoStampBlocked, onStart: handleAutoStampStart }}
          shiftAmount={settings.editor?.shiftAllAmount ?? 0.5}
          onShiftAll={handleApplyOffset}
          canRedo={canRedo}
          onRedo={redo}
          onClearAllTimestamps={handleClearTimestamps}
          onClearAllWordTimestamps={handleClearAllWordTimestamps}
          unmarkedOnly={lineFilter === 'unmarked'}
          onToggleUnmarked={() => setLineFilter((f) => (f === 'all' ? 'unmarked' : 'all'))}
          onFindLyrics={() => setLyricsSearchOpen(true)}
          onImport={() => openPhoneEdit('text')}
          onEditText={() => openPhoneEdit('text')}
          onSecondary={editorMode === 'lrc' && hasLyricLines ? () => setSecondaryOpen(true) : undefined}
          onFurigana={hasKanjiAnywhere ? () => setFuriganaOpen(true) : undefined}
          readingFormat={hasCjkAnywhere ? {
            katakana: settings.editor?.display?.readingFormat === 'katakana',
            onToggle: () => updateSetting('editor.display.readingFormat', settings.editor?.display?.readingFormat === 'katakana' ? 'hiragana' : 'katakana'),
          } : undefined}
          onSelectLines={() => setSelecting(true)}
          wordsLocked={wordsLocked}
          onSetMode={selectMode}
          onSave={handleManualSave && !inSession ? handleSaveClick : undefined}
          saving={isSaving}
          onExport={() => window.dispatchEvent(new CustomEvent('preview:open-export'))}
          onProjectSettings={onOpenProjectSettings}
          session={sessionOwner ? {
            live: sessionOwner.live,
            starting: sessionStarting,
            onStart: () => void startSessionFlow(),
            onManage: () => setSessionManageOpen(true),
          } : undefined}
          onPublish={canPublish ? openPublish : undefined}
          onViewPublic={onTogglePublicView && !inSession && serverProjectId ? onTogglePublicView : undefined}
          onChangeSong={hasMedia && !inSession ? () => setChangeMediaOpen(true) : undefined}
          onNewProject={onNewProject}
          onRemoveAll={() => requestConfirm(t('confirm.removeAll'), handleRemoveAllLyrics, { title: t('confirm.removeAllTitle'), variant: 'danger' })}
        />
        <PhoneLineSheet
          open={lineSheet.open && lineSheetValid}
          onClose={() => setLineSheet((cur) => ({ ...cur, open: false }))}
          initialView={lineSheet.view}
          indices={lineSheetIndices}
          lines={lines}
          singers={lineSheetSingers}
          nudgeFine={nudgeFine}
          nudgeCoarse={nudgeDefault}
          deleteDisabled={lineSheetIndices.some((i) => lines[i]?.id != null && !!othersLocks?.[lines[i].id as string])}
          onShift={shiftTimeWithConfidence}
          onClearTimestamp={handleClearLine}
          onDelete={handleDeleteLine}
          onAddLine={handleAddLine}
          onInsertSection={handleInsertSection}
          onToggleDepth={handleToggleSectionDepth}
          onAssignSinger={handleAssignSinger}
          onMoveToSection={handleMoveToSection}
          onTagSection={(label) => {
            const { lines: next, indexMap } = applyTagToSelection(lines, new Set(lineSheetIndices), { label });
            recordIndexMap(indexMap);
            setLines(next);
            exitSelecting();
          }}
          onEditText={(index) => {
            if (cursorBeforeEditRef.current == null) cursorBeforeEditRef.current = activeLineIndex;
            setActiveLineIndex(index);
            openPhoneEdit('line');
          }}
          onToggleCounterpart={handleToggleCounterpart}
          onBulkSingTogether={handleBulkSingTogether}
          onBulkSplitSingers={handleBulkSplitSingers}
        />
        {sessionStarting && <SessionStartShield />}
        {sessionOwner?.live && (
          <SessionSettingsModal
            open={sessionManageOpen}
            onOpenChange={setSessionManageOpen}
            publicId={sessionOwner.publicId}
            provider={collab?.provider ?? null}
            locks={collab?.locks ?? {}}
            lines={lines}
            onEnded={sessionOwner.onEnded}
          />
        )}
        {overlays}
      </>
    );
  }

  return (
    <div
      onMouseLeave={handleLineHoverEnd}
      className={`flex ${compact ? 'flex-row gap-2' : 'flex-col'} flex-1 animate-fade-in min-h-0 relative`}
    >
      {/* The workspace header (see AppHeader) hosts this screen's status, tabs and actions.
          No save status in a session: the server stores the shared doc, solo saves are off. */}
      {statusSlot && !inSession && createPortal(
        <span
          role="status"
          // Each state differs by mark and wording, not colour alone: gold dot, pulsing iris
          // dot, check, cross (redesign sheet 08).
          className={`inline-flex h-8 items-center gap-2 rounded-pill bg-raised px-3.5 text-[15px] font-medium whitespace-nowrap ${saveState === 'saved' ? 'text-foam pl-[11px] gap-1.5' : saveState === 'failed' ? 'text-love-ink pl-[11px] gap-1.5' : 'text-subtle'}`}
        >
          {saveState === 'saved' || saveState === 'failed' ? (
            <svg key={saveState} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={saveState === 'saved' ? 'icon-draw' : undefined}>
              <path d={saveState === 'saved' ? 'M5 12.5l4.5 4.5L19 7' : 'M7 7l10 10 M17 7L7 17'} />
            </svg>
          ) : (
            <span aria-hidden className={`size-[7px] rounded-full ${saveState === 'saving' ? 'status-pulse bg-iris [animation:status-pulse_1.2s_ease-in-out_infinite]' : 'bg-gold'}`} />
          )}
          {saveState === 'saving' ? t('project.saving') : saveState === 'saved' ? t('project.saved') : saveState === 'failed' ? t('project.saveFailed') : t('editor.statusUnsaved')}
        </span>,
        statusSlot,
      )}
      {actionsSlot && createPortal(
        <>
          {canChangeVisibility && !inSession && (
            <VisibilityChip isPublic={isPublic} onOpen={() => { publishPrompt.dismiss(); setPublishOpen(true); }} />
          )}
          {syncMode && lines.length > 0 && (
            <div data-tour="editor-undo-redo" className="flex items-center gap-2">
              <Tip content={t('editor.undoTitle')}>
                <Button variant="outline" size="icon" onClick={undo} disabled={!canUndo} aria-label={t('editor.undo')} className={HEADER_ICON_BTN}>
                  <Icon name="undo" size={18} />
                </Button>
              </Tip>
              <Tip content={t('editor.redoTitle')}>
                <Button variant="outline" size="icon" onClick={redo} disabled={!canRedo} aria-label={t('editor.redo')} className={HEADER_ICON_BTN}>
                  <Icon name="redo" size={18} />
                </Button>
              </Tip>
            </div>
          )}
          {/* Save stays in the bar: it is the one action nobody should have to look for. */}
          {handleManualSave && !inSession && (
            <Tip content={isSaving ? t('project.saving') : t('project.save')}>
              <Button
                variant="outline"
                size="icon"
                onClick={handleSaveClick}
                disabled={isSaving}
                aria-label={t('project.save')}
                className={HEADER_ICON_BTN}
              >
                {isSaving ? <LogoLoader size={16} /> : <Icon name="save" size={18} />}
              </Button>
            </Tip>
          )}
          {onShowPreview && (
            <Button
              variant="outline"
              onClick={onShowPreview}
              aria-label={t('editor.previewAction')}
              className="h-10 lg:h-10 coarse:h-11 px-3.5 lg:px-3.5 gap-2 rounded-[calc(var(--radius)*1)] border-zinc-800 bg-transparent text-[13px] lg:text-[13px] font-semibold text-foreground"
            >
              <Icon name="visibility" size={16} />
              <span className="max-xl:hidden">{t('editor.previewAction')}</span>
            </Button>
          )}
          <Button
            onClick={() => window.dispatchEvent(new CustomEvent('preview:open-export'))}
            disabled={lines.length === 0}
            className="h-10 lg:h-10 coarse:h-11 px-4 lg:px-4 gap-2 rounded-[calc(var(--radius)*1)] bg-primary hover:bg-primary-dim text-zinc-950 text-[13px] lg:text-[13px] font-bold"
          >
            <Icon name="download" size={16} />
            <span className="max-sm:hidden">{t('editor.exportAs', { format: editorMode === 'srt' ? 'SRT' : 'LRC' })}</span>
          </Button>
          <ActionsDropdown icon="more_horiz">
            <div className="p-1 space-y-0.5">
              {syncMode && lines.length > 0 && (
                <PopoverItem
                  onClick={() => {
                    setRawText(linesToRawText(lines, rawLineText, combinedSingers));
                    setSyncMode(false);
                  }}
                >
                  <Icon name="edit" size={16} />
                  {t('editor.backToEdit')}
                </PopoverItem>
              )}
              {onOpenProjectSettings && (
                <PopoverItem onClick={onOpenProjectSettings}>
                  <Icon name="tune" size={16} />
                  {t('editor.projectSettings')}
                </PopoverItem>
              )}
              {hasMedia && !inSession && (
                <PopoverItem onClick={() => setChangeMediaOpen(true)}>
                  <Icon name="swap_horiz" size={16} />
                  {t('player.changeSong')}
                </PopoverItem>
              )}
              {onTogglePublicView && !inSession && activepublicId && activepublicId !== 'local' && activepublicId !== 'new' && (
                <PopoverItem onClick={onTogglePublicView}>
                  <Icon name="public" size={16} />
                  {t('editor.viewAsPublic')}
                </PopoverItem>
              )}
              {/* SRT has no tab of its own: it is line mode with end times. */}
              {!isWordsMode && (
                <PopoverItem onClick={() => selectMode(editorMode === 'srt' ? 'lrc' : 'srt')}>
                  <Icon name={editorMode === 'srt' ? 'check_box' : 'check_box_outline_blank'} size={16} />
                  {t('editor.srtEndTimes')}
                </PopoverItem>
              )}

              <PopoverSeparator className="bg-zinc-800/50" />


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
        </>,
        actionsSlot,
      )}

      {publishPromptNode}

      {playerPosition === 'top' && (!wordsFocus || !hasMedia) && playerDock}

      <div className="flex flex-1 min-h-0">
      {wordsFocus && <WordsLineNav lines={lines} activeLineIndex={activeLineIndex} onSelect={setActiveLineIndex} />}
      <section aria-label={t('editor.lineList')} className="flex flex-col flex-1 min-w-0 min-h-0">
      {/* List header: sync progress on the left, mode switch + Auto Stamp on the right */}
      <div className={`flex flex-wrap items-center gap-3 ${wordsFocus ? 'px-5 sm:px-8 pt-7 pb-2' : 'px-4 sm:px-6 py-4 border-b border-zinc-800'}`}>
        <div className="lg:hidden w-full flex">{modeTabs}</div>
        {wordsFocus ? (
          <>
            <div className="hidden lg:flex shrink-0">{modeTabs}</div>
            <div className="flex flex-col gap-1 flex-[1_1_220px] min-w-0">
              <span className={`text-xs font-bold uppercase tracking-[0.1em] ${TEAL_TEXT}`}>
                {t('editor.inspector.title', { number: focusInfo.lyricNumber })}
                {focusInfo.sectionLabel && ` · ${formatSectionLabel(focusInfo.sectionLabel, t)}`}
              </span>
              <span className="font-mono text-[13px] tabular-nums text-foreground/65">
                {focusStart != null ? formatTimestamp(focusStart) : '--:--.--'}
                {focusInfo.end != null && ` → ${formatTimestamp(focusInfo.end)}`}
                {focusLength != null && ` · ${focusLength.toFixed(2)} s`}
              </span>
            </div>
            {focusLine && (
              <WordsModeLayerControl
                line={focusLine as ComponentProps<typeof WordsModeLayerControl>['line']}
                stampTarget={stampTarget}
                handleSetStampTarget={handleSetStampTarget}
              />
            )}
            <Tip content={focusLength == null ? t('editor.words.distributeUnavailable') : t('editor.words.distributeTip')}>
              <Button
                variant="outline"
                // aria-disabled keeps the tooltip that explains why reachable.
                aria-disabled={focusLength == null || !focusLine?.words?.length}
                onClick={() => { if (focusLength != null && focusLine?.words?.length) handleDistributeWords(); }}
                className={`h-10 lg:h-10 coarse:h-11 px-3.5 lg:px-3.5 rounded-[calc(var(--radius)*1)] border-zinc-700 bg-transparent text-[13px] lg:text-[13px] font-semibold text-foreground ${focusLength == null ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {t('editor.words.distribute')}
              </Button>
            </Tip>
          </>
        ) : (
          <>
        {/* Count and what it counts on the left; the mode tabs take the room the progress bar used to. */}
        {syncProgress ? (
          <div className="flex items-center gap-3.5 min-w-0 cursor-default">
            <span className="font-heading text-[22px] font-bold leading-tight tracking-[-0.02em] whitespace-nowrap">
              {t('editor.syncedCount', { synced: syncProgress.synced, count: syncProgress.total })}
            </span>
            <span className="text-[15px] text-subtle truncate">
              {t('editor.syncedLabel', { count: syncProgress.total })}
            </span>
            {editorMode === 'words' && syncProgress.totalWordsInLine > 0 && (
              <span className="text-xs font-mono tabular-nums text-subtle shrink-0">
                {syncProgress.currentWordNum}/{syncProgress.totalWordsInLine}
              </span>
            )}
          </div>
        ) : null}
        <div className="hidden lg:flex flex-1 min-w-0 justify-center">{modeTabs}</div>
        {lines.length > 0 && (
          <SegmentedControl<'all' | 'unmarked'>
            label={t('editor.filterGroup')}
            value={lineFilter}
            onChange={setLineFilter}
            options={[
              { value: 'all', label: t('editor.filterAll') },
              { value: 'unmarked', label: t('editor.filterUnmarked', { count: unmarkedCount }) },
            ]}
          />
        )}
        <Tip content={t('editor.counterpart.toggleTip')}>
          <Button
            variant="outline"
            aria-pressed={counterpartOpen}
            onClick={() => setCounterpartOpen((open) => !open)}
            className={`relative h-9 lg:h-9 coarse:h-11 gap-1.5 rounded-lg px-3 lg:px-3 text-[13px] lg:text-[13px] font-semibold ${counterpartOpen ? 'bg-counterpart-soft text-counterpart-ink inset-ring-counterpart hover:bg-counterpart-soft' : 'border-zinc-800 bg-transparent text-foreground/65 hover:text-foreground'}`}
          >
            <Icon name="mic" size={16} />
            {t('editor.counterpart.toggle')}
            <CountDot count={pendingCounterparts} className="-top-1.5 -right-1.5 bg-gold" />
          </Button>
        </Tip>
        <Tip content={t('lyricsSearch.findLyrics')}>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLyricsSearchOpen(true)}
            aria-label={t('lyricsSearch.findLyrics')}
            className="size-9 lg:size-9 coarse:size-11 rounded-lg border-zinc-800 bg-transparent text-foreground/65 hover:text-foreground"
          >
            <Icon name="search" size={16} />
          </Button>
        </Tip>
          </>
        )}
        <EditorToolbar
          editorMode={editorMode}
          lines={lines}
          autoStampHasAudio={autoStampHasAudio}
          autoStampRunning={autoStampRunning}
          onAutoStamp={handleAutoStampStart}
          onOpenFurigana={() => setFuriganaOpen(true)}
          onOpenSecondary={() => setSecondaryOpen(true)}
          sessionOwner={sessionOwner}
          collab={collab}
          onBeforeStartSession={handleManualSave ?? undefined}
          trailing={!wordsFocus && syncProgress ? (
            <Tip content={t('editor.wordCharCount', { words: syncProgress.wordCount, chars: syncProgress.charCount, charsNoSp: syncProgress.charCountNoSpaces })}>
              <span className="ml-auto pl-3 text-[13px] text-subtle whitespace-nowrap cursor-default">
                {t('editor.wordCount', { count: syncProgress.wordCount })}
              </span>
            </Tip>
          ) : undefined}
        />
      </div>

      <div className={`flex flex-col min-h-0 min-w-0 ${wordsFocus ? 'flex-none px-5 sm:px-8 pt-4' : 'flex-1 px-3 sm:px-4 pt-3'}`}>

        {/* Sync Mode View */}
        <div data-tour="editor-lines" className={`relative flex flex-col min-h-0 ${wordsFocus ? 'flex-none h-[clamp(150px,26vh,260px)] overflow-y-auto lrc-scroll' : 'flex-1'}`}>
          <div className="hidden xl:block empty:hidden">
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
          {!wordsFocus && (
          <TaggingToolbar
            lines={lines}
            setLines={setLines}
            selectedLines={selectedLines}
            recordIndexMap={recordIndexMap}
            songArtists={combinedSingers}
            clearSelection={clearSelection as () => void}
          />
          )}
          {wordsFocus ? (
          <WordsFocusLine
            lines={lines}
            lineIndex={activeLineIndex}
            playingWordIndex={playingWordIndex}
            settings={settings}
            selectedLines={selectedLines}
            focusedTimestamp={focusedTimestamp}
            setFocusedTimestamp={setFocusedTimestamp}
            activeWordIndex={activeWordIndex}
            handleSetActiveWordIndex={handleSetActiveWordIndex}
            handleClearWordTimestamp={handleClearWordTimestamp}
            onWordMenu={openWord}
            onLineMenu={openLine}
            stampTarget={stampTarget}
            playerRef={playerRef}
            projectSingers={combinedSingers}
            singerColors={singerColors}
            songArtists={combinedSingers}
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
            handleAddLine={handleAddLine}
            handleClearLine={handleClearLine}
            handleDeleteLine={handleDeleteLine}
            handleMoveToSection={handleMoveToSection}
            handleInsertSection={handleInsertSection}
            handleAssignSinger={handleAssignSinger}
            handleToggleCounterpart={handleToggleCounterpart}
            handleMark={handleMarkWithConfidence}
            shiftTime={shiftTimeWithConfidence}
            onToggleLineMode={handleToggleLineMode}
          />
          ) : lineList}
        </div>
      </div>

      {counterpartOpen && !wordsFocus && (
        <CounterpartStrip
          lines={lines}
          playbackPosition={playbackPosition}
          // A single letter is printed as it is on the key, in capitals.
          captureKey={captureKeyRaw.length === 1 ? captureKeyRaw.toUpperCase() : keyCap(captureKeyRaw)}
          selectedId={counterpartSelected}
          onSelect={setCounterpartSelected}
          namingId={counterpartNaming}
          onNaming={setCounterpartNaming}
          onCapture={captureCounterpartHere}
          onMove={handleMoveCounterpart}
          onName={handleNameCounterpart}
          onDelete={handleRemoveCounterpart}
          onSeek={seek}
          onClose={() => setCounterpartOpen(false)}
        />
      )}

      {wordsFocus && focusLine && focusLine.type !== 'section' && (
        <div className="lrc-scroll flex flex-col flex-1 min-h-0 overflow-y-auto gap-6 px-5 sm:px-8 pt-2 pb-6">
          <WordTimeline
            line={focusLine}
            lineEnd={focusInfo.end}
            playbackPosition={playbackPosition}
            activeWordIndex={playingWordIndex ?? (focusedTimestamp?.lineIndex === activeLineIndex && focusedTimestamp?.type === 'word' && focusedTimestamp.wordIndex != null ? focusedTimestamp.wordIndex : activeWordIndex)}
            onSetWordTime={handleSetWordTime}
            markKey={keyCap(settings.shortcuts?.mark?.[0] || 'Enter')}
          />
          <div className="mt-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-x-3.5 gap-y-2 text-xs text-foreground/65">
              {[
                { key: settings.shortcuts?.mark?.[0] || 'Enter', label: t('editor.words.hintMark') },
                { key: settings.shortcuts?.playPause?.[0] || 'Space', label: t('editor.shortcutHints.play') },
              ].map((hint) => (
                <span key={hint.label} className="inline-flex items-center gap-1.5">
                  <Kbd>
                    {keyCap(hint.key)}
                  </Kbd>
                  {hint.label}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2.5">
              <SegmentedControl
                mono
                label={t('player.speed')}
                value={playbackSpeed}
                onChange={applySpeed}
                options={EDITOR_SPEEDS}
              />
              <Tip content={loopFocusLine ? t('editor.words.loopOn') : t('editor.words.loopOff')}>
                <Button
                  variant="outline"
                  size="icon"
                  aria-pressed={loopFocusLine}
                  aria-label={t('editor.words.loop')}
                  onClick={toggleLoopFocusLine}
                  className={`size-10 lg:size-10 coarse:size-11 rounded-[calc(var(--radius)*1)] ${loopFocusLine ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20' : 'border-zinc-800 bg-transparent text-foreground/65 hover:text-foreground'}`}
                >
                  <Icon name="repeat" size={18} />
                </Button>
              </Tip>
              <Tip content={playerIsPlaying ? t('editor.words.pause') : focusStart == null ? t('editor.words.timelineUnavailable') : t('editor.words.playLine')}>
                <Button
                  size="icon"
                  aria-disabled={!hasMedia || (!playerIsPlaying && focusStart == null)}
                  aria-label={playerIsPlaying ? t('editor.words.pause') : t('editor.words.playLine')}
                  onClick={() => { if (hasMedia) handlePlayLine(); }}
                  className={`size-[52px] lg:size-[52px] rounded-full bg-primary hover:bg-primary-dim text-zinc-950 ${!hasMedia || (!playerIsPlaying && focusStart == null) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <MorphIcon name={playerIsPlaying ? 'pause' : 'play_arrow'} size={24} decorative />
                </Button>
              </Tip>
            </div>
          </div>
        </div>
      )}
      </section>
      {!wordsFocus && (
      <EditorSidePanel
        lines={lines}
        playbackPosition={playbackPosition}
        duration={duration}
        editorMode={editorMode}
        activeLineIndex={activeLineIndex}
        singers={combinedSingers}
        settings={settings}
        singerColors={singerColors}
        onMoveToSection={handleInspectorSection}
        onAssignSinger={handleInspectorSinger}
        onNudge={shiftTimeWithConfidence}
      />
      )}
      </div>

      {playerPosition === 'bottom' && (!wordsFocus || !hasMedia) && playerDock}

      {overlays}
    </div>
  );
}
