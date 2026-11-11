import { useTranslation } from 'react-i18next';
import LyricsSearchResultMock from '../mocks/LyricsSearchResultMock';
import LyricsImportMock from '../mocks/LyricsImportMock';

const P = 'text-sm text-zinc-400 leading-relaxed';

export default function LyricsSearchSection() {
  const { t } = useTranslation();
  return (
    <>
      <p className={P}>{t('guide.sections.lyricsSearch.body1', { search: t('lyricsSearch.findLyrics') })}</p>
      <LyricsSearchResultMock />
      <p className={P}>{t('guide.sections.lyricsSearch.body2', { synced: t('lyricsSearch.syncedBadge'), keep: t('lyricsSearch.keepTimestamps') })}</p>
      <LyricsImportMock />
      <p className={P}>{t('guide.sections.lyricsSearch.body3', { title: t('confirm.replaceLyricsTitle') })}</p>
    </>
  );
}
