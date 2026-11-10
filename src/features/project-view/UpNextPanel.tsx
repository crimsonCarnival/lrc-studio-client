import { useEffect, useId, useRef } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listPath } from '@/features/profile/profile-path';
import { ArtistText } from '@/features/artists/ArtistText';
import { Icon } from '@/shared/ui/Icon';
import { resolveCoverImage } from '@/shared/utils/cover-image';
import { cn } from '@/shared/utils/utils';
import { PlaylistCover } from '@/features/playlists/PlaylistCover';
import { formatRuntime, formatTrackLength, totalDurationSeconds } from '@/features/playlists/playlist-stats';
import type { Playlist } from '@/types';
import { listTrackHref } from './list-nav';

type UpNextPanelProps = {
  playlist: Playlist;
  currentpublicId?: string;
  listId: string;
  /** The list owner's account name, for the list's own URL. */
  accountName?: string | null;
};

const EQ_STYLE = { '--eq-h': '14px', '--eq-w': '3px', '--eq-gap': '2px' } as CSSProperties;

export function UpNextPanel({ playlist, currentpublicId, listId, accountName }: UpNextPanelProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const scrollerRef = useRef<HTMLOListElement>(null);
  const currentRef = useRef<HTMLLIElement>(null);

  const projects = playlist.projects;
  const total = projects.length;
  const index = projects.findIndex((p) => p.publicId === currentpublicId);
  const pos = index + 1;
  const runtime = formatRuntime(totalDurationSeconds(projects));
  const listHref = listPath(accountName, listId);
  const owner = playlist.owner?.displayName || playlist.owner?.accountName;

  // Bring the current row into view inside the queue's own scroller. Done by
  // hand, not scrollIntoView, which would also scroll the page and the info column.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const row = currentRef.current;
    if (!scroller || !row) return;
    const s = scroller.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    if (r.top < s.top) scroller.scrollTop += r.top - s.top;
    else if (r.bottom > s.bottom) scroller.scrollTop += r.bottom - s.bottom;
  }, [currentpublicId, total]);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4 w-full pt-2">
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t('projectView.list.playingFrom')}
        </h2>
        <Link to={listHref} className="inline-flex items-center gap-1 text-[13px] text-primary hover:text-foreground transition-colors">
          {t('projectView.list.openList')}
          <Icon name="arrow_forward" size={14} />
        </Link>
      </div>

      <Link
        to={listHref}
        className="flex items-center gap-3.5 p-3 rounded-2xl bg-card border border-border hover:bg-accent/40 transition-colors"
      >
        <PlaylistCover playlist={playlist} className="size-16 rounded-lg" iconSize={24} />
        <span className="flex flex-col gap-1 min-w-0 flex-1">
          <span className="font-heading text-[17px] font-semibold text-foreground truncate">{playlist.name}</span>
          <span className="text-[13px] text-muted-foreground truncate">
            {[
              owner,
              t('playlists.detail.projects', { count: total }),
              runtime ? t(`playlists.detail.runtime.${runtime.key}`, runtime) : null,
            ].filter(Boolean).join(' · ')}
          </span>
          {pos > 0 && (
            <span className="mt-1 h-1 rounded-pill bg-muted overflow-hidden" aria-hidden>
              <span className="block h-full bg-primary" style={{ width: `${(pos / total) * 100}%` }} />
            </span>
          )}
        </span>
        {pos > 0 && (
          <span className="self-start font-mono text-[13px] text-muted-foreground">
            <span aria-hidden>{t('projectView.list.position', { pos, total })}</span>
            <span className="sr-only">{t('projectView.list.positionLabel', { pos, total })}</span>
          </span>
        )}
      </Link>

      <ol ref={scrollerRef} className="lrc-scroll flex flex-col gap-0.5 max-h-[min(60vh,30rem)] overflow-y-auto">
        {projects.map((project, i) => {
          const isCurrent = i === index;
          const played = index !== -1 && i < index;
          const thumb = resolveCoverImage(project) as string | null;
          const href = listTrackHref(project, listId);
          const length = formatTrackLength(project.upload?.duration);
          const rowClass = cn(
            'grid grid-cols-[1.5rem_2.5rem_minmax(0,1fr)_auto] items-center gap-3 p-2 rounded-lg transition-colors',
            isCurrent ? 'bg-accent' : 'hover:bg-accent/50',
            played && 'opacity-50 hover:opacity-100',
          );
          const body = (
            <>
              <span className="flex justify-center">
                {isCurrent ? (
                  <span className="eq-bars text-primary" style={EQ_STYLE} aria-hidden><i /><i /><i /></span>
                ) : (
                  <span className="font-mono text-xs text-faint">{i + 1}</span>
                )}
              </span>
              <span className="size-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                {thumb ? (
                  <img src={thumb} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <Icon name="music_note" size={16} className="text-muted-foreground" />
                )}
              </span>
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className={cn('text-sm font-medium truncate', isCurrent ? 'text-primary' : 'text-foreground')}>
                  {isCurrent && <span className="sr-only">{t('projectView.list.nowPlaying')}: </span>}
                  {project.title || t('playlists.detail.untitled')}
                </span>
                <ArtistText metadata={project.metadata} className="block text-xs text-muted-foreground truncate" />
              </span>
              <span className="font-mono text-xs text-muted-foreground">{length ?? ''}</span>
            </>
          );
          return (
            <li key={project.publicId} ref={isCurrent ? currentRef : undefined}>
              {href
                ? <Link to={href} aria-current={isCurrent ? 'page' : undefined} className={rowClass}>{body}</Link>
                : <div className={rowClass}>{body}</div>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
