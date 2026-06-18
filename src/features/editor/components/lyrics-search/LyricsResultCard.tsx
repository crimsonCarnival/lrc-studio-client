import { LazyImage } from '@ui/LazyImage';

interface LyricsSong {
  thumbnail?: string | null;
  title?: string;
  artist?: string;
  [key: string]: unknown;
}

interface LyricsResultCardProps {
  song: LyricsSong;
  onClick: (song: LyricsSong) => void;
  isLoading?: boolean;
}

export default function LyricsResultCard({ song, onClick, isLoading }: LyricsResultCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(song)}
      disabled={isLoading}
      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left transition-colors hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-wait"
    >
      {song.thumbnail ? (
        <LazyImage
          src={song.thumbnail}
          alt=""
          className="size-10 rounded object-cover flex-shrink-0 bg-zinc-800"
        />
      ) : (
        <div className="size-10 rounded flex-shrink-0 bg-zinc-800" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-100 truncate">{song.title}</p>
        <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
      </div>
    </button>
  );
}
