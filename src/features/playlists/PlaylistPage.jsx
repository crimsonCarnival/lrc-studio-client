import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Lock, Pencil, Trash2, Music, Star, GitFork, GripVertical } from 'lucide-react';
import { Button } from '@ui/button';
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

function ProjectRow({ project, isOwner, playlistId, onRemoved, showDragHandle }) {
  const { t } = useTranslation();
  const [removing, setRemoving] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  async function handleRemove() {
    setRemoving(true);
    try {
      await removeProjectFromPlaylist(playlistId, project.id);
      if (mountedRef.current) onRemoved(project.id);
    } catch {}
    if (mountedRef.current) setRemoving(false);
  }

  return (
    <div className="glass rounded-xl p-4 flex items-center gap-4 group">
      {showDragHandle && (
        <GripVertical className="size-4 text-muted-foreground shrink-0 cursor-grab" />
      )}
      <div className="flex-1 min-w-0">
        <Link
          to={`/project/${project.projectId}`}
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
            <Star className="size-3" />{project.starCount ?? 0}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <GitFork className="size-3" />{project.forkCount ?? 0}
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
  const { accountName, playlistId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hoveringUnsave, setHoveringUnsave] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = !!user && user.accountName === accountName;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPlaylist(playlistId)
      .then(data => {
        if (cancelled) return;
        if (!data) { setNotFound(true); return; }
        setPlaylist(data);
        setIsSaved(data.isSavedByMe);
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [playlistId]);

  const handleSave = useCallback(async () => {
    if (!user) {
      navigate(`/auth/signin?redirect=${encodeURIComponent(`/profile/${accountName}/playlists/${playlistId}`)}`);
      return;
    }
    setSaveLoading(true);
    try {
      await savePlaylist(playlistId);
      setIsSaved(true);
      setPlaylist(prev => prev ? { ...prev, savedCount: prev.savedCount + 1 } : prev);
    } catch {
      setIsSaved(false);
      setPlaylist(prev => prev ? { ...prev, savedCount: Math.max(0, prev.savedCount - 1) } : prev);
    }
    setSaveLoading(false);
  }, [user, playlistId, accountName, navigate]);

  const handleUnsave = useCallback(async () => {
    setSaveLoading(true);
    try {
      await unsavePlaylist(playlistId);
      setIsSaved(false);
      setHoveringUnsave(false);
      setPlaylist(prev => prev ? { ...prev, savedCount: Math.max(0, prev.savedCount - 1) } : prev);
    } catch {
      setIsSaved(true);
      setPlaylist(prev => prev ? { ...prev, savedCount: prev.savedCount + 1 } : prev);
    }
    setSaveLoading(false);
  }, [playlistId]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await deletePlaylist(playlistId);
      navigate(`/profile/${accountName}`, { replace: true });
    } catch {
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }, [playlistId, accountName, navigate]);

  const handleProjectRemoved = useCallback((projectId) => {
    setPlaylist(prev => prev ? {
      ...prev,
      projects: prev.projects.filter(p => p.id !== projectId),
      projectCount: Math.max(0, prev.projectCount - 1),
    } : prev);
  }, []);

  const handleSortModeChange = useCallback(async (e) => {
    if (!playlist?.id) return;
    const value = e.target.value;
    try {
      await updatePlaylist(playlist.id, { sortMode: value });
      setPlaylist(prev => prev ? { ...prev, sortMode: value } : prev);
    } catch {}
  }, [playlist?.id]);

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
    <div className="flex-1 flex flex-col px-4 pt-6 pb-12 sm:pb-16 animate-fade-in max-w-4xl mx-auto w-full">
      {/* Back */}
      <Link
        to={`/profile/${accountName}`}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 w-fit"
      >
        <ArrowLeft className="size-4" />
        @{accountName}
      </Link>

      {/* Header */}
      <div className="glass rounded-[2rem] overflow-hidden mb-6">
        {/* Cover */}
        <div className="aspect-[3/1] w-full bg-gradient-to-br from-primary/30 to-accent-purple/30 flex items-center justify-center relative">
          {playlist.coverImage ? (
            <img src={playlist.coverImage} alt={playlist.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <Music className="size-12 text-primary/40" />
          )}
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-semibold text-foreground">{playlist.name}</h1>
                {!playlist.isPublic && <Lock className="size-4 text-muted-foreground" />}
              </div>
              {playlist.description && (
                <p className="text-sm text-muted-foreground mt-1 max-w-prose">{playlist.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {t('playlists.detail.projects', { count: playlist.projectCount })}
                {' · '}
                {t('playlists.detail.saved', { count: playlist.savedCount })}
              </p>
              {playlist.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {playlist.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">{t('playlists.modal.sortMode')}:</span>
                {isOwner ? (
                  <select
                    value={playlist.sortMode}
                    onChange={handleSortModeChange}
                    className="text-xs bg-transparent border border-border rounded px-1.5 py-0.5 text-foreground"
                  >
                    <option value="MANUAL">{t('playlists.sortMode.MANUAL')}</option>
                    <option value="DATE_ADDED">{t('playlists.sortMode.DATE_ADDED')}</option>
                    <option value="STARS">{t('playlists.sortMode.STARS')}</option>
                    <option value="ALPHABETICAL">{t('playlists.sortMode.ALPHABETICAL')}</option>
                  </select>
                ) : (
                  <span className="text-xs text-foreground">{t(`playlists.sortMode.${playlist.sortMode}`)}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 shrink-0">
              {isOwner ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setShowEdit(true)} className="flex items-center gap-1.5">
                    <Pencil className="size-4" />
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
                      <Trash2 className="size-4" />
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
          onSave={updated => { setPlaylist(updated); setShowEdit(false); }}
        />
      )}
    </div>
  );
}
