import { useTranslation } from 'react-i18next';
import { FloatingInput } from '@ui/floating-input';
import { FloatingTextarea } from '@ui/floating-textarea';

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
          <FloatingInput label={t('profile.displayName')}
            id="settings-display-name"
            value={values.displayName}
            onChange={(e) => onChange('displayName', e.target.value)}
            placeholder={t('profile.displayNamePlaceholder')}
            
            maxLength={50}
          />
        </div>}
        {show.identifier && identifier}
      </div>
      )}

      {show.bio && <div>
        <div className="flex justify-between items-baseline mb-2 px-1">
          <span className="font-mono text-xs text-subtle">{values.bio.length}/160</span>
        </div>
        <FloatingTextarea label={t('profile.bio')}
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
