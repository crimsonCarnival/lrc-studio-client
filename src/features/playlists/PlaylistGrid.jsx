import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@ui/button';
import { PlaylistCard } from './PlaylistCard';
import { PlaylistModal } from './PlaylistModal';
import { getPlaylists, deletePlaylist } from './playlist.service';
import useConfirm from '@/shared/hooks/useConfirm';
import toast from 'react-hot-toast';

export function PlaylistGrid({ accountName, isOwner }) {
  const { t } = useTranslation();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [requestConfirm, confirmModal] = useConfirm();

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getPlaylists(accountName)
      .then(data => { if (!cancelled) setPlaylists(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accountName]);

  function handleSaved(playlist) {
    setPlaylists(prev => {
      const exists = prev.find(p => p.id === playlist.id);
      if (exists) {
        return prev.map(p => p.id === playlist.id ? playlist : p);
      }
      return [playlist, ...prev];
    });
    setShowModal(false);
    setEditingPlaylist(null);
  }

  const handleDelete = (playlist) => {
    requestConfirm(
      t('playlists.deleteConfirm', { name: playlist.name, defaultValue: `Delete "${playlist.name}"?` }),
      async () => {
        try {
          await deletePlaylist(playlist.id);
          setPlaylists(prev => prev.filter(p => p.id !== playlist.id));
          toast.success(t('playlists.deleteSuccess', 'Playlist deleted'));
        } catch {
          toast.error(t('playlists.deleteError', 'Failed to delete playlist'));
        }
      },
      { title: t('playlists.deleteTitle', 'Delete Playlist'), variant: 'danger' }
    );
  };

  const handleEdit = (playlist) => {
    setEditingPlaylist(playlist);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass rounded-2xl aspect-[4/3] animate-pulse bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <>
      {isOwner && (
        <div className="flex justify-end mb-4">
          <Button size="sm" onClick={() => setShowModal(true)} className="flex items-center gap-1.5">
            <Plus className="size-4" />
            {t('playlists.new')}
          </Button>
        </div>
      )}

      {playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">{t('playlists.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map(playlist => (
            <PlaylistCard 
              key={playlist.id} 
              playlist={playlist} 
              accountName={accountName}
              isOwner={isOwner}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {(showModal || editingPlaylist) && (
        <PlaylistModal
          playlist={editingPlaylist}
          onClose={() => {
            setShowModal(false);
            setEditingPlaylist(null);
          }}
          onSave={handleSaved}
        />
      )}
      {confirmModal}
    </>
  );
}
