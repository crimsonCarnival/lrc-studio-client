import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { listPath } from '@/features/profile/profile-path';
import { useSettings } from '@/features/settings/useSettings';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { Tip } from '@ui/tip';
import { Skeleton } from '@ui/skeleton';
import useConfirm from '@/shared/hooks/useConfirm';
import { getRelativeTime } from '@/shared/utils/date';
import type { Playlist } from '@/types';
import { PlaylistCover } from './PlaylistCover';
import { PlaylistModal } from './PlaylistModal';
import { deletePlaylist } from './playlist.service';
import { formatRuntime, totalDurationSeconds } from './playlist-stats';

/** Projects tagged this way make up the auto-maintained Starred list (see useStarredPlaylist). */
const STARRED_TAG = 'starred';

type PlaylistTileProps = {
  playlist: Playlist;
  /** Whose lists these are: the card links under their profile. */
  accountName: string;
  /** Shows the hover edit/delete actions. */
  isOwner: boolean;
};


/**
 * A list as a card: cover with badges and a count · runtime overlay, name,
 * description, saves · views · updated. The owner gets edit and delete on hover;
 * both writes refresh every cached list page through cache-sync.
 */
export function PlaylistTile({ playlist, accountName, isOwner }: PlaylistTileProps) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const timezone = settings.advanced?.timezone || 'auto';
  const locale = (i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2);
  const [editing, setEditing] = useState(false);
  const [requestConfirm, confirmModal] = useConfirm();

  const runtime = useMemo(() => formatRuntime(totalDurationSeconds(playlist.projects ?? [])), [playlist.projects]);
  const isAuto = playlist.tags?.includes(STARRED_TAG) ?? false;
  const updated = playlist.updatedAt ? getRelativeTime(playlist.updatedAt, t, timezone, locale) : null;

  const handleEdit = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditing(true);
  };

  const handleDelete = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    requestConfirm(
      t('playlists.deleteConfirm', { name: playlist.name }),
      async () => {
        try {
          await deletePlaylist(playlist.id);
          toast.success(t('playlists.deleteSuccess'));
        } catch {
          toast.error(t('playlists.deleteError'));
        }
      },
      { title: t('playlists.deleteTitle'), variant: 'danger' },
    );
  };

  return (
    <>
      <Link
        to={listPath(accountName, playlist.id)}
        className="group relative flex flex-col gap-2.5 p-2.5 rounded-2xl bg-card border border-border hover:bg-accent/40 transition-colors"
      >
        <span className="relative block">
          <PlaylistCover playlist={playlist} className="w-full aspect-[4/3] rounded-xl" iconSize={34} />

          <span className="absolute left-2 top-2 flex gap-1.5">
            {isAuto && (
              <span className="px-2 py-0.5 rounded-pill bg-gold text-background text-[10px] font-semibold uppercase tracking-wider">
                {t('playlists.lists.auto')}
              </span>
            )}
            {!playlist.isPublic && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-pill bg-background/85 text-foreground text-[10px] font-semibold uppercase tracking-wider">
                <Icon name="lock" size={10} />
                {t('playlists.private')}
              </span>
            )}
          </span>

          <span className="absolute right-2 bottom-2 px-2 py-0.5 rounded-pill bg-background/85 text-foreground text-[11px] font-mono">
            {t('playlists.detail.projects', { count: playlist.projectCount })}
            {runtime && <> · {t(`playlists.detail.runtime.${runtime.key}`, runtime)}</>}
          </span>
        </span>

        <span className="flex flex-col gap-1 px-1 pb-1 min-w-0">
          <span className="font-heading text-[15px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {playlist.name}
          </span>
          {playlist.description ? (
            <span className="text-xs text-muted-foreground truncate">{playlist.description}</span>
          ) : (
            <span className="text-xs text-muted-foreground/60 italic truncate">{t('playlists.lists.noDescription')}</span>
          )}
          <span className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
            <span>{t('playlists.detail.saved', { count: playlist.savedCount })}</span>
            <span>{t('playlists.lists.views', { count: playlist.viewCount })}</span>
            {updated && <span className="ml-auto truncate">{updated}</span>}
          </span>
        </span>

        {isOwner && (
          <span className="absolute top-4 right-4 z-10 flex gap-1 p-1 rounded-lg bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <Tip content={t('playlists.editPlaylist')}>
              <Button variant="ghost" size="icon-sm" onClick={handleEdit} className="size-7" aria-label={t('playlists.editPlaylist')}>
                <Icon name="edit" size={14} />
              </Button>
            </Tip>
            <Tip content={t('playlists.deletePlaylist')}>
              <Button variant="ghost" size="icon-sm" onClick={handleDelete} className="size-7 text-love-ink hover:bg-love-soft hover:text-love-ink" aria-label={t('playlists.deletePlaylist')}>
                <Icon name="delete" size={14} />
              </Button>
            </Tip>
          </span>
        )}
      </Link>

      {editing && (
        <PlaylistModal
          playlist={playlist}
          onClose={() => setEditing(false)}
          onSave={() => setEditing(false)}
        />
      )}
      {confirmModal}
    </>
  );
}

/** Placeholder with the tile's shape while a page loads. */
export function PlaylistTileSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 p-2.5 rounded-2xl bg-card border border-border">
      <Skeleton className="w-full aspect-[4/3] rounded-xl" />
      <div className="flex flex-col gap-2 px-1 pb-1">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
  );
}
