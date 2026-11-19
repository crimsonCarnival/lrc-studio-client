import { lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import { CatalogSongList } from './CatalogSongList';
import { useCatalogAlbum } from './catalog.queries';
import { catalogArtistPath } from './catalog-path';

const NotFoundPage = lazy(() => import('@/app/NotFoundPage'));

/** `/artists/:slug/albums/:albumSlug`: one approved album of a catalog artist, with its public songs. */
export default function CatalogAlbumPage() {
  const { t } = useTranslation();
  const { slug, albumSlug } = useParams();
  const { data, isPending, isError } = useCatalogAlbum(slug, albumSlug);

  if (isPending) return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;
  if (isError || !data) return <Suspense fallback={null}><NotFoundPage /></Suspense>;

  const { artist, album, songs, coverUrl } = data;
  const artistHref = artist.slug ? catalogArtistPath(artist.slug) : null;
  const summary = [album.year, t('catalog.page.songs', { count: songs.length })].filter(Boolean).join(' · ');

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
        {artistHref && (
          <Link to={artistHref} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <Icon name="arrow_back" size={16} />
            {t('catalog.album.back', { name: artist.name })}
          </Link>
        )}

        <header className="flex flex-wrap items-end gap-6">
          <span className="flex size-36 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted text-muted-foreground sm:size-44">
            {coverUrl
              ? <img src={coverUrl} alt="" className="size-full object-cover" decoding="async" />
              : <Icon name="album" size={56} />}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('catalog.album.kicker')}</span>
            <h1 className="break-words font-heading text-4xl font-bold text-foreground">{album.title}</h1>
            <span className="text-sm text-muted-foreground">
              {artistHref
                ? <Link to={artistHref} className="font-medium text-foreground hover:underline">{artist.name}</Link>
                : <span className="font-medium text-foreground">{artist.name}</span>}
              {summary && <> · {summary}</>}
            </span>
          </div>
        </header>

        <section aria-labelledby="catalog-album-songs" className="flex flex-col gap-4">
          <h2 id="catalog-album-songs" className="font-heading text-xl font-semibold text-foreground">{t('catalog.album.tracks')}</h2>
          {songs.length === 0
            ? <p className="text-sm text-muted-foreground">{t('catalog.album.noSongs')}</p>
            : <CatalogSongList songs={songs} showTrack />}
        </section>
      </div>
    </div>
  );
}
