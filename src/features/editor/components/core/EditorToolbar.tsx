import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { ToggleGroup, ToggleGroupItem } from '@ui/toggle-group';
import { Tip } from '@ui/tip';
import { Icon } from '@/shared/ui/Icon';
import type { EditorLine } from '@/features/editor/services/editor.service';
import { LogoLoader } from '@ui/LogoLoader';

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

const MODE_ITEM_CLASS =
  'px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-bold rounded-full transition-all ' +
  'data-[state=on]:bg-primary data-[state=on]:text-zinc-950 data-[state=on]:shadow-[0_0_10px_rgba(var(--color-primary),0.5)] ' +
  'text-zinc-400 hover:text-zinc-200';

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

  // True once ASR has already stamped this project. Used for *labelling* only —
  // re-running is allowed (and is the only way to stamp lines ASR missed the
  // first time). Overwrite is already guarded downstream: the default
  // `autoStamp.applyMode` is 'empty-only', and AutoStampModal confirms before
  // replacing existing timestamps.
  const isAutoStampComplete = useMemo(() => {
    const lyricLines = lines.filter(l => l.type !== 'section');
    if (!lyricLines.length) return false;

    if (editorMode === 'words') {
      return lyricLines.some(l => l.source === 'asr' && l.words && l.words.some(w => w.time != null));
    }

    return lyricLines.some(l => l.source === 'asr');
  }, [lines, editorMode]);

  const isWordsMode = editorMode === 'words';

  // Why the button can't run right now — null when it can. Drives both the
  // tooltip text and the aria-disabled state.
  const autoStampBlockedReason = !autoStampHasAudio
    ? t('editor.autoStamp.noAudio')
    : autoStampRunning
      ? t('editor.autoStamp.running')
      : null;

  const autoStampTip = autoStampBlockedReason
    ?? (isAutoStampComplete
      ? t('editor.autoStamp.rerun')
      : isWordsMode ? t('editor.autoStamp.tooltipWords') : t('editor.autoStamp.tooltip'));

  // `aria-disabled` rather than the native `disabled` attribute: a natively
  // disabled button emits no pointer events, so Radix's tooltip never opens and
  // the user is left with a dead control and no explanation. aria-disabled keeps
  // it focusable and hoverable (so the reason is actually reachable, by mouse
  // and by keyboard) while the click handler below makes it inert.
  const autoStampDisabled = autoStampBlockedReason !== null;

  const wordsLocked = !hasAnyTimestamp;

  return (
    <div
      className={`absolute ${playerPosition === 'bottom' ? 'bottom-32 sm:bottom-40' : 'top-4'} left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-full shadow-2xl max-w-max`}
    >
      {onAutoStamp && (
        <Tip content={autoStampTip}>
          <Button
            variant="default"
            aria-disabled={autoStampDisabled}
            aria-label={isWordsMode ? t('editor.autoStamp.buttonWords') : t('editor.autoStamp.button')}
            onClick={() => { if (!autoStampDisabled) onAutoStamp(); }}
            className={`h-8 sm:h-10 px-2.5 sm:px-4 gap-1.5 rounded-full shadow-lg shrink-0 text-[10px] sm:text-xs font-bold transition-all duration-200 glow-primary ${
              autoStampDisabled
                ? 'opacity-50 cursor-not-allowed bg-zinc-800 text-zinc-400'
                : isAutoStampComplete
                  ? 'bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30'
                  : 'bg-gradient-to-br from-primary to-emerald-500 text-zinc-950 hover:scale-105 active:scale-95'
            }`}
          >
            {autoStampRunning ? <LogoLoader size={18} /> : <Icon name={isWordsMode ? 'spellcheck' : 'auto_fix_high'} size={18} />}
            <span className="hidden sm:inline whitespace-nowrap">
              {isWordsMode ? t('editor.autoStamp.buttonWords') : t('editor.autoStamp.button')}
            </span>
          </Button>
        </Tip>
      )}

      {lines.length > 0 && (
        <ToggleGroup
          type="single"
          value={editorMode}
          onValueChange={(val) => {
            if (!val) return;
            // Words mode needs at least one line timestamp to anchor against.
            // Guarded here instead of via `disabled` so the item keeps emitting
            // the pointer events its tooltip needs (see autoStampDisabled above).
            if (val === 'words' && wordsLocked) return;
            setEditorMode(val);
            const exportFmt = val === 'words' ? 'lrc' : val;
            updateSetting('export.copyFormat', exportFmt);
            updateSetting('export.downloadFormat', exportFmt);
          }}
          className="bg-zinc-800/40 rounded-full border border-zinc-700/50 flex-nowrap p-1 shrink-0"
        >
          <Tip content={t('editor.modeTooltipLRC')}>
            <ToggleGroupItem value="lrc" className={MODE_ITEM_CLASS}>
              {t('editor.modeLRC')}
            </ToggleGroupItem>
          </Tip>
          <Tip content={t('editor.modeTooltipSRT')}>
            <ToggleGroupItem value="srt" className={MODE_ITEM_CLASS}>
              {t('editor.modeSRT')}
            </ToggleGroupItem>
          </Tip>
          <Tip content={wordsLocked ? t('editor.modeWordsLocked') : t('editor.modeTooltipWords')}>
            <ToggleGroupItem
              value="words"
              aria-disabled={wordsLocked}
              className={`${MODE_ITEM_CLASS} ${wordsLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {t('editor.modeWords')}
            </ToggleGroupItem>
          </Tip>
        </ToggleGroup>
      )}
    </div>
  );
}
