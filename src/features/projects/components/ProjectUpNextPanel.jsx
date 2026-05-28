import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Music } from 'lucide-react';

export function ProjectUpNextPanel({ playlist, currentProjectId, listId, accountName }) {
  const { t } = useTranslation();

  if (!playlist) return null;

  return (
    <div className="w-36 flex-shrink-0 flex flex-col border-l border-border bg-card/50 overflow-hidden">
      {/* Header — list name links back to the list page */}
      <div className="p-3 border-b border-border">
        <Link
          to={`/${accountName}/lists/${listId}`}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors line-clamp-2"
        >
          {playlist.name}
        </Link>
      </div>

      {/* Scrollable track list */}
      <div className="flex-1 overflow-y-auto">
        {playlist.projects.map((project) => {
          const isCurrent = project.projectId === currentProjectId;
          return (
            <Link
              key={project.projectId}
              to={`/project/${project.projectId}?list=${listId}`}
              className={`flex items-center gap-2 px-3 py-2 transition-colors hover:bg-accent/50 ${
                isCurrent ? 'bg-primary/10' : ''
              }`}
            >
              {/* Thumbnail placeholder — GQL does not return album art on playlist items */}
              <div className="size-8 rounded flex-shrink-0 overflow-hidden bg-muted flex items-center justify-center">
                <Music className="size-3 text-muted-foreground" />
              </div>

              {/* Title + artist */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs line-clamp-1 ${isCurrent ? 'text-primary font-medium' : 'text-foreground'}`}>
                  {project.title || t('playlists.detail.untitled')}
                </p>
                {project.metadata?.songArtist && (
                  <p className="text-[10px] text-muted-foreground line-clamp-1">
                    {project.metadata.songArtist}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
