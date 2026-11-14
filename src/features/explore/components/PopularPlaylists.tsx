import { listPath } from '@/features/profile/profile-path';
import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { usePopularPlaylists } from '../hooks/useExplore';
import { LogoLoader } from '@ui/LogoLoader';
import { UserHoverCard } from '@ui/UserHoverCard';
import { Button } from '@ui/button';
import { useAuthContext } from '@/features/auth/useAuthContext';

const PlaylistModal = lazy(() => import('@/features/playlists/PlaylistModal').then((m) => ({ default: m.PlaylistModal })));

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

  const { user } = useAuthContext();
  const [creating, setCreating] = useState(false);
  const signedIn = !!user && !user.isGuest;

  // No lists yet: one slim row with a way to make the first, instead of an empty block.
  if (!loading && (error || playlists.length === 0)) {
    return (
      <section aria-labelledby="explore-lists" className="flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] bg-raised px-5 py-[18px] inset-ring inset-ring-hl">
        <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] bg-primary-soft text-primary-ink">
          <Icon name="playlist_add" size={22} />
        </span>
        <div className="min-w-0 flex-[1_1_260px]">
          <h2 id="explore-lists" className="font-heading text-base font-semibold text-foreground">{t('explore.playlists.title')}</h2>
          <p className="mt-0.5 text-[13px] text-subtle">{t('explore.playlists.emptyHint')}</p>
        </div>
        {signedIn && (
          <Button type="button" variant="outline" size="sm" onClick={() => setCreating(true)}>
            {t('explore.playlists.create')}
          </Button>
        )}
        {creating && (
          <Suspense fallback={null}>
            <PlaylistModal onClose={() => setCreating(false)} onSave={() => setCreating(false)} />
          </Suspense>
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold text-foreground">{t('explore.playlists.title')}</h2>
        <Link
          to="/explore/playlists"
          className="text-[13px] font-medium text-primary-ink hover:text-foreground"
        >
          {t('explore.playlists.seeAll')}
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <LogoLoader size={24} className="text-subtle" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {playlists.map(playlist => {
            const ownerAccountName = playlist.owner?.accountName ?? playlist.accountName;
            return (
              <Link
                key={playlist.id}
                to={listPath(ownerAccountName, playlist.id)}
                className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-raised inset-ring inset-ring-hl transition-shadow duration-[var(--duration-state)] hover:inset-ring-faint"
              >
                <div className="aspect-video w-full bg-primary-soft flex items-center justify-center relative shrink-0">
                  {playlist.coverImage ? (
                    <img
                      src={playlist.coverImage}
                      alt={playlist.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <Icon name="music_note" size={32} className="text-primary-ink/60" />
                  )}
                </div>
                <div className="p-3 flex flex-col gap-1">
                  <p className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary-ink transition-colors">
                    {playlist.name}
                  </p>
                  <p className="text-xs text-subtle truncate">
                    {ownerAccountName ? (
                      <UserHoverCard accountName={ownerAccountName}>
                        <span>{ownerAccountName}</span>
                      </UserHoverCard>
                    ) : null}
                  </p>
                  <p className="text-xs text-subtle mt-0.5">
                    {t('playlists.detail.projects', { count: playlist.projectCount ?? 0 })}
                    {' · '}
                    {t('playlists.detail.saved', { count: playlist.savedCount ?? 0 })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
