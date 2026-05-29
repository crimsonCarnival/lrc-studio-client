import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Music, Star, Pencil, Lock, Play } from 'lucide-react';
import { Button } from '@ui/button';
import { resolveUploadCover } from '@/shared/utils/cover-image';
import { useAuthContext } from '@/features/auth/useAuthContext';
import {
  getPlaylist,
  savePlaylist,
  unsavePlaylist,
} from './playlist.service';
import { PlaylistModal } from './PlaylistModal';

export default function ListPage() {
  const { accountName, listId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthContext();

  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [hoveringUnsave, setHoveringUnsave] = useState(false);

  const isOwner = !!user && user.accountName === accountName;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPlaylist(listId)
      .then(data => {
        if (cancelled) return;
        if (!data) { setNotFound(true); return; }
        setPlaylist(data);
        setIsSaved(data.isSavedByMe ?? false);
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [listId]);

  const handleSave = useCallback(async () => {
    if (!user) {
      navigate(`/auth/signin?redirect=${encodeURIComponent(`/${accountName}/lists/${listId}`)}`);
      return;
    }
    setSaveLoading(true);
    try {
      await savePlaylist(listId);
      setIsSaved(true);
      setPlaylist(prev => prev ? { ...prev, savedCount: prev.savedCount + 1 } : prev);
    } catch {
      setIsSaved(false);
      setPlaylist(prev => prev ? { ...prev, savedCount: Math.max(0, prev.savedCount - 1) } : prev);
    } finally {
      setSaveLoading(false);
    }
  }, [user, listId, accountName, navigate]);

  const handleUnsave = useCallback(async () => {
    setSaveLoading(true);
    try {
      await unsavePlaylist(listId);
      setIsSaved(false);
      setHoveringUnsave(false);
      setPlaylist(prev => prev ? { ...prev, savedCount: Math.max(0, prev.savedCount - 1) } : prev);
    } catch {
      setIsSaved(true);
      setPlaylist(prev => prev ? { ...prev, savedCount: prev.savedCount + 1 } : prev);
    } finally {
      setSaveLoading(false);
    }
  }, [listId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound || !playlist) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-4">
        <p className="text-lg font-semibold text-foreground">{t('playlists.detail.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero band */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          {playlist.coverImage ? (
            <img src={playlist.coverImage} alt="" className="w-full h-full object-cover blur-xl scale-110 opacity-40" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10" />
          )}
          <div className="absolute inset-0 bg-background/70" />
        </div>

        <div className="relative z-10 max-w-screen-xl mx-auto px-6 py-10 flex gap-8 items-end">
          <div className="size-32 lg:size-48 rounded-2xl overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center shadow-2xl">
            {playlist.coverImage ? (
              <img src={playlist.coverImage} alt={playlist.name} className="w-full h-full object-cover" />
            ) : (
              <Music className="size-12 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0 pb-2">
            <div className="flex items-center gap-2 mb-1">
              {!playlist.isPublic && <Lock className="size-4 text-muted-foreground" />}
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                {t('playlists.tab')}
              </span>
            </div>

            <h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-3 leading-tight">
              {playlist.name}
            </h1>

            {playlist.description && (
              <p className="text-sm text-muted-foreground max-w-2xl mb-3">{playlist.description}</p>
            )}

            <Link
              to={`/${accountName}`}
              className="flex items-center gap-2 w-fit hover:opacity-80 transition-opacity mb-3"
            >
              {playlist.owner?.avatarUrl ? (
                <img src={playlist.owner.avatarUrl} alt="" className="size-5 rounded-full object-cover" />
              ) : (
                <div className="size-5 rounded-full bg-muted" />
              )}
              <span className="text-sm font-medium text-foreground">
                {playlist.owner?.displayName || `@${playlist.owner?.accountName}`}
              </span>
            </Link>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
              <span>{t('playlists.detail.projects', { count: playlist.projectCount ?? playlist.projects?.length ?? 0 })}</span>
              {playlist.savedCount != null && (
                <>
                  <span>·</span>
                  <span>{t('playlists.detail.saved', { count: playlist.savedCount })}</span>
                </>
              )}
              {playlist.tags?.map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{tag}</span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {playlist.projects?.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/project/${playlist.projects[0].projectId}?list=${listId}`)}
                  className="gap-1.5 rounded-full"
                >
                  <Play className="size-4" fill="currentColor" />
                  {t('playlists.detail.playAll')}
                </Button>
              )}
              {isOwner ? (
                <Button size="sm" variant="outline" onClick={() => setShowEdit(true)} className="gap-1.5">
                  <Pencil className="size-4" />
                  {t('playlists.detail.edit')}
                </Button>
              ) : isSaved ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUnsave}
                  disabled={saveLoading}
                  onMouseEnter={() => setHoveringUnsave(true)}
                  onMouseLeave={() => setHoveringUnsave(false)}
                >
                  {hoveringUnsave ? t('playlists.remove') : t('playlists.saved')}
                </Button>
              ) : (
                <Button size="sm" onClick={handleSave} disabled={saveLoading}>
                  {t('playlists.save')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Track list */}
      <div className="max-w-screen-xl mx-auto w-full px-6 py-6">
        {!playlist.projects?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">{t('playlists.detail.noProjects')}</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-2xl overflow-hidden border border-border">
            {playlist.projects.map((project, index) => (
              <Link
                key={project.id}
                to={`/project/${project.projectId}?list=${listId}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-accent/40 transition-colors group"
              >
                <span className="w-6 text-center text-sm text-muted-foreground group-hover:hidden">
                  {index + 1}
                </span>
                <span className="w-6 text-center text-sm hidden group-hover:block">▶</span>

                <div className="w-16 h-10 rounded-md overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                  {resolveUploadCover(project.upload) ? (
                    <img src={resolveUploadCover(project.upload)} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <Music className="size-4 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {project.title || t('playlists.detail.untitled')}
                  </p>
                  {(project.metadata?.songArtist || project.metadata?.songName) && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {[project.metadata.songArtist, project.metadata.songName].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>

                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Star className="size-3" />
                  {project.starCount ?? 0}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showEdit && (
        <PlaylistModal
          playlist={playlist}
          onClose={() => setShowEdit(false)}
          onSave={updated => { setPlaylist(updated); setShowEdit(false); }}
        />
      )}
    </div>
  );
}
