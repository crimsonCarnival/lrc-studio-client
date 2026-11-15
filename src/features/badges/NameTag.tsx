import { useTranslation } from 'react-i18next';
import { Tip } from '@ui/tip';
import { emblemFor } from './badge-emblems';
import type { NameTagData } from './badges.types';

type NameTagProps = { tag?: NameTagData | null; className?: string };

export function NameTag({ tag, className = '' }: NameTagProps) {
  const { t, i18n } = useTranslation();
  if (!tag) return null;

  const lang = i18n.language === 'es' ? 'es' : 'en';
  const label = tag.label[lang] || tag.label.en;
  const description = tag.description[lang] || tag.description.en;
  const tint = emblemFor(tag.id, tag.color).color;

  return (
    <Tip content={description}>
      <span
        className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-pill border px-1.5 py-0.5 text-[11px] font-medium leading-none ${className}`}
        style={{ borderColor: tint, color: tint }}
      >
        {tag.icon && <span aria-hidden="true">{tag.icon}</span>}
        <span className="sr-only">{t('badges.nameTag.ariaLabel', { label })}</span>
        <span aria-hidden="true">{label}</span>
      </span>
    </Tip>
  );
}
