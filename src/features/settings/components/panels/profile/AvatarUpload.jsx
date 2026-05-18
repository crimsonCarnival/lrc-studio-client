import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Upload, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@ui/button';
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
  const fileInputRef = useRef(null);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
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
      const { url, publicId } = await uploadsService.uploadAvatar(file, recaptchaToken);
      const { user: updatedUser } = await authService.updateProfile({ 
        avatarUrl: url, 
        avatarPublicId: publicId 
      });
      setUser(updatedUser);
      toast.success(t('profile.avatarUpdated'));
    } catch {
      toast.error(t('profile.avatarUploadFailed'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    try {
      const { user: updatedUser } = await authService.updateProfile({ 
        avatarUrl: null, 
        avatarPublicId: null 
      });
      setUser(updatedUser);
      toast.success(t('profile.avatarRemoved'));
    } catch {
      toast.error(t('profile.avatarRemoveFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-border">
      <div className="relative group">
        <button
          type="button"
          onClick={handleAvatarClick}
          className="size-24 rounded-3xl bg-secondary flex items-center justify-center overflow-hidden cursor-pointer border-2 border-border group-hover:border-primary/50 transition-all duration-300 outline-none focus:ring-2 focus:ring-primary/50"
          aria-label={t('profile.changeAvatar')}
        >
          {uploading ? (
            <Loader2 className="size-8 animate-spin text-primary" />
          ) : user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" className="size-full object-cover" />
          ) : (
            <User className="size-10 text-muted-foreground" />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Upload className="size-6 text-white" />
          </div>
        </button>
      </div>

      <div className="flex-1 text-center sm:text-left">
        <h4 className="text-sm font-semibold text-foreground mb-1">{t('profile.avatar')}</h4>
        <p className="text-xs text-muted-foreground mb-4">{t('profile.avatarHint')}</p>
        <div className="flex flex-wrap justify-center sm:justify-start gap-2">
          <Button 
            size="sm" 
            onClick={handleAvatarClick} 
            disabled={uploading}
            className="rounded-xl h-8 text-[11px] font-bold"
          >
            {user?.avatarUrl ? t('profile.changeAvatar') : t('profile.uploadAvatar')}
          </Button>
          {user?.avatarUrl && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleRemoveAvatar}
              disabled={uploading}
              className="rounded-xl h-8 text-[11px] font-bold text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5 mr-1.5" />
              {t('profile.removeAvatar')}
            </Button>
          )}
        </div>
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
