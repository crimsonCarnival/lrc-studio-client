import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { EmptyState } from '@ui/EmptyState';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useCatalogBrowse } from './catalog.queries';
import { catalogArtistPath } from './catalog-path';

const SEARCH_DEBOUNCE_MS = 250;

/** `/artists`: the public, moderated artist catalog, A to Z, with search. */
export default function CatalogBrowsePage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const { artists, total, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useCatalogBrowse(query);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('catalog.browse.kicker')}</span>
          <h1 className="font-heading text-4xl font-bold text-foreground">{t('catalog.browse.title')}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{t('catalog.browse.description')}</p>
        </header>

        <div className="relative max-w-md">
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('catalog.browse.searchPlaceholder')}
            aria-label={t('catalog.browse.searchLabel')}
            maxLength={100}
            className="pl-9 lg:pl-9"
          />
        </div>

        {isPending ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : isError ? (
          <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">{t('catalog.browse.loadError')}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>{t('catalog.browse.retry')}</Button>
          </div>
        ) : artists.length === 0 ? (
          <EmptyState art={query ? 'search' : 'lists'} title={query ? t('catalog.browse.noMatches', { query }) : t('catalog.browse.empty')} className="py-12" />
        ) : (
          <>
            <p className="text-xs text-muted-foreground" aria-live="polite">{t('catalog.browse.count', { count: total })}</p>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-4">
              {artists.map((artist) => (
                <li key={artist.id}>
                  <Link
                    to={catalogArtistPath(artist.slug ?? '')}
                    className="group flex flex-col gap-2 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <span className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-muted text-4xl font-bold text-muted-foreground">
                      {artist.imageUrl
                        ? <img src={artist.imageUrl} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
                        : <span aria-hidden="true">{Array.from(artist.name)[0]?.toUpperCase()}</span>}
                    </span>
                    <span className="truncate text-sm font-semibold text-foreground group-hover:underline">{artist.name}</span>
                    {artist.disambiguation && <span className="-mt-1.5 truncate text-xs text-muted-foreground">{artist.disambiguation}</span>}
                  </Link>
                </li>
              ))}
            </ul>
            {hasNextPage && (
              <div className="flex justify-center">
                <Button type="button" variant="outline" loading={isFetchingNextPage} onClick={() => void fetchNextPage()}>
                  {t('catalog.browse.loadMore')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
