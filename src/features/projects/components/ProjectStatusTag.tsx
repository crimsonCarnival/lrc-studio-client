import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/utils/utils';
import type { ProjectStatus } from '../project-status';

const TONE: Record<ProjectStatus, string> = {
  completed: 'bg-foam/14 text-label',
  inProgress: 'bg-primary-soft text-primary-ink',
  notStarted: 'bg-raised text-subtle',
};

const LABEL_KEY = {
  completed: 'home.statusComplete',
  inProgress: 'home.inProgress',
  notStarted: 'home.notStarted',
} as const;

/** Status pill for a project (redesign sheet 07). Pills are for tags and status only. */
export function ProjectStatusTag({ status, withCheck, className }: { status: ProjectStatus; withCheck?: boolean; className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-[9px] font-mono text-[11px] font-semibold uppercase leading-none tracking-[0.08em]',
        TONE[status],
        className,
      )}
    >
      {withCheck && status === 'completed' && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7" />
        </svg>
      )}
      {t(LABEL_KEY[status])}
    </span>
  );
}
