import { useTranslation } from 'react-i18next';
import { TrendingProjects } from './components/TrendingProjects';
import { PopularPlaylists } from './components/PopularPlaylists';
import { SuggestedUsers } from './components/SuggestedUsers';

export default function ExplorePage() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 max-w-4xl mx-auto w-full py-6 px-4 flex flex-col gap-10">
      <h1 className="text-xl font-semibold text-white">{t('explore.page.title')}</h1>
      <TrendingProjects limit={6} />
      <PopularPlaylists limit={6} />
      <SuggestedUsers limit={8} />
    </div>
  );
}
