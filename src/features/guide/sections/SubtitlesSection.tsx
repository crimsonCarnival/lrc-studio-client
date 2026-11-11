import { useTranslation } from 'react-i18next';
import SubtitlesMock from '../mocks/SubtitlesMock';

const P = 'text-sm text-zinc-400 leading-relaxed';

export default function SubtitlesSection() {
  const { t } = useTranslation();
  return (
    <>
      <p className={P}>{t('guide.sections.subtitles.body1', { kind: t('setup.kindLabel'), song: t('setup.kindSong'), subtitles: t('setup.kindSubtitles') })}</p>
      <SubtitlesMock />
      <p className={P}>{t('guide.sections.subtitles.body2', { studio: t('editor.studio.title') })}</p>
      <p className={P}>{t('guide.sections.subtitles.body3', { ready: t('editor.studio.chipReady') })}</p>
      <p className={P}>{t('guide.sections.subtitles.body4', { srt: t('export.containerSrt'), vtt: t('export.containerVtt'), sbv: t('export.containerSbv'), hint: t('export.subtitleHint') })}</p>
    </>
  );
}
