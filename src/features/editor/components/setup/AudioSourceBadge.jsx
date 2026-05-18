import { Video, FolderOpen, Cloud } from 'lucide-react';
import SpotifyIcon from '@features/player/components/SpotifyIcon';
import { useTranslation } from 'react-i18next';

export default function AudioSourceBadge({ source }) {
  const { t } = useTranslation();
  
  if (!source) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${
      source === 'spotify' ? 'bg-green-500/15 text-green-400'
      : source === 'youtube' ? 'bg-red-500/15 text-red-400'
      : 'bg-zinc-700/50 text-zinc-300'
    }`}>
      {source === 'spotify' && <SpotifyIcon className="size-3" />}
      {source === 'youtube' && <Video className="size-3" />}
      {source === 'local' && <FolderOpen className="size-3" />}
      {source === 'cloud' && <Cloud className="size-3" />}
      {source === 'spotify' ? 'Spotify' : source === 'youtube' ? 'YouTube' : source === 'local' ? t('setup.local') : t('setup.cloud')}
    </span>
  );
}
