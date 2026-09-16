import { useState, useEffect, useCallback } from 'react';
import type { TFunction } from 'i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import useDynamicTranslation from '@/shared/hooks/useDynamicTranslation';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { projects } from '@/app/api';
import { Icon } from '@/shared/ui/Icon';
import { YoutubeIcon } from '@/shared/ui/YoutubeIcon';
import ProjectSetupModalRaw from '@features/editor/components/setup/ProjectSetupModal';
import { ThemedShineBorder } from '@ui/themed-shine-border';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

// ProjectSetupModal is a large untyped component; alias to bypass prop checking until migrated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ProjectSetupModal = ProjectSetupModalRaw as any;

interface ProjectMeta {
  tags?: string[];
  description?: string;
  songName?: string;
  songArtist?: string;
  songAlbum?: string;
  songYear?: string | number;
}

interface HomeProject {
  publicId: string;
  title?: string;
  coverImage?: string;
  metadata?: ProjectMeta;
  createdAt?: string | number;
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

const DATE_FNS_LOCALES: Record<string, typeof enUS> = { en: enUS, es };

function formatRelativeTime(dateStr?: string | number, locale = 'en') {
  try {
    return formatDistanceToNow(new Date(dateStr!), {
      addSuffix: true,
      locale: DATE_FNS_LOCALES[locale] ?? enUS,
    });
  } catch {
    return '';
  }
}


export default function Home() {
  const { t, dt, i18n } = useDynamicTranslation() as DynamicTranslation;
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [items, setItems] = useState<HomeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredProjects = items.filter(p => {
    const titleMatch = (p.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const tagsMatch = p.metadata?.tags?.some(tag => (tag || '').toLowerCase().includes(searchQuery.toLowerCase())) || false;
    return titleMatch || tagsMatch;
  });

  const lastProject = items.length > 0 ? items[0] : null;
  const username = user?.displayName || user?.accountName || 'Creator';
  const reducedMotion = useReducedMotion();

  return (
    <div className="h-full flex flex-col overflow-y-auto overflow-x-hidden pt-8 pb-12 lg:px-12 max-w-7xl mx-auto w-full">
      {/* ── Greeting & New Project ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 animate-fade-in px-4 lg:px-0">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2 tracking-tight">
            {dt('home.welcome', { name: username, context: user?.id })}
          </h1>
          <p className="text-[15px] text-zinc-400">
            {items.length > 0 ? t('home.projectProgress', { total: items.length, remaining: lastProject?.lineCount ? lastProject.lineCount - (lastProject.syncedLineCount || 0) : '?' }) : dt('home.welcomeSub')}
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
              <div className="size-24 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center shrink-0 shadow-inner-highlight">
                <Icon name="equalizer" className="text-primary/70" size={36} />
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
                    <span className="text-xs text-zinc-500">· {t('home.edited')} {formatRelativeTime(lastProject.createdAt, (i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2))}</span>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-sm font-bold text-zinc-300">{t('home.yourProjects')}</h2>
          <div className="flex items-center gap-1 sm:gap-4">
            <div className="flex items-center bg-zinc-800/50 rounded-lg p-1 border border-zinc-700/50">
              <button className="px-3 py-1.5 rounded-md bg-zinc-700 text-zinc-100 text-xs font-medium shadow-sm transition-colors">{t('home.all')}</button>
              <button className="px-3 py-1.5 rounded-md text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors">{t('home.inProgress')}</button>
              <button className="px-3 py-1.5 rounded-md text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors">{t('home.completed')}</button>
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
                     ) : project.upload?.source === 'cloudinary' ? (
                       <><Icon name="cloud" size={10} className="text-info" /><span className="text-[9px] font-bold text-zinc-300 uppercase">{t('home.sourceCloud')}</span></>
                     ) : (
                       <span className="text-[9px] font-bold text-zinc-300 uppercase">{t('home.sourceFile')}</span>
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
                      <span className="text-[10px] font-bold text-zinc-200">
                        {(project.syncedLineCount || 0)} / {(project.lineCount || 0)}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {formatRelativeTime(project.createdAt, (i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2))}
                      </span>
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
             <h3 className="text-sm font-bold text-zinc-200 mb-2">Empieza otro</h3>
             <p className="text-xs text-zinc-400 max-w-[200px]">
               Pega un enlace de YouTube o sube un audio y te llevamos al editor.
             </p>
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
          coverImage?: string; isPublic?: boolean;
        }) => {
          if (!editingProject) return;
          try {
            const { name: title, description, tags, songName, songArtist, songAlbum, songYear, coverImage, isPublic } = data;
            const updatedMetadata = {
              ...editingProject.metadata,
              description,
              tags,
              songName,
              songArtist,
              songAlbum,
              songYear,
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
        initialAlbumArt={''}
        isEditing={true}
      />
    </div>
  );
}
