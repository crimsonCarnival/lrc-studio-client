import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Loader2, Music } from 'lucide-react';
import { usePaginatedPlaylists } from './hooks/useExplore';

interface ExplorePlaylist {
  id: string;
  name: string;
  coverImage?: string | null;
  accountName?: string;
  owner?: { accountName?: string } | null;
  projectCount?: number;
  savedCount?: number;
}

export default function ExplorePlaylistsPage() {
  const { t } = useTranslation();
  const { playlists, loading, loadingMore, error, hasMore, loadMore } = usePaginatedPlaylists(12) as {
    playlists: ExplorePlaylist[];
    loading: boolean;
    loadingMore: boolean;
    error: unknown;
    hasMore: boolean;
    loadMore: () => void;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
        {t('explore.playlists.empty')}
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full py-6 px-4 flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-white">{t('explore.playlists.title')}</h1>

      {playlists.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm py-20">
          {t('explore.playlists.empty')}
        </div>
      ) : (
        <>
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
                    <Music className="size-8 text-primary/50" />
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

          {hasMore ? (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingMore
                ? <Loader2 className="size-4 animate-spin" />
                : t('explore.page.loadMore')}
            </button>
          ) : (
            <p className="text-center text-sm text-zinc-500">{t('explore.page.noMore')}</p>
          )}
        </>
      )}
    </div>
  );
}
