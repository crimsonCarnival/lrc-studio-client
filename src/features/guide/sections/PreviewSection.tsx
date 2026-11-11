import { useTranslation } from 'react-i18next';
import PreviewFormatsMock from '../mocks/PreviewFormatsMock';

const P = 'text-sm text-zinc-400 leading-relaxed';

export default function PreviewSection() {
  const { t } = useTranslation();
  return (
    <>
      <p className={P}>{t('guide.sections.preview.body1')}</p>
      <p className={P}>{t('guide.sections.preview.body2')}</p>
      <PreviewFormatsMock />
    </>
  );
}
