import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Textarea } from '@ui/textarea';
import toast from 'react-hot-toast';
import { authService } from '@/features/auth/services/auth.service';
import { updatePreferences } from '@/features/settings/services/preferences.service';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { BadgeChip } from '@/features/badges/BadgeChip';

function Toggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-border'}`}
    >
      <span className={`absolute top-1 left-1 size-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

export default function ProfileForm() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthContext();
  const [saving, setSaving] = useState(false);

  const ownedBadgeIds: string[] = (user?.badges as Array<{ id: string }> | undefined)?.map(b => b.id) ?? [];

  const prefs = user?.preferences;

  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    showFollowers: prefs?.showFollowers ?? (user?.showFollowers ?? true),
    onlineVisibility: (prefs?.onlineVisibility ?? user?.onlineVisibility ?? 'friends') as 'friends' | 'nobody',
    miniProfileBadgesEnabled: prefs?.miniProfileBadgesEnabled ?? ((user?.miniProfileBadgesEnabled as boolean | undefined) ?? true),
    miniProfileBadgeIds: prefs?.miniProfileBadgeIds ?? ((user?.miniProfileBadgeIds as string[] | undefined) ?? []),
  });

  const baseShowFollowers = prefs?.showFollowers ?? (user?.showFollowers ?? true);
  const baseOnlineVisibility = (prefs?.onlineVisibility ?? user?.onlineVisibility ?? 'friends') as 'friends' | 'nobody';
  const baseMiniProfileBadgesEnabled = prefs?.miniProfileBadgesEnabled ?? ((user?.miniProfileBadgesEnabled as boolean | undefined) ?? true);
  const baseMiniProfileBadgeIds = prefs?.miniProfileBadgeIds ?? ((user?.miniProfileBadgeIds as string[] | undefined) ?? []);

  const isDirty =
    formData.displayName !== (user?.displayName || '') ||
    formData.bio !== (user?.bio || '') ||
    formData.showFollowers !== baseShowFollowers ||
    formData.onlineVisibility !== baseOnlineVisibility ||
    formData.miniProfileBadgesEnabled !== baseMiniProfileBadgesEnabled ||
    JSON.stringify(formData.miniProfileBadgeIds) !== JSON.stringify(baseMiniProfileBadgeIds);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Separate profile fields from preferences fields and save both in parallel.
      const profileDelta: Record<string, unknown> = {};
      if (formData.displayName !== (user?.displayName || '')) profileDelta.displayName = formData.displayName;
      if (formData.bio !== (user?.bio || '')) profileDelta.bio = formData.bio;

      const prefsDelta: Record<string, unknown> = {};
      if (formData.showFollowers !== baseShowFollowers) prefsDelta.showFollowers = formData.showFollowers;
      if (formData.onlineVisibility !== baseOnlineVisibility) prefsDelta.onlineVisibility = formData.onlineVisibility;
      if (formData.miniProfileBadgesEnabled !== baseMiniProfileBadgesEnabled) prefsDelta.miniProfileBadgesEnabled = formData.miniProfileBadgesEnabled;
      if (JSON.stringify(formData.miniProfileBadgeIds) !== JSON.stringify(baseMiniProfileBadgeIds)) prefsDelta.miniProfileBadgeIds = formData.miniProfileBadgeIds;

      const tasks: Promise<unknown>[] = [];

      if (Object.keys(profileDelta).length > 0) {
        tasks.push(
          authService.updateProfile(profileDelta).then(updatedUser => {
            setUser(prev => ({ ...prev, ...updatedUser }));
          }),
        );
      }

      if (Object.keys(prefsDelta).length > 0) {
        tasks.push(
          updatePreferences(prefsDelta).then(updatedPrefs => {
            setUser(prev => ({ ...prev, preferences: updatedPrefs }));
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

  const toggleMiniProfileBadge = (id: string) => {
    setFormData(prev => {
      const current = prev.miniProfileBadgeIds;
      if (current.includes(id)) return { ...prev, miniProfileBadgeIds: current.filter(x => x !== id) };
      if (current.length >= 3) return prev; // cap at 3
      return { ...prev, miniProfileBadgeIds: [...current, id] };
    });
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

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-foreground font-medium">{t('profile.settings.showFollowers')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('profile.settings.showFollowersSub')}</p>
          </div>
          <Toggle checked={formData.showFollowers} onToggle={() => setFormData(prev => ({ ...prev, showFollowers: !prev.showFollowers }))} />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-foreground font-medium">{t('profile.settings.onlineVisibility')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formData.onlineVisibility === 'friends'
                ? t('profile.settings.onlineVisibilityFriendsSub')
                : t('profile.settings.onlineVisibilityNobodySub')}
            </p>
          </div>
          <Toggle
            checked={formData.onlineVisibility === 'friends'}
            onToggle={() => setFormData(prev => ({ ...prev, onlineVisibility: prev.onlineVisibility === 'friends' ? 'nobody' : 'friends' }))}
          />
        </div>
      </section>

      <hr className="border-border/50" />

      <section className="space-y-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          {t('profile.sections.miniProfile')}
        </h4>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-foreground font-medium">{t('profile.settings.miniProfileBadges')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('profile.settings.miniProfileBadgesSub')}</p>
          </div>
          <Toggle
            checked={formData.miniProfileBadgesEnabled}
            onToggle={() => setFormData(prev => ({ ...prev, miniProfileBadgesEnabled: !prev.miniProfileBadgesEnabled }))}
          />
        </div>

        {formData.miniProfileBadgesEnabled && ownedBadgeIds.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-0.5">
              {t('profile.settings.miniProfileBadgesPick')} <span className="text-primary">{formData.miniProfileBadgeIds.length}/3</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {ownedBadgeIds.map(id => {
                const selected = formData.miniProfileBadgeIds.includes(id);
                const atCap = !selected && formData.miniProfileBadgeIds.length >= 3;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleMiniProfileBadge(id)}
                    disabled={atCap}
                    className={`rounded-full transition-all outline-none focus-visible:ring-2 ring-primary/50 ${selected ? 'ring-2 ring-primary scale-105' : ''} ${atCap ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <BadgeChip id={id} />
                  </button>
                );
              })}
            </div>
            {ownedBadgeIds.length === 0 && (
              <p className="text-xs text-muted-foreground italic">{t('profile.settings.noBadges')}</p>
            )}
          </div>
        )}

        {formData.miniProfileBadgesEnabled && ownedBadgeIds.length === 0 && (
          <p className="text-xs text-muted-foreground italic">{t('profile.settings.noBadges')}</p>
        )}
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
