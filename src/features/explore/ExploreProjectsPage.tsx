import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Loader2, Star, GitFork, Music } from 'lucide-react';
import { usePaginatedProjects } from './hooks/useExplore';

interface ExploreProject {
  id: string;
  publicId?: string;
  title?: string;
  coverImage?: string | null;
  upload?: { uploadUrl?: string } | null;
  accountName?: string;
  owner?: { accountName?: string } | null;
  starCount?: number;
  forkCount?: number;
}

export default function ExploreProjectsPage() {
  const { t } = useTranslation();
  const { projects, loading, loadingMore, error, hasMore, loadMore } = usePaginatedProjects(12) as {
    projects: ExploreProject[];
    loading: boolean;
    loadingMore: boolean;
    error: unknown;
    hasMore: boolean;
    loadMore: () => void;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
        {t('explore.trending.empty')}
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full py-6 px-4 flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-white">{t('explore.trending.title')}</h1>

      {projects.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm py-20">
          {t('explore.trending.empty')}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {projects.map(project => (
              <Link
                key={project.id}
                to={`/project/${project.publicId ?? project.id}`}
                className="flex flex-col rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700/70 transition-colors overflow-hidden group"
              >
                <div className="aspect-video w-full bg-gradient-to-br from-primary/30 to-violet-500/30 flex items-center justify-center relative shrink-0">
                  {project.coverImage || project.upload?.uploadUrl ? (
                    <img
                      src={project.coverImage ?? project.upload?.uploadUrl}
                      alt={project.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <Music className="size-8 text-primary/50" />
                  )}
                </div>
                <div className="p-3 flex flex-col gap-1">
                  <p className="text-sm font-semibold text-white line-clamp-1 group-hover:text-primary transition-colors">
                    {project.title}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    @{project.owner?.accountName ?? project.accountName}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-zinc-400">
                      <Star className="size-3" />
                      {project.starCount ?? 0}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-zinc-400">
                      <GitFork className="size-3" />
                      {project.forkCount ?? 0}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {hasMore ? (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingMore
                ? <Loader2 className="size-4 animate-spin" />
                : t('explore.page.loadMore')}
            </button>
          ) : (
            <p className="text-center text-sm text-zinc-500">{t('explore.page.noMore')}</p>
          )}
        </>
      )}
    </div>
  );
}
