import { useTranslation } from 'react-i18next';
import LookMock from '../mocks/LookMock';

const P = 'text-sm text-zinc-400 leading-relaxed';

export default function LookSection() {
  const { t } = useTranslation();
  return (
    <>
      <p className={P}>{t('guide.sections.look.body1', { dark: t('settings.options.themes.dark'), light: t('settings.options.themes.light'), more: t('settings.interface.moreThemes'), create: t('settings.themeEditor.create') })}</p>
      <LookMock />
      <p className={P}>{t('guide.sections.look.body2', { button: t('projectView.visualizer.button'), title: t('projectView.visualizer.title') })}</p>
      <p className={P}>{t('guide.sections.look.body3', { share: t('projectView.visualizer.shareTab') })}</p>
    </>
  );
}
