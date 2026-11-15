import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/utils/utils';

/** Read-only Private/Public marker; only the owner is ever shown one. */
export function VisibilityChip({ isPublic, className }: { isPublic: boolean; className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'rounded-pill border px-2 py-0.5 text-xs font-semibold',
        isPublic ? 'border-foam/40 text-foam' : 'border-border text-muted-foreground',
        className,
      )}
    >
      {isPublic ? t('profile.artists.public') : t('profile.artists.private')}
    </span>
  );
}
