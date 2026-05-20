import React from 'react';
import ProjectCard from './ProjectCard.jsx';

/**
 * Mobile list view for projects
 * Renders projects as full-width list items with swipe support
 *
 * @param {Array} projects - Array of project objects to display
 * @param {Function} onDelete - Callback when project is deleted
 * @param {Function} onFavorite - Callback when project is favorited
 * @param {Function} onSelect - Callback when project is selected
 */
export default function ProjectList({ projects, onDelete, onFavorite, onSelect }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {projects?.length ? (
        projects.map((project) => (
          <ProjectCard
            key={project.projectId}
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
