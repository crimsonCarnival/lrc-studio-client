import { useTranslation } from 'react-i18next';
import { Input } from '@ui/input';
import { Textarea } from '@ui/textarea';

type ProfileFormProps = {
  values: { displayName: string; bio: string };
  onChange: (key: 'displayName' | 'bio', value: string) => void;
  identifier?: React.ReactNode;
  /** Settings search narrows the form to the fields that matched. */
  show?: { displayName: boolean; identifier: boolean; bio: boolean };
};

export default function ProfileForm({ values, onChange, identifier, show = { displayName: true, identifier: true, bio: true } }: ProfileFormProps) {
  const { t } = useTranslation();

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
            value={values.displayName}
            onChange={(e) => onChange('displayName', e.target.value)}
            placeholder={t('profile.displayNamePlaceholder')}
            className="bg-zinc-950 border border-zinc-700 rounded-[calc(var(--radius)*1)] h-11 text-[15px]"
            maxLength={50}
          />
        </div>}
        {show.identifier && identifier}
      </div>
      )}

      {show.bio && <div>
        <div className="flex justify-between items-baseline mb-2 px-1">
          <label htmlFor="settings-bio" className="text-[15px] font-semibold text-foreground">{t('profile.bio')}</label>
          <span className="font-mono text-xs text-subtle">{values.bio.length}/160</span>
        </div>
        <Textarea
          id="settings-bio"
          value={values.bio}
          onChange={(e) => onChange('bio', e.target.value.slice(0, 160))}
          placeholder={t('profile.bioPlaceholder')}
          rows={3}
          className="min-h-[96px] resize-y"
        />
      </div>}
    </>
  );
}
