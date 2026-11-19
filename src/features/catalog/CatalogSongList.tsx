import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { projectPath } from '@/features/projects/project-path';
import type { CatalogSong } from './catalog.types';

type CatalogSongListProps = {
  songs: CatalogSong[];
  /** Under each title, the album the song names (artist page). */
  showAlbum?: boolean;
  /** Before each title, the song's track number (album page). */
  showTrack?: boolean;
};

/** The public songs of a catalog artist or album: title links to the song, uploader on the right. */
export function CatalogSongList({ songs, showAlbum = false, showTrack = false }: CatalogSongListProps) {
  const { t } = useTranslation();
  return (
    <ol className="flex flex-col rounded-2xl border border-border bg-card">
      {songs.map((song) => {
        const href = projectPath(song, song.user?.accountName);
        const title = song.metadata?.songName || song.title || t('playlists.detail.untitled');
        const track = song.metadata?.trackNumber;
        return (
          <li key={song.id} className="flex items-center gap-3 border-t border-border px-4 py-2.5 text-sm first:border-t-0">
            {showTrack && <span className="w-6 shrink-0 text-right tabular-nums text-xs text-muted-foreground">{track ?? ''}</span>}
            <span className="flex min-w-0 flex-1 flex-col">
              {href
                ? <Link to={href} className="truncate font-medium text-foreground hover:underline">{title}</Link>
                : <span className="truncate font-medium text-foreground">{title}</span>}
              {showAlbum && song.metadata?.songAlbum && <span className="truncate text-xs text-muted-foreground">{song.metadata.songAlbum}</span>}
            </span>
            {song.user?.accountName && <span className="shrink-0 text-xs text-muted-foreground">@{song.user.accountName}</span>}
          </li>
        );
      })}
    </ol>
  );
}
