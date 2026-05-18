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
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedUser = await authService.updateProfile(formData);
      setUser(prev => ({ ...prev, ...updatedUser }));
      toast.success(t('profile.saveSuccess'));
    } catch (err) {
      if (err.status === 409 || err.message === 'Username already taken') {
        toast.error(t('auth.errors.username_taken') || t('auth.usernameTaken'));
      } else {
        toast.error(t('profile.saveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
            {t('profile.username')}
          </label>
          <Input
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            placeholder={t('profile.username')}
            className="bg-secondary/30 border-border rounded-xl h-10 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
            {t('profile.email')}
          </label>
          <Input
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder={t('profile.email')}
            className="bg-secondary/30 border-border rounded-xl h-10 text-sm"
          />
        </div>
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
            formData.username === user?.username &&
            formData.email === user?.email &&
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
