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
import { catalogAlbumPath } from './catalog-path';
import type { CatalogAlbumCard } from './catalog.types';

/** Newest first; undated albums last, then by title. */
function byYearDesc(a: CatalogAlbumCard, b: CatalogAlbumCard): number {
  return (b.album.year ?? '').localeCompare(a.album.year ?? '') || a.album.title.localeCompare(b.album.title);
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
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
        <header className="flex flex-wrap items-end gap-6">
          <div className="flex shrink-0 flex-col gap-1">
            <span className="flex size-36 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted text-6xl font-bold text-muted-foreground sm:size-44">
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
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('catalog.page.kicker')}</span>
            <h1 className="break-words font-heading text-4xl font-bold text-foreground">{artist.name}</h1>
            {artist.disambiguation && <span className="text-sm text-muted-foreground">{artist.disambiguation}</span>}
            {artist.bio && <p className="max-w-2xl whitespace-pre-line text-sm text-muted-foreground">{artist.bio}</p>}
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
                    <span className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
                      {coverUrl
                        ? <img src={coverUrl} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
                        : <Icon name="album" size={32} />}
                    </span>
                    <span className="truncate text-sm font-medium text-foreground group-hover:underline">{album.title}</span>
                    {(album.year || songCount > 0) && (
                      <span className="-mt-1 text-xs text-muted-foreground">
                        {[album.year, songCount > 0 && t('catalog.page.songs', { count: songCount })].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </>
                );
                return (
                  <li key={album.id}>
                    {album.slug && artist.slug
                      ? <Link to={catalogAlbumPath(artist.slug, album.slug)} className="group flex flex-col gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/50">{body}</Link>
                      : <div className="flex flex-col gap-2">{body}</div>}
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
          target={{ kind: 'album', artistId: artist.id, artistName: artist.name }}
        />
      )}
    </div>
  );
}
