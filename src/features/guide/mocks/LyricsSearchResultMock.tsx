import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';

// Two lyrics-search rows as the setup screen lists them: the first has timestamps, so it carries the badge.
// Song and artist are the sample title used across the app's mocks, not UI copy.
const SONG = 'Midnight Echoes';

export default function LyricsSearchResultMock() {
  const { t } = useTranslation();
  const rows = [
    { title: SONG, synced: true, duration: '3:24' },
    { title: `${SONG} (${t('guide.mock.search.plain')})`, synced: false, duration: '3:26' },
  ];
  return (
    <ul aria-hidden="true" className="flex flex-col gap-1 rounded-xl bg-zinc-900 border border-zinc-800 p-2">
      {rows.map((row) => (
        <li key={row.title} className={`flex items-center gap-3 rounded-lg p-2 ${row.synced ? 'bg-zinc-800' : ''}`}>
          <span className="size-10 shrink-0 rounded-xs bg-zinc-700 inline-flex items-center justify-center text-zinc-500">
            <Icon name="music_note" size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-zinc-100 truncate">{row.title}</span>
            <span className="block text-xs text-zinc-400 truncate">{t('guide.mock.search.artist')}</span>
          </span>
          {row.synced && (
            <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-pill bg-primary/15 border border-primary/30 text-primary text-[10px] font-bold">
              <Icon name="schedule" size={11} />
              {t('lyricsSearch.syncedBadge')}
            </span>
          )}
          <span className="shrink-0 text-[10px] text-zinc-500 tabular-nums">{row.duration}</span>
        </li>
      ))}
    </ul>
  );
}
