import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import toast from 'react-hot-toast';
import { executeRecaptchaSafe } from '@/app/recaptcha-arm';
import { Button } from '@ui/button';
import { Checkbox } from '@ui/checkbox';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Textarea } from '@ui/textarea';
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
import { ImageLightbox } from '@/shared/ui/ImageLightbox';
import { useScrollLock } from '@/shared/hooks/useScrollLock';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { userHasPermission } from '@/features/auth/permissions';
import {
  adminCreateAlbum,
  adminImportAlbums,
  adminCreateArtist,
  adminDelete,
  adminListAlbums,
  adminListArtists,
  adminUpdate,
  catalogErrorCode,
  getReviewQueue,
  reviewEntry,
  uploadCatalogImage,
} from '@/features/catalog/catalog.service';
import { catalogErrorKey } from '@/features/catalog/catalog-errors';
import type { CatalogAlbum, CatalogArtist, CatalogDecision, CatalogKind, CatalogQueue } from '@/features/catalog/catalog.types';
import { AdminSubNav } from './AdminSubNav';
import { useAdminSub } from './admin-nav';
import { isSudoCancelled, withSudo } from './services/sudo';

const NAME_MAX = 300;
const TITLE_MAX = 500;
const BIO_MAX = 1000;
const DISAMBIGUATION_MAX = 80;
const YEAR_MAX = 4;
const NOTE_MAX = 500;

type QueueEntry =
  | { kind: 'artist'; entry: CatalogArtist }
  | { kind: 'album'; entry: CatalogAlbum };

const entryName = (e: QueueEntry): string => (e.kind === 'artist' ? e.entry.name : e.entry.title);
const normalise = (s: string): string => s.normalize('NFC').trim().toLowerCase();

/** Only Cloudinary-hosted images are rendered: a submitted URL is user-influenced, so anything else is not fetched. */
function isCloudinaryUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}

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

function CatalogImage({ url, alt }: { url: string | null | undefined; alt: string }) {
  if (!isCloudinaryUrl(url)) return null;
  return <img src={url} alt={alt} loading="lazy" referrerPolicy="no-referrer" className="size-16 shrink-0 rounded-md object-cover" />;
}

/** The submitted image in the review queue: big enough to judge, click for full size, and an explicit "no photo" tile. */
function QueueImage({ url, name }: { url: string | null | undefined; name: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!isCloudinaryUrl(url)) {
    return (
      <div className="flex size-24 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-zinc-700 text-zinc-500">
        <span aria-hidden="true" className="text-2xl font-semibold text-zinc-300">{Array.from(name)[0]?.toUpperCase()}</span>
        <span className="text-xs">{t('admin.catalogTab.queue.noImage')}</span>
      </div>
    );
  }
  return (
    <>
      <button
        type="button"
        aria-label={t('admin.catalogTab.queue.viewImage', { name })}
        onClick={() => setOpen(true)}
        className="size-24 shrink-0 cursor-zoom-in overflow-hidden rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <img src={url} alt={t('admin.catalogTab.queue.imageAlt', { name })} loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
      </button>
      <ImageLightbox src={open ? url : null} alt={t('admin.catalogTab.queue.imageAlt', { name })} onClose={() => setOpen(false)} />
    </>
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
        !loadFailed && <p className="py-6 text-center text-sm text-zinc-500">{t('admin.catalogTab.queue.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <ReviewRow
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

function ReviewRow({ row, parentName, duplicate, busy, onDecide }: {
  row: QueueEntry;
  parentName: string | null;
  duplicate: boolean;
  busy: boolean;
  onDecide: (row: QueueEntry, decision: CatalogDecision, note: string) => void;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const name = entryName(row);
  const submitter = row.entry.submittedBy;
  const image = row.kind === 'artist' ? row.entry.imageUrl : row.entry.coverUrl;
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3 sm:flex-row sm:items-start">
      <QueueImage url={image} name={name} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            {t(`admin.catalogTab.kind.${row.kind}`)}
          </span>
          <span className="break-words text-sm font-semibold text-zinc-100">{name}</span>
          {row.kind === 'album' && row.entry.year && <span className="text-xs text-zinc-500">{row.entry.year}</span>}
        </div>
        {parentName && <p className="text-xs text-zinc-500">{t('admin.catalogTab.queue.albumBy', { artist: parentName })}</p>}
        {row.kind === 'artist' && row.entry.bio && <p className="line-clamp-3 text-xs text-zinc-400">{row.entry.bio}</p>}
        <p className="text-xs text-zinc-500">
          {t('admin.catalogTab.queue.submittedBy', { name: submitter?.displayName || submitter?.accountName || t('admin.catalogTab.queue.anonymous') })}
        </p>
        {duplicate && (
          <p className="flex items-center gap-1 text-xs font-medium text-love">
            <Icon name="warning" size={12} /> {t('admin.catalogTab.queue.duplicateHint')}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:w-64">
        <Input
          value={note}
          maxLength={NOTE_MAX}
          onChange={(e) => setNote(e.target.value)}
          aria-label={t('admin.catalogTab.queue.noteLabel', { name })}
          placeholder={t('admin.catalogTab.queue.notePlaceholder')}
        />
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            aria-label={t('admin.catalogTab.queue.approveLabel', { name })}
            onClick={() => onDecide(row, 'approve', note)}
            className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
          >
            <Icon name="check" size={12} /> {t('admin.catalogTab.queue.approve')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={busy}
            aria-label={t('admin.catalogTab.queue.rejectLabel', { name })}
            onClick={() => onDecide(row, 'reject', note)}
          >
            <Icon name="close" size={12} /> {t('admin.catalogTab.queue.reject')}
          </Button>
        </div>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------- browse / edit

type FormTarget =
  | { mode: 'create'; kind: 'artist' }
  | { mode: 'create'; kind: 'album'; artistId: string }
  | { mode: 'edit'; kind: 'artist'; entry: CatalogArtist }
  | { mode: 'edit'; kind: 'album'; entry: CatalogAlbum };

/** `community` shows the revoke-credit option; `credit` says whether it is known to apply (false: it only covers community entries). */
type DeleteTarget = { kind: CatalogKind; id: string; name: string; community: boolean; creditKnown: boolean };

function BrowseView({ onArtists }: { onArtists: (artists: CatalogArtist[]) => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [artists, setArtists] = useState<CatalogArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [albumsFailed, setAlbumsFailed] = useState<Record<string, boolean>>({});
  const [albums, setAlbums] = useState<Record<string, CatalogAlbum[]>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<FormTarget | null>(null);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const [revokeCredit, setRevokeCredit] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  useScrollLock(deleting !== null);

  const loadArtists = useCallback(async (q: string) => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const list = await adminListArtists({ query: q.trim() || undefined });
      setArtists(list);
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

  const loadAlbums = useCallback(async (artistId: string) => {
    setAlbumsFailed((prev) => ({ ...prev, [artistId]: false }));
    try {
      const list = await adminListAlbums(artistId);
      setAlbums((prev) => ({ ...prev, [artistId]: list }));
    } catch {
      setAlbumsFailed((prev) => ({ ...prev, [artistId]: true }));
    }
  }, []);

  async function importAlbums(artistId: string) {
    try {
      const created = await adminImportAlbums(artistId);
      toast.success(t('admin.catalogTab.browse.importDone', { count: created }));
      if (created > 0) await loadAlbums(artistId);
    } catch (err) {
      toast.error(t(catalogErrorKey(err)));
    }
  }

  function toggleAlbums(artistId: string) {
    const next = open === artistId ? null : artistId;
    setOpen(next);
    if (next && !albums[next]) void loadAlbums(next);
  }

  async function afterSave(target: FormTarget) {
    setForm(null);
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

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('admin.catalogTab.browse.searchPlaceholder')}
          aria-label={t('admin.catalogTab.browse.searchPlaceholder')}
          className="max-w-xs"
        />
        <Button type="button" size="sm" onClick={() => setForm({ mode: 'create', kind: 'artist' })}>
          <Icon name="add" size={14} /> {t('admin.catalogTab.browse.newArtist')}
        </Button>
      </div>

      {form?.mode === 'create' && form.kind === 'artist' && <EntryForm target={form} onDone={afterSave} onCancel={() => setForm(null)} />}

      {loading && artists.length === 0 ? (
        <div className="flex items-center justify-center py-16"><LogoLoader size={32} /></div>
      ) : loadFailed ? (
        <LoadError message={t('admin.catalogTab.browse.loadError')} onRetry={() => void loadArtists(query)} />
      ) : artists.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">{t('admin.catalogTab.browse.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {artists.map((artist) => (
            <li key={artist.id} className="flex flex-col gap-2 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <CatalogImage url={artist.imageUrl} alt={t('admin.catalogTab.form.imageAlt', { name: artist.name })} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="break-words text-sm font-semibold text-zinc-100">{artist.name}</span>
                  {artist.disambiguation && <span className="text-xs text-zinc-500">{artist.disambiguation}</span>}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  {t(`admin.catalogTab.browse.status.${artist.status as 'pending' | 'approved' | 'rejected'}`, { defaultValue: artist.status })}
                </span>
                <Button type="button" variant="outline" size="sm" aria-expanded={open === artist.id} aria-label={t('admin.catalogTab.browse.showAlbumsLabel', { name: artist.name })} onClick={() => toggleAlbums(artist.id)}>
                  {t('admin.catalogTab.browse.showAlbums')}
                </Button>
                <Button type="button" variant="outline" size="sm" aria-label={t('admin.catalogTab.browse.editLabel', { name: artist.name })} onClick={() => setForm({ mode: 'edit', kind: 'artist', entry: artist })}>
                  {t('admin.catalogTab.browse.edit')}
                </Button>
                <Button type="button" variant="destructive" size="sm" aria-label={t('admin.catalogTab.browse.deleteLabel', { name: artist.name })} onClick={() => askDelete(artistDeleteTarget(artist))}>
                  {t('admin.catalogTab.browse.delete')}
                </Button>
              </div>

              {form?.mode === 'edit' && form.kind === 'artist' && form.entry.id === artist.id && (
                <EntryForm target={form} onDone={afterSave} onCancel={() => setForm(null)} />
              )}

              {open === artist.id && (
                <div className="flex flex-col gap-2 border-t border-zinc-800/60 pt-2">
                  {albumsFailed[artist.id] && (
                    <LoadError message={t('admin.catalogTab.browse.albumsLoadError')} onRetry={() => void loadAlbums(artist.id)} />
                  )}
                  {(albums[artist.id] ?? []).length === 0 && albums[artist.id] && (
                    <p className="text-xs text-zinc-500">{t('admin.catalogTab.browse.noAlbums')}</p>
                  )}
                  <ul className="flex flex-col gap-1.5">
                    {(albums[artist.id] ?? []).map((album) => (
                      <li key={album.id} className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <CatalogImage url={album.coverUrl} alt={t('admin.catalogTab.form.imageAlt', { name: album.title })} />
                          <span className="min-w-0 flex-1 break-words text-sm text-zinc-200">
                            {album.title}{album.year ? <span className="text-zinc-500"> · {album.year}</span> : null}
                          </span>
                          <Button type="button" variant="outline" size="sm" aria-label={t('admin.catalogTab.browse.editLabel', { name: album.title })} onClick={() => setForm({ mode: 'edit', kind: 'album', entry: album })}>
                            {t('admin.catalogTab.browse.edit')}
                          </Button>
                          <Button type="button" variant="destructive" size="sm" aria-label={t('admin.catalogTab.browse.deleteLabel', { name: album.title })} onClick={() => askDelete({ kind: 'album', id: album.id, name: album.title, community: album.source === 'community', creditKnown: true })}>
                            {t('admin.catalogTab.browse.delete')}
                          </Button>
                        </div>
                        {form?.mode === 'edit' && form.kind === 'album' && form.entry.id === album.id && (
                          <EntryForm target={form} onDone={afterSave} onCancel={() => setForm(null)} />
                        )}
                      </li>
                    ))}
                  </ul>
                  {form?.mode === 'create' && form.kind === 'album' && form.artistId === artist.id ? (
                    <EntryForm target={form} onDone={afterSave} onCancel={() => setForm(null)} />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setForm({ mode: 'create', kind: 'album', artistId: artist.id })}>
                        <Icon name="add" size={14} /> {t('admin.catalogTab.browse.newAlbum')}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => void importAlbums(artist.id)}>
                        <Icon name="library_music" size={14} /> {t('admin.catalogTab.browse.importAlbums')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

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
              {!deleting.creditKnown && <p className="text-xs text-zinc-500">{t('admin.catalogTab.delete.revokeCreditHint')}</p>}
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

function EntryForm({ target, onDone, onCancel }: { target: FormTarget; onDone: (target: FormTarget) => void | Promise<void>; onCancel: () => void }) {
  const { t } = useTranslation();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const fileRef = useRef<HTMLInputElement>(null);
  const isAlbum = target.kind === 'album';
  const initial = target.mode === 'edit' ? target.entry : null;
  const initialArtist = initial && !isAlbum ? (initial as CatalogArtist) : null;
  const initialAlbum = initial && isAlbum ? (initial as CatalogAlbum) : null;
  const [name, setName] = useState(initialArtist?.name ?? initialAlbum?.title ?? '');
  const [disambiguation, setDisambiguation] = useState(initialArtist?.disambiguation ?? '');
  const [bio, setBio] = useState(initialArtist?.bio ?? '');
  const [year, setYear] = useState(initialAlbum?.year ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const currentImage = initialArtist?.imageUrl ?? initialAlbum?.coverUrl ?? null;
  const idPrefix = `catalog-form-${target.mode}-${target.kind}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      // undefined leaves the image alone, null removes it.
      let imageUrl: string | null | undefined;
      if (file) {
        const token = await executeRecaptchaSafe(executeRecaptcha, 'upload_catalog_image');
        imageUrl = await uploadCatalogImage(file, token);
      } else if (removeImage) {
        imageUrl = null;
      }
      if (target.mode === 'create' && target.kind === 'artist') {
        await adminCreateArtist({ name: trimmed, disambiguation: disambiguation.trim() || undefined, bio: bio.trim() || undefined, imageUrl: imageUrl ?? undefined });
      } else if (target.mode === 'create') {
        await adminCreateAlbum({ artistId: target.artistId, title: trimmed, year: year.trim() || undefined, coverUrl: imageUrl ?? undefined });
      } else if (target.kind === 'artist') {
        // Only changed fields go out, so an unrelated edit cannot trip server rules on untouched ones.
        await adminUpdate({
          kind: 'artist',
          id: target.entry.id,
          ...(trimmed !== target.entry.name && { name: trimmed }),
          ...(disambiguation.trim() !== (target.entry.disambiguation ?? '') && { disambiguation: disambiguation.trim() }),
          ...(bio.trim() !== (target.entry.bio ?? '') && { bio: bio.trim() }),
          ...(imageUrl !== undefined && { imageUrl }),
        });
      } else {
        await adminUpdate({
          kind: 'album',
          id: target.entry.id,
          ...(trimmed !== target.entry.title && { title: trimmed }),
          ...(year.trim() !== (target.entry.year ?? '') && { year: year.trim() }),
          ...(imageUrl !== undefined && { coverUrl: imageUrl }),
        });
      }
      await onDone(target);
    } catch (err) {
      toast.error(t(catalogErrorKey(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-name`}>{isAlbum ? t('admin.catalogTab.form.title') : t('admin.catalogTab.form.name')}</Label>
        <Input id={`${idPrefix}-name`} value={name} maxLength={isAlbum ? TITLE_MAX : NAME_MAX} onChange={(e) => setName(e.target.value)} />
      </div>
      {isAlbum ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-year`}>{t('admin.catalogTab.form.year')}</Label>
          <Input id={`${idPrefix}-year`} value={year} maxLength={YEAR_MAX} inputMode="numeric" onChange={(e) => setYear(e.target.value)} />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-disambiguation`}>{t('admin.catalogTab.form.disambiguation')}</Label>
            <Input id={`${idPrefix}-disambiguation`} value={disambiguation} maxLength={DISAMBIGUATION_MAX} onChange={(e) => setDisambiguation(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-bio`}>{t('admin.catalogTab.form.bio')}</Label>
            <Textarea id={`${idPrefix}-bio`} value={bio} maxLength={BIO_MAX} onChange={(e) => setBio(e.target.value)} />
          </div>
        </>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">{isAlbum ? t('admin.catalogTab.form.cover') : t('admin.catalogTab.form.image')}</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-label={t('admin.catalogTab.form.imageChoose')}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>{t('admin.catalogTab.form.imageChoose')}</Button>
        {file && <span className="max-w-48 truncate text-xs text-zinc-500">{t('admin.catalogTab.form.imageChosen', { name: file.name })}</span>}
        {target.mode === 'edit' && currentImage && !file && (
          <div className="flex items-center gap-2">
            <Checkbox id={`${idPrefix}-remove-image`} checked={removeImage} onCheckedChange={(v) => setRemoveImage(v === true)} />
            <Label htmlFor={`${idPrefix}-remove-image`}>{isAlbum ? t('admin.catalogTab.form.removeCover') : t('admin.catalogTab.form.removeImage')}</Label>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>{t('admin.catalogTab.form.cancel')}</Button>
        <Button type="submit" size="sm" disabled={!name.trim() || busy}>
          {busy ? t('admin.catalogTab.form.saving') : t(target.mode === 'create' ? 'admin.catalogTab.form.create' : 'admin.catalogTab.form.save')}
        </Button>
      </div>
    </form>
  );
}
