import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import toast from 'react-hot-toast';
import { executeRecaptchaSafe } from '@/app/recaptcha-arm';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/dialog';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Textarea } from '@ui/textarea';
import { catalogErrorKey, uploadErrorKey } from './catalog-errors';
import type { CatalogErrorKey } from './catalog-errors';
import { CatalogPhotoField } from './CatalogPhotoField';
import { UNCHANGED } from './catalog-photo';
import type { PhotoState } from './catalog-photo';
import { catalogDuplicateOf, submitCatalogAlbum, submitCatalogArtist, uploadCatalogImage } from './catalog.service';
import { MY_SUBMISSIONS_KEY } from './catalog.queries';
import { catalogAlbumPath, catalogArtistPath } from './catalog-path';

const NAME_MAX = 300;
const TITLE_MAX = 500;
const BIO_MAX = 1000;
const YEAR_MAX = 4;

/** `initialName` pre-fills the form; `artistSlug` lets a duplicate album error link to the existing album page. */
export type SubmitTarget = { kind: 'artist'; initialName?: string } | { kind: 'album'; artistId: string; artistName: string; artistSlug?: string | null; initialName?: string };

type SubmitCatalogDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: SubmitTarget;
};

type FormError = { key: CatalogErrorKey; duplicate?: { name: string; href: string | null } };

/** The artist / album submission form. Both end up in the review queue; nothing is public until a reviewer approves. */
export function SubmitCatalogDialog({ open, onOpenChange, target }: SubmitCatalogDialogProps) {
  const { t } = useTranslation();
  const isAlbum = target.kind === 'album';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isAlbum ? t('catalog.dialog.albumTitle', { artist: target.artistName }) : t('catalog.dialog.artistTitle')}</DialogTitle>
          <DialogDescription>{isAlbum ? t('catalog.dialog.albumDescription') : t('catalog.dialog.artistDescription')}</DialogDescription>
        </DialogHeader>
        <SubmitForm target={target} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function SubmitForm({ target, onClose }: { target: SubmitTarget; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const isAlbum = target.kind === 'album';
  const [name, setName] = useState(target.initialName ?? '');
  const [bio, setBio] = useState('');
  const [year, setYear] = useState('');
  const [photo, setPhoto] = useState<PhotoState>(UNCHANGED);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FormError | null>(null);

  const trimmed = name.trim();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    let imageUrl: string | undefined;
    try {
      if (photo.kind === 'new') {
        try {
          const token = await executeRecaptchaSafe(executeRecaptcha, 'upload_catalog_image');
          imageUrl = await uploadCatalogImage(photo.file, token);
        } catch (err) {
          setError({ key: uploadErrorKey(err) });
          return;
        }
      }
      if (target.kind === 'album') {
        await submitCatalogAlbum({ artistId: target.artistId, title: trimmed, year: year.trim() || undefined, coverUrl: imageUrl });
      } else {
        await submitCatalogArtist({ name: trimmed, bio: bio.trim() || undefined, imageUrl });
      }
      await queryClient.invalidateQueries({ queryKey: MY_SUBMISSIONS_KEY });
      toast.success(t('catalog.dialog.submitted'));
      onClose();
    } catch (err) {
      const existing = catalogDuplicateOf(err);
      const href = !existing ? null
        : target.kind === 'artist' ? catalogArtistPath(existing.slug)
        : target.artistSlug ? catalogAlbumPath(target.artistSlug, existing.slug) : null;
      setError({ key: catalogErrorKey(err), duplicate: existing ? { name: existing.name, href } : undefined });
    } finally {
      setBusy(false);
    }
  }

  const nameId = 'catalog-submit-name';
  const bioId = 'catalog-submit-bio';
  const yearId = 'catalog-submit-year';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={nameId}>{isAlbum ? t('catalog.dialog.albumTitleLabel') : t('catalog.dialog.nameLabel')}</Label>
        <Input id={nameId} value={name} maxLength={isAlbum ? TITLE_MAX : NAME_MAX} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>

      {isAlbum ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={yearId}>{t('catalog.dialog.yearLabel')}</Label>
          <Input id={yearId} value={year} maxLength={YEAR_MAX} inputMode="numeric" onChange={(e) => setYear(e.target.value)} />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={bioId}>{t('catalog.dialog.bioLabel')}</Label>
          <Textarea id={bioId} value={bio} maxLength={BIO_MAX} onChange={(e) => setBio(e.target.value)} />
          <span className="self-end text-xs tabular-nums text-muted-foreground" aria-live="polite">
            {t('catalog.dialog.bioCounter', { count: bio.length, max: BIO_MAX })}
          </span>
        </div>
      )}

      <CatalogPhotoField
        variant={target.kind}
        value={photo}
        onChange={setPhoto}
        onError={(key) => setError(key ? { key } : null)}
        disabled={busy}
      />

      {error && (
        <p role="alert" className="text-sm text-love">
          {t(error.key)}
          {error.duplicate && (error.duplicate.href
            ? <> <Link to={error.duplicate.href} onClick={onClose} className="underline">{t('catalog.errors.duplicateExisting', { name: error.duplicate.name })}</Link></>
            : <> {t('catalog.errors.duplicateExisting', { name: error.duplicate.name })}</>)}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>{t('catalog.dialog.cancel')}</Button>
        <Button type="submit" disabled={!trimmed || busy}>{busy ? t('catalog.dialog.submitting') : t('catalog.dialog.submit')}</Button>
      </DialogFooter>
    </form>
  );
}
