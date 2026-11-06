import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { FileDropZone } from '@/shared/ui/FileDropZone';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { LazyImage } from '@ui/LazyImage';
import { ImageCropModal } from '@ui/ImageCropModal';
import toast from 'react-hot-toast';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { uploadsService } from '@/features/projects/services/uploads.service';
import { LogoLoader } from '@ui/LogoLoader';
import { executeRecaptchaSafe } from '@/app/recaptcha-arm';

// Matches the server's profile-cover-signature transformation (c_fill,w_1200,h_400) —
// a 3:1 banner, same ratio ProfileHeader displays it at via object-cover.
const COVER_ASPECT = 3 / 1;
const COVER_OUTPUT_WIDTH = 1200;
const COVER_OUTPUT_HEIGHT = 400;

type CoverImageUploadProps = {
  coverImageUrl: string | null;
  /** Stages the new cover (null removes it); the page's save bar commits it. */
  onChange: (url: string | null) => void;
};

export default function CoverImageUpload({ coverImageUrl, onChange }: CoverImageUploadProps) {
  const { t } = useTranslation();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePickClick = () => fileInputRef.current?.click();

  const acceptFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.invalidImageType'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.imageTooLarge'));
      return;
    }

    setCropSrc(URL.createObjectURL(file));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) acceptFile(file);
  };

  const closeCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const handleCropConfirm = async (blob: Blob) => {
    closeCrop();
    setUploading(true);
    try {
      const recaptchaToken = await executeRecaptchaSafe(executeRecaptcha, 'upload_profile_cover');
      const { url } = await uploadsService.uploadProfileCover(blob, recaptchaToken);
      onChange(url);
    } catch {
      toast.error(t('profile.coverUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const hasCover = !!coverImageUrl;

  return (
    <div className="flex flex-col gap-2.5 min-w-0 flex-1 basis-72">
      <span className="text-sm font-semibold text-zinc-200">{t('profile.coverImage')}</span>
      <FileDropZone onFile={acceptFile} disabled={uploading} className="h-20 w-full rounded-[14px]">
        <button
          type="button"
          onClick={handlePickClick}
          className="size-full rounded-[14px] bg-zinc-800 flex items-center justify-center overflow-hidden cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={t('profile.changeCover')}
        >
          {uploading ? (
            <LogoLoader size={24} className="text-primary" />
          ) : hasCover ? (
            <LazyImage src={coverImageUrl!} alt=""className="size-full object-cover" />
          ) : (
            <Icon name="image" size={28} className="text-zinc-500" />
          )}
        </button>
      </FileDropZone>
      <div className="flex gap-1.5">
        <Tip content={t('profile.changeCover')}>
          <Button onClick={handlePickClick} disabled={uploading} variant="outline" size="icon" aria-label={t('profile.changeCover')} className="size-9 coarse:size-11 rounded-[10px] border-zinc-700 bg-zinc-900 text-zinc-100">
            <Icon name="cloud_upload" size={16} />
          </Button>
        </Tip>
        {hasCover && (
          <Tip content={t('profile.removeCover')}>
            <Button onClick={() => onChange(null)} disabled={uploading} variant="outline" size="icon" aria-label={t('profile.removeCover')} className="size-9 coarse:size-11 rounded-[10px] border-zinc-700 bg-zinc-900 text-zinc-400">
              <Icon name="close" size={16} />
            </Button>
          </Tip>
        )}
      </div>
      <p className="text-xs text-zinc-400">{t('profile.coverHint')}</p>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      <ImageCropModal
        imageSrc={cropSrc}
        aspect={COVER_ASPECT}
        outputWidth={COVER_OUTPUT_WIDTH}
        outputHeight={COVER_OUTPUT_HEIGHT}
        cropShape="rect"
        title={t('profile.crop.coverTitle')}
        onCancel={closeCrop}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}
