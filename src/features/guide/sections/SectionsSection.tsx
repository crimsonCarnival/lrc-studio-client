import { useTranslation } from 'react-i18next';
import SectionsMock from '../mocks/SectionsMock';

const SECTION_KEYS = ['intro', 'verse', 'preChorus', 'chorus', 'bridge', 'outro'] as const;
const P = 'text-sm text-zinc-400 leading-relaxed';

export default function SectionsSection() {
  const { t } = useTranslation();
  return (
    <>
      <p className={P}>{t('guide.sections.sections.body1', { names: SECTION_KEYS.map((k) => t(`editor.sections.${k}`)).join(', ') })}</p>
      <SectionsMock />
      <p className={P}>{t('guide.sections.sections.body2', { duet: t('editor.duetMode'), split: t('editor.splitMode') })}</p>
      <p className={P}>{t('guide.sections.sections.body3', { colors: t('settings.interface.singerColors') })}</p>
    </>
  );
}
