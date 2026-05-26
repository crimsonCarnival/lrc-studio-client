import { useState, useEffect, useCallback } from 'react';
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
  const username = user?.displayName || user?.accountName || 'Creator';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Background aesthetics */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
        <div className="absolute -top-40 -right-40 size-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 -left-20 size-80 bg-accent-purple/5 rounded-full blur-3xl" />
      </div>

      {/* Layout: sidebar + main — desktop fills viewport, mobile scrolls */}
      <div className="relative flex-1 flex flex-col lg:flex-row gap-0 overflow-y-auto lg:overflow-hidden p-4 sm:p-6 lg:p-8 min-h-0">

        {/* ── LEFT SIDEBAR: greeting + actions + tip ── */}
        <div className="lg:w-56 xl:w-64 flex flex-col gap-5 shrink-0 lg:pr-6 lg:border-r lg:border-zinc-800/50 pb-6 lg:pb-0">

          {/* Greeting */}
          <div className="animate-fade-in">
            <h1 className="text-xl xl:text-2xl font-semibold text-zinc-100 tracking-tight leading-snug mb-1.5">
              {dt('home.welcome', { name: username, context: user?.id })}
            </h1>
            <p className="text-zinc-500 text-xs xl:text-sm leading-relaxed">
              {dt('home.welcomeSub')}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 animate-fade-in">
            <button
              type="button"
              onClick={() => navigate('/project/new')}
              className="group relative glass rounded-xl px-4 py-3 text-left hover:border-primary/50 transition-all flex items-center gap-3 w-full focus:ring-2 focus:ring-primary/50 outline-none overflow-hidden"
            >
              <ThemedShineBorder />
              <div className="size-7 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="size-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-zinc-200 group-hover:text-zinc-100 transition-colors">{t('home.createNew')}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/library')}
              className="group relative glass rounded-xl px-4 py-3 text-left hover:border-accent-purple/40 transition-all flex items-center gap-3 w-full focus:ring-2 focus:ring-accent-purple/50 outline-none overflow-hidden"
            >
              <ThemedShineBorder />
              <div className="size-7 shrink-0 rounded-lg bg-accent-purple/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <LibraryIcon className="size-4 text-accent-purple" />
              </div>
              <span className="text-sm font-semibold text-zinc-200 group-hover:text-zinc-100 transition-colors">{t('home.viewLibrary')}</span>
            </button>

            {!user?.spotify?.spotifyId && (
              <button
                type="button"
                onClick={handleSpotifyLogin}
                className="group relative glass rounded-xl px-4 py-3 text-left hover:border-green-500/40 transition-all flex items-center gap-3 w-full focus:ring-2 focus:ring-green-500/50 outline-none overflow-hidden"
              >
                <ThemedShineBorder />
                <div className="size-7 shrink-0 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <SpotifyIcon className="size-4 text-green-500" />
                </div>
                <span className="text-sm font-semibold text-zinc-200 group-hover:text-zinc-100 transition-colors">{t('home.connectSpotify')}</span>
              </button>
            )}

            {!loading && lastProject && (
              <button
                type="button"
                onClick={() => navigate(`/project/${lastProject.projectId}`)}
                className="group relative glass rounded-xl px-4 py-3 text-left hover:border-primary/30 transition-all flex items-center gap-3 w-full focus:ring-2 focus:ring-primary/30 outline-none overflow-hidden"
              >
                <ThemedShineBorder />
                <div className="size-7 shrink-0 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="size-3.5 text-zinc-400 ml-0.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">{t('home.resumeLast')}</span>
                  <span className="text-xs font-semibold text-zinc-300 group-hover:text-zinc-100 truncate transition-colors">
                    {lastProject.title || t('library.untitled')}
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* Tip — pushed to bottom on desktop */}
          <div className="mt-auto pt-4 border-t border-zinc-800/50 hidden lg:block">
            <div className="flex items-center gap-1.5 mb-1.5 text-zinc-600">
              <Lightbulb className="size-3" />
              <span className="text-[9px] font-bold uppercase tracking-wider">{t('home.proTip')}</span>
            </div>
            <p className="text-[11px] text-zinc-500 italic leading-relaxed">
              "{dt('home.tips')}"
            </p>
          </div>
        </div>

        {/* ── MAIN AREA: project grid ── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 lg:pl-6 lg:overflow-hidden">

          {/* Header row */}
          <div className="flex items-center justify-between gap-3 shrink-0 animate-fade-in">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{t('home.recentProjects')}</h2>
              {!loading && items.length > 0 && (
                <span className="text-[10px] font-bold text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded-full">{items.length}</span>
              )}
            </div>
            {items.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={dt('home.searchProjects')}
                  className="pl-9 pr-4 py-2 bg-zinc-950/50 border border-zinc-800/60 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/30 transition-all w-48 xl:w-64"
                />
              </div>
            )}
          </div>

          {/* Grid body */}
          {loading ? (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="h-24 bg-zinc-800/40 rounded-2xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
              <div className="size-14 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-600">
                <FileText className="size-6" />
              </div>
              <p className="text-sm text-zinc-500">{t('home.noProjects') || 'No projects yet'}</p>
              <button
                type="button"
                onClick={() => navigate('/project/new')}
                className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
              >
                {t('home.createNew')} →
              </button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-zinc-600">{t('home.noResultsFound') || 'No results found'}</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pb-2">
                {filteredProjects.map((project) => (
                  <button
                    key={project.projectId}
                    type="button"
                    onClick={() => navigate(`/project/${project.projectId}`)}
                    className="group relative glass rounded-2xl p-4 text-left hover:border-primary/40 transition-all cursor-pointer focus:ring-1 focus:ring-primary/30 outline-none overflow-hidden animate-fade-in"
                  >
                    <ThemedShineBorder />
                    <div className="flex items-start gap-3">
                      <div className="size-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:border-primary/30 transition-colors relative overflow-hidden">
                        {project.upload?.source === 'youtube' ? (
                          <Video className="size-4 text-red-500/60" />
                        ) : (
                          <Music2 className="size-4 text-primary/60" />
                        )}
                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-zinc-200 truncate group-hover:text-primary transition-colors leading-snug">
                          {project.title || t('library.untitled')}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-zinc-600">{formatRelativeTime(project.updatedAt, t, i18n.resolvedLanguage || i18n.language)}</span>
                          <span className="size-0.5 rounded-full bg-zinc-700 shrink-0" />
                          <span className="text-[10px] text-zinc-600 flex items-center gap-0.5">
                            <Activity className="size-2.5" />
                            {(project.syncedLineCount || 0)}/{(project.lineCount || 0)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="size-3.5 text-zinc-700 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      <ProjectSetupModal
        key={editingProject?.projectId || 'none'}
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        onConfirm={async (data) => {
          try {
            const { name: title, description, tags, songName, songArtist, songAlbum, songYear, coverImage, albumArt } = data;
            const updatedMetadata = {
              ...editingProject.metadata,
              description,
              tags,
              songName,
              songArtist,
              songAlbum,
              songYear,
              albumArt
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
        initialCoverImage={editingProject?.coverImage || ''}
        initialAlbumArt={editingProject?.metadata?.albumArt || ''}
        isEditing={true}
      />
    </div>
  );
}