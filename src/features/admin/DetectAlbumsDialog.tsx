import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ui/dialog';
import { LogoLoader } from '@ui/LogoLoader';
import { approveDetectedAlbum, catalogErrorCode, detectAlbums, dismissDetectedAlbum } from '@/features/catalog/catalog.service';
import { catalogErrorKey } from '@/features/catalog/catalog-errors';
import type { CatalogAlbum, CatalogArtist, DetectedAlbum } from '@/features/catalog/catalog.types';

type DetectAlbumsDialogProps = {
  /** The artist to look at; null keeps the dialog closed. */
  artist: CatalogArtist | null;
  onApproved: (album: CatalogAlbum) => void;
  onClose: () => void;
};

type Findings = { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: DetectedAlbum[] };

/**
 * Admin-only: review the albums the server inferred from an artist's songs. Approving creates the
 * album, rejecting hides the finding for good; either way the row leaves the list.
 */
export function DetectAlbumsDialog({ artist, onApproved, onClose }: DetectAlbumsDialogProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={artist !== null} onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
      {/* minmax(0,1fr): the grid's implicit auto column would otherwise grow to a long title's
          full width (nowrap), so `truncate` never engages and the row's buttons are clipped. */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.catalogTab.detect.title', { name: artist?.name ?? '' })}</DialogTitle>
          <DialogDescription>{t('admin.catalogTab.detect.description')}</DialogDescription>
        </DialogHeader>
        {/* Mounted per artist, so reopening for another one never shows the previous findings. */}
        {artist && <DetectBody key={artist.id} artistId={artist.id} onBusyChange={setBusy} onApproved={onApproved} />}
      </DialogContent>
    </Dialog>
  );
}

function DetectBody({ artistId, onBusyChange, onApproved }: Pick<DetectAlbumsDialogProps, 'onApproved'> & { artistId: string; onBusyChange: (busy: boolean) => void }) {
  const { t } = useTranslation();
  const [findings, setFindings] = useState<Findings>({ status: 'loading' });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  // Only the latest request may write: a retry supersedes an older one, and unmounting (close, or another artist) cancels all.
  const latest = useRef(0);

  // Fetch only: state is set after the await, so it is safe to call from the mount effect.
  const load = useCallback(async () => {
    const id = ++latest.current;
    try {
      const items = await detectAlbums(artistId);
      if (id === latest.current) setFindings({ status: 'ready', items });
    } catch {
      if (id === latest.current) setFindings({ status: 'error' });
    }
  }, [artistId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return () => { latest.current += 1; };
  }, [load]);

  function retry() {
    setFindings({ status: 'loading' });
    void load();
  }

  const drop = (key: string) => setFindings((f) => (f.status === 'ready' ? { status: 'ready', items: f.items.filter((i) => i.key !== key) } : f));

  async function run(item: DetectedAlbum, action: () => Promise<void>) {
    if (busyKey !== null) return;
    setBusyKey(item.key);
    onBusyChange(true);
    try {
      await action();
    } finally {
      setBusyKey(null);
      onBusyChange(false);
    }
  }

  const approve = (item: DetectedAlbum) => run(item, async () => {
    try {
      const album = await approveDetectedAlbum({ artistId, title: item.title, year: item.year });
      drop(item.key);
      toast.success(t('admin.catalogTab.detect.approved'));
      onApproved(album);
    } catch (err) {
      // Someone already added it: the finding is stale, not failed.
      if (catalogErrorCode(err) === 'catalog_duplicate') drop(item.key);
      toast.error(t(catalogErrorKey(err)));
    }
  });

  const reject = (item: DetectedAlbum) => run(item, async () => {
    try {
      await dismissDetectedAlbum(artistId, item.key);
      drop(item.key);
      toast.success(t('admin.catalogTab.detect.dismissed'));
    } catch (err) {
      toast.error(t(catalogErrorKey(err)));
    }
  });

  if (findings.status === 'loading') {
    return (
      <div role="status" aria-label={t('admin.catalogTab.detect.loading')} className="flex justify-center py-8">
        <LogoLoader size={28} />
      </div>
    );
  }

  if (findings.status === 'error') {
    return (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="text-sm text-love">{t('admin.catalogTab.detect.error')}</p>
        <Button type="button" variant="outline" size="sm" onClick={retry}>{t('admin.catalogTab.detect.retry')}</Button>
      </div>
    );
  }

  if (findings.items.length === 0) return <p className="text-sm text-muted-foreground">{t('admin.catalogTab.detect.empty')}</p>;

  return (
    <ul className="flex flex-col gap-2">
      {findings.items.map((item) => {
        const rowBusy = busyKey === item.key;
        return (
          <li key={item.key} className="flex items-center gap-3 rounded-lg border border-border p-2">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-foreground" title={item.title}>{item.title}</span>
              <span className="flex gap-2 text-xs text-muted-foreground">
                <span>{t('admin.catalogTab.detect.songs', { count: item.songCount })}</span>
                {item.year && <span>{item.year}</span>}
              </span>
            </div>
            <Button type="button" size="sm" className="shrink-0" disabled={busyKey !== null} aria-busy={rowBusy} onClick={() => void approve(item)}>{t('admin.catalogTab.detect.approve')}</Button>
            <Button type="button" size="sm" variant="outline" className="shrink-0" disabled={busyKey !== null} onClick={() => void reject(item)}>{t('admin.catalogTab.detect.reject')}</Button>
          </li>
        );
      })}
    </ul>
  );
}
