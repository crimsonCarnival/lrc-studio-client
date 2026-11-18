import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import toast from 'react-hot-toast';
import { executeRecaptchaSafe } from '@/app/recaptcha-arm';
import { Button } from '@ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/dialog';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Textarea } from '@ui/textarea';
import { adminCreateAlbum, adminCreateArtist, adminUpdate, uploadCatalogImage } from '@/features/catalog/catalog.service';
import { catalogErrorKey, uploadErrorKey } from '@/features/catalog/catalog-errors';
import type { CatalogErrorKey } from '@/features/catalog/catalog-errors';
import { GeniusPhotoPicker } from './GeniusPhotoPicker';
import { CatalogPhotoField } from '@/features/catalog/CatalogPhotoField';
import { UNCHANGED } from '@/features/catalog/catalog-photo';
import type { PhotoState } from '@/features/catalog/catalog-photo';
import type { CatalogAlbum, CatalogArtist } from '@/features/catalog/catalog.types';

const NAME_MAX = 300;
const TITLE_MAX = 500;
const BIO_MAX = 1000;
const DISAMBIGUATION_MAX = 80;
const YEAR_MAX = 4;

export type FormTarget =
  | { mode: 'create'; kind: 'artist' }
  | { mode: 'create'; kind: 'album'; artistId: string }
  | { mode: 'edit'; kind: 'artist'; entry: CatalogArtist }
  | { mode: 'edit'; kind: 'album'; entry: CatalogAlbum };

type CatalogEntryDialogProps = {
  target: FormTarget | null;
  onDone: (target: FormTarget) => void | Promise<void>;
  onClose: () => void;
};

/** Create or edit a catalog artist or album as an admin. Entries made here are approved at once. */
export function CatalogEntryDialog({ target, onDone, onClose }: CatalogEntryDialogProps) {
  const { t } = useTranslation();
  const key = target ? `${target.mode}:${target.kind}:${target.mode === 'edit' ? target.entry.id : target.kind === 'album' ? target.artistId : ''}` : 'closed';
  return (
    <Dialog open={target !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        {target && (
          <>
            <DialogHeader>
              <DialogTitle>{t(`admin.catalogTab.form.title_${target.mode}_${target.kind}`)}</DialogTitle>
              <DialogDescription>{t(target.mode === 'create' ? 'admin.catalogTab.form.createDescription' : 'admin.catalogTab.form.editDescription')}</DialogDescription>
            </DialogHeader>
            {/* Keyed so each target starts from its own values. */}
            <EntryForm key={key} target={target} onDone={onDone} onClose={onClose} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EntryForm({ target, onDone, onClose }: { target: FormTarget; onDone: CatalogEntryDialogProps['onDone']; onClose: () => void }) {
  const { t } = useTranslation();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const isAlbum = target.kind === 'album';
  const initial = target.mode === 'edit' ? target.entry : null;
  const initialArtist = initial && !isAlbum ? (initial as CatalogArtist) : null;
  const initialAlbum = initial && isAlbum ? (initial as CatalogAlbum) : null;
  const [name, setName] = useState(initialArtist?.name ?? initialAlbum?.title ?? '');
  const [disambiguation, setDisambiguation] = useState(initialArtist?.disambiguation ?? '');
  const [bio, setBio] = useState(initialArtist?.bio ?? '');
  const [year, setYear] = useState(initialAlbum?.year ?? '');
  const [photo, setPhoto] = useState<PhotoState>(UNCHANGED);
  const [photoError, setPhotoError] = useState<CatalogErrorKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickingGenius, setPickingGenius] = useState(false);
  const existingUrl = initialArtist?.imageUrl ?? initialAlbum?.coverUrl ?? null;
  const idPrefix = `catalog-form-${target.mode}-${target.kind}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setPhotoError(null);
    try {
      // undefined leaves the image alone, null removes it.
      let imageUrl: string | null | undefined;
      // Only a Genius pick says where the image came from; any other write leaves the server to reset it to an upload.
      const source = photo.kind === 'genius' ? { imageSource: 'genius' as const, imageSourceUrl: photo.sourceUrl } : {};
      if (photo.kind === 'new') {
        try {
          const token = await executeRecaptchaSafe(executeRecaptcha, 'upload_catalog_image');
          imageUrl = await uploadCatalogImage(photo.file, token);
        } catch (err) {
          setPhotoError(uploadErrorKey(err));
          return;
        }
      } else if (photo.kind === 'genius') {
        imageUrl = photo.url;
      } else if (photo.kind === 'remove') {
        imageUrl = null;
      }
      if (target.mode === 'create' && target.kind === 'artist') {
        await adminCreateArtist({ name: trimmed, disambiguation: disambiguation.trim() || undefined, bio: bio.trim() || undefined, imageUrl: imageUrl ?? undefined, ...source });
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
          ...(imageUrl !== undefined && { imageUrl, ...source }),
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
    <>
    <form onSubmit={submit} className="flex flex-col gap-4">
      <CatalogPhotoField
        variant={target.kind}
        value={photo}
        onChange={setPhoto}
        onError={setPhotoError}
        existingUrl={existingUrl}
        disabled={busy}
      />
      {!isAlbum && (
        <Button type="button" variant="outline" size="sm" className="self-start" disabled={busy} onClick={() => setPickingGenius(true)}>
          {t('admin.catalogTab.genius.button')}
        </Button>
      )}
      {photoError && <p role="alert" className="text-sm text-love">{t(photoError)}</p>}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-name`}>{isAlbum ? t('admin.catalogTab.form.title') : t('admin.catalogTab.form.name')}</Label>
        <Input id={`${idPrefix}-name`} value={name} maxLength={isAlbum ? TITLE_MAX : NAME_MAX} onChange={(e) => setName(e.target.value)} autoFocus />
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
            <Input
              id={`${idPrefix}-disambiguation`}
              value={disambiguation}
              maxLength={DISAMBIGUATION_MAX}
              placeholder={t('admin.catalogTab.form.disambiguationPlaceholder')}
              aria-describedby={`${idPrefix}-disambiguation-hint`}
              onChange={(e) => setDisambiguation(e.target.value)}
            />
            <span id={`${idPrefix}-disambiguation-hint`} className="text-xs text-muted-foreground">{t('admin.catalogTab.form.disambiguationHint')}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${idPrefix}-bio`}>{t('admin.catalogTab.form.bio')}</Label>
            <Textarea id={`${idPrefix}-bio`} value={bio} maxLength={BIO_MAX} onChange={(e) => setBio(e.target.value)} />
            <span className="self-end text-xs tabular-nums text-muted-foreground" aria-live="polite">{t('admin.catalogTab.form.bioCounter', { count: bio.length, max: BIO_MAX })}</span>
          </div>
        </>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>{t('admin.catalogTab.form.cancel')}</Button>
        <Button type="submit" disabled={!name.trim() || busy}>
          {busy ? t('admin.catalogTab.form.saving') : t(target.mode === 'create' ? 'admin.catalogTab.form.create' : 'admin.catalogTab.form.save')}
        </Button>
      </DialogFooter>
    </form>
    {/* Outside the form: portal events bubble through React, and Enter in the picker must not submit this form. */}
    {!isAlbum && (
      <GeniusPhotoPicker
        open={pickingGenius}
        initialQuery={name.trim()}
        onPick={(p) => { setPhotoError(null); setPhoto({ kind: 'genius', url: p.imageUrl, sourceUrl: p.sourceUrl }); }}
        onClose={() => setPickingGenius(false)}
      />
    )}
    </>
  );
}
