import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { projectPath } from '@/features/projects/project-path';
import type { CatalogSong } from './catalog.types';

type CatalogSongListProps = {
  songs: CatalogSong[];
  /** Under each title, the album the song names (artist page). */
  showAlbum?: boolean;
  /** Before each title, the song's track number (album page). */
  showTrack?: boolean;
};

/** The public songs of a catalog artist or album: cover, title, album/year/genre, sync progress and stars, uploader on the right. */
export function CatalogSongList({ songs, showAlbum = false, showTrack = false }: CatalogSongListProps) {
  const { t } = useTranslation();
  return (
    <ol className="flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-raised inset-ring inset-ring-hl">
      {songs.map((song) => {
        const href = projectPath(song, song.user?.accountName);
        const title = song.metadata?.songName || song.title || t('playlists.detail.untitled');
        const track = song.metadata?.trackNumber;
        const cover = song.coverImage ?? song.upload?.coverImage ?? null;
        const total = song.lineCount ?? 0;
        const done = song.syncedLineCount ?? 0;
        const complete = total > 0 && done >= total;
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
        const stars = song.starCount ?? 0;
        const sub = [
          showAlbum ? song.metadata?.songAlbum : null,
          song.metadata?.songYear ? String(song.metadata.songYear) : null,
          song.metadata?.genre,
        ].filter(Boolean).join(' · ');
        return (
          <li key={song.id} className="group flex items-center gap-3 border-t border-border px-3 py-2.5 text-sm transition-colors first:border-t-0 hover:bg-muted/50">
            {showTrack && <span className="w-6 shrink-0 text-right tabular-nums text-xs text-muted-foreground">{track ?? ''}</span>}
            <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-soft">
              {cover
                ? <img src={cover} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
                : <Icon name="music_note" size={20} className="text-primary-ink/60" />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              {href
                ? <Link to={href} className="truncate font-medium text-foreground hover:text-primary-ink hover:underline">{title}</Link>
                : <span className="truncate font-medium text-foreground">{title}</span>}
              {sub && <span className="truncate text-xs text-subtle">{sub}</span>}
            </span>
            <span className="hidden shrink-0 items-center gap-3 text-xs text-subtle sm:flex">
              {song.hasWordSync && (
                <span className="flex items-center gap-1 rounded-[var(--radius-chip)] bg-primary-soft px-2 py-0.5 font-medium text-primary-ink">
                  <Icon name="lyrics" size={13} />{t('catalog.page.wordSync')}
                </span>
              )}
              {total > 0 && (
                <span className={complete ? 'flex items-center gap-1 text-success' : 'tabular-nums'}>
                  {complete && <Icon name="check_circle" size={13} />}
                  {complete ? t('catalog.page.synced') : t('catalog.page.syncedPercent', { percent })}
                </span>
              )}
              {stars > 0 && (
                <span className="flex items-center gap-1" aria-label={t('catalog.page.stars', { count: stars })}>
                  <Icon name="star" size={13} />{stars}
                </span>
              )}
            </span>
            {song.user?.accountName && <span className="max-w-[28%] shrink-0 truncate text-xs text-muted-foreground">@{song.user.accountName}</span>}
          </li>
        );
      })}
    </ol>
  );
}
