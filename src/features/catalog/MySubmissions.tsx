import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { executeRecaptchaSafe } from '@/app/recaptcha-arm';
import useConfirm from '@/shared/hooks/useConfirm';
import { Button } from '@ui/button';
import { CollapsibleSection } from '@ui/collapsible-section';
import { Skeleton } from '@ui/skeleton';
import { StatusChip } from '@ui/StatusChip';
import { catalogErrorKey, uploadErrorKey } from './catalog-errors';
import type { CatalogErrorKey } from './catalog-errors';
import { CatalogPhotoField } from './CatalogPhotoField';
import { UNCHANGED } from './catalog-photo';
import type { PhotoState } from './catalog-photo';
import { MY_SUBMISSIONS_KEY } from './catalog.queries';
import { catalogArtistPath } from './catalog-path';
import { getMySubmissions, updateMyEntry, uploadCatalogImage, withdrawMyEntry } from './catalog.service';
import type { CatalogAlbum, CatalogArtist, CatalogKind } from './catalog.types';
import { FloatingInput } from '@ui/floating-input';
import { FloatingTextarea } from '@ui/floating-textarea';

type ApprovedArtist = { id: string; name: string; slug?: string | null };

type MySubmissionsProps = {
  /** Open the album form for one of the user's approved catalog artists. */
  onAddAlbum: (artist: ApprovedArtist) => void;
};

const STATUS_TONE = { pending: 'gold', approved: 'foam', rejected: 'love' } as const;
type Status = keyof typeof STATUS_TONE;
const isStatus = (s: string): s is Status => s in STATUS_TONE;

type Row =
  | { kind: 'artist'; id: string; label: string; status: string; reviewNote?: string | null; entry: CatalogArtist }
  | { kind: 'album'; id: string; label: string; status: string; reviewNote?: string | null; entry: CatalogAlbum };

/** The signed-in user's own catalog submissions, collapsed until opened so the list is only fetched on demand. */
export function MySubmissions({ onAddAlbum }: MySubmissionsProps) {
  const { t } = useTranslation();
  return (
    <CollapsibleSection title={t('catalog.submissions.title')}>
      <SubmissionsList onAddAlbum={onAddAlbum} />
    </CollapsibleSection>
  );
}

function SubmissionsList({ onAddAlbum }: MySubmissionsProps) {
  const { t } = useTranslation();
  const { data, isPending, isError } = useQuery({ queryKey: MY_SUBMISSIONS_KEY, queryFn: getMySubmissions });

  if (isPending) return <Skeleton className="h-16 rounded-xl" />;
  if (isError) return <p role="alert" className="text-sm text-love">{t('catalog.submissions.loadError')}</p>;

  const rows: Row[] = [
    ...data.artists.map((entry): Row => ({ kind: 'artist', id: entry.id, label: entry.name, status: entry.status, reviewNote: entry.reviewNote, entry })),
    ...data.albums.map((entry): Row => ({ kind: 'album', id: entry.id, label: entry.title, status: entry.status, reviewNote: entry.reviewNote, entry })),
  ];
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{t('catalog.submissions.empty')}</p>;

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => <SubmissionRow key={`${row.kind}:${row.id}`} row={row} onAddAlbum={onAddAlbum} />)}
    </ul>
  );
}

function SubmissionRow({ row, onAddAlbum }: { row: Row; onAddAlbum: MySubmissionsProps['onAddAlbum'] }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [requestConfirm, confirmModal] = useConfirm();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<CatalogErrorKey | null>(null);
  const pending = row.status === 'pending';
  const tone = isStatus(row.status) ? STATUS_TONE[row.status] : 'neutral';

  const withdraw = useMutation({
    mutationFn: () => withdrawMyEntry(row.kind, row.id),
    onSuccess: async () => {
      toast.success(t('catalog.submissions.withdrawn'));
      await queryClient.invalidateQueries({ queryKey: MY_SUBMISSIONS_KEY });
    },
    onError: (err) => setError(catalogErrorKey(err)),
  });

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Thumb url={row.kind === 'artist' ? row.entry.imageUrl : row.entry.coverUrl} label={row.label} />
        <span className="text-xs text-muted-foreground">{t(`catalog.submissions.kind.${row.kind}`)}</span>
        {row.kind === 'artist' && row.status === 'approved' && row.entry.slug
          ? <Link to={catalogArtistPath(row.entry.slug)} className="min-w-0 flex-1 truncate font-medium text-foreground hover:underline">{row.label}</Link>
          : <span className="min-w-0 flex-1 truncate font-medium text-foreground">{row.label}</span>}
        <StatusChip tone={tone}>{isStatus(row.status) ? t(`catalog.submissions.status.${row.status}`) : t('catalog.submissions.status.unknown')}</StatusChip>
      </div>

      {row.status === 'rejected' && row.reviewNote && (
        <p className="text-sm text-muted-foreground">{t('catalog.submissions.rejectionNote', { note: row.reviewNote })}</p>
      )}

      {editing && pending ? (
        <EditForm row={row} onDone={() => setEditing(false)} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {pending && (
            <>
              <Button type="button" variant="outline" size="sm" aria-label={t('catalog.submissions.editLabel', { name: row.label })} onClick={() => { setError(null); setEditing(true); }}>
                {t('catalog.submissions.edit')}
              </Button>
              <Button type="button" variant="destructive" size="sm" loading={withdraw.isPending} aria-label={t('catalog.submissions.withdrawLabel', { name: row.label })} onClick={() => requestConfirm(t('catalog.submissions.withdrawConfirmBody'), () => { setError(null); withdraw.mutate(); }, { variant: 'danger', title: t('catalog.submissions.withdrawConfirmTitle') })}>
                {t('catalog.submissions.withdraw')}
              </Button>
            </>
          )}
          {row.kind === 'artist' && row.status === 'approved' && (
            <Button type="button" variant="outline" size="sm" aria-label={t('catalog.submissions.addAlbumLabel', { name: row.label })} onClick={() => onAddAlbum({ id: row.id, name: row.label, slug: row.entry.slug })}>
              {t('catalog.submissions.addAlbum')}
            </Button>
          )}
        </div>
      )}

      {error && <p role="alert" className="text-sm text-love">{t(error)}</p>}
      {confirmModal}
    </li>
  );
}

function Thumb({ url, label }: { url?: string | null; label: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-lg font-semibold text-muted-foreground">
      {url
        ? <img src={url} alt={t('catalog.submissions.thumbAlt', { name: label })} loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
        : <span aria-hidden="true">{Array.from(label)[0]?.toUpperCase()}</span>}
    </div>
  );
}

/** Edits a pending entry: its text fields and its photo. The entry stays pending, so the reviewer sees the new version. */
function EditForm({ row, onDone }: { row: Row; onDone: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isArtist = row.kind === 'artist';
  const [name, setName] = useState(row.label);
  const [bio, setBio] = useState(row.kind === 'artist' ? row.entry.bio ?? '' : '');
  const [year, setYear] = useState(row.kind === 'album' ? row.entry.year ?? '' : '');
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [photo, setPhoto] = useState<PhotoState>(UNCHANGED);
  const existingUrl = row.kind === 'artist' ? row.entry.imageUrl : row.entry.coverUrl;
  const [error, setError] = useState<CatalogErrorKey | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      // undefined leaves the stored image alone, null clears it.
      let image: string | null | undefined;
      if (photo.kind === 'new') {
        try {
          const token = await executeRecaptchaSafe(executeRecaptcha, 'upload_catalog_image');
          image = await uploadCatalogImage(photo.file, token);
        } catch (err) {
          // Tag the failure so onError can say the upload failed, not that the save did.
          throw Object.assign(err instanceof Error ? err : new Error('upload failed'), { catalogUpload: true });
        }
      } else if (photo.kind === 'remove') {
        image = null;
      }
      return updateMyEntry(
        isArtist
          ? { kind: 'artist' as CatalogKind, id: row.id, name: name.trim(), bio: bio.trim(), ...(image !== undefined && { imageUrl: image }) }
          : { kind: 'album' as CatalogKind, id: row.id, title: name.trim(), year: year.trim(), ...(image !== undefined && { coverUrl: image }) },
      );
    },
    onSuccess: async () => {
      toast.success(t('catalog.submissions.saved'));
      await queryClient.invalidateQueries({ queryKey: MY_SUBMISSIONS_KEY });
      onDone();
    },
    onError: (err) => setError((err as { catalogUpload?: boolean }).catalogUpload ? uploadErrorKey(err) : catalogErrorKey(err)),
  });

  const idBase = `catalog-edit-${row.kind}-${row.id}`;
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    save.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <FloatingInput label={isArtist ? t('catalog.submissions.nameLabel') : t('catalog.submissions.titleLabel')} id={`${idBase}-name`} value={name} maxLength={isArtist ? 300 : 500} onChange={(e) => setName(e.target.value)} />
      </div>
      {isArtist ? (
        <div className="flex flex-col gap-1.5">
          <FloatingTextarea label={t('catalog.submissions.bioLabel')} id={`${idBase}-bio`} value={bio} maxLength={1000} onChange={(e) => setBio(e.target.value)} />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <FloatingInput label={t('catalog.submissions.yearLabel')} id={`${idBase}-year`} value={year} maxLength={4} inputMode="numeric" onChange={(e) => setYear(e.target.value)} />
        </div>
      )}
      <CatalogPhotoField
        variant={row.kind}
        value={photo}
        onChange={setPhoto}
        onError={(key) => setError(key)}
        existingUrl={existingUrl}
        disabled={save.isPending}
      />
      {error && <p role="alert" className="text-sm text-love">{t(error)}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!name.trim() || save.isPending}>
          {save.isPending ? t('catalog.submissions.saving') : t('catalog.submissions.save')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>{t('catalog.submissions.cancel')}</Button>
      </div>
    </form>
  );
}
