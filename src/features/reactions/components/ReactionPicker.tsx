import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { PopoverContent } from '@ui/popover';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { Icon } from '@/shared/ui/Icon';
import { cn } from '@/shared/utils/utils';
import { EMOJI_MAP } from './reaction-constants';

const FullEmojiPicker = lazy(() => import('./FullEmojiPicker'));

interface ReactionPickerProps {
  myReaction?: string | null;
  onReact: (code: string) => void;
}

/**
 * Content of the reaction popover (redesign sheet 18). Rendered inside the Popover that
 * ReactionBar owns, so it opens above the trigger and flips below when there is no room.
 */
export function ReactionPicker({ myReaction, onReact }: ReactionPickerProps) {
  const { t } = useTranslation();
  // Dynamic keys (one per emoji code) are not in the typed resources.
  const tk = t as (key: string) => string;
  const [showAll, setShowAll] = useState(false);

  return (
    <PopoverContent
      side="top"
      align="start"
      sideOffset={10}
      aria-label={t('reactions.addReaction')}
      // overflow-visible: the pointer sits outside the box, and the default scroll clip would cut it off.
      className="flex w-[348px] max-w-[calc(100vw-1.5rem)] flex-col gap-3 overflow-visible rounded-[18px] border-0 bg-background p-3 shadow-elevated inset-ring inset-ring-hl lg:min-w-0"
    >
      <div role="group" aria-label={t('reactions.reactTitle')} className="flex justify-between gap-1">
        {Object.entries(EMOJI_MAP).map(([code, emoji]) => (
          <Tip key={code} content={tk(`reactions.names.${code}`)}>
            <button
              type="button"
              aria-pressed={myReaction === code}
              aria-label={tk(`reactions.names.${code}`)}
              onClick={() => onReact(code)}
              className={cn(
                'grid size-[52px] place-items-center rounded-[14px] text-[28px] leading-none transition-[transform,background-color] duration-[180ms] ease-bounce select-none hover:-translate-y-1 hover:scale-[1.18] hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus motion-reduce:transform-none motion-reduce:transition-none max-sm:size-11 max-sm:text-2xl',
                myReaction === code && 'bg-primary-soft inset-ring-2 inset-ring-iris',
              )}
            >
              {emoji}
            </button>
          </Tip>
        ))}
      </div>

      {showAll ? (
        <Suspense fallback={<div className="grid h-[280px] place-items-center text-sm text-subtle">{t('reactions.loadingEmoji')}</div>}>
          <FullEmojiPicker onSelect={onReact} />
        </Suspense>
      ) : (
        <Button variant="outline" onClick={() => setShowAll(true)} className="h-11 w-full justify-start gap-2 px-3 text-[15px] text-subtle lg:h-11 lg:px-3 lg:text-[15px]">
          <Icon name="add_reaction" size={18} />
          {t('reactions.moreEmoji')}
        </Button>
      )}

      <PopoverPrimitive.Arrow width={16} height={8} className="fill-background drop-shadow-[0_1px_0_var(--hl)]" />
    </PopoverContent>
  );
}
