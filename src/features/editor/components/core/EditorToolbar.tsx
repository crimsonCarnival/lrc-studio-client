import { useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@ui/button';
import { ToggleGroup, ToggleGroupItem } from '@ui/toggle-group';
import { Tip } from '@ui/tip';
import { Badge } from '@ui/badge';
import { Popover, PopoverContent, PopoverItem, PopoverSeparator, PopoverTrigger } from '@ui/popover';
import { Icon } from '@/shared/ui/Icon';
import { serializeToRubyMarkup, hasCJK } from '@/shared/utils/furigana';
import LyricsSearchBar from '../lyrics-search/LyricsSearchBar';
import { savePendingProject } from '@/features/editor/services/guest-project-db';
import { flatToSections, linesToRawText } from '@/features/editor/utils/sections';
import type { EditorLine } from '@/features/editor/services/editor.service';
import type { AppSettings } from '@/features/settings/settings.types';
import type { AuthUser } from '@/features/auth/hooks/useAuth';

interface ActionsDropdownProps {
  children: ReactNode;
  icon?: string;
  label?: string;
}

// Mobile-friendly dropdown for actions that overflow
const ActionsDropdown = ({ children, icon = 'more_horiz', label }: ActionsDropdownProps) => {
  const { t } = useTranslation();
  return (
    <Popover>
      <Tip content={label || t('editor.lineOptions')}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="size-9 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
            <Icon name={icon} size={16} />
          </Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent className="w-56 p-1 bg-zinc-900 border-zinc-800 shadow-xl" align="end">
        {children}
      </PopoverContent>
    </Popover>
  );
};

interface ConfirmOptions {
  title?: string;
  variant?: 'danger' | 'default';
}

interface EditorToolbarProps {
  user?: AuthUser | null;
  editorMode: string;
  setEditorMode: (mode: string) => void;
  updateSetting: (path: string, value: unknown) => void;
  settings: AppSettings;
  syncMode: boolean;
  lines: EditorLine[];
  setSelectedLines: (s: Set<number>) => void;
  selectedLines: Set<number>;
  handleClearTimestamps: () => void;
  handleClearAllWordTimestamps: () => void;
  requestConfirm: (message: string, action: () => void, opts?: ConfirmOptions) => void;
  setLines: (lines: EditorLine[]) => void;
  setRawText: (text: string) => void;
  setSyncMode: (v: boolean) => void;
  handleManualSave?: (() => void | Promise<void>) | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildProjectPayload?: () => Record<string, any>;
  handleRemoveAllLyrics: () => void;
  isAutosaving?: boolean;
  pendingSyncs?: number;
  isSaving?: boolean;
  overlappingLines?: Set<number>;
  onNewProject: () => void;
  onShowKeyboardHelp?: () => void;
  activeLineIndex: number;
  activeWordIndex: number;
  stampTarget?: string;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  handleApplyOffset: (direction: number) => void;
  // Panel toggles relocated from the header (#11/#13): hide this editor, or
  // restore the preview when it's hidden.
  onHideEditor?: () => void;
  previewHidden?: boolean;
  onShowPreview?: () => void;
  // Auto Stamp (#9)
  autoStampHasAudio?: boolean;
  autoStampRunning?: boolean;
  onAutoStamp?: () => void;
}

export default function EditorToolbar({
  user,
  editorMode,
  setEditorMode,
  updateSetting,
  settings,
  syncMode,
  lines,
  setSelectedLines,
  selectedLines,
  handleClearTimestamps,
  handleClearAllWordTimestamps,
  requestConfirm,
  setLines,
  setRawText,
  setSyncMode,
  handleManualSave,
  buildProjectPayload,
  handleRemoveAllLyrics,
  isAutosaving,
  pendingSyncs = 0,
  isSaving,
  overlappingLines,
  onNewProject,
  onShowKeyboardHelp,
  activeLineIndex,
  activeWordIndex,
  stampTarget,
  undo,
  redo,
  canUndo,
  canRedo,
  handleApplyOffset,
  onHideEditor,
  previewHidden,
  onShowPreview,
  autoStampHasAudio,
  autoStampRunning,
  onAutoStamp,
}: EditorToolbarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hasAnyTimestamp = useMemo(() => lines.some((l) => l.timestamp != null), [lines]);
  const hasJapanese = useMemo(() => lines.some((l) => hasCJK(l.text || '') || hasCJK(l.secondary || '')), [lines]);

  const syncProgress = useMemo(() => {
    const lyricLines = lines.filter(l => l.type !== 'section');
    if (!lyricLines.length) return null;
    const synced = lyricLines.filter(l => l.timestamp != null).length;
    const wordCount = lyricLines.reduce((acc, l) => acc + (l.text ? l.text.trim().split(/\s+/).filter(Boolean).length : 0), 0);
    const charCount = lyricLines.reduce((acc, l) => acc + (l.text ? l.text.length : 0), 0);

    // Active line word progress for Words mode
    const activeLine = lines[activeLineIndex];
    const activeWords = stampTarget === 'secondary' ? activeLine?.secondaryWords : activeLine?.words;
    const totalWordsInLine = activeWords?.length || 0;
    const currentWordNum = activeWordIndex !== -1 ? Math.min(activeWordIndex + 1, totalWordsInLine) : 0;

    return { synced, total: lyricLines.length, wordCount, charCount, totalWordsInLine, currentWordNum };
  }, [lines, activeLineIndex, activeWordIndex, stampTarget]);

  const isAutoStampComplete = useMemo(() => {
    const lyricLines = lines.filter(l => l.type !== 'section');
    if (!lyricLines.length) return false;
    
    // Disable the button if ASR has already run and stamped "the ones it found".
    // If they want to run it again, they should clear timestamps first.
    if (editorMode === 'words') {
      return lyricLines.some(l => l.source === 'asr' && l.words && l.words.some(w => w.time != null));
    }
    
    return lyricLines.some(l => l.source === 'asr');
  }, [lines, editorMode]);

  const [lyricsSearchPopoverOpen, setLyricsSearchPopoverOpen] = useState(false);

  const handleLyricsSearchImport = useCallback((lyricsText: string, keepTimestamps: boolean) => {
    const newLines = lyricsText.split('\n').reduce<EditorLine[]>((acc, line) => {
      const text = line.trim();
      if (text.length > 0) acc.push({ text, timestamp: null });
      return acc;
    }, []);
    if (keepTimestamps) {
      setLines(newLines.map((l, idx) => ({ ...l, timestamp: lines[idx]?.timestamp ?? null })));
    } else {
      setRawText(linesToRawText(newLines));
      setSyncMode(false);
    }
    setLyricsSearchPopoverOpen(false);
  }, [lines, setLines, setRawText, setSyncMode]);

  if (!syncMode) {
    if (!handleManualSave) return null;
    return (
      <div className="flex items-center justify-end gap-1 mb-2 shrink-0">
        {handleManualSave && (
          <Tip content={isSaving ? (t('project.saving') || 'Saving…') : isAutosaving ? (t('project.saved') || 'Saved') : (t('project.save') || 'Save')}>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleManualSave}
              disabled={isSaving}
              className={`size-8 transition-colors ${isSaving ? 'text-zinc-400' : isAutosaving ? 'text-primary' : 'text-zinc-400'}`}
            >
              {isSaving
                ? <Icon name="progress_activity" size={16} className="animate-spin" />
                : isAutosaving
                  ? <Icon name="check" size={16} />
                  : <Icon name="save" size={16} />}
            </Button>
          </Tip>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mb-1 sm:mb-2 sticky top-[-1px] lg:static z-raised py-2 px-4 -mx-4 border-b border-zinc-800/50 transition-all bg-zinc-950/50 backdrop-blur-md lg:bg-transparent lg:backdrop-blur-none lg:border-none lg:p-0 lg:m-0">
      {/* Top Row: Title + Sync Info + Save */}
      <div className="flex items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <h2 className="text-xs sm:text-sm font-semibold tracking-widest text-zinc-400 flex items-center gap-2">
            <span className="uppercase shrink-0 text-xs sm:text-sm flex items-center gap-1.5">
              <Icon name="description" size={14} />
              {t('editor.title')}
            </span>
          </h2>
          {syncMode && lines.length > 0 && (
            <Tip content={t('editor.backToEdit')}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setRawText(linesToRawText(lines, (l) => serializeToRubyMarkup(l.words) || l.text || ''));
                  setSyncMode(false);
                }}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex-shrink-0 size-7"
              >
                <Icon name="edit" size={14} />
              </Button>
            </Tip>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Keyboard shortcuts quick access used to be here, moved to EditorHelpModal */}

          {/* Sync progress + word/char count badge */}
          {syncProgress && (
            <Tip content={t('editor.wordCharCount', { words: syncProgress.wordCount, chars: syncProgress.charCount })}>
              <div className={`text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-900/50 flex items-center gap-1.5 cursor-default ${syncProgress.synced === syncProgress.total ? 'text-primary border-primary/20' : 'text-zinc-500'
                }`}>
                <div className={`size-1.5 rounded-full flex-shrink-0 ${syncProgress.synced === syncProgress.total ? 'bg-primary' : 'bg-zinc-700'
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

          {/* Panel toggles (desktop) — relocated from the global header (#11/#13) */}
          {previewHidden && onShowPreview && (
            <Tip content={t('app.showPreview')} side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={onShowPreview}
                aria-label={t('app.showPreview')}
                className="hidden lg:flex size-7 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 shrink-0"
              >
                <Icon name="right_panel_open" size={14} />
              </Button>
            </Tip>
          )}
          {onHideEditor && (
            <Tip content={t('app.hideEditor')} side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={onHideEditor}
                aria-label={t('app.hideEditor')}
                className="hidden lg:flex size-7 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 shrink-0"
              >
                <Icon name="left_panel_close" size={14} />
              </Button>
            </Tip>
          )}

        </div>
      </div>

      {/* Bottom Row: Editor Modes + Actions */}
      <div className="flex items-center justify-between w-full gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
          {/* Editor Modes ToggleGroup */}
          {lines.length > 0 && (
            <ToggleGroup
              type="single"
              value={editorMode}
              onValueChange={(val) => {
                if (!val) return;
                setEditorMode(val);
                const exportFmt = val === 'words' ? 'lrc' : val;
                updateSetting('export.copyFormat', exportFmt);
                updateSetting('export.downloadFormat', exportFmt);
              }}
              className="bg-zinc-900/80 rounded-xl border border-zinc-800 overflow-hidden h-auto p-0.5 gap-0.5 flex-nowrap"
            >
              <ToggleGroupItem
                value="lrc"
                className="px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg border-0 data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 h-auto min-w-[50px]"
              >
                {t('editor.modeLRC')}
              </ToggleGroupItem>
              <ToggleGroupItem
                value="srt"
                className="px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg border-0 data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 h-auto min-w-[50px]"
              >
                {t('editor.modeSRT')}
              </ToggleGroupItem>
              <ToggleGroupItem
                value="words"
                disabled={!hasAnyTimestamp}
                className="px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg border-0 data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 h-auto min-w-[50px] disabled:opacity-40"
              >
                {t('editor.modeWords')}
              </ToggleGroupItem>
            </ToggleGroup>
          )}

          {overlappingLines && overlappingLines.size > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] font-mono tabular-nums border-orange-500/40 bg-orange-500/10 text-orange-400 select-none animate-pulse shrink-0 ml-1"
            >
              {t('editor.overlappingTimestamps', { count: overlappingLines.size }) || `${overlappingLines.size} overlapping`}
            </Badge>
          )}

          <div className="w-px h-4 bg-zinc-800 mx-1 shrink-0" />

          {/* Primary Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {settings.editor?.showShiftAll && (() => {
              const shiftAmount = settings.editor?.shiftAllAmount ?? 0.5;
              return (
                <div className="flex items-center bg-zinc-900/50 rounded-lg p-0.5 border border-zinc-800">
                  <Tip content={`-${shiftAmount}s`}>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleApplyOffset(-1)}
                      className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 size-7"
                    >
                      <Icon name="chevron_left" size={14} />
                    </Button>
                  </Tip>
                  <Tip content={t('editor.shiftAll')}>
                    <span className="text-xs font-mono text-zinc-500 tabular-nums w-8 text-center select-none cursor-default">
                      {shiftAmount}s
                    </span>
                  </Tip>
                  <Tip content={`+${shiftAmount}s`}>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleApplyOffset(1)}
                      className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 size-7"
                    >
                      <Icon name="chevron_right" size={14} />
                    </Button>
                  </Tip>
                </div>
              );
            })()}

            {selectedLines.size > 0 && (
              <Tip content={t('editor.selection.deselectAll')}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedLines(new Set())}
                  className="size-9 shrink-0 text-primary"
                >
                  <Icon name="close" size={16} />
                </Button>
              </Tip>
            )}
          </div>

          {/* Desktop-only individual action buttons */}
          <div className="hidden lg:flex items-center gap-1 shrink-0">
            <Tip content={t('editor.selection.selectAll')}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedLines(new Set(lines.map((_, i) => i)))}
                className="size-9 text-zinc-400 shrink-0"
              >
                <Icon name="checklist" size={16} />
              </Button>
            </Tip>

            <Tip content={t('editor.selection.clearTimestamps')}>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearTimestamps}
                className="size-9 text-zinc-400 shrink-0"
              >
                <Icon name="ink_eraser" size={16} />
              </Button>
            </Tip>

            {editorMode === 'words' && (
              <Tip content={t('editor.clearWordTimestamps')}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearAllWordTimestamps}
                  className="size-9 text-zinc-400 shrink-0"
                >
                  <Icon name="ink_eraser" size={16} />
                </Button>
              </Tip>
            )}

            {onAutoStamp && (
              <Tip content={!autoStampHasAudio ? t('editor.autoStamp.noAudio') : isAutoStampComplete ? t('editor.autoStamp.complete', 'Already applied') : t('editor.autoStamp.button')}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onAutoStamp}
                  disabled={!autoStampHasAudio || autoStampRunning || isAutoStampComplete}
                  className={`size-9 shrink-0 disabled:opacity-40 ${isAutoStampComplete ? 'text-primary/70' : 'text-zinc-400'}`}
                >
                  <Icon name={editorMode === 'words' ? 'spellcheck' : 'auto_fix_high'} size={16} />
                </Button>
              </Tip>
            )}

          </div>
        </div>

        <div className="flex items-center gap-1">
          <Tip content={t('editor.undoTitle') || 'Undo (Ctrl+Z)'}>
            <Button
              variant="ghost"
              size="icon"
              onClick={undo}
              disabled={!canUndo}
              className="size-9 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
            >
              <Icon name="undo" size={16} />
            </Button>
          </Tip>
          <Tip content={t('editor.redoTitle') || 'Redo (Ctrl+Y)'}>
            <Button
              variant="ghost"
              size="icon"
              onClick={redo}
              disabled={!canRedo}
              className="size-9 text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
            >
              <Icon name="redo" size={16} />
            </Button>
          </Tip>
          {handleManualSave && (
            <Tip content={isSaving ? (t('project.saving') || 'Saving…') : isAutosaving ? (t('project.saved') || 'Saved') : (t('project.save') || 'Save')}>
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
                className={`flex-shrink-0 size-9 transition-colors ${isSaving ? 'text-zinc-400' : isAutosaving ? 'text-primary' : 'text-zinc-400'
                  }`}
              >
                {isSaving
                  ? <Icon name="progress_activity" size={16} className="animate-spin" />
                  : isAutosaving
                    ? <Icon name="check" size={16} />
                    : <Icon name="save" size={16} />}
              </Button>
            </Tip>
          )}
          {pendingSyncs > 0 && (
            <span className="text-xs text-amber-400 shrink-0">
              {t('editor.pendingSync', { count: pendingSyncs })}
            </span>
          )}
          <div className="w-px h-4 bg-zinc-800 mx-0.5 shrink-0" />
          <Popover open={lyricsSearchPopoverOpen} onOpenChange={setLyricsSearchPopoverOpen}>
            <Tip content={t('lyricsSearch.findLyrics')}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="size-9 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
                  <Icon name="music_note" size={16} />
                </Button>
              </PopoverTrigger>
            </Tip>
            <PopoverContent className="w-80 p-3 bg-zinc-900 border-zinc-800 shadow-xl" align="end">
              <LyricsSearchBar onImport={handleLyricsSearchImport} />
            </PopoverContent>
          </Popover>

          {/* Secondary Actions Dropdown (Mobile-first) */}
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

              {onAutoStamp && (
                <PopoverItem
                  onClick={onAutoStamp}
                  disabled={!autoStampHasAudio || autoStampRunning}
                  className="disabled:opacity-40 disabled:pointer-events-none"
                  title={!autoStampHasAudio ? t('editor.autoStamp.noAudio') : undefined}
                >
                  <Icon name="auto_fix_high" size={16} />
                  {t('editor.autoStamp.button')}
                </PopoverItem>
              )}

              {hasJapanese && (
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
  );
}
