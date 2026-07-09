import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import type { ChangeEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

const NotFoundPage = lazy(() => import('@/app/NotFoundPage'));
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { FloatingCombobox } from '@ui/floating-combobox';
import { useAuthContext } from '@/features/auth/useAuthContext';
import {
  getPlaylist,
  savePlaylist,
  unsavePlaylist,
  updatePlaylist,
  deletePlaylist,
  removeProjectFromPlaylist,
} from './playlist.service';
import { PlaylistModal } from './PlaylistModal';
import { LoadingSpinner } from '@ui/LoadingSpinner';

interface PlaylistProject {
  id: string;
  publicId?: string;
  title?: string;
  starCount?: number;
  forkCount?: number;
  metadata?: { songName?: string; songArtist?: string };
}

interface Playlist {
  id?: string;
  name: string;
  description?: string;
  coverImage?: string;
  isPublic?: boolean;
  isSavedByMe?: boolean;
  savedCount?: number;
  projectCount?: number;
  sortMode?: string;
  tags?: string[];
  projects: PlaylistProject[];
  [key: string]: unknown;
}

function ProjectRow({ project, isOwner, playlistId, onRemoved, showDragHandle }: {
  project: PlaylistProject;
  isOwner: boolean;
  playlistId?: string;
  onRemoved: (id: string) => void;
  showDragHandle?: boolean;
}) {
  const { t } = useTranslation();
  const [removing, setRemoving] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  async function handleRemove() {
    if (!playlistId) return;
    setRemoving(true);
    try {
      await removeProjectFromPlaylist(playlistId, project.id);
      if (mountedRef.current) onRemoved(project.id);
    } catch { /* ignore */ }
    if (mountedRef.current) setRemoving(false);
  }

  return (
    <div className="glass rounded-xl p-4 flex items-center gap-4 group">
      {showDragHandle && (
        <Icon name="drag_indicator" size={16} className="text-muted-foreground shrink-0 cursor-grab" />
      )}
      <div className="flex-1 min-w-0">
        <Link
          to={`/project/${project.publicId}`}
          className="text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
        >
          {project.title || t('playlists.detail.untitled')}
        </Link>
        {(project.metadata?.songName || project.metadata?.songArtist) && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {[project.metadata.songName, project.metadata.songArtist].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Icon name="star" size={12} />{project.starCount ?? 0}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Icon name="call_split" size={12} />{project.forkCount ?? 0}
          </span>
        </div>
      </div>
      {isOwner && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          disabled={removing}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive text-xs"
        >
          {t('playlists.detail.removeProject')}
        </Button>
      )}
    </div>
  );
}

export default function PlaylistPage() {
  const { t } = useTranslation();
  // sortMode keys are dynamic.
  const tk = t as (key: string) => string;
  const { accountName, playlistId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hoveringUnsave, setHoveringUnsave] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = !!user && user.accountName === accountName;

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!playlistId) { setNotFound(true); setLoading(false); return; }
    setLoading(true);
    getPlaylist(playlistId)
      .then(data => {
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
  }, [playlistId]);

  const handleSave = useCallback(async () => {
    if (!user) {
      navigate(`/auth/signin?redirect=${encodeURIComponent(`/${accountName}/lists/${playlistId}`)}`);
      return;
    }
    setSaveLoading(true);
    try {
      await savePlaylist(playlistId!);
      setIsSaved(true);
      setPlaylist(prev => prev ? { ...prev, savedCount: (prev.savedCount ?? 0) + 1 } : prev);
    } catch {
      setIsSaved(false);
      setPlaylist(prev => prev ? { ...prev, savedCount: Math.max(0, (prev.savedCount ?? 0) - 1) } : prev);
    }
    setSaveLoading(false);
  }, [user, playlistId, accountName, navigate]);

  const handleUnsave = useCallback(async () => {
    setSaveLoading(true);
    try {
      await unsavePlaylist(playlistId!);
      setIsSaved(false);
      setHoveringUnsave(false);
      setPlaylist(prev => prev ? { ...prev, savedCount: Math.max(0, (prev.savedCount ?? 0) - 1) } : prev);
    } catch {
      setIsSaved(true);
      setPlaylist(prev => prev ? { ...prev, savedCount: (prev.savedCount ?? 0) + 1 } : prev);
    }
    setSaveLoading(false);
  }, [playlistId]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await deletePlaylist(playlistId!);
      navigate(`/${accountName}`, { replace: true });
    } catch {
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }, [playlistId, accountName, navigate]);

  const handleProjectRemoved = useCallback((publicId: string) => {
    setPlaylist(prev => prev ? {
      ...prev,
      projects: prev.projects.filter(p => p.id !== publicId),
      projectCount: Math.max(0, (prev.projectCount ?? 0) - 1),
    } : prev);
  }, []);

  const handleSortModeChange = async (value: string) => {
    if (!playlist?.id) return;
    try {
      await updatePlaylist(playlist.id, { sortMode: value } as Parameters<typeof updatePlaylist>[1]);
      setPlaylist(prev => prev ? { ...prev, sortMode: value } : prev);
    } catch { /* ignore */ }
  };

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
        <NotFoundPage type="playlist" identifier={playlistId} />
      </Suspense>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-4 pt-6 pb-12 sm:pb-16 animate-fade-in max-w-4xl mx-auto w-full">
      {/* Back */}
      <Link
        to={`/${accountName}`}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 w-fit"
      >
        <Icon name="arrow_back" size={16} />
        @{accountName}
      </Link>

      {/* Header */}
      <div className="glass rounded-[2rem] overflow-hidden mb-6">
        {/* Cover */}
        <div className="aspect-[3/1] w-full bg-gradient-to-br from-primary/30 to-accent-purple/30 flex items-center justify-center relative">
          {playlist.coverImage ? (
            <img src={playlist.coverImage} alt={playlist.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <Icon name="music_note" size={48} className="text-primary/40" />
          )}
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-semibold text-foreground">{playlist.name}</h1>
                {!playlist.isPublic && <Icon name="lock" size={16} className="text-muted-foreground" />}
              </div>
              {playlist.description && (
                <p className="text-sm text-muted-foreground mt-1 max-w-prose">{playlist.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {t('playlists.detail.projects', { count: playlist.projectCount })}
                {' · '}
                {t('playlists.detail.saved', { count: playlist.savedCount })}
              </p>
              {playlist.tags && playlist.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {playlist.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                {isOwner ? (
                  <FloatingCombobox
                    size="sm"
                    className="w-44"
                    label={t('playlists.modal.sortMode')}
                    value={playlist.sortMode ?? 'DATE_ADDED'}
                    onChange={handleSortModeChange}
                    options={['MANUAL', 'DATE_ADDED', 'STARS', 'ALPHABETICAL'].map(m => ({ value: m, label: tk(`playlists.sortMode.${m}`) }))}
                    strict
                  />
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground">{t('playlists.modal.sortMode')}:</span>
                    <span className="text-xs text-foreground">{tk(`playlists.sortMode.${playlist.sortMode}`)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 shrink-0">
              {isOwner ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setShowEdit(true)} className="flex items-center gap-1.5">
                    <Icon name="edit" size={16} />
                    {t('playlists.detail.edit')}
                  </Button>
                  {confirmDelete ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {t('playlists.detail.confirmDelete')}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(true)}
                      className="text-muted-foreground hover:text-destructive flex items-center gap-1.5"
                    >
                      <Icon name="delete" size={16} />
                      {t('playlists.detail.delete')}
                    </Button>
                  )}
                </>
              ) : (
                isSaved ? (
                  <Button
                    variant="outline"
                    size="sm"
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
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Projects */}
      {playlist.projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">{t('playlists.detail.noProjects')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {playlist.projects.map(project => (
            <ProjectRow
              key={project.id}
              project={project}
              isOwner={isOwner}
              playlistId={playlistId}
              onRemoved={handleProjectRemoved}
              showDragHandle={isOwner && playlist.sortMode === 'MANUAL'}
            />
          ))}
        </div>
      )}

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
