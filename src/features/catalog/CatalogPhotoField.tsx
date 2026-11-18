import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { FileDropZone } from '@/shared/ui/FileDropZone';
import { ImageCropModal } from '@ui/ImageCropModal';
import { Button } from '@ui/button';
import type { CatalogErrorKey } from './catalog-errors';
import { MAX_IMAGE_BYTES, UNCHANGED } from './catalog-photo';
import type { PhotoState } from './catalog-photo';

/** Matches the square the server stores (c_fill,w_600,h_600): the crop does the framing, Cloudinary only confirms it. */
const OUTPUT_SIZE = 600;

type CatalogPhotoFieldProps = {
  /** Artists get a photo, albums a cover: same field, different copy. */
  variant: 'artist' | 'album';
  value: PhotoState;
  onChange: (next: PhotoState) => void;
  /** Called with a validation error for a rejected pick, or null once a pick is accepted. */
  onError: (key: CatalogErrorKey | null) => void;
  /** The image already stored on the entry, when editing one. */
  existingUrl?: string | null;
  disabled?: boolean;
};

const baseName = (name: string) => name.replace(/\.[^./\\]+$/, '') || 'photo';

/**
 * Square image picker for catalog entries: choose or drop a file, frame it in the crop step,
 * then preview it. The cropped result is what gets uploaded, so a reviewer sees exactly what
 * the submitter framed instead of whatever Cloudinary's center crop kept.
 */
export function CatalogPhotoField({ variant, value, onChange, onError, existingUrl, disabled }: CatalogPhotoFieldProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const isAlbum = variant === 'album';
  // Object URLs: `source` is the file as picked (so the crop can be adjusted again), `preview` the framed result.
  const [source, setSource] = useState<{ url: string; name: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const urls = useRef<{ source: string | null; preview: string | null }>({ source: null, preview: null });
  // Kept in sync after each render so the unmount cleanup below revokes whatever is current.
  useEffect(() => {
    urls.current = { source: source?.url ?? null, preview };
  });

  // Release both object URLs when the field goes away.
  useEffect(() => () => {
    if (urls.current.source) URL.revokeObjectURL(urls.current.source);
    if (urls.current.preview) URL.revokeObjectURL(urls.current.preview);
  }, []);

  const label = isAlbum ? t('catalog.dialog.coverLabel') : t('catalog.dialog.imageLabel');
  const shown = value.kind === 'new' ? preview : value.kind === 'genius' ? value.url : value.kind === 'unchanged' ? existingUrl ?? null : null;
  const hasImage = value.kind === 'new' || value.kind === 'genius' || (value.kind === 'unchanged' && !!existingUrl);

  function dropSource() {
    if (source) URL.revokeObjectURL(source.url);
    setSource(null);
  }

  function dropPreview() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  }

  function reset() {
    dropSource();
    dropPreview();
    onChange(existingUrl ? { kind: 'remove' } : UNCHANGED);
  }

  function pick(next: File | undefined) {
    if (!next) return;
    const invalid = !next.type.startsWith('image/')
      ? 'catalog.errors.imageNotImage'
      : next.size > MAX_IMAGE_BYTES ? 'catalog.errors.imageTooLarge' : null;
    if (invalid) {
      // A bad pick clears what was chosen before it, so the form never submits a stale file.
      dropSource();
      dropPreview();
      onChange(UNCHANGED);
      if (fileRef.current) fileRef.current.value = '';
      return onError(invalid);
    }
    onError(null);
    dropSource();
    setSource({ url: URL.createObjectURL(next), name: next.name });
    setCropping(true);
  }

  function confirmCrop(blob: Blob) {
    dropPreview();
    setPreview(URL.createObjectURL(blob));
    onChange({ kind: 'new', file: new File([blob], `${baseName(source?.name ?? 'photo')}.png`, { type: blob.type || 'image/png' }) });
    setCropping(false);
  }

  function cancelCrop() {
    setCropping(false);
    // Nothing framed yet: forget the pick so the slot goes back to what it showed before.
    if (value.kind !== 'new') dropSource();
    if (fileRef.current) fileRef.current.value = '';
  }

  const chooseLabel = hasImage
    ? isAlbum ? t('catalog.dialog.coverChange') : t('catalog.dialog.imageChange')
    : isAlbum ? t('catalog.dialog.coverChoose') : t('catalog.dialog.imageChoose');

  return (
    <div className="flex items-center gap-4">
      <FileDropZone onFile={pick} disabled={disabled} compact className="size-28 shrink-0 rounded-xl">
        <div
          className={`flex size-full items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground ${shown ? '' : 'border-2 border-dashed border-border'}`}
        >
          {shown
            ? <img src={shown} alt={t('catalog.dialog.previewAlt')} referrerPolicy="no-referrer" className="size-full object-cover" />
            : <Icon name="add_photo_alternate" size={36} />}
        </div>
      </FileDropZone>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">{t('catalog.dialog.imageHint')}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-label={isAlbum ? t('catalog.dialog.coverChoose') : t('catalog.dialog.imageChoose')}
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => fileRef.current?.click()}>{chooseLabel}</Button>
          {value.kind === 'new' && source && (
            <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => setCropping(true)}>{t('catalog.dialog.adjust')}</Button>
          )}
          {hasImage && (
            <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={reset}>
              {isAlbum ? t('catalog.dialog.coverRemove') : t('catalog.dialog.imageRemove')}
            </Button>
          )}
          {!hasImage && <span className="text-xs text-muted-foreground">{t('catalog.dialog.dropHint')}</span>}
        </div>
      </div>

      <ImageCropModal
        imageSrc={cropping && source ? source.url : null}
        aspect={1}
        outputWidth={OUTPUT_SIZE}
        outputHeight={OUTPUT_SIZE}
        title={isAlbum ? t('catalog.dialog.coverCropTitle') : t('catalog.dialog.imageCropTitle')}
        onCancel={cancelCrop}
        onConfirm={confirmCrop}
      />
    </div>
  );
}
