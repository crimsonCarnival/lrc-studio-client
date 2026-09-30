import ProjectCard, { type CardProject } from './ProjectCard.jsx';
import { useTranslation } from 'react-i18next';

interface ProjectListProps {
  // CardProject, not the API Project: this list only reads publicId and hands
  // the rest to ProjectCard, and Library feeds it its own lighter shape.
  projects?: CardProject[];
  // publicId, not the project: Library's handlers and ProjectCard's callbacks
  // both speak publicId. Declaring these as project-shaped is what let the list
  // hand the whole object to loadProject and navigate to /project/[object Object].
  onDelete?: (publicId: string) => void;
  onFavorite?: (publicId: string) => void;
  onSelect?: (publicId: string) => void;
}

/**
 * Mobile list view for projects — renders projects as full-width list items.
 */
export default function ProjectList({ projects, onDelete, onFavorite, onSelect }: ProjectListProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 p-4">
      {projects?.length ? (
        projects.map((project) => (
          // Both sides speak publicId, so these pass straight through.
          <ProjectCard
            key={project.publicId}
            project={project}
            onDelete={onDelete}
            onFavorite={onFavorite}
            onSelect={onSelect}
            isListView={true}
            // ProjectList is only ever fed Library's own project list (the
            // signed-in user's projects) — same ownership guarantee as Library.tsx.
            isOwner
          />
        ))
      ) : (
        <div className="text-center py-12 text-zinc-500 text-sm">
          {t('home.noProjects')}
        </div>
      )}
    </div>
  );
}
