import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { cn } from '@/shared/utils/utils';
import type { ProjectKind } from '@/types';

/** Marks a subtitle project wherever projects are listed. Songs are the default, so they get nothing. */
export function ProjectKindBadge({ kind, className }: { kind?: ProjectKind | null; className?: string }) {
  const { t } = useTranslation();
  if (kind !== 'subtitles') return null;
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-pill bg-primary-soft px-[9px] font-mono text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-primary-ink',
        className,
      )}
    >
      <Icon name="subtitles" size={12} />
      {t('project.kindSubtitles')}
    </span>
  );
}
