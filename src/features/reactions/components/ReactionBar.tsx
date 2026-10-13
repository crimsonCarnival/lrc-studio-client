import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Icon } from '@/shared/ui/Icon';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverTrigger } from '@ui/popover';
import { Tip } from '@ui/tip';
import { cn } from '@/shared/utils/utils';
import { ReactionPicker } from './ReactionPicker';
import { EMOJI_MAP } from './reaction-constants';

interface ReactionCount {
  emoji: string;
  count: number;
}

interface ReactionBarProps {
  reactions?: ReactionCount[];
  myReaction?: string | null;
  onReact?: (emoji: string) => void;
  disabled?: boolean;
}

const EMPTY_REACTIONS: ReactionCount[] = [];
const RAY_ANGLES = [0, 60, 120, 180, 240, 300];
const MAX_CHIPS = 8;
const EMOJIS: Record<string, string> = EMOJI_MAP;

export function ReactionBar({
  reactions = EMPTY_REACTIONS,
  myReaction = null,
  onReact,
  disabled = false,
}: ReactionBarProps) {
  const { t } = useTranslation();
  // Dynamic keys (one per emoji code) are not in the typed resources.
  const tk = t as (key: string, options?: Record<string, unknown>) => string;
  const [pickerOpen, setPickerOpen] = useState(false);
  // The reaction that was just added, so only that chip plays the burst.
  const [burst, setBurst] = useState<string | null>(null);

  // Zero-count chips disappear instead of sitting at "0". Any emoji is allowed now, so a
  // popular project could collect dozens of distinct ones: show the most used (and always
  // your own) and fold the long tail into a "+N" pill.
  const ranked = reactions.filter(r => r.count > 0).sort((a, b) => b.count - a.count);
  const active = ranked.filter((r, i) => i < MAX_CHIPS || r.emoji === myReaction);
  const hidden = ranked.length - active.length;

  const react = (emoji: string) => {
    if (disabled) return;
    // Burst only when adding: tapping your own reaction removes it, which is not a celebration.
    setBurst(emoji === myReaction ? null : emoji);
    onReact?.(emoji);
  };

  return (
    <div className="flex items-center flex-wrap gap-1.5">
      {active.map(({ emoji, count }) => {
        const mine = myReaction === emoji;
        // Custom emoji have no name; the glyph itself is the best label available.
        const name = emoji in EMOJIS ? tk(`reactions.names.${emoji}`) : emoji;
        const who = mine
          ? count > 1 ? t('reactions.whoYouAndOthers', { count: count - 1 }) : t('reactions.whoOnlyYou')
          : t('reactions.whoPeople', { count });
        return (
          <Tip key={emoji} content={who}>
            <button
              type="button"
              onClick={() => react(emoji)}
              aria-disabled={disabled || undefined}
              aria-pressed={mine}
              aria-label={t(mine ? 'reactions.chipLabelMine' : 'reactions.chipLabel', { name, count })}
              className={cn(
                'relative inline-flex h-[34px] items-center gap-1.5 rounded-full px-[11px] font-mono text-[13px] font-medium tabular-nums transition-[background-color,box-shadow] duration-[var(--duration-state)] select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus',
                mine
                  ? 'bg-primary-soft text-primary-ink inset-ring-[1.5px] inset-ring-iris'
                  : 'bg-raised text-foreground inset-ring inset-ring-hl',
                disabled ? 'cursor-default' : !mine && 'hover:inset-ring-faint',
              )}
            >
              <span aria-hidden className={cn('text-base leading-none', burst === emoji && 'reaction-bump')}>
                {EMOJIS[emoji] ?? emoji}
              </span>
              {count}
              {burst === emoji && RAY_ANGLES.map((angle, i) => (
                <i
                  key={angle}
                  aria-hidden
                  className="reaction-ray"
                  style={{ '--a': `${angle}deg` } as CSSProperties}
                  // All rays end together; clearing on the last one lets the next reaction replay.
                  onAnimationEnd={i === RAY_ANGLES.length - 1 ? () => setBurst(null) : undefined}
                />
              ))}
            </button>
          </Tip>
        );
      })}

      {hidden > 0 && (
        <span
          aria-label={t('reactions.moreReactions', { count: hidden })}
          className="inline-flex h-[34px] items-center rounded-full px-[11px] font-mono text-[13px] font-medium text-subtle tabular-nums inset-ring inset-ring-hl"
        >
          +{hidden}
        </span>
      )}

      {!disabled && (
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <Tip content={t('reactions.addReaction')}>
            <PopoverTrigger
              aria-label={t('reactions.addReaction')}
              className="grid size-[34px] shrink-0 place-items-center rounded-full text-subtle inset-ring inset-ring-hl transition-[background-color,box-shadow,color] duration-[var(--duration-state)] hover:bg-primary-soft hover:text-primary-ink hover:inset-ring-[1.5px] hover:inset-ring-iris focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus aria-expanded:bg-primary-soft aria-expanded:text-primary-ink aria-expanded:inset-ring-[1.5px] aria-expanded:inset-ring-iris coarse:size-11"
            >
              <Icon name="add_reaction" size={17} />
            </PopoverTrigger>
          </Tip>
          <ReactionPicker
            // Remounted per open so the full catalogue is collapsed again next time.
            key={String(pickerOpen)}
            myReaction={myReaction}
            onReact={(emoji) => {
              react(emoji);
              setPickerOpen(false);
            }}
          />
        </Popover>
      )}
    </div>
  );
}
