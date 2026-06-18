import { useState, useEffect, useCallback } from 'react';
import type { TFunction } from 'i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import useDynamicTranslation from '@/shared/hooks/useDynamicTranslation';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { projects } from '@/app/api';
import { Music2, Plus, Search, Play, ChevronRight, Activity, Library as LibraryIcon, Compass, Trophy, Rss } from 'lucide-react';
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
    <div className="h-full flex flex-col overflow-hidden">

      {/* Decorative background — hidden for data-saver */}
      <div className="wavy-canvas-container fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 size-80 bg-primary/4 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-24 size-72 bg-accent-purple/3 rounded-full blur-3xl" />
      </div>

      <div className="relative flex-1 flex flex-col lg:flex-row gap-0 overflow-y-auto lg:overflow-hidden p-4 sm:p-5 lg:p-6 min-h-0">

        {/* ── SIDEBAR ── */}
        <div className="lg:w-52 xl:w-60 flex flex-col gap-4 shrink-0 lg:pr-5 lg:border-r lg:border-zinc-800/60 pb-5 lg:pb-0">

          {/* Greeting */}
          <div className="animate-fade-in">
            <h1 className="font-heading text-zinc-100 leading-tight mb-1"
                style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)' }}>
              {dt('home.welcome', { name: username, context: user?.id })}
            </h1>
            <p className="text-zinc-600 text-xs leading-relaxed">
              {dt('home.welcomeSub')}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1.5 animate-fade-in">
            <button
              type="button"
              onClick={() => navigate('/project/new')}
              className="group relative glass rounded-xl px-3.5 py-3 text-left hover:border-primary/50 transition-all flex items-center gap-3 w-full focus:ring-2 focus:ring-primary/50 outline-none overflow-hidden contrast-more:border-zinc-600"
            >
              <ThemedShineBorder />
              <div className="size-7 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 motion-reduce:group-hover:scale-100 transition-transform">
                <Plus className="size-4 text-primary" />
              </div>
              <span className="text-xs font-semibold text-zinc-300 group-hover:text-zinc-100 transition-colors">{t('home.createNew')}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/library')}
              className="group relative glass rounded-xl px-3.5 py-3 text-left hover:border-accent-purple/40 transition-all flex items-center gap-3 w-full focus:ring-2 focus:ring-accent-purple/50 outline-none overflow-hidden contrast-more:border-zinc-600"
            >
              <ThemedShineBorder />
              <div className="size-7 shrink-0 rounded-lg bg-accent-purple/10 flex items-center justify-center group-hover:scale-110 motion-reduce:group-hover:scale-100 transition-transform">
                <LibraryIcon className="size-4 text-accent-purple" />
              </div>
              <span className="text-xs font-semibold text-zinc-300 group-hover:text-zinc-100 transition-colors">{t('home.viewLibrary')}</span>
            </button>

            {!loading && lastProject && (
              <button
                type="button"
                onClick={() => navigate(`/project/${lastProject.publicId}/edit`)}
                className="group relative glass rounded-xl px-3.5 py-3 text-left hover:border-zinc-600/50 transition-all flex items-center gap-3 w-full focus:ring-2 focus:ring-zinc-600/50 outline-none overflow-hidden contrast-more:border-zinc-600"
              >
                <ThemedShineBorder />
                <div className="size-7 shrink-0 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:scale-110 motion-reduce:group-hover:scale-100 transition-transform">
                  <Play className="size-3.5 text-zinc-400 ml-0.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{t('home.resumeLast')}</span>
                  <span className="text-xs font-semibold text-zinc-300 group-hover:text-zinc-100 truncate transition-colors">
                    {lastProject.title || t('library.untitled')}
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* Pro Tip — ambient, pushed to bottom on desktop */}
          <div className="mt-auto pt-4 border-t border-zinc-800/40 hidden lg:block">
            <div className="flex items-center gap-2 mb-2">
              <span className={`size-1.5 rounded-full bg-primary ${reducedMotion ? '' : 'animate-pulse'}`} />
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{t('home.proTip')}</span>
            </div>
            <p className="text-[11px] text-zinc-600 contrast-more:text-zinc-400 italic leading-relaxed">
              "{dt('home.tips')}"
            </p>
          </div>
        </div>

        {/* ── MAIN: project grid ── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 lg:pl-5 lg:overflow-hidden">

          {/* Header row */}
          <div className="flex items-center justify-between gap-3 shrink-0 animate-fade-in">
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{t('home.recentProjects')}</h2>
              {!loading && items.length > 0 && (
                <span className="text-[9px] font-bold text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded-full">{items.length}</span>
              )}
            </div>
            {items.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-600 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={dt('home.searchProjects')}
                  className="pl-9 pr-4 py-1.5 bg-zinc-950/60 border border-zinc-800/60 contrast-more:border-zinc-600 rounded-xl text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/30 transition-all w-44 xl:w-56"
                />
              </div>
            )}
          </div>

          {/* Grid body */}
          {loading ? (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="h-28 bg-zinc-800/30 rounded-2xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex-1 flex flex-col gap-5 py-2 overflow-y-auto">
              {/* Waveform + CTA */}
              <div className="flex flex-col items-center justify-center text-center gap-3 py-6 glass rounded-2xl">
                <div className="flex items-end gap-0.5 h-10 opacity-25">
                  {Array.from({ length: 20 }, (_, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-primary"
                      style={{
                        height: `${25 + 65 * Math.abs(Math.sin(i * 0.6))}%`,
                        animation: reducedMotion ? 'none' : `waveBar ${1 + (i % 4) * 0.2}s ease-in-out ${i * 0.04}s infinite`,
                      }}
                    />
                  ))}
                </div>
                <p className="text-sm text-zinc-500 contrast-more:text-zinc-300">{t('home.noProjects')}</p>
                <button
                  type="button"
                  onClick={() => navigate('/project/new')}
                  className="text-xs text-primary hover:text-primary/70 transition-colors font-medium"
                >
                  {t('home.createNew')} →
                </button>
              </div>

              {/* Discovery shortcuts */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-2 px-0.5">{t('home.discover')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/explore')}
                    className="group glass rounded-xl p-3.5 text-left hover:border-primary/40 transition-all flex items-center gap-3 focus:ring-1 focus:ring-primary/30 outline-none overflow-hidden"
                  >
                    <ThemedShineBorder />
                    <div className="size-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 motion-reduce:group-hover:scale-100 transition-transform">
                      <Compass className="size-4 text-primary" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-zinc-300 group-hover:text-zinc-100 transition-colors">{t('explore.nav')}</span>
                      <span className="text-[10px] text-zinc-600 leading-snug">{t('home.exploreSub')}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/leaderboard')}
                    className="group glass rounded-xl p-3.5 text-left hover:border-warning/30 transition-all flex items-center gap-3 focus:ring-1 focus:ring-warning/20 outline-none overflow-hidden"
                  >
                    <ThemedShineBorder />
                    <div className="size-8 shrink-0 rounded-lg bg-warning/10 flex items-center justify-center group-hover:scale-110 motion-reduce:group-hover:scale-100 transition-transform">
                      <Trophy className="size-4 text-warning" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-zinc-300 group-hover:text-zinc-100 transition-colors">{t('badges.leaderboard.title')}</span>
                      <span className="text-[10px] text-zinc-600 leading-snug">{t('home.leaderboardSub')}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/feed')}
                    className="group glass rounded-xl p-3.5 text-left hover:border-accent-blue/30 transition-all flex items-center gap-3 focus:ring-1 focus:ring-accent-blue/20 outline-none overflow-hidden"
                  >
                    <ThemedShineBorder />
                    <div className="size-8 shrink-0 rounded-lg bg-accent-blue/10 flex items-center justify-center group-hover:scale-110 motion-reduce:group-hover:scale-100 transition-transform">
                      <Rss className="size-4 text-accent-blue" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-zinc-300 group-hover:text-zinc-100 transition-colors">{t('feed.title')}</span>
                      <span className="text-[10px] text-zinc-600 leading-snug">{t('home.feedSub')}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-zinc-600 contrast-more:text-zinc-400">{t('home.noResultsFound')}</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 pb-2">
                {filteredProjects.map((project) => {
                  const hasCover = !!project.coverImage;
                  return (
                    <button
                      key={project.publicId}
                      type="button"
                      onClick={() => navigate(`/project/${project.publicId}/edit`)}
                      className="group relative glass rounded-2xl overflow-hidden text-left hover:border-primary/30 transition-all cursor-pointer focus:ring-1 focus:ring-primary/30 outline-none animate-fade-in contrast-more:border-zinc-600"
                    >
                      <ThemedShineBorder />
                      <div className={`relative ${hasCover ? 'h-20' : 'h-12 bg-gradient-to-br from-zinc-900 to-zinc-800/50 flex items-center justify-center'} overflow-hidden`}>
                        {hasCover ? (
                          <>
                            <img src={project.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 motion-reduce:group-hover:scale-100 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />
                          </>
                        ) : (
                          <Music2 className="size-4 text-zinc-600" />
                        )}
                        {/* Source indicator */}
                        <div className="absolute top-2 right-2">
                          {project.upload?.source === 'youtube'
                            ? <YoutubeIcon className="size-4 drop-shadow-md" />
                            : hasCover ? <Music2 className="size-3 text-primary/60" /> : null}
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-3 flex items-start gap-2.5">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-semibold text-zinc-200 truncate group-hover:text-primary transition-colors leading-snug">
                            {project.title || t('library.untitled')}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-zinc-500">{formatRelativeTime(project.createdAt, (i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2))}</span>
                            <span className="size-0.5 rounded-full bg-zinc-700 shrink-0" />
                            <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
                              <Activity className="size-2.5" />
                              {(project.syncedLineCount || 0)}/{(project.lineCount || 0)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="size-3.5 text-zinc-800 group-hover:text-primary group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0 transition-all mt-0.5 shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
