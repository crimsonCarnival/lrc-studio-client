import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Loader2 } from 'lucide-react';
import { useProjectSearch } from './hooks/useProjectSearch';
import { SearchProjectCard } from './components/SearchProjectCard';

const SORT_OPTIONS = [
  { value: 'RELEVANCE', key: 'relevance' },
  { value: 'STARS',     key: 'stars'     },
  { value: 'NEWEST',    key: 'newest'    },
];

export default function SearchPage() {
  const { t } = useTranslation();
  const { query, sortBy, results, total, loading, error, handleQueryChange, handleSortChange } = useProjectSearch();

  // Pick placeholder once per mount so it doesn't change while typing
  const placeholders = t('search.placeholder', { returnObjects: true });
  const placeholder  = useRef(
    Array.isArray(placeholders)
      ? placeholders[Math.floor(Math.random() * placeholders.length)]
      : placeholders
  ).current;

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full py-6 px-4">
      <h1 className="text-xl font-semibold text-white mb-4">{t('search.title')}</h1>

      {/* Search input */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400 pointer-events-none" />
        <input
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary text-sm transition-colors"
        />
      </div>

      {/* Sort controls — only visible when there's a query */}
      {query.trim() && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {SORT_OPTIONS.map(({ value, key }) => (
            <button
              key={value}
              onClick={() => handleSortChange(value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                sortBy === value
                  ? 'bg-primary text-zinc-950'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {t(`search.sort.${key}`)}
            </button>
          ))}
          {!loading && total > 0 && (
            <span className="ml-auto text-xs text-zinc-500">
              {t('search.resultCount', { count: total })}
            </span>
          )}
        </div>
      )}

      {/* States */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && error && (
        <p className="text-center py-16 text-zinc-400 text-sm">{t('search.error')}</p>
      )}

      {!loading && !error && query.trim() && results.length === 0 && (
        <p className="text-center py-16 text-zinc-400 text-sm">
          {t('search.noResults', { query })}
        </p>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="flex flex-col gap-3">
          {results.map(project => (
            <SearchProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
