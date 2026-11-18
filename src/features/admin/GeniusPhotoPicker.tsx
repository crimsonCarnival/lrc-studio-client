import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ui/dialog';
import { Input } from '@ui/input';
import { copyGeniusPhoto, searchGeniusArtists } from '@/features/catalog/catalog.service';
import { catalogErrorKey } from '@/features/catalog/catalog-errors';
import type { CatalogErrorKey } from '@/features/catalog/catalog-errors';
import type { GeniusArtistMatch, GeniusPhoto } from '@/features/catalog/catalog.types';

type GeniusPhotoPickerProps = {
  open: boolean;
  /** Searched as soon as the picker opens. */
  initialQuery: string;
  onPick: (photo: GeniusPhoto) => void;
  onClose: () => void;
};

type Results = { status: 'loading' } | { status: 'error'; key: CatalogErrorKey } | { status: 'ready'; matches: GeniusArtistMatch[] };

/**
 * Admin-only: search Genius for an artist and copy one of its photos. The previews are Genius's own
 * images, shown only here; picking one has the server copy it to Cloudinary, and that copy is what gets stored.
 */
export function GeniusPhotoPicker({ open, initialQuery, onPick, onClose }: GeniusPhotoPickerProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.catalogTab.genius.title')}</DialogTitle>
          <DialogDescription>{t('admin.catalogTab.genius.description')}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so each opening starts from the current name field. */}
        <PickerBody initialQuery={initialQuery} onBusyChange={setBusy} onPick={onPick} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function PickerBody({ initialQuery, onBusyChange, onPick, onClose }: Pick<GeniusPhotoPickerProps, 'initialQuery' | 'onPick' | 'onClose'> & { onBusyChange: (busy: boolean) => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  // The query last searched, so Retry repeats it instead of whatever was typed since.
  const [searched, setSearched] = useState(initialQuery);
  const [results, setResults] = useState<Results>({ status: 'loading' });
  const [copyingId, setCopyingId] = useState<number | null>(null);
  const [copyError, setCopyError] = useState<CatalogErrorKey | null>(null);

  // Fetch only: state is set after the await, so it is safe to call from the mount effect.
  const load = useCallback(async (q: string) => {
    try {
      const matches = q.trim() ? await searchGeniusArtists(q.trim()) : [];
      setResults({ status: 'ready', matches });
    } catch (err) {
      setResults({ status: 'error', key: catalogErrorKey(err) });
    }
  }, []);

  // User-triggered: resets to loading first.
  function search(q: string) {
    setSearched(q);
    setCopyError(null);
    setResults({ status: 'loading' });
    void load(q);
  }

  useEffect(() => {
    // Once on mount: later edits to the name field must not restart a search.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(initialQuery);
  }, [load, initialQuery]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (copyingId === null) search(query);
  }

  async function use(match: GeniusArtistMatch) {
    if (copyingId !== null) return;
    setCopyingId(match.geniusId);
    onBusyChange(true);
    setCopyError(null);
    try {
      const photo = await copyGeniusPhoto(match.geniusId);
      onPick(photo);
      onClose();
    } catch (err) {
      setCopyError(catalogErrorKey(err));
      setCopyingId(null);
      onBusyChange(false);
    }
  }

  const busy = copyingId !== null;

  return (
    <>
    <form onSubmit={submit} className="flex gap-2">
      <Input
        type="search"
        value={query}
        aria-label={t('admin.catalogTab.genius.searchLabel')}
        placeholder={t('admin.catalogTab.genius.searchPlaceholder')}
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
      <p className="text-sm text-muted-foreground">{t('admin.catalogTab.genius.empty')}</p>
    )}

    {results.status === 'ready' && results.matches.length > 0 && (
      <ul className="flex flex-col gap-2">
        {results.matches.map((m) => (
          <li key={m.geniusId} className="flex items-center gap-3 rounded-lg border border-border p-2">
            <img
              src={m.imageUrl}
              alt={t('admin.catalogTab.genius.photoAlt', { name: m.name })}
              referrerPolicy="no-referrer"
              className="size-14 shrink-0 rounded-md bg-muted object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-foreground">{m.name}</span>
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                {t('admin.catalogTab.genius.openPage')}
              </a>
            </div>
            <Button type="button" size="sm" disabled={busy} onClick={() => void use(m)}>
              {copyingId === m.geniusId ? t('admin.catalogTab.genius.copying') : t('admin.catalogTab.genius.use')}
            </Button>
          </li>
        ))}
      </ul>
    )}

    {copyError && <p role="alert" className="text-sm text-love">{t(copyError)}</p>}
    </>
  );
}
