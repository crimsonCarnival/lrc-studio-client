import { Icon } from '@/shared/ui/Icon';
import { useTranslation } from 'react-i18next';

export default function AudioSourceBadge({ source }: { source?: string | null }) {
  const { t } = useTranslation();

  if (!source) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${source === 'youtube' ? 'bg-red-500/15 text-red-400'
        : 'bg-zinc-700/50 text-zinc-300'
      }`}>
      {source === 'youtube' && <svg preserveAspectRatio="xMidYMid" viewBox="0 0 256 180"><path fill="red" d="M250.346 28.075A32.18 32.18 0 0 0 227.69 5.418C207.824 0 127.87 0 127.87 0S47.912.164 28.046 5.582A32.18 32.18 0 0 0 5.39 28.24c-6.009 35.298-8.34 89.084.165 122.97a32.18 32.18 0 0 0 22.656 22.657c19.866 5.418 99.822 5.418 99.822 5.418s79.955 0 99.82-5.418a32.18 32.18 0 0 0 22.657-22.657c6.338-35.348 8.291-89.1-.164-123.134Z" /><path fill="#FFF" d="m102.421 128.06 66.328-38.418-66.328-38.418z" className='size-3' /></svg>}
      {source === 'local' && <Icon name="folder_open" size={12} />}
      {source === 'cloud' && <Icon name="cloud" size={12} />}
      {source === 'youtube' ? 'YouTube' : source === 'local' ? t('setup.local') : t('setup.cloud')}
    </span>
  );
}
