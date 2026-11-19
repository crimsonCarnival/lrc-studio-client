import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { EmptyState } from '@ui/EmptyState';
import { SearchField } from '@ui/search-field';
import { SelectField } from '@ui/select-field';
import { Skeleton } from '@ui/skeleton';
import { MySubmissions } from '@/features/catalog/MySubmissions';
import { SubmitCatalogDialog } from '@/features/catalog/SubmitCatalogDialog';
import type { SubmitTarget } from '@/features/catalog/SubmitCatalogDialog';
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
  /** The viewer's email is verified; the server refuses catalog submissions otherwise. */
  isVerified: boolean;
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
export function ArtistsTab({ accountName, isOwner, asVisitor, isVerified }: ArtistsTabProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ArtistSort>('songs');
  const [submitTarget, setSubmitTarget] = useState<SubmitTarget | null>(null);
  const hintId = useId();
  const { data, isPending, isError, refetch } = useArtistShelf(accountName, { asVisitor });

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
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon name="lock" size={14} />
              {t('profile.artists.ownerNote')}
            </p>
            {/* aria-disabled, not disabled: the button stays focusable so the hint is reachable. */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-disabled={!isVerified}
              aria-describedby={isVerified ? undefined : hintId}
              className={isVerified ? undefined : 'opacity-60'}
              onClick={() => { if (isVerified) setSubmitTarget({ kind: 'artist' }); }}
            >
              {t('catalog.suggest.button')}
            </Button>
            {!isVerified && <span id={hintId} className="text-xs text-muted-foreground">{t('catalog.suggest.unverifiedHint')}</span>}
          </div>
        )}
      </div>

      {isPending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,11rem))] gap-3.5">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-zinc-400 font-medium">{t('common.loadError')}</p>
          <Button variant="link" size={null} onClick={() => void refetch()} className="text-xs">{t('common.retry')}</Button>
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          art={query ? 'search' : 'lists'}
          title={query ? t('profile.artists.noMatches') : isOwner ? t('profile.artists.emptyOwn') : t('profile.artists.empty')}
          className="py-12"
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,11rem))] gap-3.5">
          {shown.map((artist) => (
            <Link
              key={artist.id}
              to={artistPath(accountName, artist.id)}
              className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-2.5 transition-colors hover:bg-accent/40"
            >
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-muted text-3xl font-bold text-muted-foreground">
                {artist.coverImage
                  ? <img src={artist.coverImage} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
                  : <span aria-hidden="true">{Array.from(artist.name)[0]?.toUpperCase()}</span>}
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="truncate font-heading text-sm font-semibold text-foreground">{artist.name}</h3>
                <span className="text-xs text-muted-foreground">{t('profile.artists.songs', { count: artist.songCount })}</span>
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

      {isOwner && isVerified && (
        <MySubmissions onAddAlbum={(a) => setSubmitTarget({ kind: 'album', artistId: a.id, artistName: a.name, artistSlug: a.slug })} />
      )}
      {submitTarget && (
        <SubmitCatalogDialog open onOpenChange={(open) => { if (!open) setSubmitTarget(null); }} target={submitTarget} />
      )}
    </div>
  );
}
