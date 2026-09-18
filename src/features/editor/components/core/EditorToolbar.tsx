import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { ToggleGroup, ToggleGroupItem } from '@ui/toggle-group';
import { Tip } from '@ui/tip';
import { Icon } from '@/shared/ui/Icon';
import type { EditorLine } from '@/features/editor/services/editor.service';

interface EditorToolbarProps {
  editorMode: string;
  setEditorMode: (mode: string) => void;
  updateSetting: (path: string, value: unknown) => void;
  lines: EditorLine[];
  // Auto Stamp (#9)
  autoStampHasAudio?: boolean;
  autoStampRunning?: boolean;
  onAutoStamp?: () => void;
  playerPosition?: 'top' | 'bottom';
}

export default function EditorToolbar({
  editorMode,
  setEditorMode,
  updateSetting,
  lines,
  autoStampHasAudio,
  autoStampRunning,
  onAutoStamp,
  playerPosition = 'bottom',
}: EditorToolbarProps) {
  const { t } = useTranslation();
  
  const hasAnyTimestamp = useMemo(() => lines.some((l) => l.timestamp != null), [lines]);

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

  return (
    <div className={`absolute ${playerPosition === 'bottom' ? 'bottom-28' : 'bottom-6'} left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 sm:gap-4 px-4 py-2 bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 rounded-full shadow-2xl overflow-visible transition-all`}>
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
            <Tip content={t('editor.modeTooltipLRC') || 'Line-by-line lyrics (standard)'}>
              <ToggleGroupItem
                value="lrc"
                className="px-3 py-1 text-xs font-bold rounded-full data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200"
              >
                {t('editor.modeLRC')}
              </ToggleGroupItem>
            </Tip>
            <Tip content={t('editor.modeTooltipSRT') || 'Subtitle format (start & end times)'}>
              <ToggleGroupItem
                value="srt"
                className="px-3 py-1 text-xs font-bold rounded-full data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200"
              >
                {t('editor.modeSRT')}
              </ToggleGroupItem>
            </Tip>
            <Tip content={t('editor.modeTooltipWords') || 'Word-by-word timestamps (advanced)'}>
              <ToggleGroupItem
                value="words"
                disabled={!hasAnyTimestamp}
                className="px-3 py-1 text-xs font-bold rounded-full data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
              >
                {t('editor.modeWords')}
              </ToggleGroupItem>
            </Tip>
          </ToggleGroup>
        )}
      </div>
    </div>
  );
}
