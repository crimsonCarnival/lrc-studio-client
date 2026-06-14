import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Save } from 'lucide-react';
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
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedUser = await authService.updateProfile({ displayName: formData.displayName, bio: formData.bio, showFollowers: formData.showFollowers });
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
      </section>

      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border pb-8">
        <Button
          onClick={handleSave}
          disabled={saving || (
            formData.displayName === (user?.displayName || '') &&
            formData.bio === (user?.bio || '') &&
            formData.showFollowers === (user?.showFollowers ?? true)
          )}
          className="w-full sm:w-auto min-w-[140px] h-10 rounded-xl font-bold gap-2"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {t('profile.save')}
        </Button>
      </div>
    </>
  );
}
