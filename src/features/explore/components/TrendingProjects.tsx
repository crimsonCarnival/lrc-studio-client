import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { projectPath } from '@/features/projects/project-path';
import { useTrendingProjects, useExploreTracking } from '../hooks/useExplore';
import { LogoLoader } from '@ui/LogoLoader';
import { UserAvatar } from '@ui/UserAvatar';
import { ProjectKindBadge } from '@/features/projects/components/ProjectKindBadge';
import { cn } from '@/shared/utils/utils';
import type { ProjectKind } from '@/types';
import { NameTag } from '@/features/badges/NameTag';
import type { NameTagData } from '@/features/badges/badges.types';
import { projectDisplayTitle } from '@/features/projects/project-title';

export interface ExploreProject {
  id: string;
  publicId?: string;
  slug?: string | null;
  title?: string | null;
  kind?: ProjectKind | null;
  coverImage?: string | null;
  upload?: { uploadUrl?: string | null } | null;
  accountName?: string;
  user?: { accountName?: string; displayName?: string | null; avatarUrl?: string | null; staffRole?: string | null; nameTag?: NameTagData | null } | null;
  owner?: { accountName?: string } | null;
  metadata?: { songName?: string | null; songArtist?: string | null } | null;
  starCount?: number | null;
  forkCount?: number | null;
}

export type KindFilter = 'all' | ProjectKind;

const CARD = 'group flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-raised text-foreground inset-ring inset-ring-hl transition-[box-shadow,translate] duration-[var(--duration-state)] hover:-translate-y-0.5 hover:inset-ring-faint hover:shadow-[var(--shadow-elevated)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:hover:translate-y-0';

const ownerOf = (p: ExploreProject) => p.user?.accountName ?? p.owner?.accountName ?? p.accountName;
const coverOf = (p: ExploreProject) => p.coverImage ?? p.upload?.uploadUrl ?? null;
// The title already is the song name, so the line under it is only who sings it.
const songLine = (p: ExploreProject) => p.metadata?.songArtist ?? '';

function Cover({ project, className, playSize = 40 }: { project: ExploreProject; className?: string; playSize?: number }) {
  const cover = coverOf(project);
  return (
    <div className={cn('relative shrink-0 overflow-hidden bg-primary-soft', className)}>
      {cover ? (
        <img src={cover} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <Icon name={project.kind === 'subtitles' ? 'subtitles' : 'music_note'} size={32} className="text-primary-ink/60" />
        </div>
      )}
      <span
        aria-hidden="true"
        style={{ width: playSize, height: playSize }}
        className="absolute bottom-2.5 right-2.5 grid place-items-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-[var(--shadow-card)] transition-opacity duration-[var(--duration-state)] group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <Icon name="play_arrow" size={Math.round(playSize * 0.5)} filled />
      </span>
    </div>
  );
}

function Stats({ project, long = false }: { project: ExploreProject; long?: boolean }) {
  const { t } = useTranslation();
  const stars = project.starCount ?? 0;
  const forks = project.forkCount ?? 0;
  return (
    <div className={cn('flex items-center gap-3.5 text-subtle', long ? 'text-[13px]' : 'text-xs')}>
      <span className="flex items-center gap-1" aria-label={t('explore.trending.stars', { count: stars })}>
        <Icon name="star" size={long ? 15 : 13} />
        {long ? t('explore.trending.stars', { count: stars }) : stars}
      </span>
      <span className="flex items-center gap-1" aria-label={t('explore.trending.forks', { count: forks })}>
        <Icon name="call_split" size={long ? 15 : 13} />
        {long ? t('explore.trending.forks', { count: forks }) : forks}
      </span>
    </div>
  );
}

function Owner({ project, size = 'sm' }: { project: ExploreProject; size?: 'sm' | 'md' }) {
  const owner = ownerOf(project);
  if (!owner) return null;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <UserAvatar
        accountName={owner}
        displayName={project.user?.displayName}
        avatarUrl={project.user?.avatarUrl}
        staffRole={project.user?.staffRole}
        className={size === 'md' ? 'size-7 text-xs' : 'size-5 text-[10px]'}
      />
      <span className={cn('truncate', size === 'md' ? 'text-sm font-medium text-foreground' : 'text-[13px] text-subtle')}>
        {project.user?.displayName || owner}
      </span>
      <NameTag tag={project.user?.nameTag} />
    </div>
  );
}

/** Links to the project, or a plain box when it has no canonical URL (no owner account name). */
function CardShell({ project, className, onOpen, children }: { project: ExploreProject; className?: string; onOpen: (id: string) => void; children: React.ReactNode }) {
  const publicId = project.publicId ?? project.id;
  const href = projectPath({ ...project, publicId }, ownerOf(project));
  return href
    ? <Link to={href} className={cn(CARD, className)} onClick={() => onOpen(publicId)}>{children}</Link>
    : <div className={cn(CARD, className)}>{children}</div>;
}

function FeaturedProject({ project, onOpen }: { project: ExploreProject; onOpen: (id: string) => void }) {
  const { t } = useTranslation();
  const song = songLine(project);
  return (
    <CardShell project={project} onOpen={onOpen} className="flex-row flex-wrap">
      <div className="relative min-h-[220px] flex-[1_1_340px]">
        <Cover project={project} className="absolute inset-0" playSize={52} />
        <span className="absolute left-4 top-4 rounded-[var(--radius-chip)] bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
          {t('explore.trending.featured')}
        </span>
      </div>
      <div className="flex min-w-0 flex-[1_1_320px] flex-col justify-center gap-3.5 p-6 lg:p-7">
        <ProjectKindBadge kind={project.kind} className="self-start" />
        <h3 className="font-heading text-3xl font-bold leading-tight text-foreground group-hover:text-primary-ink line-clamp-2">
          {projectDisplayTitle(project, t('feed.untitled'))}
        </h3>
        {song && <p className="text-[15px] text-subtle line-clamp-1">{song}</p>}
        <Owner project={project} size="md" />
        <Stats project={project} long />
      </div>
    </CardShell>
  );
}

export function ProjectCard({ project, onOpen }: { project: ExploreProject; onOpen: (id: string) => void }) {
  const { t } = useTranslation();
  const song = songLine(project);
  return (
    <CardShell project={project} onOpen={onOpen}>
      <div className="relative aspect-square w-full">
        <Cover project={project} className="absolute inset-0" />
        {project.kind === 'subtitles' && (
          <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-[var(--radius-chip)] bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
            <Icon name="subtitles" size={12} />{t('project.kindSubtitles')}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5 px-3.5 pb-3.5 pt-3">
        <p className="truncate text-[15px] font-semibold group-hover:text-primary-ink">{projectDisplayTitle(project, t('feed.untitled'))}</p>
        {song && <p className="-mt-1 truncate text-xs text-subtle">{song}</p>}
        <Owner project={project} />
        <Stats project={project} />
      </div>
    </CardShell>
  );
}

/** Trending projects: the top one featured, the rest as a grid. `kind` filters both. */
export function TrendingProjects({ limit = 6, kind = 'all' }: { limit?: number; kind?: KindFilter }) {
  const { t } = useTranslation();
  // Over-fetch so a kind filter still has something to show from the ranked preview.
  const { projects, loading, error } = useTrendingProjects(limit * 2 + 1) as {
    projects: ExploreProject[];
    loading: boolean;
    error: unknown;
  };
  const shown = kind === 'all' ? projects : projects.filter((p) => (p.kind ?? 'song') === kind);
  const [featured, ...rest] = shown;
  const grid = rest.slice(0, limit);
  const trackOpen = useExploreTracking(projects);

  return (
    <section aria-labelledby="explore-trending" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="explore-trending" className="font-heading text-xl font-semibold text-foreground">{t('explore.trending.title')}</h2>
        <Link to="/explore/projects" className="text-[13px] font-medium text-primary-ink hover:text-foreground">
          {t('explore.trending.seeAll')}
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><LogoLoader size={24} className="text-subtle" /></div>
      ) : error || !featured ? (
        <p className="py-10 text-center text-sm text-subtle">
          {kind === 'all' || error ? t('explore.trending.empty') : t('explore.trending.emptyKind')}
        </p>
      ) : (
        <>
          <FeaturedProject project={featured} onOpen={trackOpen} />
          {grid.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-4">
              {grid.map((p) => <ProjectCard key={p.id} project={p} onOpen={trackOpen} />)}
            </div>
          )}
        </>
      )}
    </section>
  );
}
