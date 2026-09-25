import { useState, useEffect, useCallback } from 'react';
import type { TFunction } from 'i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatInTimezone } from '@/shared/utils/date';
import useDynamicTranslation from '@/shared/hooks/useDynamicTranslation';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { projects } from '@/app/api';
import { Icon } from '@/shared/ui/Icon';
import { YoutubeIcon } from '@/shared/ui/YoutubeIcon';
import ProjectSetupModalRaw from '@features/editor/components/setup/ProjectSetupModal';
import { ThemedShineBorder } from '@ui/themed-shine-border';

// ProjectSetupModal is a large untyped component; alias to bypass prop checking until migrated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ProjectSetupModal = ProjectSetupModalRaw as any;

// Stable fallback: ProjectSetupModal re-syncs its form whenever an initial* prop changes identity.
const EMPTY_LIST: string[] = [];

interface ProjectMeta {
  tags?: string[];
  description?: string;
  songName?: string;
  songArtist?: string;
  songAlbum?: string;
  songYear?: string | number;
  singers?: string[];
  singerColors?: string[];
}

interface HomeProject {
  publicId: string;
  title?: string;
  coverImage?: string;
  metadata?: ProjectMeta;
  createdAt?: string | number;
  updatedAt?: string | number;
  syncedLineCount?: number;
  lineCount?: number;
  public?: boolean;
  upload?: { source?: string };
  [key: string]: unknown;
}

interface DynamicTranslation {
  t: TFunction;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dt: (key: string, options?: Record<string, any>) => string;
  i18n: { resolvedLanguage?: string; language?: string };
}

type HomeFilterTab = 'all' | 'inProgress' | 'completed' | 'notStarted';
const FILTER_TABS: HomeFilterTab[] = ['all', 'inProgress', 'completed', 'notStarted'];

function statusOf(p: HomeProject): Exclude<HomeFilterTab, 'all'> {
  const progress = p.lineCount ? Math.min(100, Math.round(((p.syncedLineCount || 0) / p.lineCount) * 100)) : 0;
  if (progress === 100) return 'completed';
  if (progress === 0) return 'notStarted';
  return 'inProgress';
}

export default function Home() {
  const { t, dt, i18n } = useDynamicTranslation() as DynamicTranslation;
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [items, setItems] = useState<HomeProject[]>([]);
  const [, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<HomeFilterTab>('all');
  const [sortBy, setSortBy] = useState<'edited' | 'created' | 'title'>('edited');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [editingProject, setEditingProject] = useState<HomeProject | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const list = await projects.list() as HomeProject[] || [];
      setItems(list || []);
    } catch (err) {
      console.error('Failed to fetch projects', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProjects();
  }, [fetchProjects]);

  const searchMatched = items.filter(p => {
    const titleMatch = (p.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const tagsMatch = p.metadata?.tags?.some(tag => (tag || '').toLowerCase().includes(searchQuery.toLowerCase())) || false;
    return titleMatch || tagsMatch;
  });

  // Tab counts are derived from the same search-filtered list the grid renders, so a
  // badge always equals the number of cards its tab shows. The server's `projects`
  // query ignores limit/offset and returns the user's full list (capped at 100).
  const tabCounts: Record<HomeFilterTab, number> = { all: searchMatched.length, inProgress: 0, completed: 0, notStarted: 0 };
  for (const p of searchMatched) tabCounts[statusOf(p)]++;

  const filteredProjects = searchMatched.filter(p => filterTab === 'all' || statusOf(p) === filterTab).sort((a, b) => {
    if (sortBy === 'edited') {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    }
    if (sortBy === 'created') {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    }
    if (sortBy === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return 0;
  });

  const lastProject = items.length > 0 ? items[0] : null;
  const username = user?.displayName || user?.accountName || 'Creator';
  const timezone = (user as unknown as { settings?: { advanced?: { timezone?: string } } })?.settings?.advanced?.timezone || 'auto';

  return (
    <div className="h-full flex flex-col overflow-y-auto overflow-x-hidden pt-8 pb-12 lg:px-12 max-w-7xl mx-auto w-full">
      {/* ── Greeting & New Project ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 animate-fade-in px-4 lg:px-0">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2 tracking-tight">
            {dt('home.welcome', { name: username, context: user?.id })}
          </h1>
          <p className="text-[15px] text-zinc-400">
            {dt('home.welcomeSub')}
            {items.length > 0 && ` ${t('home.projectProgress', { total: items.length, remaining: lastProject?.lineCount ? lastProject.lineCount - (lastProject.syncedLineCount || 0) : '?' })}`}
          </p>
        </div>
        <button
          onClick={() => navigate('/project/new')}
          className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 rounded-xl font-medium transition-colors shadow-glow"
        >
          <Icon name="add" size={18} />
          {t('home.createNew')}
        </button>
      </div>

      {/* ── Donde lo dejaste ── */}
      {lastProject && (
        <div className="mb-12 animate-fade-in px-4 lg:px-0">
          <h2 className="text-sm font-bold text-zinc-300 mb-4">{t('home.resumeLast')}</h2>
          <div 
            className="glass rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 cursor-pointer hover:border-primary/30 transition-all group"
            onClick={() => navigate(`/project/${lastProject.publicId}/edit`)}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 flex-1 min-w-0">
              <div className="size-24 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center shrink-0 shadow-inner-highlight overflow-hidden relative">
                {lastProject.coverImage ? (
                  <img src={lastProject.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <Icon name="equalizer" className="text-primary/70" size={36} />
                )}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-bold text-zinc-100 truncate group-hover:text-primary transition-colors">{lastProject.title || t('library.untitled')}</h3>
                  {lastProject.syncedLineCount === lastProject.lineCount && lastProject.lineCount && lastProject.lineCount > 0 ? (
                    <span className="text-[10px] px-2 py-1 rounded-md bg-zinc-700/50 text-zinc-300 font-bold tracking-wider uppercase border border-zinc-600/30">{t('home.statusComplete')}</span>
                  ) : null}
                </div>
                <p className="text-[15px] text-zinc-400 mb-4 truncate">
                  {lastProject.metadata?.songArtist || t('home.noArtist')}
                  {lastProject.metadata?.songAlbum ? ` · ${lastProject.metadata.songAlbum}` : ''}
                </p>
                <div className="flex items-center gap-4 w-full max-w-xl">
                  <div className="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-success rounded-full" 
                      style={{ width: `${lastProject.lineCount ? Math.min(100, Math.round(((lastProject.syncedLineCount || 0) / lastProject.lineCount) * 100)) : 0}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-medium text-zinc-300">
                      {(lastProject.syncedLineCount || 0)} / {(lastProject.lineCount || 0)} {t('home.lines')}
                    </span>
                    <span className="text-xs text-zinc-500 flex flex-col items-end gap-1">
                      <span>{t('home.created')} {formatInTimezone(lastProject.createdAt, timezone, { dateStyle: 'short', timeStyle: 'short' }, (i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2))}</span>
                      {(lastProject.updatedAt && lastProject.updatedAt !== lastProject.createdAt) && (
                        <span>{t('home.edited')} {formatInTimezone(lastProject.updatedAt, timezone, { dateStyle: 'short', timeStyle: 'short' }, (i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2))}</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <button className="flex items-center justify-center gap-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 px-5 py-3 rounded-xl font-medium transition-colors shrink-0">
              <Icon name="play_arrow" size={20} /> {t('home.resume')}
            </button>
          </div>
        </div>
      )}

      {/* ── Tus proyectos ── */}
      <div className="px-4 lg:px-0 animate-fade-in flex-1 flex flex-col min-h-0">
        <div className="flex flex-col gap-4 mb-6 relative z-10">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-semibold text-zinc-100 tracking-tight">{t('home.yourProjects')}</h2>
            
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 w-full relative">
            <div className="flex gap-1 overflow-x-auto hide-scrollbar">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  aria-pressed={filterTab === tab}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] whitespace-nowrap ${filterTab === tab
                    ? 'border-primary text-zinc-100'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                  {(t as (k: string) => string)(`home.${tab}`)}
                  <span className={`min-w-5 px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums leading-none ${filterTab === tab
                    ? 'bg-primary/20 text-primary'
                    : 'bg-zinc-800 text-zinc-500'
                    }`}>
                    {tabCounts[tab]}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 relative shrink-0 ml-auto sm:ml-0 mb-1 sm:mb-0">
              <div className="relative flex items-center">
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
              <div className="w-px h-5 bg-zinc-800 mx-1 hidden sm:block" />
              <button 
                onClick={() => navigate('/library')}
                className="text-xs font-medium text-primary hover:text-primary-dim transition-colors hidden sm:block"
              >
                {t('home.viewLibrary')}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
          {filteredProjects.map((project) => {
            const progress = project.lineCount ? Math.min(100, Math.round(((project.syncedLineCount || 0) / project.lineCount) * 100)) : 0;
            return (
              <button
                key={project.publicId}
                type="button"
                onClick={() => navigate(`/project/${project.publicId}/edit`)}
                className="group glass rounded-2xl overflow-hidden text-left hover:border-primary/40 transition-all cursor-pointer focus:ring-2 focus:ring-primary/30 outline-none flex flex-col h-64"
              >
                {/* Image/Waveform Header */}
                <div className="relative h-36 bg-zinc-800/30 border-b border-zinc-800/50 flex items-center justify-center overflow-hidden">
                   {project.coverImage ? (
                     <>
                        <img src={project.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent" />
                     </>
                   ) : (
                     <div className="flex items-end gap-[3px] h-12 opacity-30 group-hover:opacity-50 transition-opacity">
                       {Array.from({ length: 9 }, (_, i) => (
                         <div key={i} className="w-1.5 rounded-full bg-zinc-300" style={{ height: `${20 + 80 * Math.abs(Math.sin(i * 1.5))}%` }} />
                       ))}
                     </div>
                   )}
                   {/* Badge */}
                   <div className="absolute top-3 left-3 px-2 py-1 bg-zinc-950/60 backdrop-blur-md rounded border border-zinc-700/50 flex items-center gap-1.5">
                     {project.upload?.source === 'youtube' ? (
                       <><Icon name="play_circle" size={10} className="text-destructive" /><span className="text-[9px] font-bold text-zinc-300 uppercase">{t('home.sourceYoutube')}</span></>
                     ) : (
                       <><Icon name="description" size={10} className="text-info" /><span className="text-[9px] font-bold text-zinc-300 uppercase">{t('home.sourceFile')}</span></>
                     )}
                   </div>
                </div>
                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-sm font-bold text-zinc-100 truncate group-hover:text-primary transition-colors">{project.title || t('library.untitled')}</h3>
                  <p className="text-xs text-zinc-400 mt-1 truncate">{project.metadata?.songArtist || t('home.noArtist')}</p>
                  
                  <div className="mt-auto pt-4 flex flex-col gap-2">
                    <div className="h-[3px] w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-200 mt-auto">
                        {(project.syncedLineCount || 0)} / {(project.lineCount || 0)}
                      </span>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] text-zinc-500">
                          {t('home.created')} {formatInTimezone(project.createdAt, timezone, { dateStyle: 'short', timeStyle: 'short' }, (i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2))}
                        </span>
                        {(project.updatedAt && project.updatedAt !== project.createdAt) && (
                          <span className="text-[10px] text-zinc-500">
                            {t('home.edited')} {formatInTimezone(project.updatedAt, timezone, { dateStyle: 'short', timeStyle: 'short' }, (i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Start another CTA Card */}
          <button
            onClick={() => navigate('/project/new')}
            className="group relative rounded-2xl border border-dashed border-zinc-700 hover:border-primary/50 bg-transparent hover:bg-zinc-800/20 transition-all flex flex-col items-center justify-center p-6 h-64 text-center"
          >
             <div className="size-12 rounded-full bg-zinc-800/80 group-hover:bg-primary/20 flex items-center justify-center mb-4 transition-colors">
               <Icon name="add" size={24} className="text-zinc-400 group-hover:text-primary transition-colors" />
             </div>
             <h3 className="text-zinc-100 font-medium text-sm leading-tight mb-1">{t('home.startAnother')}</h3>
             <p className="text-zinc-400 text-xs">{t('home.startAnotherDesc')}</p>
          </button>
        </div>
      </div>
      
      <ProjectSetupModal
        key={editingProject?.publicId || 'none'}
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        onConfirm={async (data: {
          name?: string; description?: string; tags?: string[];
          songName?: string; songArtist?: string; songAlbum?: string; songYear?: string | number;
          coverImage?: string; isPublic?: boolean; singerColors?: string[]; singers?: string[];
        }) => {
          if (!editingProject) return;
          try {
            const { name: title, description, tags, songName, songArtist, songAlbum, songYear, coverImage, isPublic, singerColors, singers } = data;
            const updatedMetadata = {
              ...editingProject.metadata,
              description,
              tags,
              songName,
              songArtist,
              songAlbum,
              songYear,
              singerColors: (singerColors || []).map((c) => c || ''),
              singers,
            };
            await projects.patch(editingProject.publicId, {
              title,
              coverImage,
              public: isPublic,
              metadata: updatedMetadata
            } as Parameters<typeof projects.patch>[1]);
            // Update local state
            setItems(prev => prev.map(p =>
              p.publicId === editingProject.publicId
                ? { ...p, title, coverImage, public: isPublic, metadata: updatedMetadata }
                : p
            ));
            setEditingProject(null);
          } catch {
            toast.error(t('project.updateError'));
          }
        }}
        initialName={editingProject?.title || ''}
        initialDescription={editingProject?.metadata?.description || ''}
        initialTags={editingProject?.metadata?.tags || []}
        initialSongName={editingProject?.metadata?.songName || ''}
        initialSongArtist={editingProject?.metadata?.songArtist || ''}
        initialSongAlbum={editingProject?.metadata?.songAlbum || ''}
        initialSongYear={editingProject?.metadata?.songYear || ''}
        initialCoverImage={editingProject?.coverImage || ''}
        initialIsPublic={editingProject?.public || false}
        initialSingerColors={editingProject?.metadata?.singerColors ?? EMPTY_LIST}
        initialSingers={editingProject?.metadata?.singers ?? EMPTY_LIST}
        initialAlbumArt={''}
        isEditing={true}
      />
    </div>
  );
}
