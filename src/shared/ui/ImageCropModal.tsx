import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@ui/dialog';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { getCroppedImageBlob } from '@/shared/utils/image-crop';

interface ImageCropModalProps {
  /** Object URL (or data URL) of the picked file. Modal is open iff this is non-null. */
  imageSrc: string | null;
  /** width / height of both the crop box and the stored output. */
  aspect: number;
  /** Pixel size to resize the crop to before upload. */
  outputWidth: number;
  outputHeight: number;
  /** Round crop mask for avatars; rectangular for banners. */
  cropShape?: 'round' | 'rect';
  title: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

/**
 * Pick-a-region-and-zoom step shared by avatar and cover-banner uploads, so a photo that's
 * the wrong shape (too tall/too wide for the target slot) can be framed before it's sent
 * anywhere — rather than Cloudinary's server-side c_fill silently deciding what to keep.
 */
export function ImageCropModal({
  imageSrc,
  aspect,
  outputWidth,
  outputHeight,
  cropShape = 'rect',
  title,
  onCancel,
  onConfirm,
}: ImageCropModalProps) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  // Reset for next time this opens with a new image, since the component stays mounted.
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      onCancel();
    }
  };

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, outputWidth, outputHeight);
      onConfirm(blob);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!imageSrc} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {imageSrc && (
          <div className="relative h-80 w-full overflow-hidden rounded-xl bg-zinc-950">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={cropShape}
              showGrid={cropShape === 'rect'}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <Icon name="zoom_out" size={18} className="text-zinc-400 shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label={t('profile.crop.zoom')}
            className="w-full"
          />
          <Icon name="zoom_in" size={18} className="text-zinc-400 shrink-0" />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !croppedAreaPixels}>
            {t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
