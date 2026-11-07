import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { usePlayer } from '@/features/player/PlayerContext';
import { formatTime } from '@/shared/utils/format-time';
import PhonePlayerStrip from './PhonePlayerStrip';
import { useMarkTap } from './useMarkTap';

export type PhoneFocusViewProps = {
  /** Neighbouring lyric lines' text; null where there is none (start or end of the song). */
  previous: string | null;
  current: string | null;
  next: string | null;
  /** The same handleMark the Mark bar calls. */
  onMark: () => void;
  onUndo: () => void;
  canUndo: boolean;
  /** Accessible name and text of the stamp area, e.g. "Mark line 3". */
  label: string;
  disabled: boolean;
  /** Why the stamp area is disabled, shown on it and read with it. */
  disabledHint?: string;
  /** Back to the lyric list. */
  onClose: () => void;
  onAddMedia?: () => void;
};

const NEIGHBOUR = 'min-h-[1.5em] truncate text-center text-[17px] text-foreground/50';

/**
 * Sync with one line in view: previous and next small, the current line large, the running
 * time, and a stamp area that fills the thumb zone. It stamps on pointerdown through the same
 * path as the Mark bar (useMarkTap), once per tap. The stamp area has no scrolling content and
 * is a sibling of every other control, so neither a scroll nor a tap on Undo, Back or the
 * player can stamp. touch-none turns off double-tap zoom and pan on it.
 */
export default function PhoneFocusView({
  previous, current, next, onMark, onUndo, canUndo, label, disabled, disabledHint, onClose, onAddMedia,
}: PhoneFocusViewProps) {
  const { t } = useTranslation();
  const { currentTime } = usePlayer();
  const tap = useMarkTap(onMark, disabled);
  const hintId = useId();

  return (
    <div
      data-testid="phone-focus-view"
      className="flex flex-1 min-h-0 flex-col short-landscape:flex-row select-none touch-manipulation [-webkit-touch-callout:none]"
    >
      <div className="flex flex-1 min-h-0 min-w-0 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 px-2 pt-1">
          <Button
            variant="ghost"
            onClick={onClose}
            aria-label={t('editor.phone.focus.close')}
            className="h-11 lg:h-11 gap-1.5 px-2 text-[15px] font-semibold text-foreground/80"
          >
            <Icon name="list" size={20} />
            {t('editor.phone.focus.close')}
          </Button>
          <span className="font-mono text-2xl font-semibold tabular-nums text-foreground" aria-hidden>
            {formatTime(currentTime)}
          </span>
        </div>
        <div className="flex flex-1 min-h-0 flex-col justify-center gap-3 px-5 py-2">
          <p className={NEIGHBOUR}>
            <span className="sr-only">{t('editor.phone.focus.previous')}: </span>{previous ?? ''}
          </p>
          <p className="break-words text-center font-heading text-[28px] font-bold leading-tight text-foreground line-clamp-4">
            <span className="sr-only">{t('editor.phone.focus.current')}: </span>{current ?? t('editor.phone.focus.none')}
          </p>
          <p className={NEIGHBOUR}>
            <span className="sr-only">{t('editor.phone.focus.next')}: </span>{next ?? ''}
          </p>
        </div>
        <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/60">
          <PhonePlayerStrip onAddMedia={onAddMedia} />
        </div>
      </div>
      <div className="flex flex-[1.3_1_0%] min-h-40 items-stretch gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] short-landscape:min-h-0 short-landscape:w-[48%] short-landscape:flex-none short-landscape:flex-col-reverse">
        <Button
          variant="outline"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label={t('editor.undo')}
          className="size-14 lg:size-14 shrink-0 self-end rounded-[calc(var(--radius)*1.5)] border-zinc-800 bg-transparent text-foreground/80 disabled:opacity-30 short-landscape:self-start"
        >
          <Icon name="undo" size={22} />
        </Button>
        <button
          type="button"
          disabled={disabled}
          aria-label={label}
          aria-describedby={disabled && disabledHint ? hintId : undefined}
          {...tap}
          className="flex-1 min-w-0 rounded-[calc(var(--radius)*2)] bg-primary px-4 text-zinc-950 text-[22px] font-bold select-none touch-none [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent] transition-transform duration-75 active:scale-[0.98] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus"
        >
          {label}
          {disabled && disabledHint && (
            <span id={hintId} className="mt-1 block text-[13px] font-medium opacity-80">{disabledHint}</span>
          )}
        </button>
        {/* One announcement per cursor move: the lyric about to be stamped, then which line it is.
            The running time is aria-hidden, so playback never re-announces. */}
        <span role="status" aria-live="polite" className="sr-only">{current ? `${current}. ` : ''}{label}</span>
      </div>
    </div>
  );
}
