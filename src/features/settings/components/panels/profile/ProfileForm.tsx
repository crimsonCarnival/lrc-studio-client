import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Textarea } from '@ui/textarea';
import toast from 'react-hot-toast';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthContext } from '@/features/auth/useAuthContext';

export default function ProfileForm() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthContext();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    showFollowers: user?.showFollowers ?? true,
    onlineVisibility: (user?.onlineVisibility as 'friends' | 'nobody') ?? 'friends',
  });

  const isDirty =
    formData.displayName !== (user?.displayName || '') ||
    formData.bio !== (user?.bio || '') ||
    formData.showFollowers !== (user?.showFollowers ?? true) ||
    formData.onlineVisibility !== ((user?.onlineVisibility as 'friends' | 'nobody') ?? 'friends');

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedUser = await authService.updateProfile({ displayName: formData.displayName, bio: formData.bio, showFollowers: formData.showFollowers, onlineVisibility: formData.onlineVisibility });
      setUser(prev => ({ ...prev, ...updatedUser }));
      toast.success(t('profile.saveSuccess'));
    } catch {
      toast.error(t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="space-y-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          {t('profile.displayName') + ' & ' + t('profile.bio')}
        </h4>
        <div className="space-y-1.5">
          <div className="flex items-center ml-1 h-[18px]">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t('profile.displayName')}
            </label>
          </div>
          <Input
            value={formData.displayName}
            onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
            placeholder={t('profile.displayNamePlaceholder')}
            className="bg-secondary/30 border-border rounded-xl h-10 text-sm"
            maxLength={50}
          />
        </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-end">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
            {t('profile.bio')}
          </label>
          <span className="text-[9px] text-muted-foreground font-bold mr-1">{formData.bio.length}/160</span>
        </div>
        <Textarea
          value={formData.bio}
          onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value.slice(0, 160) }))}
          placeholder={t('profile.bioPlaceholder')}
          className="bg-secondary/30 border-border rounded-2xl min-h-[100px] text-sm resize-none"
        />
      </div>
      </section>

      <hr className="border-border/50" />

      <section className="space-y-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          {t('profile.sections.visibility')}
        </h4>
        {/* Show followers toggle */}
        <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-foreground font-medium">
            {t('profile.settings.showFollowers')}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('profile.settings.showFollowersSub')}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={formData.showFollowers}
          onClick={() => setFormData(prev => ({ ...prev, showFollowers: !prev.showFollowers }))}
          className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${
            formData.showFollowers ? 'bg-primary' : 'bg-border'
          }`}
        >
          <span
            className={`absolute top-1 left-1 size-4 rounded-full bg-white shadow transition-transform ${
              formData.showFollowers ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

        {/* Online visibility toggle */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-foreground font-medium">
              {t('profile.settings.onlineVisibility')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formData.onlineVisibility === 'friends'
                ? t('profile.settings.onlineVisibilityFriendsSub')
                : t('profile.settings.onlineVisibilityNobodySub')}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={formData.onlineVisibility === 'friends'}
            onClick={() => setFormData(prev => ({ ...prev, onlineVisibility: prev.onlineVisibility === 'friends' ? 'nobody' : 'friends' }))}
            className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${
              formData.onlineVisibility === 'friends' ? 'bg-primary' : 'bg-border'
            }`}
          >
            <span
              className={`absolute top-1 left-1 size-4 rounded-full bg-white shadow transition-transform ${
                formData.onlineVisibility === 'friends' ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {isDirty && createPortal(
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
          <div className="flex items-center gap-2 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/60 rounded-2xl shadow-2xl px-4 py-2.5 pointer-events-auto animate-slide-up-fade">
            <span className="text-xs text-zinc-400 mr-1">
              <span className="font-semibold text-zinc-200">{t('settings.unsavedChanges')}</span>
            </span>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary-dim text-zinc-950 font-semibold rounded-lg h-8 px-4 text-xs gap-1.5"
            >
              {saving && <Loader2 className="size-3 animate-spin" />}
              {t('profile.save')}
            </Button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
