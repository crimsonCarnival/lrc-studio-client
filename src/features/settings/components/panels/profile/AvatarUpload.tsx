import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { LazyImage } from '@ui/LazyImage';
import toast from 'react-hot-toast';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { authService } from '@/features/auth/services/auth.service';
import { uploadsService } from '@/features/projects/services/uploads.service';
import { useAuthContext } from '@/features/auth/useAuthContext';

export default function AvatarUpload() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthContext();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.invalidImageType'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.imageTooLarge'));
      return;
    }

    setUploading(true);
    try {
      const recaptchaToken = executeRecaptcha ? await executeRecaptcha('upload_avatar') : undefined;
      const { url } = await uploadsService.uploadAvatar(file, recaptchaToken) as { url: string };
      const updatedUser = await authService.updateProfile({ avatarUrl: url });
      setUser(prev => ({ ...prev, ...updatedUser }));
      toast.success(t('profile.avatarUpdated'));
      setExpanded(false);
    } catch {
      toast.error(t('profile.avatarUploadFailed'));
    } finally {
      setUploading(false);
      e.target.value = '';
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
      setExpanded(false);
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
      setExpanded(false);
    } catch {
      toast.error(t('profile.avatarRemoveFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border/40">
      <div className="relative group">
        <button
          type="button"
          onClick={handleAvatarClick}
          className="size-20 rounded-3xl bg-secondary/40 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-zinc-800 hover:border-primary/50 transition-all duration-300 outline-none focus:ring-2 focus:ring-primary/50 shrink-0"
          aria-label={t('profile.changeAvatar')}
        >
          {uploading ? (
            <Icon name="progress_activity" size={24} className="animate-spin text-primary" />
          ) : user?.avatarUrl && user.avatarUrl.length > 0 ? (
            <LazyImage src={user.avatarUrl} alt={t('profile.avatarAlt')} className="size-full object-cover" />
          ) : (
            <div className="size-full flex items-center justify-center bg-gradient-to-br from-primary/80 to-accent-purple font-bold text-zinc-950 text-2xl select-none">
              {(user?.displayName || user?.accountName || '?')[0].toUpperCase()}
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Icon name="upload" size={20} className="text-white" />
          </div>
        </button>
      </div>

      <div className="flex-1 text-center sm:text-left min-w-0">
        <h4 className="text-sm font-semibold text-zinc-200 mb-0.5">{t('profile.avatar')}</h4>
        <p className="text-xs text-zinc-500 mb-3">{t('profile.avatarHint')}</p>

        {!expanded ? (
          <Button
            size="sm"
            onClick={() => setExpanded(true)}
            className="rounded-xl h-8 text-[11px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60"
          >
            {t('profile.changeAvatar')}
          </Button>
        ) : (
          <div className="flex flex-col gap-2.5 max-w-sm border border-border/50 bg-secondary/15 rounded-2xl p-3 animate-fade-in">
            {urlMode ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={urlValue}
                  onChange={e => setUrlValue(e.target.value)}
                  placeholder={t('profile.avatarUrlPlaceholder')}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-primary/60 w-full"
                  disabled={uploading}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleApplyUrl}
                    disabled={uploading || !urlValue.trim().startsWith('http')}
                    className="rounded-xl h-8 text-[11px] font-bold"
                  >
                    {uploading ? <Icon name="progress_activity" size={14} className="animate-spin" /> : t('common.apply') || 'Apply'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setUrlMode(false); setUrlValue(''); }}
                    disabled={uploading}
                    className="rounded-xl h-8 text-[11px] font-bold text-zinc-400 hover:text-zinc-200"
                  >
                    {t('common.cancel') || 'Cancel'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <Button
                  size="sm"
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  className="rounded-xl h-8 text-[11px] font-bold bg-primary hover:bg-primary-dim text-zinc-950"
                >
                  <Icon name="upload" size={12} className="mr-1.5 shrink-0" />
                  {t('profile.uploadAvatar') || 'Upload file'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setUrlMode(true); setUrlValue(user?.avatarUrl || ''); }}
                  disabled={uploading}
                  className="rounded-xl h-8 text-[11px] font-bold border-zinc-700 bg-zinc-800 text-zinc-200"
                >
                  <Icon name="link" size={12} className="mr-1.5 shrink-0" />
                  {t('profile.setAvatarUrl') || 'Set URL'}
                </Button>
                {user?.avatarUrl && user.avatarUrl.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRemoveAvatar}
                    disabled={uploading}
                    className="rounded-xl h-8 text-[11px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Icon name="delete" size={14} className="mr-1.5 shrink-0" />
                    {t('profile.removeAvatar')}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpanded(false)}
                  disabled={uploading}
                  className="rounded-xl size-8 p-0 shrink-0 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                  title={t('common.close')}
                >
                  <Icon name="close" size={16} />
                </Button>
              </div>
            )}
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
}
