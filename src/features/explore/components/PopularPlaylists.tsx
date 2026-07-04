import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { usePopularPlaylists } from '../hooks/useExplore';

interface ExplorePlaylist {
  id: string;
  name: string;
  coverImage?: string | null;
  accountName?: string;
  owner?: { accountName?: string } | null;
  projectCount?: number;
  savedCount?: number;
}

export function PopularPlaylists({ limit = 6 }: { limit?: number }) {
  const { t } = useTranslation();
  const { playlists, loading, error } = usePopularPlaylists(limit) as {
    playlists: ExplorePlaylist[];
    loading: boolean;
    error: unknown;
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">{t('explore.playlists.title')}</h2>
        <Link
          to="/explore/playlists"
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          {t('explore.playlists.seeAll')}
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Icon name="progress_activity" size={24} className="animate-spin text-zinc-500" />
        </div>
      ) : error || playlists.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-10">
          {t('explore.playlists.empty')}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {playlists.map(playlist => (
            <Link
              key={playlist.id}
              to={`/${playlist.owner?.accountName ?? playlist.accountName}/lists/${playlist.id}`}
              className="flex flex-col rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700/70 transition-colors overflow-hidden group"
            >
              <div className="aspect-video w-full bg-gradient-to-br from-primary/30 to-accent-purple/30 flex items-center justify-center relative shrink-0">
                {playlist.coverImage ? (
                  <img
                    src={playlist.coverImage}
                    alt={playlist.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <Icon name="music_note" size={32} className="text-primary/50" />
                )}
              </div>
              <div className="p-3 flex flex-col gap-1">
                <p className="text-sm font-semibold text-white line-clamp-1 group-hover:text-primary transition-colors">
                  {playlist.name}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  @{playlist.owner?.accountName ?? playlist.accountName}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {t('playlists.detail.projects', { count: playlist.projectCount ?? 0 })}
                  {' · '}
                  {t('playlists.detail.saved', { count: playlist.savedCount ?? 0 })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
