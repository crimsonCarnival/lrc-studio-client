import { useTranslation } from 'react-i18next';
import { LazyImage } from '@ui/LazyImage';
import { Icon } from '@/shared/ui/Icon';

interface LyricsSong {
  thumbnail?: string | null;
  title?: string;
  artist?: string;
  duration?: number | null;
  synced?: boolean;
  [key: string]: unknown;
}

interface LyricsResultCardProps {
  song: LyricsSong;
  onClick: (song: LyricsSong) => void;
}

function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function LyricsResultCard({ song, onClick }: LyricsResultCardProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => onClick(song)}
      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left transition-colors hover:bg-zinc-800"
    >
      {song.thumbnail ? (
        <LazyImage
          src={song.thumbnail}
          alt=""
          className="size-10 rounded object-cover flex-shrink-0 bg-zinc-800"
        />
      ) : (
        <div className="size-10 rounded flex-shrink-0 bg-zinc-800 flex items-center justify-center">
          <Icon name="music_note" size={18} className="text-zinc-600" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-100 truncate">{song.title}</p>
        <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Surfaced before the click so the user can pick the timed version when
            one exists — the whole reason to prefer a synced source. */}
        {song.synced && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-[10px] font-bold">
            <Icon name="schedule" size={11} />
            {t('lyricsSearch.syncedBadge')}
          </span>
        )}
        {typeof song.duration === 'number' && song.duration > 0 && (
          <span className="text-[10px] text-zinc-500 tabular-nums">{formatDuration(song.duration)}</span>
        )}
      </div>
    </button>
  );
}
