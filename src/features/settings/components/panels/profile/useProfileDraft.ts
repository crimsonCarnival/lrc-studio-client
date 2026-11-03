import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthContext } from '@/features/auth/useAuthContext';
import type { ApiError } from '@/types/api/error';
import { useReportDraft } from '../../SettingsDraftContext';

export const ACCOUNT_NAME_RE = /^[a-z0-9_.:-]{3,30}$/;

export type ProfileDraft = {
  displayName?: string;
  bio?: string;
  accountName?: string;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
};

type ProfileValues = Required<ProfileDraft>;

/**
 * Staged edits for the public-profile page. Only touched fields live in `draft`, so the
 * values fall through to the live user (no stale copy from mount) and a field edited back
 * to its saved value stops counting as a change.
 */
export function useProfileDraft() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthContext();
  const [draft, setDraft] = useState<ProfileDraft>({});
  const [saving, setSaving] = useState(false);
  const [accountNameError, setAccountNameError] = useState('');

  const saved: ProfileValues = {
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    accountName: user?.accountName || '',
    avatarUrl: user?.avatarUrl || null,
    coverImageUrl: user?.coverImageUrl ? String(user.coverImageUrl) : null,
  };
  const values: ProfileValues = { ...saved, ...draft };

  const delta: ProfileDraft = {};
  for (const key of Object.keys(draft) as (keyof ProfileDraft)[]) {
    if (draft[key] !== saved[key]) Object.assign(delta, { [key]: draft[key] });
  }
  const isDirty = Object.keys(delta).length > 0;
  const accountNameInvalid = delta.accountName !== undefined && !ACCOUNT_NAME_RE.test(delta.accountName);

  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    if (key === 'accountName') setAccountNameError('');
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const discard = () => {
    setDraft({});
    setAccountNameError('');
  };

  const save = async (): Promise<boolean> => {
    if (!isDirty || accountNameInvalid) return false;
    setSaving(true);
    setAccountNameError('');
    try {
      const updated = await authService.updateProfile(delta);
      setUser(prev => ({ ...prev, ...updated }));
      setDraft({});
      toast.success(t('profile.saveSuccess'));
      return true;
    } catch (e) {
      const err = e as ApiError;
      const ext = err?.graphqlErrors?.[0]?.extensions;
      if (ext?.code === 'accountName_change_cooldown') {
        const days = typeof ext.daysLeft === 'number' ? ext.daysLeft : 7;
        setAccountNameError(t('profile.accountNameCooldownError', { days }));
      } else if (ext?.code === 'accountName_taken' || err?.message?.includes('already taken')) {
        setAccountNameError(t('profile.accountNameTaken'));
      } else {
        toast.error(t('profile.saveError'));
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  useReportDraft({ isDirty, save, discard });

  return { values, set, isDirty, accountNameInvalid, accountNameError, saving, save, discard };
}
