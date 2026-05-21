import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { projects } from '@/app/api';
import { Button } from '@ui/button';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { SkeletonCard } from '@ui/skeleton';
import ProjectSetupModal from '@features/editor/components/setup/ProjectSetupModal';
import useConfirm from '@/shared/hooks/useConfirm';
import { useSettings } from '@/features/settings/useSettings';
import useInputMethod from '@/shared/hooks/useInputMethod';
import { FileText } from 'lucide-react';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import ProjectCard from './ProjectCard.jsx';
import ProjectList from './ProjectList.jsx';

export default function Library({ onOpenProject, onBack }) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const timezone = settings.advanced?.timezone;
  const inputMethod = useInputMethod();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [, confirmModal] = useConfirm();

  const fetchProjects = useCallback(async () => {
    try {
      const list = await projects.list() || [];
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleDelete = useCallback((projectId) => {
    setDeletingId(projectId);
    try {
      projects.remove(projectId);
      setItems((prev) => prev.filter((s) => s.projectId !== projectId));
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleFavorite = useCallback((projectId) => {
    // Placeholder for favorite functionality
    // Can be implemented later with backend support
    console.log('Favorite toggled for:', projectId);
  }, []);

  const handleEdit = useCallback((project) => {
    setEditingProject(project);
  }, []);

  return (
    <div className="flex flex-col h-full pt-0 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex-shrink-0"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-widest">
          {t('library.title')}
        </h2>
        <span className="text-xs text-zinc-500 ml-auto">
          {!loading && t('library.count', { count: items.length })}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6"
        >
          <div className="size-14 rounded-2xl bg-zinc-800/80 flex items-center justify-center">
            <FileText className="size-7 text-zinc-500" />
          </div>
          <p className="text-sm text-zinc-400 font-medium">{t('library.empty')}</p>
          <p className="text-xs text-zinc-500">{t('library.emptyHint')}</p>
        </motion.div>
      ) : inputMethod === 'touch' ? (
        // Mobile: List view with swipe gestures
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 settings-scroll">
          <ProjectList
            projects={items}
            onDelete={handleDelete}
            onFavorite={handleFavorite}
            onSelect={onOpenProject}
          />
        </div>
      ) : (
        // Desktop: Grid view (original layout)
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 settings-scroll">
          {items.map((project) => (
            <ProjectCard
              key={project.projectId}
              project={project}
              onDelete={handleDelete}
              onFavorite={handleFavorite}
              onSelect={onOpenProject}
              onEdit={handleEdit}
              isListView={false}
              isDeleting={deletingId === project.projectId}
              i18n={i18n}
              timezone={timezone}
            />
          ))}
        </div>
      )}

      {editingProject && (
        <ProjectSetupModal
          isOpen={!!editingProject}
          onClose={() => setEditingProject(null)}
          onConfirm={async (data) => {
            try {
              const { title, description, tags } = data;
              const updatedMetadata = { ...editingProject.metadata, description, tags };
              await projects.patch(editingProject.projectId, {
                title,
                metadata: updatedMetadata
              });
              // Update local state
              setItems(prev => prev.map(p =>
                p.projectId === editingProject.projectId
                  ? { ...p, title, metadata: updatedMetadata }
                  : p
              ));
              setEditingProject(null);
            } catch (err) {
              console.error('Failed to update project metadata:', err);
            }
          }}
          initialName={editingProject?.title || ''}
          initialDescription={editingProject?.metadata?.description || ''}
          initialTags={editingProject?.metadata?.tags || []}
          isEditing={true}
        />
      )}
      {confirmModal}
    </div>
  );
}
