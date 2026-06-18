import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Music } from 'lucide-react';
import { resolveCoverImage } from '@/shared/utils/cover-image';

interface UpNextProject {
  publicId: string;
  title?: string | null;
  metadata?: { songArtist?: string | null } | null;
  [key: string]: unknown;
}

interface ProjectUpNextPanelProps {
  playlist?: { name: string; projects: UpNextProject[] } | null;
  currentpublicId?: string;
  listId?: string;
  accountName?: string;
}

export function ProjectUpNextPanel({ playlist, currentpublicId, listId, accountName }: ProjectUpNextPanelProps) {
  const { t } = useTranslation();
  if (!playlist) return null;

  return (
    <div className="flex flex-col w-full lg:w-80 lg:flex-shrink-0">
      <div className="px-1 pb-2">
        <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          {t('projectView.upNext')}
        </span>
        <Link
          to={`/${accountName}/lists/${listId}`}
          className="block text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-1 mt-0.5"
        >
          {playlist.name}
        </Link>
      </div>

      <div className="flex flex-col gap-1 max-h-[60vh] lg:max-h-none overflow-y-auto">
        {playlist.projects.map((project) => {
          const isCurrent = project.publicId === currentpublicId;
          const thumb = resolveCoverImage(project);
          return (
            <Link
              key={project.publicId}
              to={`/project/${project.publicId}?list=${listId}`}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-accent/50 ${isCurrent ? 'bg-primary/10' : ''}`}
            >
              <div className="w-20 h-12 rounded-md flex-shrink-0 overflow-hidden bg-muted flex items-center justify-center">
                {thumb ? (
                  <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <Music className="size-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm line-clamp-2 leading-snug ${isCurrent ? 'text-primary font-medium' : 'text-foreground'}`}>
                  {project.title || t('playlists.detail.untitled')}
                </p>
                {project.metadata?.songArtist && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{project.metadata.songArtist}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
