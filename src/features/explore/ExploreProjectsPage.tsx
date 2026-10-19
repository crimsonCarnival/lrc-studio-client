import { EmptyState } from '@ui/EmptyState';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Icon } from '@/shared/ui/Icon';
import { projectPath } from '@/features/projects/project-path';
import { usePaginatedProjects } from './hooks/useExplore';
import { useProjectSearch } from '@/features/search/hooks/useProjectSearch';
import { LogoLoader } from '@ui/LogoLoader';
import { Button } from '@ui/button';
import { SearchField } from '@ui/search-field';
import { ProjectMenu, ProjectMenuButton } from '@/features/projects/components/ProjectMenu';

interface ExploreProject {
  id: string;
  publicId?: string;
  slug?: string | null;
  title?: string | null;
  coverImage?: string | null;
  upload?: { uploadUrl?: string | null } | null;
  accountName?: string;
  user?: { accountName?: string } | null;
  owner?: { accountName?: string } | null;
  metadata?: { songName?: string | null; songArtist?: string | null } | null;
  starCount?: number | null;
  forkCount?: number | null;
}

const CARD_CLASS = 'flex flex-col rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700/70 transition-colors overflow-hidden group';

function ExploreProjectCard({ project }: { project: ExploreProject }) {
  const menuProject = { ...project, publicId: project.publicId ?? project.id };
  const ownerAccountName = project.user?.accountName ?? project.owner?.accountName ?? project.accountName;
  // No owner account name means no canonical URL: the card stays non-navigable
  // rather than pointing at a path that would 404.
  const href = projectPath(menuProject, ownerAccountName);
  const body = (
    <>
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
            {ownerAccountName}
          </p>
          <div className="flex items-center justify-between mt-0.5">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-zinc-400">
                <Icon name="star" size={12} />
                {project.starCount ?? 0}
              </span>
              <span className="flex items-center gap-1 text-xs text-zinc-400">
                <Icon name="call_split" size={12} />
                {project.forkCount ?? 0}
              </span>
            </div>
            <ProjectMenuButton
              project={menuProject}
              isOwner={false}
              className="p-1 coarse:p-3.5 -m-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors"
            />
          </div>
        </div>
    </>
  );
  return (
    <ProjectMenu project={menuProject} isOwner={false} ownerAccountName={ownerAccountName}>
      {href
        ? <Link to={href} className={CARD_CLASS}>{body}</Link>
        : <div className={CARD_CLASS}>{body}</div>}
    </ProjectMenu>
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

      <SearchField
        value={search.query}
        onValueChange={search.handleQueryChange}
        placeholder={t('explore.page.searchPlaceholder')}
        label={t('explore.page.searchLabel')}
        clearLabel={t('explore.page.clearSearch')}
        maxLength={100}
        focusShortcut
      />

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
          <EmptyState art="search" title={t('search.noResults', { query: search.query.trim() })} description={t('search.emptyHint')} className="py-14" />
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
            <Button
              variant="outline"
              onClick={loadMore}
              loading={loadingMore}
              className="mt-2 h-10 text-sm lg:h-10 lg:text-sm"
            >
              {t('explore.page.loadMore')}
            </Button>
          ) : (
            <p className="text-center text-sm text-zinc-500">{t('explore.page.noMore')}</p>
          )}
        </>
      )}
    </div>
    </div>
  );
}
