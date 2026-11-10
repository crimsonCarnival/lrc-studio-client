import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { cn } from '@/shared/utils/utils';

type VisibilityChipProps = {
  isPublic: boolean;
  /** Only meaningful while public. False shows Unlisted. */
  isListed?: boolean;
  onOpen: () => void;
  className?: string;
};

/**
 * The project's visibility, always visible in the editor header. Tapping it opens the
 * publish flow; it never changes visibility by itself. Short enough for a phone header.
 */
export function VisibilityChip({ isPublic, isListed = true, onOpen, className }: VisibilityChipProps) {
  const { t } = useTranslation();
  const unlisted = isPublic && !isListed;
  const state = t(unlisted ? 'project.visibilityChipUnlisted' : isPublic ? 'project.visibilityChipPublic' : 'project.visibilityChipPrivate');
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t('project.visibilityChipLabel', { state })}
      data-visibility={unlisted ? 'unlisted' : isPublic ? 'public' : 'private'}
      className={cn(
        'inline-flex h-10 coarse:h-11 shrink-0 items-center justify-center gap-1.5 rounded-pill px-3 max-[420px]:min-w-10 coarse:max-[420px]:min-w-11 max-[420px]:px-0 text-[13px] font-semibold whitespace-nowrap transition-colors duration-[var(--duration-state)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus',
        unlisted
          ? 'bg-primary-soft text-primary-ink inset-ring inset-ring-primary'
          : isPublic
          ? 'bg-foam-soft text-foam-ink inset-ring inset-ring-foam'
          : 'bg-raised text-subtle inset-ring inset-ring-hl hover:bg-overlay hover:text-foreground',
        className,
      )}
    >
      <Icon name={unlisted ? 'link' : isPublic ? 'public' : 'lock'} size={14} />
      {/* Narrow headers keep the icon and the colour; the state stays in the accessible name. */}
      <span className="max-[420px]:sr-only">{state}</span>
    </button>
  );
}
