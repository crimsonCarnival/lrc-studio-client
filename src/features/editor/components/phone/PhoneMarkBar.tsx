import { useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';

type PhoneMarkBarProps = {
  onMark: () => void;
  onUndo: () => void;
  canUndo: boolean;
  label: string;
  disabled?: boolean;
};

/**
 * Undo plus the large Mark button, in thumb reach under the lyric list. It is rendered
 * outside the list's scroll container, so a scroll gesture can never stamp a line.
 *
 * Marking fires on pointerdown: waiting for the click adds latency you can hear. The click
 * that follows the same tap is swallowed; a click with no pointerdown before it (keyboard,
 * switch access, a screen reader) still marks.
 */
export default function PhoneMarkBar({ onMark, onUndo, canUndo, label, disabled = false }: PhoneMarkBarProps) {
  const { t } = useTranslation();
  const markedOnPointer = useRef(false);

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    // Browsers differ on whether a disabled button still gets pointer events, so check.
    // A second finger or a non-primary mouse button is not a tap on Mark either.
    if (disabled || !e.isPrimary || e.button !== 0) return;
    // No focus ring, no emulated mouse events, no text selection from a long press.
    e.preventDefault();
    markedOnPointer.current = true;
    onMark();
  };

  const handleClick = () => {
    if (disabled) return;
    if (markedOnPointer.current) {
      markedOnPointer.current = false;
      return;
    }
    onMark();
  };

  // Enter and Space activate the focused button, which marks through handleClick. Keep the
  // keypress from also reaching the editor's window shortcuts (Enter is the default mark
  // key there), or one press would stamp twice.
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    markedOnPointer.current = false;
    if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
  };

  return (
    <div className="flex items-center gap-3 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <Button
        variant="outline"
        size="icon"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label={t('editor.undo')}
        className="size-14 lg:size-14 shrink-0 rounded-[calc(var(--radius)*1.5)] border-zinc-800 bg-transparent text-foreground/80 disabled:opacity-30"
      >
        <Icon name="undo" size={22} />
      </Button>
      <button
        type="button"
        disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerCancel={() => { markedOnPointer.current = false; }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onContextMenu={(e) => e.preventDefault()}
        className="flex-1 min-w-0 h-14 rounded-pill bg-primary text-zinc-950 text-[17px] font-bold truncate px-4 select-none touch-manipulation [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent] transition-transform duration-75 active:scale-[0.97] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus"
      >
        {label}
      </button>
    </div>
  );
}
