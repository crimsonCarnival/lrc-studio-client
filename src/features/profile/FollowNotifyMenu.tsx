import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { Popover, PopoverContent, PopoverItem, PopoverTrigger } from '@ui/popover';

export type FollowNotifyLevel = 'off' | 'uploads' | 'all';

const LEVELS: { value: FollowNotifyLevel; icon: string }[] = [
  { value: 'off', icon: 'notifications_off' },
  { value: 'uploads', icon: 'library_add' },
  { value: 'all', icon: 'notifications_active' },
];

/** What you hear about a followed user's projects: nothing, new projects, or those and edits. */
export function FollowNotifyMenu({ level, disabled, onChange }: {
  level: FollowNotifyLevel;
  disabled?: boolean;
  onChange: (level: FollowNotifyLevel) => void;
}) {
  const { t } = useTranslation();
  const tk = t as (key: string) => string;
  const [open, setOpen] = useState(false);
  const current = LEVELS.find(l => l.value === level) ?? LEVELS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tip content={tk('profile.followNotify.title')}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={disabled}
            aria-label={tk('profile.followNotify.title')}
            className={`bg-zinc-800/50 hover:bg-zinc-700 border-zinc-700 ${level === 'off' ? '' : 'text-primary border-primary/40'}`}
          >
            <Icon name={current.icon} size={16} />
          </Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent align="end" className="w-64 p-1.5">
        <p className="px-2.5 pt-1.5 pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">
          {tk('profile.followNotify.title')}
        </p>
        {LEVELS.map(({ value, icon }) => (
          <PopoverItem
            key={value}
            onClick={() => { setOpen(false); if (value !== level) onChange(value); }}
            className="items-start gap-3"
          >
            <Icon name={icon} size={16} className={`mt-0.5 shrink-0 ${value === level ? 'text-primary' : 'text-zinc-500'}`} />
            <span className="flex-1">
              <span className="block text-sm font-semibold">{tk(`profile.followNotify.${value}`)}</span>
              <span className="block text-xs text-zinc-500">{tk(`profile.followNotify.${value}Hint`)}</span>
            </span>
            {value === level && <Icon name="check" size={14} className="mt-0.5 text-primary" />}
          </PopoverItem>
        ))}
      </PopoverContent>
    </Popover>
  );
}
