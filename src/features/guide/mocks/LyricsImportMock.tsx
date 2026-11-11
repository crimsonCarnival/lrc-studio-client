import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';

// The import step for a synced result: the "already timed" note and the ticked keep-timestamps box.
export default function LyricsImportMock() {
  const { t } = useTranslation();
  return (
    <div aria-hidden="true" className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex flex-col gap-3">
      <div className="text-sm">
        <p className="font-semibold text-primary">{t('lyricsSearch.syncedTitle')}</p>
        <p className="text-zinc-300 leading-snug">{t('lyricsSearch.syncedDesc')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-3">
        <span className="mr-auto inline-flex min-h-11 items-center gap-2.5 text-[15px] text-zinc-100">
          <span className="inline-flex size-[18px] items-center justify-center rounded-xs border border-primary bg-primary text-zinc-950"><Icon name="check" size={14} /></span>
          {t('lyricsSearch.keepTimestamps')}
        </span>
        <span className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-[15px] font-semibold text-zinc-950">{t('lyricsSearch.useLyrics')}</span>
      </div>
    </div>
  );
}
