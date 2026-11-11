import { useTranslation } from 'react-i18next';
import AutoStampMock from '../mocks/AutoStampMock';

const P = 'text-sm text-zinc-400 leading-relaxed';

export default function AutoStampSection() {
  const { t } = useTranslation();
  return (
    <>
      <p className={P}>{t('guide.sections.autoStamp.body1', { button: t('editor.autoStamp.button'), words: t('editor.autoStamp.buttonWords') })}</p>
      <AutoStampMock />
      <p className={P}>{t('guide.sections.autoStamp.body2', { transcribing: t('editor.autoStamp.phaseTranscribing'), aligning: t('editor.autoStamp.phaseAligning') })}</p>
      <p className={P}>{t('guide.sections.autoStamp.body3', { review: t('editor.autoStamp.uncertainLines'), settings: t('settings.autoStamp.title') })}</p>
      <p className={P}>{t('guide.sections.autoStamp.body4', { only: t('settings.autoStamp.applyModeEmptyOnly'), all: t('settings.autoStamp.applyModeAll'), confirm: t('editor.autoStamp.confirmOverwriteTitle') })}</p>
      <p className={P}>{t('guide.sections.autoStamp.body5', { record: t('editor.autoStamp.recordTab') })}</p>
    </>
  );
}
