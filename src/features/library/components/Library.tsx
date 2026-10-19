import { useState, useCallback } from 'react';
import { artistErrorMessageFor } from '@/features/artists/artist-errors';
import { useCachedList } from '@/shared/hooks/useCachedList';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { projects } from '@/app/api';
import ProjectSetupModalRaw from '@features/editor/components/setup/ProjectSetupModal';
import useConfirm from '@/shared/hooks/useConfirm';
import { useSettings } from '@/features/settings/useSettings';
import useInputMethod from '@/shared/hooks/useInputMethod';
import { Icon } from '@/shared/ui/Icon';
import { SearchField } from '@ui/search-field';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import { Button } from '@ui/button';
import { CountTabs } from '@ui/count-tabs';
import { Link } from 'react-router-dom';
import { projectStatus as statusOf, type ProjectStatus } from '@/features/projects/project-status';
import ProjectCard from './ProjectCard.jsx';
import ProjectListRaw from './ProjectList';
import { LibrarySwitch } from './LibrarySwitch';
import { useAuthContext } from '@/features/auth/useAuthContext';

// ProjectSetupModal is still untyped JS; cast until it is migrated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ProjectSetupModal = ProjectSetupModalRaw as any;
const ProjectList = ProjectListRaw;

// Stable fallback: ProjectSetupModal re-syncs its form whenever an initial* prop changes identity.
const EMPTY_LIST: string[] = [];

import { artistFieldsFromForm, creditsOf, type ArtistCredit } from '@/features/artists/artist-credits';

type LibraryFilterTab = 'all' | ProjectStatus;
const FILTER_TABS: LibraryFilterTab[] = ['all', 'inProgress', 'completed', 'notStarted'];

interface ProjectMeta {
  description?: string;
  tags?: string[];
  songName?: string;
  songArtist?: string;
  artists?: ArtistCredit[];
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
  lineCount?: number;
  syncedLineCount?: number;
  [key: string]: unknown;
}

interface SetupConfirmData {
  name?: string;
  description?: string;
  tags?: string[];
  songName?: string;
  artists?: ArtistCredit[];
  artistsChanged?: boolean;
  songAlbum?: string;
  songYear?: string | number;
  genre?: string;
  coverImage?: string;
  isPublic?: boolean;
  singerColors?: string[];
  singers?: string[];
}

// onOpenProject receives the project's publicId AND its canonical editor path
// (ProjectCard.onSelect passes both). Project URLs are owner-scoped, so the
// caller must navigate to the path given and never rebuild one from publicId.
export default function Library({ onOpenProject }: { onOpenProject?: (publicId: string, editPath: string | null) => void }) {
  const { t, i18n } = useTranslation();
  // projects.list() returns only the signed-in user's own projects, so the
  // signed-in account name IS the owner for every card in this list.
  const { user } = useAuthContext();
  const { settings } = useSettings();
  const timezone = settings.advanced?.timezone;
  const inputMethod = useInputMethod();
  const { items, loading, error, reload: fetchProjects, setItems } = useCachedList<ProjectItem>(
    ['projects', 'mine'],
    () => projects.list() as Promise<ProjectItem[] | null>,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [, confirmModal] = useConfirm() as [unknown, ReactNode];

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<LibraryFilterTab>('all');
  const [sortBy, setSortBy] = useState<'edited' | 'created' | 'title'>('edited');

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
  }, [setItems]);

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

  const searchMatched = items.filter(p => {
    const titleMatch = (p.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const tagsMatch = p.metadata?.tags?.some(tag => (tag || '').toLowerCase().includes(searchQuery.toLowerCase())) || false;
    return titleMatch || tagsMatch;
  });

  // Counted from the search-filtered list, so a badge always equals the cards its tab shows.
  const tabCounts: Record<LibraryFilterTab, number> = { all: searchMatched.length, inProgress: 0, completed: 0, notStarted: 0 };
  for (const p of searchMatched) tabCounts[statusOf(p)]++;

  const filteredProjects = searchMatched.filter(p => filterTab === 'all' || statusOf(p) === filterTab).sort((a, b) => {
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
      <div className="px-4 lg:px-0 mb-6">
        <LibrarySwitch active="projects" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 px-4 lg:px-0">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2 tracking-tight">{t('library.title')}</h1>
          <p className="text-[15px] text-zinc-400">
            {!loading && t('library.stats', { total: totalProjects, completed: completedProjects, lines: totalSyncedLines })}
          </p>
        </div>
        <Button asChild className="h-11 w-fit px-5 text-[15px] lg:h-11 lg:px-5 lg:text-[15px]">
          <Link to="/project/new">
            <Icon name="add" size={18} />
            {t('home.createNew')}
          </Link>
        </Button>
      </div>

      {/* Filter Row */}
      {!loading && !error && items.length > 0 && (
        <div className="px-4 lg:px-0 mb-6 flex flex-col gap-4 relative z-10">
          <div className="flex items-end justify-between">
            <SearchField
              compact
              label={t('home.search')}
              placeholder={t('home.search')}
              value={searchQuery}
              onValueChange={setSearchQuery}
              clearLabel={t('common.clear')}
              className="w-56 max-w-full"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 w-full mb-6 relative">
            <CountTabs<LibraryFilterTab>
              label={t('library.title')}
              value={filterTab}
              onChange={setFilterTab}
              tabs={FILTER_TABS.map((tab) => ({
                value: tab,
                label: (t as (k: string) => string)(`home.${tab}`),
                count: tabCounts[tab],
              }))}
            />


            <div className="relative flex items-center shrink-0 ml-auto sm:ml-0 mb-1 sm:mb-0">
              <Icon name="sort" size={14} className="absolute left-3 text-zinc-400 pointer-events-none" />
              <select 
                className="appearance-none bg-transparent hover:bg-zinc-800 text-xs coarse:min-h-11 text-zinc-400 hover:text-zinc-200 transition-colors pl-8 pr-8 py-1.5 rounded-lg outline-none cursor-pointer border-none"
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
          <Button variant="link" size={null} onClick={fetchProjects} className="text-xs">
            {t('common.retry')}
          </Button>
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
            ownerAccountName={user?.accountName}
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
              ownerAccountName={user?.accountName}
              onEdit={handleEdit}
              isListView={false}
              isDeleting={deletingId === project.publicId}
              i18n={i18n}
              timezone={timezone}
              // projects.list() returns only the signed-in user's own projects —
              // there's no per-item owner field to check, so this list-level
              // guarantee is the ownership signal.
              isOwner
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
              const { name: title, description, tags, songName, songAlbum, songYear, genre, coverImage, isPublic, singerColors, singers } = data;
              const updatedMetadata = {
                ...editingProject.metadata,
                description,
                tags,
                songName,
                ...artistFieldsFromForm(data),
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
              const invalid = artistErrorMessageFor(t, err);
              if (invalid) toast.error(invalid);
            }
          }}
          initialName={editingProject?.title || ''}
          initialDescription={editingProject?.metadata?.description || ''}
          initialTags={editingProject?.metadata?.tags || []}
          initialSongName={editingProject?.metadata?.songName || ''}
          initialArtists={creditsOf(editingProject?.metadata)}
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
