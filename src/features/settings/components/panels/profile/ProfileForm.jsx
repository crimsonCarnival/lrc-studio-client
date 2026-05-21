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
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedUser = await authService.updateProfile({ displayName: formData.displayName, bio: formData.bio });
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
      <div className="space-y-1.5">
        <div className="flex items-center ml-1 h-[18px]">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {t('profile.displayName', 'Display name')}
          </label>
        </div>
        <Input
          value={formData.displayName}
          onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
          placeholder={t('profile.displayNamePlaceholder', 'Optional public name')}
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

      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border pb-8">
        <Button
          onClick={handleSave}
          disabled={saving || (
            formData.displayName === (user?.displayName || '') &&
            formData.bio === (user?.bio || '')
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
