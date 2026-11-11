import { useTranslation } from 'react-i18next';
import WordsDemo from '../demos/WordsDemo';

const P = 'text-sm text-zinc-400 leading-relaxed';

export default function WordsSection() {
  const { t } = useTranslation();
  return (
    <>
      <p className={P}>{t('guide.sections.words.body1')}</p>
      <p className={P}>{t('guide.sections.words.body2')}</p>
      <WordsDemo />
    </>
  );
}
