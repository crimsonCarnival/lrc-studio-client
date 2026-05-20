import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useDynamicTranslation from '@/shared/hooks/useDynamicTranslation';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { projects } from '@/app/api';
import { Music2, Video, Plus, Search, Play, FileText, ChevronRight, Activity, Lightbulb, Library as LibraryIcon } from 'lucide-react';
import SpotifyIcon from '@features/player/components/SpotifyIcon';
import ProjectSetupModal from '@features/editor/components/setup/ProjectSetupModal';
import { useSpotifyAuth } from '@/features/player/hooks/useSpotifyAuth';
import { ThemedShineBorder } from '@ui/themed-shine-border';

function formatRelativeTime(dateStr, t, locale = 'en') {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('library.justNow') || 'Just now';
  if (mins < 60) return t('library.minutesAgo', { count: mins }) || `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('library.hoursAgo', { count: hours }) || `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return t('library.daysAgo', { count: days }) || `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(locale);
}

export default function Home() {
  const { t, dt, i18n } = useDynamicTranslation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { login: handleSpotifyLogin } = useSpotifyAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProject, setEditingProject] = useState(null);

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const list = await projects.list() || [];
      setItems(list || []);
    } catch (err) {
      console.error('Failed to fetch projects', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = items.filter(p => {
    const titleMatch = (p.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const tagsMatch = p.metadata?.tags?.some(tag => (tag || '').toLowerCase().includes(searchQuery.toLowerCase())) || false;
    return titleMatch || tagsMatch;
  });

  const lastProject = items.length > 0 ? items[0] : null;
  const username = user?.username || 'Creator';

  const renderActionCards = () => (
    <div className="flex flex-row gap-4 w-full max-w-2xl animate-fade-in">
      <div className="flex flex-col gap-4 flex-1 isolate">
        <button
          type="button"
          onClick={() => navigate('/project/new')}
          className="group cursor-pointer glass rounded-2xl p-5 text-left hover:border-primary/50 transition-all shadow-elevated flex items-center gap-5 w-full focus:ring-2 focus:ring-primary/50 outline-none relative overflow-hidden"
        >
          <ThemedShineBorder />
          <div className="size-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="size-6 text-primary" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-base sm:text-lg font-semibold text-zinc-100 mb-0.5">{t('home.createNew')}</h3>
            <p className="text-sm sm:text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">{t('home.createNewDesc')}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/library')}
          className="group cursor-pointer glass rounded-2xl p-5 text-left hover:border-accent-purple/40 transition-all shadow-elevated flex items-center gap-5 w-full focus:ring-2 focus:ring-accent-purple/50 outline-none relative overflow-hidden"
        >
          <ThemedShineBorder />
          <div className="size-12 shrink-0 rounded-xl bg-accent-purple/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <LibraryIcon className="size-6 text-accent-purple" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-zinc-100 mb-0.5">{t('home.viewLibrary')}</h3>
            <p className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">{t('home.viewLibraryDesc')}</p>
          </div>
        </button>
      </div>

      {!user?.spotify?.spotifyId && (
        <button
          type="button"
          onClick={handleSpotifyLogin}
          className="group cursor-pointer glass rounded-2xl p-5 text-center hover:border-green-500/40 transition-all shadow-elevated w-48 flex flex-col items-center justify-center gap-3 shrink-0 isolate focus:ring-2 focus:ring-green-500/50 outline-none relative overflow-hidden"
        >
          <ThemedShineBorder />
          <div className="size-16 rounded-2xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
            <SpotifyIcon className="size-10 text-green-500" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-base font-semibold text-zinc-100 mb-1">{t('home.connectSpotify')}</h3>
            <p className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors leading-relaxed">{t('home.connectSpotifyDesc')}</p>
          </div>
        </button>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Background aesthetics */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
        <div className="absolute -top-40 -right-40 size-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 -left-20 size-80 bg-accent-purple/5 rounded-full blur-3xl" />
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 flex flex-col h-full overflow-hidden p-6 sm:px-10 lg:px-16">

        <div className="max-w-7xl mx-auto size-full flex flex-col lg:flex-row gap-10">

          {/* LEFT COLUMN: Welcome & Actions */}
          <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left gap-8 overflow-y-auto scrollbar-none pb-10 px-4 -mx-4">
            <div className="flex flex-col items-center lg:items-start animate-fade-in shrink-0 w-full">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-zinc-100 tracking-tight mb-3">
                {dt('home.welcome', { name: username, context: user?.id })}
              </h1>
              <p className="text-zinc-400 text-sm sm:text-base lg:text-lg max-w-xl leading-relaxed mb-8">
                {dt('home.welcomeSub')}
              </p>
              <div className="flex flex-col items-center lg:items-start w-full">
                {renderActionCards()}
              </div>
            </div>

            {/* Featured / Resume Section (Main Area) */}
            {!loading && lastProject && (
              <section className="w-full max-w-md flex flex-col gap-4 animate-fade-in mt-4">
                <h2 className="text-xs sm:text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">{t('home.resumeLast')}</h2>
                <button
                  type="button"
                  onClick={() => navigate(`/project/${lastProject.projectId}`)}
                  className="group relative glass rounded-2xl p-1 overflow-hidden cursor-pointer shadow-elevated border-primary/20 hover:border-primary/50 transition-all w-full text-left focus:ring-2 focus:ring-primary/50 outline-none"
                >
                  <ThemedShineBorder />
                  <div className="relative flex items-center gap-4 p-3 bg-zinc-950/40 rounded-xl">
                    <div className="size-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden relative">
                      <Music2 className="size-6 text-primary/50" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="size-4 text-zinc-950 ml-0.5" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-sm font-semibold text-zinc-100 truncate group-hover:text-primary transition-colors">
                        {lastProject.title || t('library.untitled') || 'Untitled'}
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{formatRelativeTime(lastProject.updatedAt, t, i18n.resolvedLanguage || i18n.language)}</p>
                    </div>
                    <ChevronRight className="size-4 text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </div>
                </button>
              </section>
            )}

            {/* Footer Tips (Main Area) */}
            <div className="mt-auto w-full max-w-md pt-10 pb-4 border-t border-zinc-800/50 hidden lg:block">
              <div className="flex items-center gap-2 mb-2 text-zinc-500">
                <Lightbulb className="size-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{t('home.proTip')}</span>
              </div>
              <p className="text-xs text-zinc-400 italic leading-relaxed">
                "{dt('home.tips')}"
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: Project Sidebar */}
          <div className="w-full lg:w-[360px] flex flex-col gap-6 glass border border-white/10 shadow-elevated rounded-2xl p-6 h-[400px] lg:h-full animate-slide-in-right relative overflow-hidden">
            <ThemedShineBorder />
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-xs sm:text-sm font-semibold text-zinc-100 uppercase tracking-widest">{t('home.recentProjects')}</h2>
              {!loading && items.length > 0 && (
                <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded-full">{items.length}</span>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col gap-3 animate-pulse">
                {[1, 2, 3, 4].map(i => (

                  <div key={i} className="h-16 bg-zinc-800/50 rounded-2xl w-full" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <div className="size-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4 text-zinc-600">
                  <FileText className="size-6" />
                </div>
                <p className="text-sm text-zinc-500">{t('home.noProjects') || 'No projects yet'}</p>
              </div>
            ) : (
              <>
                {/* Sidebar Search */}
                <div className="relative shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={dt('home.searchProjects')}
                    className="w-full pl-9 pr-4 py-2 sm:py-2 bg-zinc-950/50 border border-zinc-800/60 rounded-xl text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/30 transition-all"
                  />
                </div>

                {/* Sidebar List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 flex flex-col gap-2.5 min-h-0">

                  {filteredProjects.length === 0 ? (
                    <p className="text-xs text-zinc-600 text-center py-10">{t('home.noResultsFound') || 'No results found'}</p>
                  ) : (
                    filteredProjects.map((project) => (
                      <button
                        key={project.projectId}
                        type="button"
                        onClick={() => navigate(`/project/${project.projectId}`)}
                        className="group flex items-center gap-3 p-3 rounded-2xl border border-transparent hover:border-zinc-700/50 hover:bg-zinc-800/40 cursor-pointer transition-all animate-fade-in w-full text-left focus:ring-1 focus:ring-primary/30 outline-none"
                      >
                        <div className="size-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden relative group-hover:border-primary/30 transition-colors">
                          {project.upload?.source === 'youtube' ? (
                            <Video className="size-4 text-red-500/60" />
                          ) : (
                            <Music2 className="size-4 text-primary/60" />
                          )}
                          <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-xs font-semibold text-zinc-200 truncate group-hover:text-primary transition-colors">
                            {project.title || t('library.untitled')}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-zinc-500">{formatRelativeTime(project.updatedAt, t, i18n.resolvedLanguage || i18n.language)}</span>
                            <span className="size-0.5 rounded-full bg-zinc-700" />
                            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                              <Activity className="size-2.5" />
                              {(project.syncedLineCount || 0)}/{(project.lineCount || 0)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="size-3.5 text-zinc-600 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      </div>

      <ProjectSetupModal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        onConfirm={async (data) => {
          try {
            const { title, description, tags, songName, songArtist, songAlbum, songYear } = data;
            const updatedMetadata = { 
              ...editingProject.metadata, 
              description, 
              tags,
              songName,
              songArtist,
              songAlbum,
              songYear
            };
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
        initialSongName={editingProject?.metadata?.songName || ''}
        initialSongArtist={editingProject?.metadata?.songArtist || ''}
        initialSongAlbum={editingProject?.metadata?.songAlbum || ''}
        initialSongYear={editingProject?.metadata?.songYear || ''}
        isEditing={true}
      />
    </div>
  );
}