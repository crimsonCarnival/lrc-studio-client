import { useState, useEffect, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars -- motion used as JSX namespace: <motion.div>
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { projects } from '@/app/api';
import ProjectSetupModal from '@features/editor/components/setup/ProjectSetupModal';
import useConfirm from '@/shared/hooks/useConfirm';
import { useSettings } from '@/features/settings/useSettings';
import useInputMethod from '@/shared/hooks/useInputMethod';
import { FileText, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import ProjectCard from './ProjectCard.jsx';
import ProjectList from './ProjectList.jsx';

export default function Library({ onOpenProject }) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const timezone = settings.advanced?.timezone;
  const inputMethod = useInputMethod();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [, confirmModal] = useConfirm();

  const fetchProjects = useCallback(async () => {
    setError(false);
    try {
      const list = await projects.list() || [];
      setItems(list);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
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
      {/* Count */}
      <div className="flex items-center mb-5">
        <span className="text-xs text-zinc-500">
          {!loading && t('library.count', { count: items.length })}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <div className="size-14 rounded-2xl bg-zinc-800/80 flex items-center justify-center">
            <AlertCircle className="size-7 text-zinc-500" />
          </div>
          <p className="text-sm text-zinc-400 font-medium">{t('common.loadError')}</p>
          <button onClick={fetchProjects} className="text-xs text-primary hover:text-primary/70 transition-colors font-medium">
            {t('common.retry')}
          </button>
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
          key={editingProject?.projectId || 'none'}
          isOpen={!!editingProject}
          onClose={() => setEditingProject(null)}
          onConfirm={async (data) => {
            try {
              const { name: title, description, tags, songName, songArtist, songAlbum, songYear, genre, coverImage } = data;
              const updatedMetadata = {
                ...editingProject.metadata,
                description,
                tags,
                songName,
                songArtist,
                songAlbum,
                songYear,
                genre,
              };
              await projects.patch(editingProject.projectId, {
                title,
                coverImage,
                metadata: updatedMetadata
              });
              // Update local state
              setItems(prev => prev.map(p =>
                p.projectId === editingProject.projectId
                  ? { ...p, title, coverImage, metadata: updatedMetadata }
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
          initialSongName={editingProject?.metadata?.songName || ''}
          initialSongArtist={editingProject?.metadata?.songArtist || ''}
          initialSongAlbum={editingProject?.metadata?.songAlbum || ''}
          initialSongYear={editingProject?.metadata?.songYear || ''}
          initialGenre={editingProject?.metadata?.genre || ''}
          initialCoverImage={editingProject?.coverImage || ''}
          initialAlbumArt={''}
          isEditing={true}
        />
      )}
      {confirmModal}
    </div>
  );
}
