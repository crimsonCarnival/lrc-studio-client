import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { projectPath } from '@/features/projects/project-path';
import { useTrendingProjects } from '../hooks/useExplore';
import { LogoLoader } from '@ui/LogoLoader';

interface ExploreProject {
  id: string;
  publicId?: string;
  slug?: string | null;
  title?: string;
  coverImage?: string | null;
  upload?: { uploadUrl?: string } | null;
  accountName?: string;
  user?: { accountName?: string } | null;
  owner?: { accountName?: string } | null;
  metadata?: { songName?: string | null; songArtist?: string | null } | null;
  starCount?: number;
  forkCount?: number;
}

export function TrendingProjects({ limit = 6 }: { limit?: number }) {
  const { t } = useTranslation();
  const { projects, loading, error } = useTrendingProjects(limit) as {
    projects: ExploreProject[];
    loading: boolean;
    error: unknown;
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">{t('explore.trending.title')}</h2>
        <Link
          to="/explore/projects"
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          {t('explore.trending.seeAll')}
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <LogoLoader size={24} className="text-zinc-500" />
        </div>
      ) : error || projects.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-10">
          {t('explore.trending.empty')}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {projects.map(project => {
            // One owner name for both the link and the byline. They were resolved
            // separately before, and the byline read `owner`/`accountName` while
            // the query returns the owner under `user` — so it rendered empty.
            const ownerName = project.user?.accountName ?? project.owner?.accountName ?? project.accountName;
            // No owner account name means no canonical URL: the card renders
            // without a link rather than pointing at a path that would 404.
            const href = projectPath(
              { ...project, publicId: project.publicId ?? project.id },
              ownerName,
            );
            const CARD_CLASS = 'flex flex-col rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700/70 transition-colors overflow-hidden group';
            const body = (
              <>
              <div className="aspect-video w-full bg-gradient-to-br from-primary/30 to-violet-500/30 flex items-center justify-center relative shrink-0">
                {project.coverImage || project.upload?.uploadUrl ? (
                  <img
                    src={project.coverImage ?? project.upload?.uploadUrl}
                    alt={project.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <Icon name="music_note" size={32} className="text-primary/50" />
                )}
              </div>
              <div className="p-3 flex flex-col gap-1">
                <p className="text-sm font-semibold text-white line-clamp-1 group-hover:text-primary transition-colors">
                  {project.title}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {ownerName}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <Icon name="star" size={12} />
                    {project.starCount ?? 0}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <Icon name="call_split" size={12} />
                    {project.forkCount ?? 0}
                  </span>
                </div>
              </div>
              </>
            );
            return href
              ? <Link key={project.id} to={href} className={CARD_CLASS}>{body}</Link>
              : <div key={project.id} className={CARD_CLASS}>{body}</div>;
          })}
        </div>
      )}
    </section>
  );
}
