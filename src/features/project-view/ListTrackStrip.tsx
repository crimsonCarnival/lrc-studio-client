import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { resolveCoverImage } from '@/shared/utils/cover-image';
import { cn } from '@/shared/utils/utils';
import { listPath } from '@/features/profile/profile-path';
import { PlaylistCover } from '@/features/playlists/PlaylistCover';
import type { Playlist, Project } from '@/types';

/** Past this many tracks the segments get too small to read, so a plain bar stands in. */
const MAX_SEGMENTS = 20;

type ListTrackStripProps = {
  playlist: Playlist;
  listId: string;
  accountName?: string | null;
  /** 1-based position of the current track. */
  pos: number;
  prevTrack: Project | null;
  nextTrack: Project | null;
  onPrev: () => void;
  onNext: () => void;
  /** The next track starts on its own when this one ends. */
  autoplays: boolean;
};

function TrackButton({ track, eyebrow, onClick, side }: { track: Project; eyebrow: string; onClick: () => void; side: 'prev' | 'next' }) {
  const { t } = useTranslation();
  const cover = resolveCoverImage(track) as string | null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 min-w-0 max-w-full p-1.5 pr-3 rounded-xl hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        side === 'next' && 'flex-row-reverse text-right pl-3 pr-1.5',
      )}
    >
      <Icon name={side === 'prev' ? 'arrow_back' : 'arrow_forward'} size={18} className="text-muted-foreground" />
      <span className="size-9 shrink-0 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
        {cover
          ? <img src={cover} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
          : <Icon name="music_note" size={14} className="text-muted-foreground" />}
      </span>
      <span className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[11px] uppercase tracking-[0.08em] text-faint">{eyebrow}</span>
        <span className="text-sm text-foreground truncate">{track.title || t('playlists.detail.untitled')}</span>
      </span>
    </button>
  );
}

/** The playback bar's list strip: previous track, the list with your place in it, next track. */
export const ListTrackStrip = memo(function ListTrackStrip({
  playlist, listId, accountName, pos, prevTrack, nextTrack, onPrev, onNext, autoplays,
}: ListTrackStripProps) {
  const { t } = useTranslation();
  const total = playlist.projects.length;

  return (
    <div className="flex items-center gap-4 pt-3 border-t border-border">
      {/* Phones skip tracks from the transport buttons; the side buttons need room. */}
      <div className="max-md:hidden flex-1 min-w-0 flex">
        {prevTrack && <TrackButton track={prevTrack} eyebrow={t('projectView.list.previous')} onClick={onPrev} side="prev" />}
      </div>

      <div className="flex flex-col items-center gap-1.5 max-md:flex-1 min-w-0">
        <Link
          to={listPath(accountName, listId)}
          className="flex items-center gap-2 max-w-full text-[13px] text-foreground hover:text-primary transition-colors"
        >
          <PlaylistCover playlist={playlist} className="size-5 rounded-[5px]" iconSize={12} />
          <span className="truncate">{playlist.name}</span>
          <span className="font-mono text-muted-foreground shrink-0">
            <span aria-hidden>{pos} / {total}</span>
            <span className="sr-only">{t('projectView.list.positionLabel', { pos, total })}</span>
          </span>
        </Link>
        {total <= MAX_SEGMENTS ? (
          <span className="flex gap-1" aria-hidden>
            {playlist.projects.map((p, i) => (
              <span key={p.publicId} className={cn('w-4.5 h-[3px] rounded-pill', i < pos ? 'bg-primary' : 'bg-muted')} />
            ))}
          </span>
        ) : (
          <span className="w-40 h-[3px] rounded-pill bg-muted overflow-hidden" aria-hidden>
            <span className="block h-full bg-primary" style={{ width: `${(pos / total) * 100}%` }} />
          </span>
        )}
      </div>

      <div className="max-md:hidden flex-1 min-w-0 flex justify-end">
        {nextTrack && (
          <TrackButton
            track={nextTrack}
            eyebrow={autoplays ? t('projectView.list.upNextAutoplays') : t('projectView.list.upNext')}
            onClick={onNext}
            side="next"
          />
        )}
      </div>
    </div>
  );
});
