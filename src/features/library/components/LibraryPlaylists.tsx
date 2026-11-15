import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { CountTabs } from '@ui/count-tabs';
import { EmptyState } from '@ui/EmptyState';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { ListPager } from '@/features/playlists/ListPager';
import { PlaylistModal } from '@/features/playlists/PlaylistModal';
import { PlaylistTile, PlaylistTileSkeleton } from '@/features/playlists/PlaylistTile';
import { usePlaylistsPage, useSavedPlaylistsPage } from '@/features/playlists/playlist.queries';
import type { PlaylistVisibilityFilter } from '@/types';
import { LibrarySwitch } from './LibrarySwitch';

type Chip = 'all' | 'private' | 'unlisted' | 'public' | 'saved';
const CHIPS: readonly Chip[] = ['all', 'private', 'unlisted', 'public', 'saved'];

// Public = public AND listed, matching the server's PUBLIC filter; unlisted is the public-but-unlisted rest.
const VISIBILITY: Record<Exclude<Chip, 'saved'>, PlaylistVisibilityFilter> = {
  all: 'ALL', private: 'PRIVATE', unlisted: 'UNLISTED', public: 'PUBLIC',
};

const PER_PAGE = 12;

/**
 * The Library's Playlists tab: the owner's lists (private ones included) filtered by visibility,
 * plus the lists they saved from others. A chip's count is the server's `total` for that filter,
 * so it stays right however many lists there are.
 */
export default function LibraryPlaylists() {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const accountName = user?.accountName ?? undefined;
  const [chip, setChip] = useState<Chip>('all');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  // Counts: one probe per visibility, one row each. Saved lists are not "own", so they have their own probe.
  const countAll = usePlaylistsPage(accountName, { visibility: 'ALL', limit: 1 });
  const countPrivate = usePlaylistsPage(accountName, { visibility: 'PRIVATE', limit: 1 });
  const countUnlisted = usePlaylistsPage(accountName, { visibility: 'UNLISTED', limit: 1 });
  const countPublic = usePlaylistsPage(accountName, { visibility: 'PUBLIC', limit: 1 });
  const countSaved = useSavedPlaylistsPage({ limit: 1 }, !!accountName);
  const counts: Record<Chip, number | undefined> = {
    all: countAll.data?.total,
    private: countPrivate.data?.total,
    unlisted: countUnlisted.data?.total,
    public: countPublic.data?.total,
    saved: countSaved.data?.total,
  };

  const isSaved = chip === 'saved';
  const pageParams = { offset: (page - 1) * PER_PAGE, limit: PER_PAGE };
  const own = usePlaylistsPage(isSaved ? undefined : accountName, { ...pageParams, sort: 'UPDATED', visibility: VISIBILITY[isSaved ? 'all' : chip] });
  const saved = useSavedPlaylistsPage(pageParams, isSaved && !!accountName);
  const active = isSaved ? saved : own;
  const playlists = active.data?.playlists ?? [];
  const total = active.data?.total ?? 0;

  const selectChip = (next: Chip) => {
    setChip(next);
    setPage(1);
  };

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <div className="flex flex-col pt-8 pb-12 lg:px-12 max-w-7xl mx-auto w-full">
        <div className="px-4 lg:px-0 mb-6">
          <LibrarySwitch active="playlists" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 px-4 lg:px-0">
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">{t('library.playlists.title')}</h1>
          <Button className="h-11 w-fit px-5 text-[15px] lg:h-11 lg:px-5 lg:text-[15px]" onClick={() => setCreating(true)}>
            <Icon name="add" size={18} />
            {t('library.playlists.newPlaylist')}
          </Button>
        </div>

        <div className="px-4 lg:px-0 mb-6 border-b border-zinc-800">
          <CountTabs<Chip>
            label={t('library.playlists.filterLabel')}
            value={chip}
            onChange={selectChip}
            tabs={CHIPS.map((c) => ({ value: c, label: t(`library.playlists.${c}`), count: counts[c] }))}
          />
        </div>

        <div className="px-4 lg:px-0 flex flex-col gap-4">
          {active.isPending ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(13.75rem,1fr))] gap-3.5">
              {Array.from({ length: 4 }, (_, i) => <PlaylistTileSkeleton key={i} />)}
            </div>
          ) : active.isError ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-zinc-400 font-medium">{t('common.loadError')}</p>
              <Button variant="link" size={null} onClick={() => void active.refetch()} className="text-xs">{t('common.retry')}</Button>
            </div>
          ) : playlists.length === 0 ? (
            <EmptyState art="lists" title={isSaved ? t('library.playlists.emptySaved') : t('library.playlists.empty')} className="py-12" />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(13.75rem,1fr))] gap-3.5">
              {playlists.map((playlist) => (
                <PlaylistTile
                  key={playlist.id}
                  playlist={playlist}
                  // A saved list lives under its own owner's profile, not the viewer's.
                  accountName={isSaved ? playlist.owner?.accountName ?? '' : accountName ?? ''}
                  isOwner={!isSaved}
                />
              ))}
            </div>
          )}
          <ListPager page={page} perPage={PER_PAGE} total={total} shown={playlists.length} onPageChange={setPage} />
        </div>

        {creating && <PlaylistModal onClose={() => setCreating(false)} onSave={() => setCreating(false)} />}
      </div>
    </div>
  );
}
