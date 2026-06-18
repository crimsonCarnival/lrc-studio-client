import { useRef, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Loader2 } from 'lucide-react';
import { useProjectSearch } from './hooks/useProjectSearch';
import { useUserSearch } from './hooks/useUserSearch';
import { SearchProjectCard } from './components/SearchProjectCard';
import { SearchUserCard } from './components/SearchUserCard';

const SORT_OPTIONS = [
  { value: 'RELEVANCE', key: 'relevance' },
  { value: 'STARS',     key: 'stars'     },
  { value: 'NEWEST',    key: 'newest'    },
];

const TABS = ['projects', 'users'];

export default function SearchPage() {
  const { t } = useTranslation();
  // Dynamic/indexed keys (tabs, sort, placeholder array) bypass strict checking.
  const tk = t as (key: string, options?: Record<string, unknown>) => string;
  const [searchParams, setSearchParams] = useSearchParams();

  const urlQuery = searchParams.get('q') || '';
  const urlTab   = TABS.includes(searchParams.get('tab') || '') ? searchParams.get('tab')! : 'projects';
  const urlSort  = searchParams.get('sort') || 'RELEVANCE';

  const setParam = (key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set(key, value);
      return next;
    }, { replace: true });
  };

  const projects = useProjectSearch();
  const users    = useUserSearch();

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

  const handleTab = (tab: string) => setParam('tab', tab);

  const query = projects.query || urlQuery;

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full py-6 px-4">
      {/* Search input */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
        <input
          value={query}
          onChange={e => handleInput(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary text-sm transition-colors"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-zinc-800/60 pb-0">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => handleTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              urlTab === tab
                ? 'border-primary text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tk(`search.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Projects tab */}
      {urlTab === 'projects' && (
        <>
          {query.trim() && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {SORT_OPTIONS.map(({ value, key }) => (
                <button
                  key={value}
                  onClick={() => handleSort(value)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    (projects.sortBy || urlSort) === value
                      ? 'bg-primary text-zinc-950'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {tk(`search.sort.${key}`)}
                </button>
              ))}
              {!projects.loading && projects.total > 0 && (
                <span className="ml-auto text-xs text-zinc-500">
                  {t('search.resultCount', { count: projects.total })}
                </span>
              )}
            </div>
          )}

          {projects.loading && (
            <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-primary" /></div>
          )}
          {!projects.loading && projects.error && (
            <p className="text-center py-16 text-zinc-400 text-sm">{t('search.error')}</p>
          )}
          {!projects.loading && !projects.error && query.trim() && projects.results.length === 0 && (
            <p className="text-center py-16 text-zinc-400 text-sm">{t('search.noResults', { query })}</p>
          )}
          {!projects.loading && !projects.error && projects.results.length > 0 && (
            <div className="flex flex-col gap-3">
              {projects.results.map((p) => <SearchProjectCard key={p.id} project={p} />)}
            </div>
          )}
        </>
      )}

      {/* Users tab */}
      {urlTab === 'users' && (
        <>
          {users.loading && (
            <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-primary" /></div>
          )}
          {!users.loading && users.error && (
            <p className="text-center py-16 text-zinc-400 text-sm">{t('search.error')}</p>
          )}
          {!users.loading && !users.error && query.trim() && users.results.length === 0 && (
            <p className="text-center py-16 text-zinc-400 text-sm">{t('search.noUsers', { query })}</p>
          )}
          {!users.loading && !users.error && users.results.length > 0 && (
            <div className="flex flex-col gap-3">
              {users.results.map((u) => <SearchUserCard key={u.id} user={u} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
