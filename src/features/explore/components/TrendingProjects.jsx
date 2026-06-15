import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Star, GitFork, Music } from 'lucide-react';
import { useTrendingProjects } from '../hooks/useExplore';

export function TrendingProjects({ limit = 6 }) {
  const { t } = useTranslation();
  const { projects, loading, error } = useTrendingProjects(limit);

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
          <Loader2 className="size-6 animate-spin text-zinc-500" />
        </div>
      ) : error || projects.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-10">
          {t('explore.trending.empty')}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {projects.map(project => (
            <Link
              key={project.id}
              to={`/project/${project.projectId ?? project.id}`}
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
      )}
    </section>
  );
}
