import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { LazyImage } from '@ui/LazyImage';
import { ImageCropModal } from '@ui/ImageCropModal';
import toast from 'react-hot-toast';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { authService } from '@/features/auth/services/auth.service';
import { uploadsService } from '@/features/projects/services/uploads.service';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { LogoLoader } from '@ui/LogoLoader';
import { executeRecaptchaSafe } from '@/app/recaptcha-arm';

// Matches the server's profile-cover-signature transformation (c_fill,w_1200,h_400) —
// a 3:1 banner, same ratio ProfileHeader displays it at via object-cover.
const COVER_ASPECT = 3 / 1;
const COVER_OUTPUT_WIDTH = 1200;
const COVER_OUTPUT_HEIGHT = 400;

export default function CoverImageUpload() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthContext();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePickClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

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
      const updatedUser = await authService.updateProfile({ coverImageUrl: url });
      setUser(prev => ({ ...prev, ...updatedUser }));
      toast.success(t('profile.coverUpdated'));
    } catch {
      toast.error(t('profile.coverUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCover = async () => {
    setUploading(true);
    try {
      const updatedUser = await authService.updateProfile({ coverImageUrl: null });
      setUser(prev => ({ ...prev, ...updatedUser }));
      toast.success(t('profile.coverRemoved'));
    } catch {
      toast.error(t('profile.coverRemoveFailed'));
    } finally {
      setUploading(false);
    }
  };

  const hasCover = !!user?.coverImageUrl && String(user.coverImageUrl).length > 0;

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold text-zinc-200">{t('profile.coverImage')}</span>
      <div className="flex flex-wrap items-center gap-[18px]">
        <button
          type="button"
          onClick={handlePickClick}
          className="h-20 w-full max-w-72 rounded-[14px] bg-zinc-800 flex items-center justify-center overflow-hidden cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/50 shrink-0"
          aria-label={t('profile.changeCover')}
        >
          {uploading ? (
            <LogoLoader size={24} className="text-primary" />
          ) : hasCover ? (
            <LazyImage src={String(user!.coverImageUrl)} alt="" className="size-full object-cover" />
          ) : (
            <Icon name="image" size={28} className="text-zinc-500" />
          )}
        </button>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handlePickClick} disabled={uploading} variant="outline" className="h-11 rounded-[10px] border-zinc-700 bg-zinc-900 text-zinc-100 font-semibold">
            {t('profile.changeCover')}
          </Button>
          {hasCover && (
            <Button onClick={handleRemoveCover} disabled={uploading} variant="outline" className="h-11 rounded-[10px] border-zinc-700 bg-zinc-900 text-zinc-400 font-semibold">
              {t('profile.removeCover')}
            </Button>
          )}
        </div>
      </div>
      <p className="text-[13px] text-zinc-400">{t('profile.coverHint')}</p>
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
