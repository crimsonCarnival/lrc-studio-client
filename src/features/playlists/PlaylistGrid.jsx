import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@ui/button';
import { PlaylistCard } from './PlaylistCard';
import { PlaylistModal } from './PlaylistModal';
import { getPlaylists } from './playlist.service';

export function PlaylistGrid({ accountName, isOwner }) {
  const { t } = useTranslation();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPlaylists(accountName)
      .then(data => { if (!cancelled) setPlaylists(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accountName]);

  function handleCreated(playlist) {
    setPlaylists(prev => [playlist, ...prev]);
    setShowModal(false);
  }

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
            <PlaylistCard key={playlist.id} playlist={playlist} accountName={accountName} />
          ))}
        </div>
      )}

      {showModal && (
        <PlaylistModal
          onClose={() => setShowModal(false)}
          onSave={handleCreated}
        />
      )}
    </>
  );
}
