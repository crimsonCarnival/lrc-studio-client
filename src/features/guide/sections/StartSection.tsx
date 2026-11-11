import { useTranslation } from 'react-i18next';
import SetupStepperMock from '../mocks/SetupStepperMock';
import LyricsSearchResultMock from '../mocks/LyricsSearchResultMock';

const P = 'text-sm text-zinc-400 leading-relaxed';

export default function StartSection() {
  const { t } = useTranslation();
  return (
    <>
      <p className={P}>{t('guide.sections.start.body1')}</p>
      <SetupStepperMock />
      <p className={P}>{t('guide.sections.start.body2')}</p>
      <LyricsSearchResultMock />
      <p className={P}>{t('guide.sections.start.body3')}</p>
    </>
  );
}
