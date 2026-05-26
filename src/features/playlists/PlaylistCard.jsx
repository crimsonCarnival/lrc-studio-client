import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, Music } from 'lucide-react';

export function PlaylistCard({ playlist, accountName }) {
  const { t } = useTranslation();

  return (
    <Link
      to={`/profile/${accountName}/playlists/${playlist.id}`}
      className="glass rounded-2xl overflow-hidden flex flex-col hover:bg-white/5 transition-colors group"
    >
      {/* Cover */}
      <div className="aspect-video w-full bg-gradient-to-br from-primary/30 to-accent-purple/30 flex items-center justify-center relative shrink-0">
        {playlist.coverImage ? (
          <img
            src={playlist.coverImage}
            alt={playlist.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <Music className="size-8 text-primary/50" />
        )}
        {!playlist.isPublic && (
          <span className="absolute top-2 right-2 bg-zinc-900/80 rounded-lg p-1">
            <Lock className="size-3 text-muted-foreground" />
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {playlist.name}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t('playlists.detail.projects', { count: playlist.projectCount })}
          {' · '}
          {t('playlists.detail.saved', { count: playlist.savedCount })}
        </p>
        {playlist.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {playlist.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
