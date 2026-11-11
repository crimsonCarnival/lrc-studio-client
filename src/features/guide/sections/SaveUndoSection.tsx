import { useTranslation } from 'react-i18next';
import SaveStatusMock from '../mocks/SaveStatusMock';

const P = 'text-sm text-zinc-400 leading-relaxed';

export default function SaveUndoSection() {
  const { t } = useTranslation();
  return (
    <>
      <p className={P}>{t('guide.sections.saveUndo.body1')}</p>
      <p className={P}>{t('guide.sections.saveUndo.body2')}</p>
      <SaveStatusMock />
    </>
  );
}
