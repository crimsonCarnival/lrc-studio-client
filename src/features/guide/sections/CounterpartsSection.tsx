import { useTranslation } from 'react-i18next';
import CounterpartsDemo from '../demos/CounterpartsDemo';

const P = 'text-sm text-zinc-400 leading-relaxed';

export default function CounterpartsSection() {
  const { t } = useTranslation();
  return (
    <>
      <p className={P}>{t('guide.sections.counterparts.body1')}</p>
      <p className={P}>{t('guide.sections.counterparts.body2')}</p>
      <CounterpartsDemo />
    </>
  );
}
