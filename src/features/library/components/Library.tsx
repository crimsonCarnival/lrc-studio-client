import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { projects } from '@/app/api';
import ProjectSetupModalRaw from '@features/editor/components/setup/ProjectSetupModal';
import useConfirm from '@/shared/hooks/useConfirm';
import { useSettings } from '@/features/settings/useSettings';
import useInputMethod from '@/shared/hooks/useInputMethod';
import { Icon } from '@/shared/ui/Icon';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import ProjectCard from './ProjectCard.jsx';
import ProjectListRaw from './ProjectList';

// ProjectSetupModal is still untyped JS; cast until it is migrated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ProjectSetupModal = ProjectSetupModalRaw as any;
// ProjectList's typed handler signatures (project vs publicId) differ from this
// page's; cast until both are reconciled.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ProjectList = ProjectListRaw as any;

interface ProjectMeta {
  description?: string;
  tags?: string[];
  songName?: string;
  songArtist?: string;
  songAlbum?: string;
  songYear?: string | number;
  genre?: string;
  [key: string]: unknown;
}

interface ProjectItem {
  publicId: string;
  title?: string;
  coverImage?: string;
  public?: boolean;
  metadata?: ProjectMeta;
  [key: string]: unknown;
}

interface SetupConfirmData {
  name?: string;
  description?: string;
  tags?: string[];
  songName?: string;
  songArtist?: string;
  songAlbum?: string;
  songYear?: string | number;
  genre?: string;
  coverImage?: string;
  isPublic?: boolean;
}

// onOpenProject receives the project's publicId (ProjectCard.onSelect passes project.publicId).
export default function Library({ onOpenProject }: { onOpenProject?: (publicId: string) => void }) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const timezone = settings.advanced?.timezone;
  const inputMethod = useInputMethod();
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [, confirmModal] = useConfirm() as [unknown, ReactNode];

  const fetchProjects = useCallback(async () => {
    setError(false);
    try {
      const list = await projects.list() as ProjectItem[] | null || [];
      setItems(list);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleDelete = useCallback((publicId: string) => {
    setDeletingId(publicId);
    try {
      projects.remove(publicId);
      setItems((prev) => prev.filter((s) => s.publicId !== publicId));
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleFavorite = useCallback((publicId: string) => {
    // Placeholder for favorite functionality
    // Can be implemented later with backend support
    console.log('Favorite toggled for:', publicId);
  }, []);

  const handleEdit = useCallback((project: ProjectItem) => {
    setEditingProject(project);
  }, []);

  // Calculate stats
  const totalProjects = items.length;
  const completedProjects = items.filter(p => (p.lineCount as number) && (p.syncedLineCount as number) === (p.lineCount as number) && (p.lineCount as number) > 0).length;
  const totalSyncedLines = items.reduce((acc, p) => acc + ((p.syncedLineCount as number) || 0), 0);

  return (
    <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden pt-8 pb-12 lg:px-12 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 px-4 lg:px-0">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2 tracking-tight">Biblioteca</h1>
          <p className="text-[15px] text-zinc-400">
            {!loading && `${totalProjects} proyectos · ${completedProjects} completos · ${totalSyncedLines} líneas sincronizadas`}
          </p>
        </div>
        <button
          className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 rounded-xl font-medium transition-colors shadow-glow w-fit"
        >
          <Icon name="add" size={18} />
          Nuevo proyecto
        </button>
      </div>

      {/* Filter Row */}
      {!loading && !error && items.length > 0 && (
        <div className="px-4 lg:px-0 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-64">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            <div className="flex items-center bg-zinc-800/50 rounded-lg p-1 border border-zinc-700/50 shrink-0">
              <button className="px-4 py-1.5 rounded-md bg-zinc-700 text-zinc-100 text-sm font-medium shadow-sm transition-colors">Todos</button>
              <button className="px-4 py-1.5 rounded-md text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors">En curso</button>
              <button className="px-4 py-1.5 rounded-md text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors">Completos</button>
              <button className="px-4 py-1.5 rounded-md text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors">Sin empezar</button>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400 shrink-0 ml-auto sm:ml-0 cursor-pointer hover:text-zinc-200 transition-colors">
              <span className="font-medium">Ordenar</span>
              <span className="text-zinc-300 font-semibold">Editado recientemente</span>
              <Icon name="expand_more" size={16} />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <div className="size-14 rounded-2xl bg-zinc-800/80 flex items-center justify-center">
            <Icon name="error" size={28} className="text-zinc-500" />
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
            <Icon name="description" size={28} className="text-zinc-500" />
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
        <div className="flex-1 px-4 lg:px-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
            {items.map((project) => (
            <ProjectCard
              key={project.publicId}
              project={project}
              onDelete={handleDelete}
              onFavorite={handleFavorite}
              onSelect={onOpenProject}
              onEdit={handleEdit}
              isListView={false}
              isDeleting={deletingId === project.publicId}
              i18n={i18n}
              timezone={timezone}
            />
          ))}
          </div>
        </div>
      )}

      {editingProject && (
        <ProjectSetupModal
          key={editingProject?.publicId || 'none'}
          isOpen={!!editingProject}
          onClose={() => setEditingProject(null)}
          onConfirm={async (data: SetupConfirmData) => {
            try {
              const { name: title, description, tags, songName, songArtist, songAlbum, songYear, genre, coverImage, isPublic } = data;
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
              await projects.patch(editingProject.publicId, {
                title,
                coverImage,
                public: isPublic,
                metadata: updatedMetadata,
              } as Parameters<typeof projects.patch>[1]);
              // Update local state
              setItems(prev => prev.map(p =>
                p.publicId === editingProject.publicId
                  ? { ...p, title, coverImage, public: isPublic, metadata: updatedMetadata }
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
          initialIsPublic={editingProject?.public || false}
          initialAlbumArt={''}
          isEditing={true}
        />
      )}
      {confirmModal}
    </div>
  );
}
