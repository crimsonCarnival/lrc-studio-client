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

// Stable fallback: ProjectSetupModal re-syncs its form whenever an initial* prop changes identity.
const EMPTY_LIST: string[] = [];

interface ProjectMeta {
  description?: string;
  tags?: string[];
  songName?: string;
  songArtist?: string;
  songAlbum?: string;
  songYear?: string | number;
  genre?: string;
  singers?: string[];
  singerColors?: string[];
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
  singerColors?: string[];
  singers?: string[];
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

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'inProgress' | 'completed' | 'notStarted'>('all');
  const [sortBy, setSortBy] = useState<'edited' | 'created' | 'title'>('edited');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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

  const totalProjects = items.length;
  const completedProjects = items.filter(p => (p.lineCount as number) && (p.syncedLineCount as number) === (p.lineCount as number) && (p.lineCount as number) > 0).length;
  const totalSyncedLines = items.reduce((acc, p) => acc + ((p.syncedLineCount as number) || 0), 0);

  const filteredProjects = items.filter(p => {
    const titleMatch = (p.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const tagsMatch = p.metadata?.tags?.some(tag => (tag || '').toLowerCase().includes(searchQuery.toLowerCase())) || false;
    const matchesSearch = titleMatch || tagsMatch;

    if (!matchesSearch) return false;

    const progress = p.lineCount ? Math.min(100, Math.round((((p.syncedLineCount as number) || 0) / (p.lineCount as number)) * 100)) : 0;

    if (filterTab === 'inProgress') {
      return progress > 0 && progress < 100;
    }
    if (filterTab === 'completed') {
      return progress === 100;
    }
    if (filterTab === 'notStarted') {
      return progress === 0;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'edited') {
      const aTime = new Date((a.updatedAt as string) || (a.createdAt as string) || 0).getTime();
      const bTime = new Date((b.updatedAt as string) || (b.createdAt as string) || 0).getTime();
      return bTime - aTime;
    }
    if (sortBy === 'created') {
      const aTime = new Date((a.createdAt as string) || 0).getTime();
      const bTime = new Date((b.createdAt as string) || 0).getTime();
      return bTime - aTime;
    }
    if (sortBy === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return 0;
  });

  return (
    <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden pt-8 pb-12 lg:px-12 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 px-4 lg:px-0">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2 tracking-tight">{t('library.title')}</h1>
          <p className="text-[15px] text-zinc-400">
            {!loading && t('library.stats', { total: totalProjects, completed: completedProjects, lines: totalSyncedLines })}
          </p>
        </div>
        <button
          className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 rounded-xl font-medium transition-colors shadow-glow w-fit"
        >
          <Icon name="add" size={18} />
          {t('home.createNew')}
        </button>
      </div>

      {/* Filter Row */}
      {!loading && !error && items.length > 0 && (
        <div className="px-4 lg:px-0 mb-6 flex flex-col gap-4 relative z-10">
          <div className="flex items-end justify-between">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${
              isSearchFocused ? 'border-primary/50 bg-zinc-900' : 'border-zinc-800 bg-zinc-900/50'
            }`}>
              <Icon name="search" size={14} className={isSearchFocused ? 'text-primary' : 'text-zinc-500'} />
              <input 
                type="text" 
                placeholder={t('home.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="bg-transparent border-none outline-none text-xs text-zinc-200 placeholder:text-zinc-600 w-32 focus:w-48 transition-all"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 w-full mb-6 relative">
            <div className="flex gap-1 overflow-x-auto hide-scrollbar">
              {['all', 'inProgress', 'completed', 'notStarted'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab as 'all' | 'inProgress' | 'completed' | 'notStarted')}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap ${filterTab === tab
                    ? 'border-primary text-zinc-100'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                  {(t as (k: string) => string)(`home.${tab}`)}
                </button>
              ))}
            </div>
            
            <div className="relative flex items-center shrink-0 ml-auto sm:ml-0 mb-1 sm:mb-0">
              <Icon name="sort" size={14} className="absolute left-3 text-zinc-400 pointer-events-none" />
              <select 
                className="appearance-none bg-transparent hover:bg-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 transition-colors pl-8 pr-8 py-1.5 rounded-lg outline-none cursor-pointer border-none"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'edited' | 'created' | 'title')}
              >
                <option value="edited" className="bg-zinc-900">{t('home.sortBy')} {t('home.recentlyEdited')}</option>
                <option value="created" className="bg-zinc-900">{t('home.sortBy')} {t('home.recentlyCreated')}</option>
                <option value="title" className="bg-zinc-900">{t('home.sortBy')} {t('home.titleAZ')}</option>
              </select>
              <Icon name="expand_more" size={14} className="absolute right-2 text-zinc-400 pointer-events-none" />
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
            projects={filteredProjects}
            onDelete={handleDelete}
            onFavorite={handleFavorite}
            onSelect={onOpenProject}
          />
        </div>
      ) : (
        // Desktop: Grid view (original layout)
        <div className="flex-1 px-4 lg:px-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
            {filteredProjects.map((project) => (
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
              const { name: title, description, tags, songName, songArtist, songAlbum, songYear, genre, coverImage, isPublic, singerColors, singers } = data;
              const updatedMetadata = {
                ...editingProject.metadata,
                description,
                tags,
                songName,
                songArtist,
                songAlbum,
                songYear,
                genre,
                singerColors,
                singers,
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
          initialSingerColors={editingProject?.metadata?.singerColors ?? EMPTY_LIST}
          initialSingers={editingProject?.metadata?.singers ?? EMPTY_LIST}
          initialAlbumArt={''}
          isEditing={true}
        />
      )}
      {confirmModal}
    </div>
  );
}
