import { Link } from 'react-router-dom';
import { artistDisplay } from '@/features/artists/artist-credits';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { ProjectListCover } from '@/features/projects/components/ProjectListCover';
import { ProjectMenu, ProjectMenuButton } from '@/features/projects/components/ProjectMenu';
import { projectPath } from '@/features/projects/project-path';
import type { Project } from '@/types';
import { Highlight } from './Highlight';

const ROW_CLASS = 'flex items-center gap-4 rounded-[18px] bg-background px-[18px] py-4 inset-ring inset-ring-hl transition-shadow duration-[var(--duration-state)] hover:inset-ring-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus';

export function SearchProjectCard({ project, query }: { project: Project; query: string }) {
  const { t } = useTranslation();
  const { title, coverImage, starCount, forkCount, metadata, forkedFrom } = project;
  const displayTitle = metadata?.songName || title || t('library.untitled');
  const artist = artistDisplay(metadata);
  // Null when the search result carries no owner account name: the row then
  // renders non-navigable rather than pointing at a path that would 404.
  const href = projectPath(project);
  const body = (
    <>
        <ProjectListCover coverImage={coverImage} genre={metadata?.genre} className="size-14" />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate font-heading text-xl leading-tight font-bold tracking-[-0.02em] text-foreground">
            <Highlight text={displayTitle} query={query} />
          </p>
          <p className="truncate text-sm text-subtle">
            {artist && <><Highlight text={artist} query={query} />{' · '}</>}
            {t(project.hasWordSync ? 'search.wordSync' : 'search.lineSync')}
          </p>
          {forkedFrom?.accountName && (
            <p className="truncate text-xs text-faint">
              {t('search.forkedFrom', { accountName: forkedFrom.accountName })}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 font-mono text-xs font-medium text-subtle tabular-nums">
          <span className="flex items-center gap-1"><Icon name="star" size={14} />{starCount ?? 0}</span>
          <span className="flex items-center gap-1"><Icon name="call_split" size={14} />{forkCount ?? 0}</span>
          <ProjectMenuButton project={project} isOwner={false} className="grid size-8 place-items-center rounded-[10px] text-subtle transition-colors hover:bg-raised hover:text-foreground coarse:size-11" />
        </div>
    </>
  );

  return (
    <ProjectMenu project={project} isOwner={false}>
      {href
        ? <Link to={href} className={ROW_CLASS}>{body}</Link>
        : <div className={ROW_CLASS}>{body}</div>}
    </ProjectMenu>
  );
}
