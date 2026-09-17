import { useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@ui/button';
import { ToggleGroup, ToggleGroupItem } from '@ui/toggle-group';
import { Tip } from '@ui/tip';
import { Badge } from '@ui/badge';
import { Popover, PopoverContent, PopoverItem, PopoverSeparator, PopoverTrigger } from '@ui/popover';
import { Icon } from '@/shared/ui/Icon';
import { hasCJK } from '@/shared/utils/furigana';
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
  playerPosition?: 'top' | 'bottom';
}

import { usePlayer } from '@/features/player/PlayerContext';

export default function EditorToolbar({
  user,
  editorMode,
  setEditorMode,
  updateSetting,
  settings,
  syncMode,
  lines,
  setSelectedLines,
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
  isSaving,
  onNewProject,
  onShowKeyboardHelp,
  undo,
  redo,
  canUndo,
  canRedo,
  autoStampHasAudio,
  autoStampRunning,
  onAutoStamp,
  playerPosition = 'bottom',
  onHideEditor,
  previewHidden,
  onShowPreview,
}: EditorToolbarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // Get playback state
  const { isPlaying, togglePlay } = usePlayer();
  const hasAnyTimestamp = useMemo(() => lines.some((l) => l.timestamp != null), [lines]);
  const hasJapanese = useMemo(() => lines.some((l) => hasCJK(l.text || '') || hasCJK(l.secondary || '')), [lines]);

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
        {id && id !== 'local' && (
          <Tip content={t('app.viewPublicPage') || 'View Public Page'} side="bottom">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/project/${id}`)}
              aria-label={t('app.viewPublicPage') || 'View Public Page'}
              className="size-8 text-zinc-400 hover:text-zinc-200"
            >
              <Icon name="visibility" size={16} />
            </Button>
          </Tip>
        )}
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
                ? <Icon name="autorenew" size={16} className="animate-spin" />
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
    <div className={`absolute ${playerPosition === 'bottom' ? 'bottom-28' : 'bottom-6'} left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 sm:gap-4 px-4 py-2 bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 rounded-full shadow-2xl overflow-visible transition-all`}>
      {/* ── Left: Undo / Redo / Play ── */}
      <div className="flex items-center gap-1 shrink-0">
        <Tip content={t('editor.undoTitle') || 'Undo (Ctrl+Z)'}>
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={!canUndo}
            className="size-9 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 disabled:opacity-30 transition-colors"
          >
            <Icon name="undo" size={18} />
          </Button>
        </Tip>
        <Tip content={t('editor.redoTitle') || 'Redo (Ctrl+Y)'}>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={!canRedo}
            className="size-9 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 disabled:opacity-30 transition-colors"
          >
            <Icon name="redo" size={18} />
          </Button>
        </Tip>

        <div className="w-px h-4 bg-zinc-700/50 mx-1 shrink-0" />

        <Tip content={isPlaying ? t('shortcuts.playPause') || 'Pause' : t('shortcuts.playPause') || 'Play'}>
          <Button
            variant="default"
            size="icon"
            onClick={togglePlay}
            className="size-10 rounded-full bg-primary hover:bg-primary-dim text-zinc-950 hover:scale-105 active:scale-95 shadow-lg shadow-primary/20 transition-all duration-200"
          >
            <Icon name={isPlaying ? "pause" : "play_arrow"} size={20} />
          </Button>
        </Tip>
      </div>

      <div className="w-px h-6 bg-zinc-700/50 shrink-0" />

      {/* ── Center: Auto Stamp (Sync Mode) + Modes ── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onAutoStamp && (
          <Tip content={!autoStampHasAudio ? t('editor.autoStamp.noAudio') : isAutoStampComplete ? t('editor.autoStamp.complete', 'Already applied') : t('editor.autoStamp.button')}>
            <Button
              variant="default"
              size="icon"
              onClick={onAutoStamp}
              disabled={!autoStampHasAudio || autoStampRunning || isAutoStampComplete}
              className={`size-10 rounded-full shadow-lg ${
                isAutoStampComplete
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'bg-gradient-to-br from-primary to-emerald-500 text-zinc-950 hover:scale-105 active:scale-95'
              } disabled:opacity-50 transition-all duration-200 glow-primary`}
            >
              <Icon name={editorMode === 'words' ? 'spellcheck' : 'auto_fix_high'} size={20} />
            </Button>
          </Tip>
        )}

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
            className="bg-zinc-800/40 rounded-full border border-zinc-700/50 p-1 flex-nowrap"
          >
            <ToggleGroupItem
              value="lrc"
              className="px-3 py-1 text-xs font-bold rounded-full data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200"
            >
              {t('editor.modeLRC')}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="srt"
              className="px-3 py-1 text-xs font-bold rounded-full data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200"
            >
              {t('editor.modeSRT')}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="words"
              disabled={!hasAnyTimestamp}
              className="px-3 py-1 text-xs font-bold rounded-full data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
            >
              {t('editor.modeWords')}
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>

      <div className="w-px h-6 bg-zinc-700/50 shrink-0" />

      {/* ── Right: More Actions / Search ── */}
      <div className="flex items-center gap-1 shrink-0">
        {onHideEditor && onShowPreview && (
          <Tip content={previewHidden ? (t('editor.showPreview') || 'Show preview') : (t('editor.hideEditor') || 'Hide editor')}>
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
        <Popover open={lyricsSearchPopoverOpen} onOpenChange={setLyricsSearchPopoverOpen}>
          <Tip content={t('lyricsSearch.findLyrics')}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors">
                <Icon name="search" size={18} />
              </Button>
            </PopoverTrigger>
          </Tip>
          <PopoverContent className="w-80 p-3 bg-zinc-900 border-zinc-800 shadow-xl" align="end" side="top" sideOffset={10}>
            <LyricsSearchBar onImport={handleLyricsSearchImport} />
          </PopoverContent>
        </Popover>

        <ActionsDropdown icon="more_horiz">
          <div className="p-1 space-y-0.5">
            {handleManualSave && (
              <PopoverItem
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
              >
                {isSaving ? <Icon name="autorenew" size={16} className="animate-spin" /> : isAutosaving ? <Icon name="check" size={16} className="text-primary" /> : <Icon name="save" size={16} />}
                {isSaving ? t('project.saving') : isAutosaving ? t('project.saved') : t('project.save')}
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
  );
}
