import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShelfArtist, ShelfProject } from '@/features/artists/shelf.service';
import { filterShelf, noArtistOf, type LibraryFilterTab } from './library-artist-view';

type LibraryByArtistProps = {
  /** The owner's full shelf with tracks (not capped, unlike the loaded Library list). */
  shelf: ShelfArtist[];
  /** The loaded, search-filtered Library list. Only its credit-less projects are used (the "No artist set" bucket). */
  items: ShelfProject[];
  query: string;
  filterTab: LibraryFilterTab;
  renderCard: (project: ShelfProject) => ReactNode;
};

const GRID = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';

/** The Library's "Artist → album" view: artist header, album sub-header, then the project cards. */
export function LibraryByArtist({ shelf, items, query, filterTab, renderCard }: LibraryByArtistProps) {
  const { t } = useTranslation();
  const groups = filterShelf(shelf, query, filterTab);
  const noArtist = noArtistOf(items, filterTab);

  if (groups.length === 0 && noArtist.length === 0) {
    return <p className="px-4 lg:px-0 py-12 text-center text-sm text-zinc-400">{t('library.noMatches')}</p>;
  }

  return (
    <div className="flex flex-col gap-10 px-4 lg:px-0 pb-12">
      {groups.map(({ artist, albums }) => (
        <section key={artist.id} aria-label={artist.name} className="flex flex-col gap-6">
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">{artist.name}</h2>
          {albums.map(({ album, projects }) => (
            <div key={album.key} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                {album.key === '' ? t('library.singles') : album.title}
              </h3>
              <div className={GRID}>
                {projects.map((p) => <Fragment key={p.publicId}>{renderCard(p)}</Fragment>)}
              </div>
            </div>
          ))}
        </section>
      ))}
      {noArtist.length > 0 && (
        <section aria-label={t('library.noArtist')} className="flex flex-col gap-6">
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">{t('library.noArtist')}</h2>
          <div className={GRID}>
            {noArtist.map((p) => <Fragment key={p.publicId}>{renderCard(p)}</Fragment>)}
          </div>
        </section>
      )}
    </div>
  );
}
