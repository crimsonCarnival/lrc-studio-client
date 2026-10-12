import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { Icon } from '@/shared/ui/Icon';
import type { EditorLine } from '@/features/editor/services/editor.service';
import { LogoLoader } from '@ui/LogoLoader';

interface EditorToolbarProps {
  editorMode: string;
  lines: EditorLine[];
  // Auto Stamp (#9)
  autoStampHasAudio?: boolean;
  autoStampRunning?: boolean;
  onAutoStamp?: () => void;
}

// Teal is `success`; in the light theme that token is too pale to read as text on
// a light surface, so it is mixed toward the foreground there.
const TEAL_TEXT =
  'text-[color-mix(in_srgb,var(--color-success)_50%,var(--foreground))] hover:text-[color-mix(in_srgb,var(--color-success)_50%,var(--foreground))] ' +
  'dark:text-success dark:hover:text-success';

export default function EditorToolbar({
  editorMode,
  lines,
  autoStampHasAudio,
  autoStampRunning,
  onAutoStamp,
}: EditorToolbarProps) {
  const { t } = useTranslation();

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

  return (
    <div className="flex items-center min-w-0">
      {onAutoStamp && (
        <Tip content={autoStampTip}>
          <Button
            variant="outline"
            aria-disabled={autoStampDisabled}
            aria-label={isWordsMode ? t('editor.autoStamp.buttonWords') : t('editor.autoStamp.button')}
            onClick={() => { if (!autoStampDisabled) onAutoStamp(); }}
            className={`h-9 lg:h-9 coarse:h-11 px-3.5 lg:px-3.5 gap-2 rounded-lg shrink-0 text-[13px] lg:text-[13px] font-semibold border-success/40 bg-success/10 dark:border-success/40 dark:bg-success/10 ${TEAL_TEXT} ${
              autoStampDisabled
                ? 'opacity-50 cursor-not-allowed hover:bg-success/10 dark:hover:bg-success/10'
                : 'hover:bg-success/20 dark:hover:bg-success/20 hover:border-success/60'
            }`}
          >
            {autoStampRunning ? <LogoLoader size={16} /> : <Icon name={isWordsMode ? 'spellcheck' : 'auto_fix_high'} size={16} />}
            <span className="hidden sm:inline whitespace-nowrap">
              {isWordsMode ? t('editor.autoStamp.buttonWords') : t('editor.autoStamp.button')}
            </span>
          </Button>
        </Tip>
      )}
    </div>
  );
}
