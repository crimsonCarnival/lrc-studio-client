import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { Tip } from '@ui/tip';
import { RARITY_CONFIG, BADGE_REGISTRY } from './badge-registry';
import { useBadgeDefs } from './BadgeDefsContext';
import { BadgeEmblem } from './BadgeEmblem';
import { emblemFor } from './badge-emblems';

const DATE_LOCALES: Record<string, Locale> = { en: enUS, es };

interface ShowcaseBadge {
  id: string;
  label?: string;
  icon?: unknown;
  color?: string;
  rarity?: string;
  grantedAt?: string;
  holderCount?: number;
}

const EMPTY_BADGES: ShowcaseBadge[] = [];

function ShowcaseCard({ badge, locale }: { badge: ShowcaseBadge; locale?: string }) {
  const { t, i18n } = useTranslation();
  // The UI language, unless a caller names one: a fixed 'en' default read "about 1 month ago" inside Spanish text.
  const dateLocale = DATE_LOCALES[locale ?? i18n.resolvedLanguage ?? i18n.language] ?? enUS;
  const defs = useBadgeDefs();
  // badge label keys are composed from a registry; bypass strict key checking.
  const tk = t as (key: string, defaultValue?: string) => string;
  const dbDef = defs[badge.id];
  const staticDef = BADGE_REGISTRY[badge.id];
  const def = dbDef || staticDef || { label: badge.label, icon: badge.icon, color: badge.color };
  const rarity = badge.rarity ?? 'common';
  const rarityConf = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.common;
  const grantedStr = badge.grantedAt
    ? formatDistanceToNow(new Date(badge.grantedAt), { addSuffix: true, locale: dateLocale })
    : '';

  // If badge.label from API is a localized object, prefer it over def.label
  const rawLabel = badge.label || def.label;
  const labelText = typeof rawLabel === 'object' && rawLabel !== null
    ? (rawLabel[i18n.language === 'es' ? 'es' : 'en'] || rawLabel.en)
    : rawLabel;

  const badgeLabel = typeof labelText === 'string' ? tk(`badges.${badge.id}.label`, labelText) : '';

  // What the old card printed under the name now sits in the tooltip; the rarity itself is
  // the frame around the emblem.
  const details = [
    tk(rarityConf.labelKey),
    grantedStr && t('badges.showcase.earnedAgo', { when: grantedStr }),
    badge.holderCount !== undefined && t('badges.showcase.holders', { count: badge.holderCount }),
  ].filter(Boolean).join(' · ');

  return (
    <Tip content={details} side="bottom">
      <div
        className="group/emblem flex h-[168px] w-[124px] cursor-default select-none flex-col items-center justify-center gap-2.5 rounded-2xl bg-background px-2 text-center text-[15px] font-semibold leading-tight text-foreground"
        style={{ boxShadow: `inset 0 0 0 1.5px ${emblemFor(badge.id, def.color).color}` }}
      >
        <BadgeEmblem
          id={badge.id}
          color={def.color}
          rarity={rarity}
          size={64}
          className="transition-transform duration-[220ms] ease-bounce group-hover/emblem:-translate-y-[3px] group-hover/emblem:-rotate-[4deg]"
        />
        <span>{badgeLabel}</span>
      </div>
    </Tip>
  );
}

function EmptySlot() {
  const { t } = useTranslation();
  return (
    <div className="flex h-[168px] w-[124px] items-center justify-center rounded-2xl border-[1.5px] border-dashed border-hl text-sm font-semibold text-faint">
      {t('badges.showcase.emptySlot')}
    </div>
  );
}

interface ShowcasedBadgesProps {
  badges?: ShowcaseBadge[];
  maxSlots?: number;
  locale?: string;
  className?: string;
}

export function ShowcasedBadges({ badges = EMPTY_BADGES, maxSlots = 3, locale, className = '' }: ShowcasedBadgesProps) {
  const { t } = useTranslation();

  if (badges.length === 0 && maxSlots === 0) return null;

  const slots = Array.from({ length: maxSlots }, (_, i) => badges[i] ?? null);

  return (
    <section className={`flex flex-col gap-3 ${className}`}>
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
        {t('badges.showcase.title')}
      </p>
      <div className="flex gap-2.5 flex-wrap pb-2">
        {slots.map((badge, i) =>
          badge
            ? <ShowcaseCard key={badge.id} badge={badge} locale={locale} />
            : <EmptySlot key={`empty-${i}`} />
        )}
      </div>
    </section>
  );
}
