import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

const NotFoundPage = lazy(() => import('@/app/NotFoundPage'));
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { resolveCoverImage } from '@/shared/utils/cover-image';
import { useAuthContext } from '@/features/auth/useAuthContext';
import {
  getPlaylist,
  savePlaylist,
  unsavePlaylist,
} from './playlist.service';
import { PlaylistModal } from './PlaylistModal';
import { LoadingSpinner } from '@ui/LoadingSpinner';

interface PlaylistProject {
  id: string;
  publicId: string;
  title?: string;
  starCount?: number;
  metadata?: { songArtist?: string; songName?: string };
  [key: string]: unknown;
}

interface Playlist {
  name: string;
  description?: string;
  coverImage?: string;
  isPublic?: boolean;
  isSavedByMe?: boolean;
  savedCount?: number;
  projectCount?: number;
  tags?: string[];
  owner?: { avatarUrl?: string; displayName?: string; accountName?: string };
  projects?: PlaylistProject[];
  [key: string]: unknown;
}

export default function ListPage() {
  const { accountName, listId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthContext();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [hoveringUnsave, setHoveringUnsave] = useState(false);

  const isOwner = !!user && user.accountName === accountName;

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!listId) { setNotFound(true); setLoading(false); return; }
    setLoading(true);
    getPlaylist(listId)
      .then((data) => {
        const pl = data as Playlist | null;
        if (cancelled) return;
        if (!pl) { setNotFound(true); return; }
        setPlaylist(pl);
        setIsSaved(pl.isSavedByMe ?? false);
      })
      .catch((err: { graphqlErrors?: Array<{ message?: string }> }) => {
        if (cancelled) return;
        if (err.graphqlErrors?.[0]?.message === 'forbidden') setForbidden(true);
        else setNotFound(true);
      })
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
      await savePlaylist(listId!);
      setIsSaved(true);
      setPlaylist(prev => prev ? { ...prev, savedCount: (prev.savedCount ?? 0) + 1 } : prev);
    } catch {
      setIsSaved(false);
      setPlaylist(prev => prev ? { ...prev, savedCount: Math.max(0, (prev.savedCount ?? 0) - 1) } : prev);
    } finally {
      setSaveLoading(false);
    }
  }, [user, listId, accountName, navigate]);

  const handleUnsave = useCallback(async () => {
    setSaveLoading(true);
    try {
      await unsavePlaylist(listId!);
      setIsSaved(false);
      setHoveringUnsave(false);
      setPlaylist(prev => prev ? { ...prev, savedCount: Math.max(0, (prev.savedCount ?? 0) - 1) } : prev);
    } catch {
      setIsSaved(true);
      setPlaylist(prev => prev ? { ...prev, savedCount: (prev.savedCount ?? 0) + 1 } : prev);
    } finally {
      setSaveLoading(false);
    }
  }, [listId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <Suspense fallback={null}>
        <NotFoundPage type="forbidden" />
      </Suspense>
    );
  }

  if (notFound || !playlist) {
    return (
      <Suspense fallback={null}>
        <NotFoundPage type="playlist" identifier={listId} />
      </Suspense>
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
              <Icon name="music_note" size={48} className="text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0 pb-2">
            <div className="flex items-center gap-2 mb-1">
              {!playlist.isPublic && <Icon name="lock" size={16} className="text-muted-foreground" />}
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
                <img src={playlist.owner.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-5 rounded-full object-cover" />
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
              {playlist.projects && playlist.projects.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/project/${playlist.projects![0].publicId}?list=${listId}`)}
                  className="gap-1.5 rounded-full"
                >
                  <Icon name="play_arrow" size={16} filled />
                  {t('playlists.detail.playAll')}
                </Button>
              )}
              {isOwner ? (
                <Button size="sm" variant="outline" onClick={() => setShowEdit(true)} className="gap-1.5">
                  <Icon name="edit" size={16} />
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
            {playlist.projects.map((project, index) => {
              const thumb = resolveCoverImage(project);
              return (
              <Link
                key={project.id}
                to={`/project/${project.publicId}?list=${listId}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-accent/40 transition-colors group"
              >
                <span className="w-6 text-center text-sm text-muted-foreground group-hover:hidden">
                  {index + 1}
                </span>
                <span className="w-6 text-center text-sm hidden group-hover:block">▶</span>

                <div className="w-16 h-10 rounded-md overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <Icon name="music_note" size={16} className="text-muted-foreground" />
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
                  <Icon name="star" size={12} />
                  {project.starCount ?? 0}
                </span>
              </Link>
              ); })}
          </div>
        )}
      </div>

      {showEdit && (
        <PlaylistModal
          playlist={playlist}
          onClose={() => setShowEdit(false)}
          onSave={(updated: Playlist) => { setPlaylist(updated); setShowEdit(false); }}
        />
      )}
    </div>
  );
}
