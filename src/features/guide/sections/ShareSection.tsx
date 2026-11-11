import { useTranslation } from 'react-i18next';
import ShareMock from '../mocks/ShareMock';

const P = 'text-sm text-zinc-400 leading-relaxed';

export default function ShareSection() {
  const { t } = useTranslation();
  return (
    <>
      <p className={P}>{t('guide.sections.share.body1', { title: t('project.publishAction') })}</p>
      <ShareMock />
      <p className={P}>{t('guide.sections.share.body2', { publicLabel: t('project.choicePublic'), unlisted: t('project.choiceUnlisted'), manage: t('project.visibilityManage'), makePrivate: t('project.unpublishAction') })}</p>
      <p className={P}>{t('guide.sections.share.body3', { share: t('share.sheet.title'), forks: t('share.forksEnabled') })}</p>
      <p className={P}>{t('guide.sections.share.body4')}</p>
    </>
  );
}
