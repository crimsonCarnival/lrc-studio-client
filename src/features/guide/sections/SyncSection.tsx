import { useTranslation } from 'react-i18next';
import SyncDemo from '../demos/SyncDemo';

const P = 'text-sm text-zinc-400 leading-relaxed';

export default function SyncSection() {
  const { t } = useTranslation();
  return (
    <>
      <p className={P}>{t('guide.sections.sync.body1')}</p>
      <p className={P}>{t('guide.sections.sync.body2')}</p>
      <SyncDemo />
    </>
  );
}
