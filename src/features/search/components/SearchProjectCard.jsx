import { Link } from 'react-router-dom';
import { Star, GitFork } from 'lucide-react';

export function SearchProjectCard({ project }) {
  const { projectId, title, coverImage, starCount, forkCount, metadata, forkedFrom } = project;
  const displayTitle = metadata?.songName || title || 'Untitled';
  const artist = metadata?.songArtist;
  const thumb = metadata?.albumArt || coverImage;

  return (
    <Link
      to={`/project/${projectId}`}
      className="flex gap-3 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700/70 hover:bg-zinc-800/50 transition-all"
    >
      {thumb && (
        <img
          src={thumb}
          alt=""
          className="w-12 h-12 rounded-lg object-cover shrink-0"
        />
      )}

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate">{displayTitle}</p>
        {artist && (
          <p className="text-xs text-zinc-400 truncate mt-0.5">{artist}</p>
        )}
        {forkedFrom?.accountName && (
          <p className="text-[10px] text-zinc-600 mt-0.5">
            forked from @{forkedFrom.accountName}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Star className="size-3" />
          <span>{starCount ?? 0}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <GitFork className="size-3" />
          <span>{forkCount ?? 0}</span>
        </div>
      </div>
    </Link>
  );
}
