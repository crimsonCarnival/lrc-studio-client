import { InitialsAvatar } from '@/shared/ui/InitialsAvatar';
import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { LazyImage } from '@ui/LazyImage';
import { ImageCropModal } from '@ui/ImageCropModal';
import toast from 'react-hot-toast';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { authService } from '@/features/auth/services/auth.service';
import { uploadsService } from '@/features/projects/services/uploads.service';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { LogoLoader } from '@ui/LogoLoader';
import { executeRecaptchaSafe } from '@/app/recaptcha-arm';

// Matches the server's avatar-signature transformation (c_fill,w_256,h_256) — the crop
// step resizes to this before upload so the Cloudinary transform is a no-op safety net,
// not the thing doing the actual framing.
const AVATAR_OUTPUT_SIZE = 256;

export default function AvatarUpload() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthContext();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [uploading, setUploading] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => fileInputRef.current?.click();

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
      const recaptchaToken = await executeRecaptchaSafe(executeRecaptcha, 'upload_avatar');
      const { url } = await uploadsService.uploadAvatar(blob, recaptchaToken);
      const updatedUser = await authService.updateProfile({ avatarUrl: url });
      setUser(prev => ({ ...prev, ...updatedUser }));
      toast.success(t('profile.avatarUpdated'));
    } catch {
      toast.error(t('profile.avatarUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleApplyUrl = async () => {
    const url = urlValue.trim();
    if (!url.startsWith('http')) return;
    setUploading(true);
    try {
      const updatedUser = await authService.updateProfile({ avatarUrl: url });
      setUser(prev => ({ ...prev, ...updatedUser }));
      toast.success(t('profile.avatarUpdated'));
      setUrlMode(false);
      setUrlValue('');
    } catch {
      toast.error(t('profile.avatarUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    try {
      const updatedUser = await authService.updateProfile({ avatarUrl: null });
      setUser(prev => ({ ...prev, ...updatedUser }));
      toast.success(t('profile.avatarRemoved'));
    } catch {
      toast.error(t('profile.avatarRemoveFailed'));
    } finally {
      setUploading(false);
    }
  };

  const hasAvatar = !!user?.avatarUrl && user.avatarUrl.length > 0;

  return (
    <div className={`flex flex-col gap-2.5 shrink-0 ${urlMode ? 'w-72' : 'w-[10.5rem]'}`}>
      <button
        type="button"
        onClick={handleAvatarClick}
        className="size-20 rounded-[20px] bg-zinc-800 flex items-center justify-center overflow-hidden cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/50 shrink-0"
        aria-label={t('profile.changeAvatar')}
      >
        {uploading ? (
          <LogoLoader size={24} className="text-primary" />
        ) : hasAvatar ? (
          <LazyImage src={user!.avatarUrl!} alt={t('profile.avatarAlt')} className="size-full object-cover" />
        ) : (
          <InitialsAvatar name={(user?.displayName || user?.accountName || '?')} handle={user?.accountName} className="size-full text-[40px]" />
        )}
      </button>

      <div className="min-w-0">
        {urlMode ? (
          <div className="flex flex-col gap-2 w-full">
            <input
              type="text"
              value={urlValue}
              onChange={e => setUrlValue(e.target.value)}
              placeholder={t('profile.avatarUrlPlaceholder')}
              aria-label={t('profile.setAvatarUrl')}
              className="bg-zinc-950 border border-zinc-700 rounded-[10px] px-3 h-10 text-sm text-zinc-100 outline-none focus:border-primary/60 w-full"
              disabled={uploading}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleApplyUrl} disabled={uploading || !urlValue.trim().startsWith('http')} className="rounded-xl h-10 coarse:h-11 font-bold">
                {uploading ? <LogoLoader size={14} /> : t('common.apply')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setUrlMode(false); setUrlValue(''); }} disabled={uploading} className="rounded-xl h-10 coarse:h-11 font-bold text-zinc-400 hover:text-zinc-200">
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <Tip content={t('profile.changeAvatar')}>
              <Button onClick={handleAvatarClick} disabled={uploading} variant="outline" size="icon" aria-label={t('profile.changeAvatar')} className="size-9 coarse:size-11 rounded-[10px] border-zinc-700 bg-zinc-900 text-zinc-100">
                <Icon name="cloud_upload" size={16} />
              </Button>
            </Tip>
            <Tip content={t('profile.setAvatarUrl')}>
              <Button onClick={() => { setUrlMode(true); setUrlValue(user?.avatarUrl || ''); }} disabled={uploading} variant="outline" size="icon" aria-label={t('profile.setAvatarUrl')} className="size-9 coarse:size-11 rounded-[10px] border-zinc-700 bg-zinc-900 text-zinc-100">
                <Icon name="link" size={16} />
              </Button>
            </Tip>
            {hasAvatar && (
              <Tip content={t('profile.removeAvatar')}>
                <Button onClick={handleRemoveAvatar} disabled={uploading} variant="outline" size="icon" aria-label={t('profile.removeAvatar')} className="size-9 coarse:size-11 rounded-[10px] border-zinc-700 bg-zinc-900 text-zinc-400">
                  <Icon name="close" size={16} />
                </Button>
              </Tip>
            )}
          </div>
        )}
        <p className="text-xs text-zinc-400 mt-2">{t('profile.avatarHint')}</p>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      </div>
      <ImageCropModal
        imageSrc={cropSrc}
        aspect={1}
        outputWidth={AVATAR_OUTPUT_SIZE}
        outputHeight={AVATAR_OUTPUT_SIZE}
        cropShape="round"
        title={t('profile.crop.avatarTitle')}
        onCancel={closeCrop}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}
