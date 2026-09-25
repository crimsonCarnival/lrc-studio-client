import { useMemo, useState } from 'react';
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

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`absolute ${playerPosition === 'bottom' ? 'bottom-32 sm:bottom-40' : 'top-4'} left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-4 sm:py-2 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-full shadow-2xl transition-all duration-300 ease-in-out max-w-max`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* ── Center: Auto Stamp (Sync Mode) + Modes ── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onAutoStamp && (
          <Tip content={!autoStampHasAudio ? t('editor.autoStamp.noAudio') : isAutoStampComplete ? t('editor.autoStamp.complete') : t('editor.autoStamp.button')}>
            <Button
              variant="default"
              size="icon"
              onClick={onAutoStamp}
              disabled={!autoStampHasAudio || autoStampRunning || isAutoStampComplete}
              className={`size-8 sm:size-10 rounded-full shadow-lg shrink-0 ${isAutoStampComplete
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'bg-gradient-to-br from-primary to-emerald-500 text-zinc-950 hover:scale-105 active:scale-95'
                } disabled:opacity-50 transition-all duration-200 glow-primary`}
            >
              <Icon name={editorMode === 'words' ? 'spellcheck' : 'auto_fix_high'} size={18} />
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
            className={`bg-zinc-800/40 rounded-full border flex-nowrap transition-all duration-300 overflow-hidden ${isExpanded ? 'max-w-[300px] opacity-100 p-1 ml-1 border-zinc-700/50 pointer-events-auto' : 'max-w-0 opacity-0 p-0 ml-0 border-transparent pointer-events-none'}`}
          >
            <Tip content={t('editor.modeTooltipLRC')}>
              <ToggleGroupItem
                value="lrc"
                className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold rounded-full data-[state=on]:bg-primary data-[state=on]:text-zinc-950 data-[state=on]:shadow-[0_0_10px_rgba(var(--color-primary),0.5)] text-zinc-400 hover:text-zinc-200 transition-all"
              >
                {t('editor.modeLRC')}
              </ToggleGroupItem>
            </Tip>
            <Tip content={t('editor.modeTooltipSRT')}>
              <ToggleGroupItem
                value="srt"
                className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold rounded-full data-[state=on]:bg-primary data-[state=on]:text-zinc-950 data-[state=on]:shadow-[0_0_10px_rgba(var(--color-primary),0.5)] text-zinc-400 hover:text-zinc-200 transition-all"
              >
                {t('editor.modeSRT')}
              </ToggleGroupItem>
            </Tip>
            <Tip content={t('editor.modeTooltipWords')}>
              <ToggleGroupItem
                value="words"
                disabled={!hasAnyTimestamp}
                className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold rounded-full data-[state=on]:bg-primary data-[state=on]:text-zinc-950 data-[state=on]:shadow-[0_0_10px_rgba(var(--color-primary),0.5)] text-zinc-400 hover:text-zinc-200 disabled:opacity-40 transition-all"
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
