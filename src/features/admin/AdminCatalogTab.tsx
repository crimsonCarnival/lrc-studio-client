import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Button } from '@ui/button';
import { Checkbox } from '@ui/checkbox';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { LogoLoader } from '@ui/LogoLoader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ui/alert-dialog';
import { Icon } from '@/shared/ui/Icon';
import { useScrollLock } from '@/shared/hooks/useScrollLock';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { userHasPermission } from '@/features/auth/permissions';
import {
  adminDelete,
  adminListAlbums,
  adminListArtists,
  catalogErrorCode,
  getReviewQueue,
  reviewEntry,
} from '@/features/catalog/catalog.service';
import { catalogErrorKey } from '@/features/catalog/catalog-errors';
import type { CatalogAlbum, CatalogArtist, CatalogDecision, CatalogKind, CatalogQueue } from '@/features/catalog/catalog.types';
import { AdminSubNav } from './AdminSubNav';
import { useAdminSub } from './admin-nav';
import { isSudoCancelled, withSudo } from './services/sudo';
import { CatalogAlbumsDrawer } from './CatalogAlbumsDrawer';
import { CatalogArtistCard } from './CatalogArtistCard';
import { DetectAlbumsDialog } from './DetectAlbumsDialog';
import { CatalogEntryDialog } from './CatalogEntryDialog';
import type { FormTarget } from './CatalogEntryDialog';
import { CatalogReviewCard } from './CatalogReviewCard';
import { entryName } from './catalog-queue';
import type { QueueEntry } from './catalog-queue';

/** Artists fetched per page of the browse grid. */
const PAGE = 24;

const normalise = (s: string): string => s.normalize('NFC').trim().toLowerCase();

export default function AdminCatalogTab() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const canReview = userHasPermission(user?.permissions, 'catalog.review');
  const canManage = userHasPermission(user?.permissions, 'catalog.manage');
  const allowed = [...(canReview ? ['queue'] : []), ...(canManage ? ['browse'] : [])];
  const view = useAdminSub('catalog', allowed);
  // Approved artists the browse view has loaded: the review queue uses them for its duplicate hint.
  const [knownArtists, setKnownArtists] = useState<CatalogArtist[]>([]);

  return (
    <div className="flex flex-col gap-4">
      {allowed.length > 1 && (
        <AdminSubNav
          tab="catalog"
          current={view}
          items={[
            { id: 'queue', icon: 'inbox', label: t('admin.catalogTab.views.queue') },
            { id: 'browse', icon: 'library_music', label: t('admin.catalogTab.views.browse') },
          ]}
        />
      )}
      {view === 'browse' ? <BrowseView onArtists={setKnownArtists} /> : <QueueView knownArtists={knownArtists} />}
    </div>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-wrap items-center justify-center gap-3 py-6 text-sm text-love">
      <span>{message}</span>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>{t('admin.catalogTab.retry')}</Button>
    </div>
  );
}

// ---------------------------------------------------------------- review queue

function QueueView({ knownArtists }: { knownArtists: CatalogArtist[] }) {
  const { t } = useTranslation();
  const [queue, setQueue] = useState<CatalogQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      setQueue(await getReviewQueue());
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const rows = useMemo<QueueEntry[]>(() => {
    if (!queue) return [];
    const all: QueueEntry[] = [
      ...queue.artists.map((entry): QueueEntry => ({ kind: 'artist', entry })),
      ...queue.albums.map((entry): QueueEntry => ({ kind: 'album', entry })),
    ];
    return all.sort((a, b) => a.entry.createdAt.localeCompare(b.entry.createdAt));
  }, [queue]);

  const artistName = useCallback((id: string): string | null => {
    const found = queue?.artists.find((a) => a.id === id) ?? knownArtists.find((a) => a.id === id);
    return found?.name ?? null;
  }, [queue, knownArtists]);

  // Entries already known to exist (other queue rows plus the approved artists browse has loaded), by normalised key.
  const keyOf = (kind: CatalogKind, name: string, artistId?: string) => `${kind}:${artistId ?? ''}:${normalise(name)}`;
  const duplicateKeys = useMemo(() => {
    const counts = new Map<string, number>();
    const bump = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);
    for (const r of rows) bump(keyOf(r.kind, entryName(r), r.kind === 'album' ? r.entry.artistId : undefined));
    for (const a of knownArtists) {
      if (a.status === 'approved' && !rows.some((r) => r.entry.id === a.id)) bump(keyOf('artist', a.name));
    }
    return counts;
  }, [rows, knownArtists]);

  const remove = (id: string) => setQueue((q) => q && { artists: q.artists.filter((a) => a.id !== id), albums: q.albums.filter((a) => a.id !== id) });

  async function decide(row: QueueEntry, decision: CatalogDecision, note: string) {
    setBusy(row.entry.id);
    try {
      await reviewEntry({
        kind: row.kind,
        id: row.entry.id,
        decision,
        note: note.trim() || undefined,
        // The version the reviewer saw: the server refuses if the submitter edited it since.
        expectedUpdatedAt: row.entry.updatedAt,
      });
      remove(row.entry.id);
      toast.success(t(decision === 'approve' ? 'admin.catalogTab.queue.approved' : 'admin.catalogTab.queue.rejected'));
    } catch (err) {
      const code = catalogErrorCode(err);
      if (code === 'catalog_already_reviewed') remove(row.entry.id);
      toast.error(t(catalogErrorKey(err)));
      if (code === 'catalog_changed') await load();
    } finally {
      setBusy(null);
    }
  }

  if (loading && !queue) return <div className="flex items-center justify-center py-16"><LogoLoader size={32} /></div>;
  if (loadFailed && !queue) return <LoadError message={t('admin.catalogTab.queue.loadError')} onRetry={() => void load()} />;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="icon" aria-label={t('admin.catalogTab.refresh')} onClick={() => void load()}>
          <Icon name="refresh" size={14} />
        </Button>
      </div>
      {loadFailed && <LoadError message={t('admin.catalogTab.queue.loadError')} onRetry={() => void load()} />}
      {rows.length === 0 ? (
        !loadFailed && <p className="py-6 text-center text-sm text-muted-foreground">{t('admin.catalogTab.queue.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <CatalogReviewCard
              key={row.entry.id}
              row={row}
              parentName={row.kind === 'album' ? artistName(row.entry.artistId) : null}
              duplicate={(duplicateKeys.get(keyOf(row.kind, entryName(row), row.kind === 'album' ? row.entry.artistId : undefined)) ?? 0) > 1}
              busy={busy === row.entry.id}
              onDecide={decide}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- browse / edit

/** `community` shows the revoke-credit option; `creditKnown` says whether it is known to apply (false: it only covers community entries). */
type DeleteTarget = { kind: CatalogKind; id: string; name: string; community: boolean; creditKnown: boolean };

function BrowseView({ onArtists }: { onArtists: (artists: CatalogArtist[]) => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [artists, setArtists] = useState<CatalogArtist[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [albumsFailed, setAlbumsFailed] = useState<Record<string, boolean>>({});
  const [albums, setAlbums] = useState<Record<string, CatalogAlbum[]>>({});
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [form, setForm] = useState<FormTarget | null>(null);
  const [detectFor, setDetectFor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const [revokeCredit, setRevokeCredit] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  useScrollLock(deleting !== null);

  const loadArtists = useCallback(async (q: string) => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const list = await adminListArtists({ query: q.trim() || undefined, offset: 0, limit: PAGE });
      setArtists(list);
      setHasMore(list.length === PAGE);
      onArtists(list);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [onArtists]);

  useEffect(() => {
    const timer = setTimeout(() => void loadArtists(query), query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query, loadArtists]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = await adminListArtists({ query: query.trim() || undefined, offset: artists.length, limit: PAGE });
      const merged = [...artists, ...next.filter((n) => !artists.some((a) => a.id === n.id))];
      setArtists(merged);
      setHasMore(next.length === PAGE);
      onArtists(merged);
    } catch (err) {
      toast.error(t(catalogErrorKey(err)));
    } finally {
      setLoadingMore(false);
    }
  }

  const loadAlbums = useCallback(async (artistId: string) => {
    setAlbumsFailed((prev) => ({ ...prev, [artistId]: false }));
    try {
      const list = await adminListAlbums(artistId);
      setAlbums((prev) => ({ ...prev, [artistId]: list }));
    } catch {
      setAlbumsFailed((prev) => ({ ...prev, [artistId]: true }));
    }
  }, []);

  function openAlbums(artistId: string) {
    setDrawerId(artistId);
    if (!albums[artistId]) void loadAlbums(artistId);
  }

  async function afterSave(target: FormTarget) {
    setForm(null);
  // The artist an album form belongs to, for its Genius cover search; the album form never edits it.
  const formArtistId = form?.kind !== 'album' ? null : form.mode === 'create' ? form.artistId : form.entry.artistId;
  const formArtistName = formArtistId ? artists.find((a) => a.id === formArtistId)?.name : undefined;

    toast.success(t(target.mode === 'create' ? 'admin.catalogTab.form.created' : 'admin.catalogTab.form.saved'));
    if (target.kind === 'album') {
      const artistId = target.mode === 'create' ? target.artistId : target.entry.artistId;
      await loadAlbums(artistId);
    } else {
      await loadArtists(query);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleteBusy(true);
    try {
      // Delete needs a fresh sudo grant: withSudo prompts for it and retries once.
      await withSudo(() => adminDelete(target.kind, target.id, target.community ? revokeCredit : false));
      setDeleting(null);
      if (target.kind === 'artist' && drawerId === target.id) setDrawerId(null);
      setArtists((prev) => prev.filter((a) => a.id !== target.id));
      setAlbums((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, v.filter((a) => a.id !== target.id)])));
      toast.success(t('admin.catalogTab.delete.done'));
    } catch (err) {
      if (!isSudoCancelled(err)) toast.error(t(catalogErrorKey(err)));
    } finally {
      setDeleteBusy(false);
    }
  }

  // Deleting an artist cascades to its albums, so their credit matters too. Albums that were
  // never opened are unknown: offer the option anyway and say it only covers community entries.
  function artistDeleteTarget(artist: CatalogArtist): DeleteTarget {
    const loaded = albums[artist.id];
    const community = artist.source === 'community' || !loaded || loaded.some((a) => a.source === 'community');
    return { kind: 'artist', id: artist.id, name: artist.name, community, creditKnown: artist.source === 'community' || !!loaded };
  }

  function askDelete(target: DeleteTarget) {
    setRevokeCredit(false);
    setDeleting(target);
  }

  const drawerArtist = artists.find((a) => a.id === drawerId) ?? null;
  const detectArtist = artists.find((a) => a.id === detectFor) ?? null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('admin.catalogTab.browse.searchPlaceholder')}
            aria-label={t('admin.catalogTab.browse.searchPlaceholder')}
            className="pl-9 lg:pl-9"
          />
        </div>
        <Button type="button" onClick={() => setForm({ mode: 'create', kind: 'artist' })}>
          <Icon name="add" size={14} /> {t('admin.catalogTab.browse.newArtist')}
        </Button>
      </div>

      {loading && artists.length === 0 ? (
        <div className="flex items-center justify-center py-16"><LogoLoader size={32} /></div>
      ) : loadFailed ? (
        <LoadError message={t('admin.catalogTab.browse.loadError')} onRetry={() => void loadArtists(query)} />
      ) : artists.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('admin.catalogTab.browse.empty')}</p>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {artists.map((artist) => (
              <CatalogArtistCard
                key={artist.id}
                artist={artist}
                onAlbums={() => openAlbums(artist.id)}
                onEdit={() => setForm({ mode: 'edit', kind: 'artist', entry: artist })}
                onDelete={() => askDelete(artistDeleteTarget(artist))}
              />
            ))}
          </ul>
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground" aria-live="polite">{t('admin.catalogTab.browse.shown', { count: artists.length })}</p>
            {hasMore && (
              <Button type="button" variant="outline" disabled={loadingMore} onClick={() => void loadMore()}>
                {t('admin.catalogTab.browse.loadMore')}
              </Button>
            )}
          </div>
        </>
      )}

      <CatalogEntryDialog target={form} artistName={formArtistName} onDone={afterSave} onClose={() => setForm(null)} />

      <CatalogAlbumsDrawer
        artist={drawerArtist}
        albums={drawerId ? albums[drawerId] : undefined}
        failed={drawerId ? !!albumsFailed[drawerId] : false}
        onRetry={() => drawerId && void loadAlbums(drawerId)}
        onNew={() => drawerId && setForm({ mode: 'create', kind: 'album', artistId: drawerId })}
        onDetect={() => drawerId && setDetectFor(drawerId)}
        onEdit={(album) => setForm({ mode: 'edit', kind: 'album', entry: album })}
        onDelete={(album) => askDelete({ kind: 'album', id: album.id, name: album.title, community: album.source === 'community', creditKnown: true })}
        onClose={() => setDrawerId(null)}
      />

      <DetectAlbumsDialog
        artist={detectArtist}
        // The drawer lists the albums, so reload them to show the new one.
        onApproved={(album) => void loadAlbums(album.artistId)}
        onClose={() => setDetectFor(null)}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(next) => { if (!next && !deleteBusy) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.catalogTab.delete.title', { name: deleting?.name ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.catalogTab.delete.body')}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleting?.community && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Checkbox id="catalog-revoke-credit" checked={revokeCredit} onCheckedChange={(v) => setRevokeCredit(v === true)} />
                <Label htmlFor="catalog-revoke-credit">{t('admin.catalogTab.delete.revokeCredit')}</Label>
              </div>
              {!deleting.creditKnown && <p className="text-xs text-muted-foreground">{t('admin.catalogTab.delete.revokeCreditHint')}</p>}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel variant="ghost" disabled={deleteBusy}>{t('admin.catalogTab.delete.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteBusy}
              // Keep the dialog open while sudo and the request run; confirmDelete closes it on success.
              onClick={(e) => { e.preventDefault(); void confirmDelete(); }}
              className="bg-love-ink text-primary-foreground shadow-none hover:bg-love-ink/90 active:bg-love-ink/80"
            >
              {t('admin.catalogTab.delete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
