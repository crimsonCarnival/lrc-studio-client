import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Textarea } from '@ui/textarea';
import toast from 'react-hot-toast';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { LogoLoader } from '@ui/LogoLoader';

type ProfileFormProps = {
  identifier?: React.ReactNode;
  /** Settings search narrows the form to the fields that matched. */
  show?: { displayName: boolean; identifier: boolean; bio: boolean };
};

export default function ProfileForm({ identifier, show = { displayName: true, identifier: true, bio: true } }: ProfileFormProps) {
  const { t } = useTranslation();
  const { user, setUser } = useAuthContext();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
  });

  const isDirty =
    formData.displayName !== (user?.displayName || '') ||
    formData.bio !== (user?.bio || '');

  const handleSave = async () => {
    setSaving(true);
    try {
      const profileDelta: Record<string, unknown> = {};
      if (formData.displayName !== (user?.displayName || '')) profileDelta.displayName = formData.displayName;
      if (formData.bio !== (user?.bio || '')) profileDelta.bio = formData.bio;

      const tasks: Promise<unknown>[] = [];

      if (Object.keys(profileDelta).length > 0) {
        tasks.push(
          authService.updateProfile(profileDelta).then(updatedUser => {
            setUser(prev => ({ ...prev, ...updatedUser }));
          }),
        );
      }

      await Promise.all(tasks);
      toast.success(t('profile.saveSuccess'));
    } catch {
      toast.error(t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {(show.displayName || show.identifier) && (
      <div className="grid gap-[18px] grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
        {show.displayName && <div>
          <label htmlFor="settings-display-name" className="block text-[13px] font-bold text-zinc-100 mb-2">
            {t('profile.displayName')}
          </label>
          <Input
            id="settings-display-name"
            value={formData.displayName}
            onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
            placeholder={t('profile.displayNamePlaceholder')}
            className="bg-zinc-950 border border-zinc-700 rounded-[10px] h-11 text-[15px]"
            maxLength={50}
          />
        </div>}
        {show.identifier && identifier}
      </div>
      )}

      {show.bio && <div>
        <div className="flex justify-between items-baseline mb-2 px-1">
          <label htmlFor="settings-bio" className="text-[15px] font-semibold text-foreground">{t('profile.bio')}</label>
          <span className="font-mono text-xs text-subtle">{formData.bio.length}/160</span>
        </div>
        <Textarea
          id="settings-bio"
          value={formData.bio}
          onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value.slice(0, 160) }))}
          placeholder={t('profile.bioPlaceholder')}
          rows={3}
          className="min-h-[96px] resize-y"
        />
      </div>}

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
              className="bg-primary hover:bg-primary-dim text-zinc-950 font-semibold rounded-lg h-8 coarse:h-11 px-4 text-xs gap-1.5"
            >
              {saving && <LogoLoader size={12} />}
              {t('profile.save')}
            </Button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
