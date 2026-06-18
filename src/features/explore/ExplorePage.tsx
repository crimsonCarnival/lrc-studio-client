import { TrendingProjects } from './components/TrendingProjects';
import { PopularPlaylists } from './components/PopularPlaylists';
import { SuggestedUsers } from './components/SuggestedUsers';

export default function ExplorePage() {
  return (
    <div className="flex-1 max-w-4xl mx-auto w-full py-6 px-4 flex flex-col gap-10">
      <TrendingProjects limit={6} />
      <PopularPlaylists limit={6} />
      <SuggestedUsers limit={8} />
    </div>
  );
}
