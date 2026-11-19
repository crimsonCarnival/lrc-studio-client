import { lazy, Suspense, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import { Button } from '@ui/button';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { SubmitCatalogDialog } from './SubmitCatalogDialog';
import { useCatalogArtist } from './catalog.queries';
import { CatalogSongList } from './CatalogSongList';
import { CATALOG_BROWSE_PATH, catalogAlbumPath } from './catalog-path';
import { artistPath } from '@/features/artists/shelf-path';
import type { CatalogAlbumCard, CatalogSong } from './catalog.types';

/** Newest first; undated albums last, then by title. */
function byYearDesc(a: CatalogAlbumCard, b: CatalogAlbumCard): number {
  return (b.album.year ?? '').localeCompare(a.album.year ?? '') || a.album.title.localeCompare(b.album.title);
}

/** The three most common genres among the songs, most frequent first. */
function topGenres(songs: CatalogSong[]): string[] {
  const counts = new Map<string, number>();
  for (const song of songs) {
    const g = song.metadata?.genre?.trim();
    if (g) counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([g]) => g);
}

const NotFoundPage = lazy(() => import('@/app/NotFoundPage'));

/** `/artists/:slug`: the shared, moderated catalog page of one artist, visible to everyone. */
export default function CatalogArtistPage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const { data, isPending, isError } = useCatalogArtist(slug);
  const { user } = useAuthContext();
  const [suggesting, setSuggesting] = useState(false);

  if (isPending) return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;
  if (isError || !data) return <Suspense fallback={null}><NotFoundPage /></Suspense>;

  const { artist, songs } = data;
  // Older servers predate albumCards; an empty list beats a crash during a deploy.
  const albums = [...(data.albumCards ?? [])].sort(byYearDesc);
  // The server validates this too; checking the host keeps a bad row from rendering an arbitrary link.
  const showGeniusCredit = artist.imageSource === 'genius' && !!artist.imageSourceUrl?.startsWith('https://genius.com/');
  const totalStars = songs.reduce((n, s) => n + (s.starCount ?? 0), 0);
  const fullySynced = songs.filter((s) => (s.lineCount ?? 0) > 0 && (s.syncedLineCount ?? 0) >= (s.lineCount ?? 0)).length;
  const years = songs.map((s) => Number(s.metadata?.songYear)).filter((y) => Number.isInteger(y) && y > 0);
  const yearRange = years.length ? [Math.min(...years), Math.max(...years)] : null;
  const genres = topGenres(songs);
  const stats = [
    { icon: 'album', label: t('catalog.page.albumsCount', { count: albums.length }), show: albums.length > 0 },
    { icon: 'music_note', label: t('catalog.page.songs', { count: songs.length }), show: true },
    { icon: 'star', label: `${totalStars} ${t('catalog.page.statStars')}`, show: totalStars > 0 },
    { icon: 'check_circle', label: `${fullySynced} ${t('catalog.page.statSynced')}`, show: fullySynced > 0 },
    { icon: 'calendar_month', label: yearRange ? (yearRange[0] === yearRange[1] ? `${yearRange[0]}` : `${yearRange[0]}–${yearRange[1]}`) : '', show: !!yearRange },
  ].filter((x) => x.show);
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
        <Link to={CATALOG_BROWSE_PATH} className="-mb-4 flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <Icon name="arrow_back" size={16} />
          {t('catalog.browse.all')}
        </Link>
        <header className="relative isolate overflow-hidden rounded-[var(--radius-card)] bg-raised inset-ring inset-ring-hl">
          {artist.imageUrl && (
            <img src={artist.imageUrl} alt="" aria-hidden="true" decoding="async" className="absolute inset-0 -z-10 size-full scale-125 object-cover opacity-25 blur-2xl" />
          )}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-raised via-raised/60 to-transparent" />
          <div className="flex flex-wrap items-end gap-6 p-5 sm:p-8">
            <div className="flex shrink-0 flex-col gap-1">
              <span className="flex size-36 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted text-6xl font-bold text-muted-foreground shadow-[var(--shadow-elevated)] sm:size-48">
                {artist.imageUrl
                  ? <img src={artist.imageUrl} alt="" className="size-full object-cover" decoding="async" />
                  : <span aria-hidden="true">{Array.from(artist.name)[0]?.toUpperCase()}</span>}
              </span>
              {showGeniusCredit && (
                <a href={artist.imageSourceUrl!} target="_blank" rel="noopener noreferrer nofollow" className="text-xs text-muted-foreground hover:underline">
                  {t('catalog.page.photoCredit')}
                </a>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('catalog.page.kicker')}</span>
              <h1 className="break-words font-heading text-4xl font-bold text-foreground sm:text-5xl">{artist.name}</h1>
              {artist.disambiguation && <span className="-mt-2 text-sm text-muted-foreground">{artist.disambiguation}</span>}
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-subtle">
                {stats.map((x) => (
                  <li key={x.icon} className="flex items-center gap-1.5"><Icon name={x.icon} size={15} />{x.label}</li>
                ))}
              </ul>
              {genres.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {genres.map((g) => (
                    <li key={g} className="rounded-[var(--radius-chip)] bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-ink">{g}</li>
                  ))}
                </ul>
              )}
              {artist.bio && <p className="max-w-2xl whitespace-pre-line text-sm text-muted-foreground">{artist.bio}</p>}
              {data.viewerShelf && user?.accountName && (
                <Link to={artistPath(user.accountName, data.viewerShelf.artistId)} className="flex w-fit items-center gap-1 text-sm text-primary hover:underline">
                  {t('catalog.page.yourSongs', { count: data.viewerShelf.songCount, name: artist.name })}
                  <Icon name="arrow_forward" size={14} />
                </Link>
              )}
            </div>
          </div>
        </header>

        <section aria-labelledby="catalog-albums" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="catalog-albums" className="font-heading text-xl font-semibold text-foreground">{t('catalog.page.albums')}</h2>
            {user?.isVerified && (
              <Button type="button" variant="outline" size="sm" onClick={() => setSuggesting(true)}>
                <Icon name="add" size={14} /> {t('catalog.page.suggestAlbum')}
              </Button>
            )}
          </div>
          {albums.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('catalog.page.noAlbums')}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {albums.map(({ album, songCount, coverUrl }) => {
                const body = (
                  <>
                    <span className="flex aspect-square w-full items-center justify-center overflow-hidden bg-primary-soft text-primary-ink/60">
                      {coverUrl
                        ? <img src={coverUrl} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
                        : <Icon name="album" size={32} />}
                    </span>
                    <span className="flex flex-col gap-0.5 px-3.5 pb-3.5 pt-3">
                      <span className="truncate text-[15px] font-semibold group-hover:text-primary-ink">{album.title}</span>
                      {(album.year || songCount > 0) && (
                        <span className="text-xs text-subtle">
                          {[album.year, songCount > 0 && t('catalog.page.songs', { count: songCount })].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                  </>
                );
                return (
                  <li key={album.id}>
                    {album.slug && artist.slug
                      ? <Link to={catalogAlbumPath(artist.slug, album.slug)} className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-raised text-foreground inset-ring inset-ring-hl transition-[box-shadow,translate] duration-[var(--duration-state)] hover:-translate-y-0.5 hover:inset-ring-faint hover:shadow-[var(--shadow-elevated)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:hover:translate-y-0">{body}</Link>
                      : <div className="flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-raised inset-ring inset-ring-hl">{body}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="catalog-songs" className="flex flex-col gap-4">
          <h2 id="catalog-songs" className="font-heading text-xl font-semibold text-foreground">{t('catalog.page.songs', { count: songs.length })}</h2>
          {songs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('catalog.page.noSongs')}</p>
          ) : (
            <CatalogSongList songs={songs} showAlbum />
          )}
        </section>
      </div>
      {suggesting && (
        <SubmitCatalogDialog
          open
          onOpenChange={(open) => { if (!open) setSuggesting(false); }}
          target={{ kind: 'album', artistId: artist.id, artistName: artist.name, artistSlug: artist.slug }}
        />
      )}
    </div>
  );
}
