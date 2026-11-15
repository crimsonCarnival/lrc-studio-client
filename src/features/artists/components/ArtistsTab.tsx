import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { EmptyState } from '@ui/EmptyState';
import { SearchField } from '@ui/search-field';
import { SelectField } from '@ui/select-field';
import { Skeleton } from '@ui/skeleton';
import { artistPath } from '../shelf-path';
import { useArtistShelf } from '../shelf.queries';
import type { ShelfArtist } from '../shelf.service';
import { VisibilityChip } from './VisibilityChip';

type ArtistSort = 'songs' | 'az' | 'recent';
const SORTS: readonly ArtistSort[] = ['songs', 'az', 'recent'];

type ArtistsTabProps = {
  accountName: string;
  /** The viewer owns this profile (and isn't previewing it as others see it). */
  isOwner: boolean;
  /** Ask for the visitor projection: the owner's "view as others" preview. */
  asVisitor: boolean;
};

function sortArtists(artists: ShelfArtist[], sort: ArtistSort): ShelfArtist[] {
  const byName = (a: ShelfArtist, b: ShelfArtist) => a.name.localeCompare(b.name);
  const copy = [...artists];
  if (sort === 'az') copy.sort(byName);
  // ISO timestamps compare correctly as strings.
  else if (sort === 'recent') copy.sort((a, b) => b.latestEditAt.localeCompare(a.latestEditAt) || byName(a, b));
  else copy.sort((a, b) => b.songCount - a.songCount || byName(a, b));
  return copy;
}

/** The profile's Artists tab: a searchable, sortable grid built from each song's artist credits. */
export function ArtistsTab({ accountName, isOwner, asVisitor }: ArtistsTabProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ArtistSort>('songs');
  const { data, isPending } = useArtistShelf(accountName, { asVisitor });

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matching = q ? (data ?? []).filter((a) => a.name.toLowerCase().includes(q)) : (data ?? []);
    return sortArtists(matching, sort);
  }, [data, query, sort]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchField
            compact
            focusShortcut={false}
            className="w-72 max-w-full"
            value={query}
            onValueChange={setQuery}
            label={t('profile.artists.searchLabel')}
            placeholder={t('profile.artists.searchPlaceholder')}
            clearLabel={t('profile.artists.clearSearch')}
          />
          <SelectField
            size="sm"
            aria-label={t('profile.artists.sortLabel')}
            value={sort}
            onValueChange={(v) => setSort(v as ArtistSort)}
            options={SORTS.map((s) => ({ value: s, label: t(`profile.artists.sort.${s}`) }))}
          />
        </div>
        {isOwner && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon name="lock" size={14} />
            {t('profile.artists.ownerNote')}
          </p>
        )}
      </div>

      {isPending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(13.75rem,1fr))] gap-4">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          art={query ? 'search' : 'lists'}
          title={query ? t('profile.artists.noMatches') : isOwner ? t('profile.artists.emptyOwn') : t('profile.artists.empty')}
          className="py-12"
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(13.75rem,1fr))] gap-4">
          {shown.map((artist) => (
            <Link
              key={artist.id}
              to={artistPath(accountName, artist.id)}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3.5 transition-colors hover:bg-accent/40"
            >
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-muted text-4xl font-bold text-muted-foreground">
                {artist.coverImage
                  ? <img src={artist.coverImage} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
                  : <span aria-hidden="true">{Array.from(artist.name)[0]?.toUpperCase()}</span>}
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="truncate font-heading text-base font-semibold text-foreground">{artist.name}</h3>
                <span className="text-sm text-muted-foreground">{t('profile.artists.songs', { count: artist.songCount })}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                {isOwner ? <VisibilityChip isPublic={artist.isPublic} /> : <span />}
                <span className="text-xs text-muted-foreground">
                  {artist.albumCount === 0 ? t('profile.artists.singlesOnly') : t('profile.artists.albums', { count: artist.albumCount })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
