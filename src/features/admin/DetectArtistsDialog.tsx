import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ui/dialog';
import { LogoLoader } from '@ui/LogoLoader';
import { approveDetectedArtist, catalogErrorCode, detectArtists, dismissDetectedArtist } from '@/features/catalog/catalog.service';
import { catalogErrorKey } from '@/features/catalog/catalog-errors';
import type { CatalogArtist, DetectedArtist } from '@/features/catalog/catalog.types';

type DetectArtistsDialogProps = {
  open: boolean;
  onApproved: (artist: CatalogArtist) => void;
  onClose: () => void;
};

type Findings = { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: DetectedArtist[] };

/**
 * Admin-only: review the artist names the server found on songs that the catalog does not have.
 * Approving creates the artist (and imports its albums), rejecting hides the name for good;
 * either way the row leaves the list.
 */
export function DetectArtistsDialog({ open, onApproved, onClose }: DetectArtistsDialogProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
      {/* minmax(0,1fr): see DetectAlbumsDialog; keeps long names truncating instead of clipping the buttons. */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.catalogTab.detectArtists.title')}</DialogTitle>
          <DialogDescription>{t('admin.catalogTab.detectArtists.description')}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so every opening scans fresh. */}
        {open && <DetectBody onBusyChange={setBusy} onApproved={onApproved} />}
      </DialogContent>
    </Dialog>
  );
}

function DetectBody({ onBusyChange, onApproved }: Pick<DetectArtistsDialogProps, 'onApproved'> & { onBusyChange: (busy: boolean) => void }) {
  const { t } = useTranslation();
  const [findings, setFindings] = useState<Findings>({ status: 'loading' });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  // Only the latest request may write: a retry supersedes an older one, and unmounting cancels all.
  const latest = useRef(0);

  const load = useCallback(async () => {
    const id = ++latest.current;
    try {
      const items = await detectArtists();
      if (id === latest.current) setFindings({ status: 'ready', items });
    } catch {
      if (id === latest.current) setFindings({ status: 'error' });
    }
  }, []);

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

  async function run(item: DetectedArtist, action: () => Promise<void>) {
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

  const approve = (item: DetectedArtist) => run(item, async () => {
    try {
      const artist = await approveDetectedArtist(item.name);
      drop(item.key);
      toast.success(t('admin.catalogTab.detectArtists.approved'));
      onApproved(artist);
    } catch (err) {
      // Someone already added it: the finding is stale, not failed.
      const code = catalogErrorCode(err);
      if (code === 'catalog_duplicate' || code === 'catalog_disambiguation_required') drop(item.key);
      toast.error(t(catalogErrorKey(err)));
    }
  });

  const reject = (item: DetectedArtist) => run(item, async () => {
    try {
      await dismissDetectedArtist(item.key);
      drop(item.key);
      toast.success(t('admin.catalogTab.detectArtists.dismissed'));
    } catch (err) {
      toast.error(t(catalogErrorKey(err)));
    }
  });

  if (findings.status === 'loading') {
    return (
      <div role="status" aria-label={t('admin.catalogTab.detectArtists.loading')} className="flex justify-center py-8">
        <LogoLoader size={28} />
      </div>
    );
  }

  if (findings.status === 'error') {
    return (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="text-sm text-love">{t('admin.catalogTab.detectArtists.error')}</p>
        <Button type="button" variant="outline" size="sm" onClick={retry}>{t('admin.catalogTab.detectArtists.retry')}</Button>
      </div>
    );
  }

  if (findings.items.length === 0) return <p className="text-sm text-muted-foreground">{t('admin.catalogTab.detectArtists.empty')}</p>;

  return (
    <ul className="flex flex-col gap-2">
      {findings.items.map((item) => {
        const rowBusy = busyKey === item.key;
        return (
          <li key={item.key} className="flex items-center gap-3 rounded-lg border border-border p-2">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-foreground" title={item.name}>{item.name}</span>
              <span className="text-xs text-muted-foreground">{t('admin.catalogTab.detectArtists.songs', { count: item.songCount })}</span>
            </div>
            <Button type="button" size="sm" className="shrink-0" disabled={busyKey !== null} aria-busy={rowBusy} onClick={() => void approve(item)}>{t('admin.catalogTab.detectArtists.approve')}</Button>
            <Button type="button" size="sm" variant="outline" className="shrink-0" disabled={busyKey !== null} onClick={() => void reject(item)}>{t('admin.catalogTab.detectArtists.reject')}</Button>
          </li>
        );
      })}
    </ul>
  );
}
