import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { useMarkTap } from './useMarkTap';

export type PhoneNudge = {
  /** The line the buttons move: the cursor line when it is stamped, else the last stamped line before it. Null when there is none. */
  target: { number: number } | null;
  /** Seconds moved per tap (the editor's configured default nudge). */
  amount: number;
  onEarlier: () => void;
  onLater: () => void;
};

type PhoneMarkBarProps = {
  onMark: () => void;
  onUndo: () => void;
  canUndo: boolean;
  label: string;
  disabled?: boolean;
  /** The -/+ timestamp buttons next to Mark. Left out where a nudge makes no sense (viewers, Words). */
  nudge?: PhoneNudge;
};

/**
 * Undo plus the large Mark button, in thumb reach under the lyric list. It is rendered
 * outside the list's scroll container, so a scroll gesture can never stamp a line.
 *
 * Marking fires on pointerdown: waiting for the click adds latency you can hear. The click
 * that follows the same tap is swallowed; a keyboard or assistive-tech click (detail 0)
 * always marks.
 */
export default function PhoneMarkBar({ onMark, onUndo, canUndo, label, disabled = false, nudge }: PhoneMarkBarProps) {
  const { t } = useTranslation();
  const tap = useMarkTap(onMark, disabled);

  return (
    <div className="flex items-center gap-2 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <Button
        variant="outline"
        size="icon"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label={t('editor.undo')}
        className="size-12 lg:size-12 shrink-0 rounded-[calc(var(--radius)*1.5)] border-zinc-800 bg-transparent text-foreground/80 disabled:opacity-30"
      >
        <Icon name="undo" size={22} />
      </Button>
      {nudge && <NudgeButton dir={-1} nudge={nudge} />}
      <button
        type="button"
        disabled={disabled}
        {...tap}
        className="flex-1 min-w-0 h-14 rounded-pill bg-primary text-zinc-950 text-[17px] font-bold truncate px-4 select-none touch-manipulation [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent] transition-transform duration-75 active:scale-[0.97] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus"
      >
        {label}
      </button>
      {nudge && <NudgeButton dir={1} nudge={nudge} />}
      {/* Says which line the next tap stamps when it changes after a mark, without
          announcing anything while the song plays. */}
      <span role="status" aria-live="polite" className="sr-only">{label}</span>
    </div>
  );
}

/**
 * One of the two timestamp nudges beside Mark. A plain click: unlike Mark, a nudge is not timing
 * critical, so it takes the usual click path. The accessible name says which line moves.
 */
function NudgeButton({ dir, nudge }: { dir: 1 | -1; nudge: PhoneNudge }) {
  const { t } = useTranslation();
  const name = nudge.target
    ? t(dir < 0 ? 'editor.phone.nudge.earlier' : 'editor.phone.nudge.later', { number: nudge.target.number, amount: nudge.amount })
    : t('editor.phone.nudge.none');
  return (
    <Button
      variant="outline"
      size="icon"
      disabled={!nudge.target}
      onClick={dir < 0 ? nudge.onEarlier : nudge.onLater}
      aria-label={name}
      className="h-14 w-12 lg:h-14 lg:w-12 shrink-0 flex-col gap-0 rounded-[calc(var(--radius)*1.5)] border-zinc-800 bg-transparent text-foreground/80 disabled:opacity-30 touch-manipulation"
    >
      <Icon name={dir < 0 ? 'remove' : 'add'} size={20} />
      <span aria-hidden className="font-mono text-[10px] leading-none tabular-nums text-subtle">{nudge.amount}</span>
    </Button>
  );
}
