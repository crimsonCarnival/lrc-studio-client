import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SearchField } from '@ui/search-field';
import { LogoLoader } from '@ui/LogoLoader';
import { EmptyState } from '@ui/EmptyState';
import { cn } from '@/shared/utils/utils';
import { useProjectSearch } from '@/features/search/hooks/useProjectSearch';
import { TrendingProjects, ProjectCard, type ExploreProject, type KindFilter } from './components/TrendingProjects';
import { PopularPlaylists } from './components/PopularPlaylists';
import { SuggestedUsers } from './components/SuggestedUsers';
import { useExploreStats } from './hooks/useExplore';

type Tab = 'all' | 'song' | 'subtitles' | 'lists' | 'people';

const TABS: { value: Tab; labelKey: 'all' | 'songs' | 'subtitles' | 'lists' | 'people' }[] = [
  { value: 'all', labelKey: 'all' },
  { value: 'song', labelKey: 'songs' },
  { value: 'subtitles', labelKey: 'subtitles' },
  { value: 'lists', labelKey: 'lists' },
  { value: 'people', labelKey: 'people' },
];

const noop = () => {};

export default function ExplorePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('all');
  const stats = useExploreStats();
  const search = useProjectSearch();
  const query = search.query.trim();
  const results = search.results as ExploreProject[];

  const showProjects = tab === 'all' || tab === 'song' || tab === 'subtitles';
  const kind: KindFilter = tab === 'song' || tab === 'subtitles' ? tab : 'all';

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <h1 className="font-heading text-[32px] font-bold leading-tight text-foreground">{t('explore.page.title')}</h1>
              {stats && (
                <p className="text-sm text-subtle">
                  {[
                    t('explore.stats.projects', { count: stats.totalProjects }),
                    t('explore.stats.users', { count: stats.totalUsers }),
                    t('explore.stats.playlists', { count: stats.totalPlaylists }),
                    t('explore.stats.views', { count: stats.totalViews }),
                    t('explore.stats.stars', { count: stats.totalStars }),
                  ].join(' · ')}
                </p>
              )}
            </div>
            <SearchField
              value={search.query}
              onValueChange={search.handleQueryChange}
              placeholder={t('explore.page.searchPlaceholder')}
              label={t('explore.page.searchLabel')}
              clearLabel={t('explore.page.clearSearch')}
              maxLength={100}
              busy={search.loading && query !== ''}
              focusShortcut
              className="w-full sm:max-w-[460px]"
            />
          </div>
          {query === '' && (
            <div role="group" aria-label={t('explore.tabs.label')} className="flex flex-wrap gap-2">
              {TABS.map(({ value, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={tab === value}
                  onClick={() => setTab(value)}
                  className={cn(
                    'h-9 rounded-pill px-3.5 text-[13px] font-medium transition-colors duration-[var(--duration-state)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                    tab === value
                      ? 'bg-foreground text-background'
                      : 'text-subtle inset-ring inset-ring-hl hover:text-foreground hover:inset-ring-faint',
                  )}
                >
                  {t(`explore.tabs.${labelKey}`)}
                </button>
              ))}
            </div>
          )}
        </header>

        {query !== '' ? (
          search.loading && results.length === 0 ? (
            <div className="flex justify-center py-20"><LogoLoader size={32} className="text-primary" /></div>
          ) : search.error ? (
            <p className="py-20 text-center text-sm text-subtle">{t('search.error')}</p>
          ) : results.length === 0 ? (
            <EmptyState art="search" title={t('search.noResults', { query })} description={t('search.emptyHint')} className="py-14" />
          ) : (
            <section className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-4">
                {results.map((p) => <ProjectCard key={p.id} project={p} onOpen={noop} />)}
              </div>
              {search.total > results.length && (
                <Link
                  to={`/search?q=${encodeURIComponent(query)}`}
                  className="self-center rounded-[var(--radius-control)] px-4 py-2.5 text-sm font-medium text-primary-ink inset-ring inset-ring-hl hover:text-foreground"
                >
                  {t('explore.page.seeAllResults', { count: search.total })}
                </Link>
              )}
            </section>
          )
        ) : (
          <>
            {showProjects && <TrendingProjects limit={6} kind={kind} />}
            {(tab === 'all' || tab === 'people') && <SuggestedUsers limit={tab === 'people' ? 12 : 4} />}
            {(tab === 'all' || tab === 'lists') && <PopularPlaylists limit={6} />}
          </>
        )}
      </div>
    </div>
  );
}
