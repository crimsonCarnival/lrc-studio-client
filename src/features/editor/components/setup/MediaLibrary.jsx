import { Video, Cloud, Trash2 } from 'lucide-react';
import SpotifyIcon from '@features/player/components/SpotifyIcon';
import { SkeletonMediaItem } from '@ui/skeleton';
import { useTranslation } from 'react-i18next';

export default function MediaLibrary({ 
  loading, 
  uploads, 
  onSelect, 
  onDelete, 
  onShowAll,
  selectedId
}) {
  const { t } = useTranslation();

  if (!loading && uploads.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('setup.yourMedia')}</span>
        {!loading && uploads.length > 4 && onShowAll && (
          <button 
            onClick={onShowAll} 
            className="text-[10px] font-medium text-primary hover:text-primary/80 uppercase tracking-wider"
          >
            {t('setup.viewAll')}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {loading ? (
          <>
            <SkeletonMediaItem />
            <SkeletonMediaItem />
          </>
        ) : (
          uploads.slice(0, 4).map((upload) => (
            <div
              key={upload.id}
              role="button"
              tabIndex={0}
              aria-label={upload.title || upload.fileName || 'Untitled'}
              onClick={() => onSelect(upload)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(upload); } }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all group cursor-pointer ${
                selectedId === upload.id 
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                  : 'border-zinc-700/40 hover:border-primary/40 hover:bg-zinc-800/60'
              }`}
            >
              <div className="size-7 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0">
                {upload.source === 'youtube' ? <Video className="size-3.5 text-red-400" />
                  : upload.source === 'spotify' ? <SpotifyIcon className="size-3.5 text-green-400" />
                  : <Cloud className="size-3.5 text-zinc-400" />}
              </div>
              <p className={`flex-1 text-xs font-medium truncate ${
                selectedId === upload.id ? 'text-primary' : 'text-zinc-300 group-hover:text-zinc-100'
              }`}>
                {upload.title || upload.fileName || 'Untitled'}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(upload.id);
                }}
                className="p-1 rounded opacity-0 group-hover:opacity-100 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
