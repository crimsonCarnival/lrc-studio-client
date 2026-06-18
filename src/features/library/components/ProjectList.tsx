import ProjectCard from './ProjectCard.jsx';
import type { Project } from '@/types';

interface ProjectListProps {
  projects?: Project[];
  onDelete?: (project: Project) => void;
  onFavorite?: (project: Project) => void;
  onSelect?: (project: Project) => void;
}

/**
 * Mobile list view for projects — renders projects as full-width list items.
 */
export default function ProjectList({ projects, onDelete, onFavorite, onSelect }: ProjectListProps) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {projects?.length ? (
        projects.map((project) => (
          <ProjectCard
            key={project.publicId}
            project={project}
            onDelete={onDelete}
            onFavorite={onFavorite}
            onSelect={onSelect}
            isListView={true}
          />
        ))
      ) : (
        <div className="text-center py-12 text-zinc-500 text-sm">
          No projects yet
        </div>
      )}
    </div>
  );
}
