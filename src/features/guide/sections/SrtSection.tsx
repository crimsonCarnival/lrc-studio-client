import { useTranslation } from 'react-i18next';
import SrtDemo from '../demos/SrtDemo';

const P = 'text-sm text-zinc-400 leading-relaxed';

export default function SrtSection() {
  const { t } = useTranslation();
  return (
    <>
      <p className={P}>{t('guide.sections.srt.body1')}</p>
      <p className={P}>{t('guide.sections.srt.body2')}</p>
      <SrtDemo />
    </>
  );
}
