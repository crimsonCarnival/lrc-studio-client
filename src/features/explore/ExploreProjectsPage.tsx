import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Icon } from '@/shared/ui/Icon';
import { usePaginatedProjects } from './hooks/useExplore';
import { useProjectSearch } from '@/features/search/hooks/useProjectSearch';
import { LogoLoader } from '@ui/LogoLoader';

interface ExploreProject {
  id: string;
  publicId?: string;
  title?: string | null;
  coverImage?: string | null;
  upload?: { uploadUrl?: string | null } | null;
  accountName?: string;
  user?: { accountName?: string } | null;
  owner?: { accountName?: string } | null;
  starCount?: number | null;
  forkCount?: number | null;
}

function ExploreProjectCard({ project }: { project: ExploreProject }) {
  return (
    <Link
      to={`/project/${project.publicId ?? project.id}`}
      className="flex flex-col rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700/70 transition-colors overflow-hidden group"
    >
      <div className="aspect-video w-full bg-gradient-to-br from-primary/30 to-violet-500/30 flex items-center justify-center relative shrink-0">
        {project.coverImage || project.upload?.uploadUrl ? (
          <img
            src={project.coverImage ?? project.upload?.uploadUrl ?? undefined}
            alt={project.title ?? ''}
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
          {project.user?.accountName ?? project.owner?.accountName ?? project.accountName}
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
    </Link>
  );
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
  // Reuses the existing `searchProjects` GraphQL query (public + own projects, Atlas
  // Search with regex fallback) and its 300ms debounce.
  const search = useProjectSearch();
  const isSearching = search.query.trim() !== '';
  const searchResults = search.results as ExploreProject[];

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
    <div className="max-w-4xl mx-auto w-full py-6 px-4 flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-white">{t('explore.trending.title')}</h1>

      <div className="relative">
        <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <input
          type="search"
          value={search.query}
          onChange={e => search.handleQueryChange(e.target.value)}
          placeholder={t('explore.page.searchPlaceholder')}
          aria-label={t('explore.page.searchLabel')}
          maxLength={100}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary text-sm transition-colors [&::-webkit-search-cancel-button]:hidden"
        />
        {isSearching && (
          <button
            type="button"
            onClick={() => search.handleQueryChange('')}
            aria-label={t('explore.page.clearSearch')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-400 hover:text-white transition-colors"
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </div>

      {isSearching ? (
        search.loading ? (
          <div className="flex justify-center py-20">
            <LogoLoader size={32} className="text-primary" />
          </div>
        ) : search.error ? (
          <div className="flex items-center justify-center text-zinc-400 text-sm py-20">
            {t('search.error')}
          </div>
        ) : searchResults.length === 0 ? (
          <div className="flex items-center justify-center text-zinc-500 text-sm py-20">
            {t('search.noResults', { query: search.query.trim() })}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {searchResults.map(project => <ExploreProjectCard key={project.id} project={project} />)}
            </div>
            {search.total > searchResults.length && (
              <Link
                to={`/search?q=${encodeURIComponent(search.query.trim())}`}
                className="mt-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors flex items-center justify-center gap-2"
              >
                {t('explore.page.seeAllResults', { count: search.total })}
              </Link>
            )}
          </>
        )
      ) : loading ? (
        <div className="flex justify-center py-20">
          <LogoLoader size={32} className="text-primary" />
        </div>
      ) : error || projects.length === 0 ? (
        <div className="flex items-center justify-center text-zinc-500 text-sm py-20">
          {t('explore.trending.empty')}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {projects.map(project => <ExploreProjectCard key={project.id} project={project} />)}
          </div>

          {hasMore ? (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingMore
                ? <LogoLoader size={16} />
                : t('explore.page.loadMore')}
            </button>
          ) : (
            <p className="text-center text-sm text-zinc-500">{t('explore.page.noMore')}</p>
          )}
        </>
      )}
    </div>
    </div>
  );
}
