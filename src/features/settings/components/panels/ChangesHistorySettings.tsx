import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useSettings } from '@/features/settings/useSettings';
import { formatInTimezone } from '@/shared/utils/date';
import { Section, SettingRow } from '../shared';

interface HistoryEntry { from: string; to: string; changedAt: string }

/** Past handle and email changes, one row per change. */
export default function ChangesHistorySettings({ searchTerm }: { searchTerm?: string }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuthContext();
  const { settings } = useSettings();
  const locale = i18n.resolvedLanguage || i18n.language;

  const date = (iso: string) => formatInTimezone(iso, settings.advanced?.timezone, { year: 'numeric', month: 'short', day: 'numeric' }, locale);

  const groups: { title: string; entries: HistoryEntry[] }[] = [
    { title: t('profile.accountName'), entries: (user?.previousAccountNames ?? []) as HistoryEntry[] },
    { title: t('profile.email'), entries: (user?.emailHistory ?? []) as HistoryEntry[] },
  ];

  return (
    <Section title={t('profile.tabs.history')} searchTerm={searchTerm}>
      {groups.flatMap(({ title, entries }) => entries.length === 0
        ? [(
          <SettingRow key={title} label={title} description={t('profile.noHistoryYet')} />
        )]
        : entries.map((entry) => (
          <SettingRow
            key={`${title}-${entry.changedAt}`}
            label={title}
            description={<span className="font-mono">{t('profile.changedFrom', { from: entry.from, to: entry.to })}</span>}
          >
            <span className="text-[13px] text-zinc-400">{date(entry.changedAt)}</span>
          </SettingRow>
        )))}
    </Section>
  );
}
