import { useMemo } from 'react';
import type { ArtistCredit } from '@/features/artists/artist-credits';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { ProgressRing } from '@ui/progress-ring';
import { ProjectListCover } from '@/features/projects/components/ProjectListCover';
import { Button } from '@ui/button';

export interface AlmostDoneProject {
  publicId: string;
  title?: string;
  coverImage?: string;
  lineCount?: number;
  syncedLineCount?: number;
  metadata?: { songArtist?: string; artists?: ArtistCredit[]; genre?: string };
}

const MAX_SHOWN = 4;

/**
 * Projects that are started but not finished, nearest to completion first.
 *
 * The `synced > 0` condition is load-bearing: an untouched project is "not
 * started", not "almost done", and mixing the two makes the band meaningless as
 * a to-do list. Renders nothing when nothing qualifies.
 */
export function AlmostDoneBand({
  projects,
  onOpen,
}: {
  projects: AlmostDoneProject[];
  onOpen: (publicId: string) => void;
}) {
  const { t } = useTranslation();

  const items = useMemo(() => (
    projects
      .filter(p => {
        const total = p.lineCount ?? 0;
        const synced = p.syncedLineCount ?? 0;
        return total > 0 && synced > 0 && synced < total;
      })
      .map(p => ({
        ...p,
        pct: Math.min(99, Math.round(((p.syncedLineCount ?? 0) / (p.lineCount ?? 1)) * 100)),
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, MAX_SHOWN)
  ), [projects]);

  if (items.length === 0) return null;

  return (
    <section className="lg:w-[38%] lg:shrink-0 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="pending_actions" size={16} className="text-primary-ink" />
        <h2 className="text-sm font-bold text-subtle">{t('home.almostDone')}</h2>
        <span className="text-xs text-faint">{t('home.almostDoneSub')}</span>
      </div>

      {/* The ring replaces the old progress bar and wraps the cover thumbnail (sheet 07). */}
      <div className="flex flex-1 flex-col gap-2 rounded-[var(--radius-card)] bg-background p-2 inset-ring inset-ring-hl">
        {items.map(p => (
          <Button
            key={p.publicId}
            type="button"
            variant="ghost"
            size={null}
            onClick={() => onOpen(p.publicId)}
            className="h-auto justify-start gap-3.5 rounded-[14px] px-2.5 py-2 text-left font-normal hover:bg-raised hover:text-foreground"
          >
            {/* 44px ring, 4px stroke, 2px gap: leaves 32px for the cover. */}
            <ProgressRing value={p.pct} size={44} label={p.title || t('library.untitled')}>
              <span className="block size-8 overflow-hidden rounded-full">
                <ProjectListCover coverImage={p.coverImage} genre={p.metadata?.genre} className="size-8" />
              </span>
            </ProgressRing>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-base font-semibold text-foreground">
                {p.title || t('library.untitled')}
              </span>
              <span className="truncate font-mono text-xs font-medium text-subtle">
                {p.syncedLineCount} / {p.lineCount} {t('home.lines')}
              </span>
            </span>
            <span className="shrink-0 font-mono text-sm font-semibold text-primary-ink tabular-nums">{p.pct}%</span>
          </Button>
        ))}
      </div>
    </section>
  );
}
