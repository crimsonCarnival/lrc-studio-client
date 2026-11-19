import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ui/dialog';
import { Input } from '@ui/input';
import {
  copyGeniusAlbumCover, copyGeniusPhoto, copyProjectCover, listProjectCovers, searchGeniusAlbums, searchGeniusArtists,
} from '@/features/catalog/catalog.service';
import { catalogErrorKey } from '@/features/catalog/catalog-errors';
import type { CatalogErrorKey } from '@/features/catalog/catalog-errors';
import type { GeniusAlbumMatch, GeniusArtistMatch, PickedCover, ProjectCoverProposal } from '@/features/catalog/catalog.types';

type PickerKind = 'artist' | 'album';

type GeniusPhotoPickerProps = {
  open: boolean;
  /** Searched as soon as the picker opens. */
  initialQuery: string;
  /** `artist` (default) fetches an artist photo, `album` an album cover. */
  kind?: PickerKind;
  /** Album only: also offer the covers of the artist's public songs on this album. */
  songCovers?: { artistId: string; title: string };
  onPick: (cover: PickedCover) => void;
  onClose: () => void;
};

type Results = { status: 'loading' } | { status: 'error'; key: CatalogErrorKey } | { status: 'ready'; matches: Array<GeniusArtistMatch | GeniusAlbumMatch> };

/**
 * Admin-only: search Genius for an artist or album and copy one of its images. The previews are Genius's own
 * images, shown only here; picking one has the server copy it to Cloudinary, and that copy is what gets stored.
 * For an album, covers already on the artist's songs for it are offered first.
 */
export function GeniusPhotoPicker({ open, initialQuery, kind = 'artist', songCovers, onPick, onClose }: GeniusPhotoPickerProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const album = kind === 'album';
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{album ? t('admin.catalogTab.genius.albumTitle') : t('admin.catalogTab.genius.title')}</DialogTitle>
          <DialogDescription>{album ? t('admin.catalogTab.genius.albumDescription') : t('admin.catalogTab.genius.description')}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so each opening starts from the current name field. */}
        <PickerBody initialQuery={initialQuery} kind={kind} songCovers={songCovers} onBusyChange={setBusy} onPick={onPick} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

type Row = { key: string; name: string; sub?: string; imageUrl: string; alt: string; href?: string; use: () => Promise<PickedCover> };
type Failed = { key: string; error: CatalogErrorKey };

function PickerBody({ initialQuery, kind, songCovers, onBusyChange, onPick, onClose }: Pick<GeniusPhotoPickerProps, 'initialQuery' | 'songCovers' | 'onPick' | 'onClose'> & { kind: PickerKind; onBusyChange: (busy: boolean) => void }) {
  const { t } = useTranslation();
  const album = kind === 'album';
  const [query, setQuery] = useState(initialQuery);
  // The query last searched, so Retry repeats it instead of whatever was typed since.
  const [searched, setSearched] = useState(initialQuery);
  const [results, setResults] = useState<Results>({ status: 'loading' });
  const [songs, setSongs] = useState<ProjectCoverProposal[]>([]);
  const [copyingKey, setCopyingKey] = useState<string | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  // Only the newest search may write results; an older, slower one is dropped.
  const latest = useRef(0);

  // Fetch only: state is set after the await, so it is safe to call from the mount effect.
  const load = useCallback(async (q: string) => {
    const id = ++latest.current;
    try {
      const find = album ? searchGeniusAlbums : searchGeniusArtists;
      const matches = q.trim() ? await find(q.trim()) : [];
      if (id === latest.current) setResults({ status: 'ready', matches });
    } catch (err) {
      if (id === latest.current) setResults({ status: 'error', key: catalogErrorKey(err) });
    }
  }, [album]);

  // User-triggered: resets to loading first.
  function search(q: string) {
    setSearched(q);
    setFailed(null);
    setResults({ status: 'loading' });
    void load(q);
  }

  useEffect(() => {
    // Once on mount: later edits to the name field must not restart a search.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(initialQuery);
  }, [load, initialQuery]);

  // Primitives, not the object: a new object identity each render would refetch every time.
  const coverArtistId = songCovers?.artistId;
  const coverTitle = songCovers?.title;
  useEffect(() => {
    if (!album || !coverArtistId || !coverTitle) return;
    let live = true;
    // An extra: if it fails the Genius results are still there, so there is nothing to report.
    listProjectCovers(coverArtistId, coverTitle).then((list) => { if (live) setSongs(list); }, () => {});
    return () => { live = false; };
  }, [album, coverArtistId, coverTitle]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (copyingKey === null) search(query);
  }

  async function use(row: Row) {
    if (copyingKey !== null) return;
    setCopyingKey(row.key);
    onBusyChange(true);
    setFailed(null);
    try {
      const cover = await row.use();
      onBusyChange(false);
      onPick(cover);
      onClose();
    } catch (err) {
      setFailed({ key: row.key, error: catalogErrorKey(err) });
      setCopyingKey(null);
      onBusyChange(false);
    }
  }

  const busy = copyingKey !== null;
  const copyGenius = album ? copyGeniusAlbumCover : copyGeniusPhoto;

  const songRows: Row[] = songs.map((s) => ({
    key: `song:${s.publicId}`,
    name: s.title,
    imageUrl: s.coverUrl,
    alt: t('admin.catalogTab.genius.songCoverAlt', { title: s.title }),
    use: () => copyProjectCover({ artistId: coverArtistId ?? '', title: coverTitle ?? '', publicId: s.publicId }),
  }));
  const geniusRows: Row[] = results.status === 'ready'
    ? results.matches.map((m) => ({
      key: `genius:${m.geniusId}`,
      name: m.name,
      sub: 'artistName' in m ? m.artistName : undefined,
      imageUrl: m.imageUrl,
      alt: album ? t('admin.catalogTab.genius.albumPhotoAlt', { name: m.name }) : t('admin.catalogTab.genius.photoAlt', { name: m.name }),
      href: m.url,
      use: () => copyGenius(m.geniusId),
    }))
    : [];

  return (
    <>
      {songRows.length > 0 && (
        <section className="flex flex-col gap-2" aria-label={t('admin.catalogTab.genius.songsHeading')}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.catalogTab.genius.songsHeading')}</h3>
          <RowList rows={songRows} album busy={busy} copyingKey={copyingKey} failed={failed} onUse={use} />
          <h3 className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.catalogTab.genius.geniusHeading')}</h3>
        </section>
      )}

      <form onSubmit={submit} className="flex gap-2">
        <Input
          type="search"
          value={query}
          aria-label={album ? t('admin.catalogTab.genius.albumSearchLabel') : t('admin.catalogTab.genius.searchLabel')}
          placeholder={album ? t('admin.catalogTab.genius.albumSearchPlaceholder') : t('admin.catalogTab.genius.searchPlaceholder')}
          onChange={(e) => setQuery(e.target.value)}
          disabled={busy}
        />
        <Button type="submit" variant="outline" disabled={busy}>{t('admin.catalogTab.genius.search')}</Button>
      </form>

      {results.status === 'loading' && <p role="status" className="text-sm text-muted-foreground">{t('admin.catalogTab.genius.loading')}</p>}

      {results.status === 'error' && (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-love">{t(results.key)}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => search(searched)}>{t('admin.catalogTab.genius.retry')}</Button>
        </div>
      )}

      {results.status === 'ready' && results.matches.length === 0 && (
        <p className="text-sm text-muted-foreground">{album ? t('admin.catalogTab.genius.albumEmpty') : t('admin.catalogTab.genius.empty')}</p>
      )}

      {geniusRows.length > 0 && <RowList rows={geniusRows} album={album} busy={busy} copyingKey={copyingKey} failed={failed} onUse={use} />}
    </>
  );
}

type RowListProps = {
  rows: Row[];
  album: boolean;
  busy: boolean;
  copyingKey: string | null;
  failed: Failed | null;
  onUse: (row: Row) => void | Promise<void>;
};

function RowList({ rows, album, busy, copyingKey, failed, onUse }: RowListProps) {
  const { t } = useTranslation();
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => {
        const rowFailed = failed?.key === row.key ? failed : null;
        return (
          // The copy error renders inside the row that failed, next to the button to retry.
          <li key={row.key} className={`flex flex-col gap-2 rounded-lg border p-2 ${rowFailed ? 'border-love' : 'border-border'}`}>
            <div className="flex items-center gap-3">
              <img src={row.imageUrl} alt={row.alt} referrerPolicy="no-referrer" className="size-14 shrink-0 rounded-md bg-muted object-cover" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{row.name}</span>
                {row.sub && <span className="truncate text-xs text-muted-foreground">{row.sub}</span>}
                {row.href && (
                  <a href={row.href} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                    {t('admin.catalogTab.genius.openPage')}
                  </a>
                )}
              </div>
              <Button type="button" size="sm" disabled={busy} onClick={() => void onUse(row)}>
                {copyingKey === row.key
                  ? t('admin.catalogTab.genius.copying')
                  : rowFailed ? t('admin.catalogTab.genius.retry') : album ? t('admin.catalogTab.genius.useCover') : t('admin.catalogTab.genius.use')}
              </Button>
            </div>
            {rowFailed && <p role="alert" className="text-xs text-love">{t(rowFailed.error)}</p>}
          </li>
        );
      })}
    </ul>
  );
}
