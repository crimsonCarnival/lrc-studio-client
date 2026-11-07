import { useTranslation } from 'react-i18next';
import { ArtistText } from '@/features/artists/ArtistText';
import { ProjectListCover } from '@/features/projects/components/ProjectListCover';
import { projectProgress, projectStatus } from '@/features/projects/project-status';
import type { CardProject } from '@/features/library/components/ProjectCard';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';

/**
 * Phone-width "resume last session": one row, 56px cover, title, thin progress bar and a
 * 44px play button. The row opens the editor too; the button is the labelled keyboard and
 * screen-reader way in (its click bubbles to the row's handler, as on the desktop card).
 */
export function HomeResumeRow({ project, onOpen }: { project: CardProject; onOpen: () => void }) {
  const { t } = useTranslation();
  const title = project.title || t('library.untitled');
  const pct = projectProgress(project);
  const complete = projectStatus(project) === 'completed';

  return (
    <article
      onClick={onOpen}
      className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-card)] bg-background p-3 inset-ring inset-ring-hl"
    >
      <ProjectListCover coverImage={project.coverImage} genre={project.metadata?.genre} className="size-14" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate font-heading text-base font-bold text-foreground">{title}</h3>
        <p className="truncate text-xs text-subtle">
          <ArtistText metadata={project.metadata} fallback={t('home.noArtist')} />
        </p>
        <div className="flex items-center gap-2">
          <div className="h-[3px] flex-1 overflow-hidden rounded-sm bg-hl" aria-hidden="true">
            <div className={`h-full rounded-sm ${complete ? 'bg-foam' : 'bg-iris'}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 font-mono text-xs tabular-nums text-subtle">{pct}%</span>
        </div>
      </div>
      <Button
        type="button"
        size={null}
        aria-label={`${t('home.resume')}: ${title}`}
        className="size-11 shrink-0 rounded-pill p-0"
      >
        <Icon name="play_arrow" size={22} filled />
      </Button>
    </article>
  );
}
