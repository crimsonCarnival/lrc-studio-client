import { useTranslation } from 'react-i18next';
import PlayerDemo from '../demos/PlayerDemo';

const P = 'text-sm text-zinc-400 leading-relaxed';

export default function PlayerSection() {
  const { t } = useTranslation();
  return (
    <>
      <p className={P}>{t('guide.sections.player.body1')}</p>
      <p className={P}>{t('guide.sections.player.body2')}</p>
      <PlayerDemo />
    </>
  );
}
