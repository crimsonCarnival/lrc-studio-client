import { useRef, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SearchField } from '@ui/search-field';
import { useProjectSearch } from './hooks/useProjectSearch';
import { useUserSearch } from './hooks/useUserSearch';
import { SearchProjectCard } from './components/SearchProjectCard';
import { SearchUserCard } from './components/SearchUserCard';
import { CountTabs } from '@ui/count-tabs';
import { SegmentedControl } from '@ui/segmented-control';
import { Skeleton } from '@ui/skeleton';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { useAuthContext } from '@/features/auth/useAuthContext';

const SORT_OPTIONS = [
  { value: 'RELEVANCE', key: 'relevance' },
  { value: 'STARS',     key: 'stars'     },
  { value: 'NEWEST',    key: 'newest'    },
];

const TABS = ['projects', 'users'] as const;
type SearchTab = (typeof TABS)[number];
const SORT_VALUES = SORT_OPTIONS.map(o => o.value);

export default function SearchPage() {
  const { t } = useTranslation();
  // Dynamic/indexed keys (tabs, sort, placeholder array) bypass strict checking.
  const tk = t as (key: string, options?: Record<string, unknown>) => string;
  const [searchParams, setSearchParams] = useSearchParams();

  const urlQuery = searchParams.get('q') || '';
  const tabParam = searchParams.get('tab');
  const urlTab: SearchTab = TABS.find((tab) => tab === tabParam) ?? 'projects';
  // Whitelisted like `tab`: an unrecognised value falls back to the default
  // instead of being forwarded to the server as an invalid sort enum.
  const urlSort  = SORT_VALUES.includes(searchParams.get('sort') || '') ? searchParams.get('sort')! : 'RELEVANCE';

  const setParam = (key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set(key, value);
      return next;
    }, { replace: true });
  };

  const projects = useProjectSearch();
  const users    = useUserSearch();
  const { user: me } = useAuthContext();

  // Pre-fill and trigger search when URL query changes (e.g. arriving from header)
  const initDone = useRef(false);
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    if (urlQuery) {
      projects.handleQueryChange(urlQuery);
      users.handleQueryChange(urlQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const placeholders = t('search.placeholder', { returnObjects: true }) as unknown as string[] | string;
  const [placeholder] = useState(() =>
    Array.isArray(placeholders)
      ? placeholders[Math.floor(Math.random() * placeholders.length)]
      : placeholders
  );

  const handleInput = (q: string) => {
    setParam('q', q);
    projects.handleQueryChange(q);
    users.handleQueryChange(q);
  };

  const handleSort = (sort: string) => {
    setParam('sort', sort);
    projects.handleSortChange(sort as Parameters<typeof projects.handleSortChange>[0]);
  };

  const handleTab = (tab: SearchTab) => setParam('tab', tab);

  const query = projects.query || urlQuery;
  const hasQuery = !!query.trim();
  // Users come back as one capped page (20), so that count is "shown", not a server total.
  const counts: Record<SearchTab, number> = { projects: projects.total, users: users.results.length };
  const active = urlTab === 'projects' ? projects : users;
  const otherTab: SearchTab = urlTab === 'projects' ? 'users' : 'projects';

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
    <div className="max-w-3xl mx-auto w-full py-6 px-4">
      {/* Search input */}
      <SearchField
        value={query}
        onValueChange={handleInput}
        placeholder={placeholder}
        label={t('search.title')}
        clearLabel={t('common.clear')}
        className="mb-4 h-[54px] rounded-2xl px-[18px] [&_input]:text-[19px]"
      />

      {/* Tabs + sort share the rule. Sort only applies to projects, and only when there is something to sort. */}
      <div className="mb-4 flex flex-col gap-x-4 gap-y-2 border-b border-hl sm:flex-row sm:items-center sm:justify-between">
        <CountTabs<SearchTab>
          label={t('search.title')}
          value={urlTab}
          onChange={handleTab}
          tabs={TABS.map((tab) => ({
            value: tab,
            label: tk(`search.tabs.${tab}`),
            count: hasQuery ? counts[tab] : undefined,
          }))}
        />
        <SegmentedControl
          label={t('search.sortLabel')}
          value={projects.sortBy || urlSort}
          onChange={handleSort}
          options={SORT_OPTIONS.map(({ value, key }) => ({
            value,
            label: tk(`search.sort.${key}`),
            disabled: urlTab !== 'projects' || projects.results.length === 0,
          }))}
          className="mb-2 self-start sm:self-auto"
        />
      </div>

      {hasQuery && active.loading && active.results.length === 0 && (
        <div aria-busy="true" aria-label={t('search.loading')} className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-[18px] bg-background px-[18px] py-4 inset-ring inset-ring-hl">
              <Skeleton className={`size-14 shrink-0 ${urlTab === 'users' ? 'rounded-full' : 'rounded-lg'}`} />
              <div className="flex flex-col gap-2"><Skeleton className="h-4 w-48 rounded-md" /><Skeleton className="h-3 w-32 rounded-md" /></div>
            </div>
          ))}
        </div>
      )}

      {!active.loading && active.error && (
        <p className="py-16 text-center text-sm text-subtle">{t('search.error')}</p>
      )}

      {/* An empty tab points at the one that has results instead of dead-ending. */}
      {hasQuery && !active.loading && !active.error && active.results.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-[18px] bg-background px-5 py-[30px] text-center inset-ring inset-ring-hl">
          <Icon name={urlTab === 'projects' ? 'music_note' : 'person_search'} size={40} className="text-faint" />
          <span className="font-heading text-xl font-bold tracking-[-0.02em] text-foreground">
            {t(urlTab === 'projects' ? 'search.emptyProjects' : 'search.emptyUsers', { query })}
          </span>
          {counts[otherTab] > 0 && (
            <>
              <span className="text-[15px] text-subtle">
                {t(otherTab === 'users' ? 'search.butUsers' : 'search.butProjects', { count: counts[otherTab] })}
              </span>
              <Button variant="outline" onClick={() => handleTab(otherTab)} className="h-10 gap-2 px-3.5 text-[15px] lg:h-10 lg:px-3.5 lg:text-[15px] coarse:h-11">
                {t(otherTab === 'users' ? 'search.showUsers' : 'search.showProjects')}
                <Icon name="arrow_forward" size={16} />
              </Button>
            </>
          )}
        </div>
      )}

      {urlTab === 'projects' && !projects.error && projects.results.length > 0 && (
        <div className="flex flex-col gap-3">
          {projects.results.map((p) => <SearchProjectCard key={p.id} project={p} query={query} />)}
        </div>
      )}

      {urlTab === 'users' && !users.error && users.results.length > 0 && (
        <div className="flex flex-col gap-3">
          {users.results.map((u) => (
            <SearchUserCard key={u.id} user={u} query={query} canFollow={!!me && !me.isGuest && me.accountName !== u.accountName} />
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
