import { Icon } from '@/shared/ui/Icon';
import { SkeletonMediaItem } from '@ui/skeleton';
import { useTranslation } from 'react-i18next';

interface MediaUpload {
  id: string;
  title?: string | null;
  fileName?: string | null;
  source?: string;
  [key: string]: unknown;
}

interface MediaLibraryProps {
  loading?: boolean;
  uploads: MediaUpload[];
  onSelect: (upload: MediaUpload) => void;
  onDelete: (id: string) => void;
  onShowAll?: () => void;
  selectedId?: string | null;
}

export default function MediaLibrary({
  loading,
  uploads,
  onSelect,
  onDelete,
  onShowAll,
  selectedId
}: MediaLibraryProps) {
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
            <SkeletonMediaItem className="size-7" />
            <SkeletonMediaItem className="size-7" />
            <SkeletonMediaItem className="size-7" />
            <SkeletonMediaItem className="size-7" />
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
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all group cursor-pointer ${selectedId === upload.id
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-zinc-700/40 hover:border-primary/40 hover:bg-zinc-800/60'
                }`}
            >
              <div className="size-7 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0">
                {upload.source === 'youtube' ? <svg preserveAspectRatio="xMidYMid" viewBox="0 0 256 180"><path fill="red" d="M250.346 28.075A32.18 32.18 0 0 0 227.69 5.418C207.824 0 127.87 0 127.87 0S47.912.164 28.046 5.582A32.18 32.18 0 0 0 5.39 28.24c-6.009 35.298-8.34 89.084.165 122.97a32.18 32.18 0 0 0 22.656 22.657c19.866 5.418 99.822 5.418 99.822 5.418s79.955 0 99.82-5.418a32.18 32.18 0 0 0 22.657-22.657c6.338-35.348 8.291-89.1-.164-123.134Z" /><path fill="#FFF" d="m102.421 128.06 66.328-38.418-66.328-38.418z" className="size-3.5 text-red-400" /></svg>
                  : <Icon name="cloud" size={14} className="text-zinc-400" />}
              </div>
              <p className={`flex-1 text-xs font-medium truncate ${selectedId === upload.id ? 'text-primary' : 'text-zinc-300 group-hover:text-zinc-100'
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
                <Icon name="delete" size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
