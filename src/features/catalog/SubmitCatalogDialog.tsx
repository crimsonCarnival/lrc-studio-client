import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import toast from 'react-hot-toast';
import { executeRecaptchaSafe } from '@/app/recaptcha-arm';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/dialog';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Textarea } from '@ui/textarea';
import { catalogErrorKey } from './catalog-errors';
import type { CatalogErrorKey } from './catalog-errors';
import { catalogDuplicateOf, submitCatalogAlbum, submitCatalogArtist, uploadCatalogImage } from './catalog.service';
import { MY_SUBMISSIONS_KEY } from './catalog.queries';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const NAME_MAX = 300;
const TITLE_MAX = 500;
const BIO_MAX = 1000;
const YEAR_MAX = 4;

export type SubmitTarget = { kind: 'artist' } | { kind: 'album'; artistId: string; artistName: string };

type SubmitCatalogDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: SubmitTarget;
};

type FormError = { key: CatalogErrorKey | 'catalog.errors.imageNotImage' | 'catalog.errors.imageTooLarge' | 'catalog.errors.uploadFailed'; duplicate?: { name: string } };

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [year, setYear] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FormError | null>(null);

  const trimmed = name.trim();

  function pickFile(next: File | undefined) {
    if (!next) return;
    const invalid = !next.type.startsWith('image/') ? 'catalog.errors.imageNotImage' : next.size > MAX_IMAGE_BYTES ? 'catalog.errors.imageTooLarge' : null;
    if (invalid) {
      clearFile();
      return setError({ key: invalid });
    }
    setError(null);
    setFile(next);
  }

  function clearFile() {
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    let imageUrl: string | undefined;
    try {
      if (file) {
        try {
          const token = await executeRecaptchaSafe(executeRecaptcha, 'upload_catalog_image');
          imageUrl = await uploadCatalogImage(file, token);
        } catch (err) {
          // A signature rejection carries a code (rate limit, bad image); a Cloudinary or network failure does not.
          const key = catalogErrorKey(err);
          setError({ key: key === 'catalog.errors.generic' ? 'catalog.errors.uploadFailed' : key });
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
      setError({ key: catalogErrorKey(err), duplicate: !isAlbum && existing ? { name: existing.name } : undefined });
    } finally {
      setBusy(false);
    }
  }

  const nameId = 'catalog-submit-name';
  const bioId = 'catalog-submit-bio';
  const yearId = 'catalog-submit-year';
  const imageLabel = isAlbum
    ? file ? t('catalog.dialog.coverChange') : t('catalog.dialog.coverChoose')
    : file ? t('catalog.dialog.imageChange') : t('catalog.dialog.imageChoose');

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

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">{isAlbum ? t('catalog.dialog.coverLabel') : t('catalog.dialog.imageLabel')}</span>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-label={isAlbum ? t('catalog.dialog.coverChoose') : t('catalog.dialog.imageChoose')}
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>{imageLabel}</Button>
          {file && (
            <>
              <span className="max-w-48 truncate text-xs text-muted-foreground">{file.name}</span>
              <Button type="button" variant="ghost" size="sm" onClick={clearFile}>
                {isAlbum ? t('catalog.dialog.coverRemove') : t('catalog.dialog.imageRemove')}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-love">
          {t(error.key)}
          {error.duplicate && (
            // Plain text on purpose: there is no public artist page to link to until catalog step 2.
            <> {t('catalog.errors.duplicateExisting', { name: error.duplicate.name })}</>
          )}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>{t('catalog.dialog.cancel')}</Button>
        <Button type="submit" disabled={!trimmed || busy}>{busy ? t('catalog.dialog.submitting') : t('catalog.dialog.submit')}</Button>
      </DialogFooter>
    </form>
  );
}
