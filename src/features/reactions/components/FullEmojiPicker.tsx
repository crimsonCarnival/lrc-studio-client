import { useTranslation } from 'react-i18next';
import { EmojiPicker } from 'frimousse';
import type { EmojiPickerListCategoryHeaderProps, EmojiPickerListEmojiProps, EmojiPickerListRowProps } from 'frimousse';
import { cn } from '@/shared/utils/utils';

// Defined at module level: the list is virtualized and remounts rows whose component identity changes.
function CategoryHeader({ category, ...props }: EmojiPickerListCategoryHeaderProps) {
  return (
    <div {...props} className="bg-background px-1.5 pt-2.5 pb-1 font-mono text-[11px] font-semibold tracking-[0.14em] text-subtle uppercase">
      {category.label}
    </div>
  );
}

function Row({ children, ...props }: EmojiPickerListRowProps) {
  return <div {...props} className="scroll-my-1 px-0.5">{children}</div>;
}

function Emoji({ emoji, ...props }: EmojiPickerListEmojiProps) {
  return (
    <button
      {...props}
      className={cn('grid size-9 place-items-center rounded-[10px] text-xl leading-none', emoji.isActive && 'bg-primary-soft')}
    >
      {emoji.emoji}
    </button>
  );
}

const LIST_COMPONENTS = { CategoryHeader, Row, Emoji };

/**
 * The whole emoji catalogue, for a reaction outside the six quick ones. Loaded on demand
 * (its own chunk, and the emoji data is fetched on first open), so it costs nothing until used.
 */
export default function FullEmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage || i18n.language || 'en').startsWith('es') ? 'es' : 'en';

  return (
    <EmojiPicker.Root
      locale={locale}
      columns={8}
      onEmojiSelect={({ emoji }) => onSelect(emoji)}
      className="flex h-[280px] w-full flex-col gap-2"
    >
      <EmojiPicker.Search
        autoFocus
        aria-label={t('reactions.searchEmoji')}
        placeholder={t('reactions.searchEmoji')}
        className="h-10 w-full shrink-0 appearance-none rounded-[var(--radius-control)] bg-card px-3 text-[15px] font-medium text-foreground outline-none inset-ring inset-ring-hl placeholder:text-faint focus-visible:ring-0 focus-visible:inset-ring-2 focus-visible:inset-ring-iris [&::-webkit-search-cancel-button]:hidden"
      />
      <EmojiPicker.Viewport className="settings-scroll relative min-h-0 flex-1 outline-none">
        <EmojiPicker.Loading className="absolute inset-0 grid place-items-center text-sm text-subtle">
          {t('reactions.loadingEmoji')}
        </EmojiPicker.Loading>
        <EmojiPicker.Empty className="absolute inset-0 grid place-items-center text-sm text-subtle">
          {t('reactions.noEmoji')}
        </EmojiPicker.Empty>
        <EmojiPicker.List className="pb-1 select-none" components={LIST_COMPONENTS} />
      </EmojiPicker.Viewport>
    </EmojiPicker.Root>
  );
}
