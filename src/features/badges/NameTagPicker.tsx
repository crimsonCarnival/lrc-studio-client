import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { NameTag } from './NameTag';
import { BADGE_REGISTRY } from './badge-registry';
import { useBadgeDefs } from './BadgeDefsContext';
import { setNameTag } from './services/name-tag.service';
import type { NameTagData } from './badges.types';

type NameTagPickerProps = {
  earned: { id: string }[];
  value: string | null;
  /** Staff with no equipped tag get the built-in Staff pill by default. */
  staff?: boolean;
  onChange: (badgeId: string | null) => void;
};

export function NameTagPicker({ earned, value, staff = false, onChange }: NameTagPickerProps) {
  const { t, i18n } = useTranslation();
  const defs = useBadgeDefs();
  const [saving, setSaving] = useState(false);

  const options: NameTagData[] = [];
  for (const { id } of earned) {
    const def = defs[id];
    if (def) {
      options.push({ id, label: def.label, description: def.description, icon: def.icon, color: def.color });
      continue;
    }
    const fallback = (BADGE_REGISTRY as Record<string, { label: string; icon: string; color: string }>)[id];
    if (fallback) {
      const text = { en: fallback.label, es: fallback.label };
      options.push({ id, label: text, description: text, icon: fallback.icon, color: fallback.color });
    }
  }

  const select = async (next: string | null) => {
    if (saving || next === value) return;
    const prev = value;
    onChange(next);
    setSaving(true);
    try {
      await setNameTag(next);
    } catch {
      onChange(prev);
      toast.error(t('badges.nameTag.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const staffLabel = t('badges.nameTag.staffLabel');
  const staffDesc = t('badges.nameTag.staffDesc');
  const staffTag: NameTagData = {
    id: 'builtin:staff',
    label: { en: staffLabel, es: staffLabel },
    description: { en: staffDesc, es: staffDesc },
    icon: '',
    color: 'primary',
  };

  const selected = options.find(o => o.id === value) ?? null;
  const showStaffDefault = !selected && staff;
  const preview = selected ?? (showStaffDefault ? staffTag : null);
  const lang = i18n.language === 'es' ? 'es' : 'en';

  return (
    <section className="rounded-xl bg-raised p-4 inset-ring inset-ring-hl">
      <h3 className="text-sm font-semibold text-foreground">{t('badges.nameTag.title')}</h3>
      <p className="mt-1 text-xs text-subtle">{t('badges.nameTag.desc')}</p>

      <div className="mt-3 flex min-h-6 items-center">
        <NameTag tag={preview} />
      </div>
      {showStaffDefault && <p className="mt-1 text-xs text-subtle">{t('badges.nameTag.staffDefault')}</p>}

      <div role="radiogroup" aria-label={t('badges.nameTag.title')} className="mt-3 flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-foreground">
          <input
            type="radio"
            name="name-tag"
            checked={value === null}
            disabled={saving}
            onChange={() => select(null)}
          />
          {t('badges.nameTag.none')}
        </label>
        {options.map(o => (
          <label key={o.id} className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-foreground">
            <input
              type="radio"
              name="name-tag"
              checked={value === o.id}
              disabled={saving}
              onChange={() => select(o.id)}
            />
            {o.icon && <span aria-hidden="true">{o.icon}</span>}
            {o.label[lang] || o.label.en}
          </label>
        ))}
      </div>
    </section>
  );
}
