import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import { Link } from 'react-router-dom';
import { projectPath } from '@/features/projects/project-path';
import { useCatalogArtist } from './catalog.queries';

const NotFoundPage = lazy(() => import('@/app/NotFoundPage'));

/** `/artists/:slug`: the shared, moderated catalog page of one artist, visible to everyone. */
export default function CatalogArtistPage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const { data, isPending, isError } = useCatalogArtist(slug);

  if (isPending) return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;
  if (isError || !data) return <Suspense fallback={null}><NotFoundPage /></Suspense>;

  const { artist, albums, songs } = data;
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
          <h2 id="catalog-albums" className="font-heading text-xl font-semibold text-foreground">{t('catalog.page.albums')}</h2>
          {albums.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('catalog.page.noAlbums')}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {albums.map((album) => (
                <li key={album.id} className="flex flex-col gap-2">
                  <span className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
                    {album.coverUrl
                      ? <img src={album.coverUrl} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
                      : <Icon name="music_note" size={32} />}
                  </span>
                  <span className="truncate text-sm font-medium text-foreground">{album.title}</span>
                  {album.year && <span className="-mt-1 text-xs text-muted-foreground">{album.year}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="catalog-songs" className="flex flex-col gap-4">
          <h2 id="catalog-songs" className="font-heading text-xl font-semibold text-foreground">{t('catalog.page.songs', { count: songs.length })}</h2>
          {songs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('catalog.page.noSongs')}</p>
          ) : (
            <ol className="flex flex-col rounded-2xl border border-border bg-card">
              {songs.map((song) => {
                const href = projectPath(song, song.user?.accountName);
                const title = song.metadata?.songName || song.title || t('playlists.detail.untitled');
                return (
                  <li key={song.id} className="flex items-center gap-3 border-t border-border px-4 py-2.5 text-sm first:border-t-0">
                    <span className="flex min-w-0 flex-1 flex-col">
                      {href
                        ? <Link to={href} className="truncate font-medium text-foreground hover:underline">{title}</Link>
                        : <span className="truncate font-medium text-foreground">{title}</span>}
                      {song.metadata?.songAlbum && <span className="truncate text-xs text-muted-foreground">{song.metadata.songAlbum}</span>}
                    </span>
                    {song.user?.accountName && <span className="shrink-0 text-xs text-muted-foreground">@{song.user.accountName}</span>}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
