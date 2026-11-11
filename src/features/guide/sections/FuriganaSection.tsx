import { useTranslation } from 'react-i18next';
import FuriganaDemo from '../demos/FuriganaDemo';
import SecondaryTextMock from '../mocks/SecondaryTextMock';

const P = 'text-sm text-zinc-400 leading-relaxed';

export default function FuriganaSection() {
  const { t } = useTranslation();
  return (
    <>
      <p className={P}>{t('guide.sections.furigana.body1')}</p>
      <FuriganaDemo />
      <p className={P}>{t('guide.sections.furigana.body2')}</p>
      <p className={P}>{t('guide.sections.furigana.body3', { open: t('editor.furigana.open'), format: t('settings.interface.readingFormat'), toggle: t('preview.furigana') })}</p>
      <SecondaryTextMock />
      <p className={P}>{t('guide.sections.furigana.body4', { secondary: t('editor.secondaryBulk.open'), add: t('editor.addTranslation'), toggleTr: t('preview.toggleTranslations') })}</p>
    </>
  );
}
