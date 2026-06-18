import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChangeEvent, KeyboardEvent, MouseEvent, SyntheticEvent } from 'react';
import useDynamicTranslation from '@/shared/hooks/useDynamicTranslation';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { uploads as uploadsApi } from '@/app/api';
import { formatTime } from '@/shared/utils/format-time';
import { formatInTimezone, getRelativeTime } from '@/shared/utils/date';
import { useSettings } from '@/features/settings/useSettings';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Tip } from '@ui/tip';
import { Cloud, Video, Trash2, Loader2, Music2, Clock, Edit2, Check, X, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import toast from 'react-hot-toast';
import useConfirm from '@/shared/hooks/useConfirm';

interface Upload {
  id: string;
  source?: string;
  title?: string;
  fileName?: string;
  uploadUrl?: string;
  duration?: number;
  createdAt?: string | number;
  [key: string]: unknown;
}

function SourceIcon({ source }: { source?: string }) {
  if (source === 'youtube') return <svg preserveAspectRatio="xMidYMid" viewBox="0 0 256 180"><path fill="red" d="M250.346 28.075A32.18 32.18 0 0 0 227.69 5.418C207.824 0 127.87 0 127.87 0S47.912.164 28.046 5.582A32.18 32.18 0 0 0 5.39 28.24c-6.009 35.298-8.34 89.084.165 122.97a32.18 32.18 0 0 0 22.656 22.657c19.866 5.418 99.822 5.418 99.822 5.418s79.955 0 99.82-5.418a32.18 32.18 0 0 0 22.657-22.657c6.338-35.348 8.291-89.1-.164-123.134Z" /><path fill="#FFF" d="m102.421 128.06 66.328-38.418-66.328-38.418z" className="size-4 text-red-400" /></svg>;

  return <Cloud className="size-4 text-blue-400" />;
}

function SourceLabel({ source, t }: { source?: string; t: TFunction }) {
  if (source === 'youtube') return <>{t('uploads.youtube')}</>;
  if (source === 'cloudinary') return <>{t('uploads.cloudAudio')}</>;
  return <>{source}</>;
}

export default function UploadsLibrary({ onSelect }: { onSelect?: (upload: Upload) => void }) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const timezone = settings.advanced?.timezone;
  const [items, setItems] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [requestConfirm, confirmModal] = useConfirm();
  const { dt } = useDynamicTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUploads = useCallback(async () => {
    setError(false);
    try {
      const uploads = await uploadsApi.listMedia() as Upload[];
      setItems(uploads || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchUploads(); }, [fetchUploads]);

  const handleDelete = (e: MouseEvent, uploadId: string, title?: string) => {
    e.stopPropagation();
    requestConfirm(
      t('confirm.deleteUpload', { title: title || t('uploads.untitled') }),
      async () => {
        setDeletingId(uploadId);
        try {
          await uploadsApi.deleteMedia(uploadId);
          setItems((prev) => prev.filter((u) => u.id !== uploadId));
        } catch {
          // ignore
        } finally {
          setDeletingId(null);
        }
      },
      { title: t('confirm.deleteUploadTitle'), variant: 'danger' }
    );
  };

  const handleStartEdit = (e: MouseEvent, upload: Upload) => {
    e.stopPropagation();
    setEditingId(upload.id);
    setEditTitle(upload.title || upload.fileName || upload.uploadUrl || '');
  };

  const handleCancelEdit = (e: SyntheticEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditTitle('');
  };

  const handleSaveTitle = async (e: SyntheticEvent, uploadId: string) => {
    e.stopPropagation();
    if (!editTitle.trim()) {
      toast.error(t('uploads.titleRequired'));
      return;
    }

    setSavingTitle(true);
    try {
      const { upload } = await uploadsApi.updateMedia(uploadId, { title: editTitle.trim() }) as { upload: { title?: string } };
      setItems((prev) =>
        prev.map((u) => (u.id === uploadId ? { ...u, title: upload.title } : u))
      );
      setEditingId(null);
      setEditTitle('');
      toast.success(t('uploads.titleUpdated'));
    } catch {
      toast.error(t('uploads.updateFailed'));
    } finally {
      setSavingTitle(false);
    }
  };

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>, uploadId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle(e, uploadId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit(e);
    }
  };

  return (
    <div className="flex flex-col h-full pt-0 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
      {/* Count */}
      <div className="flex items-center mb-5">
        <span className="text-xs text-zinc-500">
          {!loading && t('uploads.count', { count: items.length })}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <div className="size-14 rounded-2xl bg-zinc-800/80 flex items-center justify-center">
            <AlertCircle className="size-7 text-zinc-500" />
          </div>
          <p className="text-sm text-zinc-400 font-medium">{t('common.loadError')}</p>
          <button onClick={fetchUploads} className="text-xs text-primary hover:text-primary/70 transition-colors font-medium">
            {t('common.retry')}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <div className="size-14 rounded-2xl bg-zinc-800/80 flex items-center justify-center">
            <Music2 className="size-7 text-zinc-500" />
          </div>
          <p className="text-sm text-zinc-400 font-medium">{dt('uploads.empty')}</p>
          <p className="text-xs text-zinc-500">{dt('uploads.emptyHint')}</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 settings-scroll">
          {items.map((upload) => (
            <button
              key={upload.id}
              type="button"
              onClick={() => onSelect?.(upload)}
              className="w-full group relative flex items-start gap-3 p-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-700/40 hover:border-zinc-600/60 transition-all duration-150 text-left cursor-pointer"
            >
              {/* Thumbnail or source icon */}
              <div className="size-9 rounded-lg bg-zinc-700/50 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
                <SourceIcon source={upload.source} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {editingId === upload.id ? (
                    <Input
                      ref={editInputRef}
                      value={editTitle}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
                      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => handleTitleKeyDown(e, upload.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-semibold h-7 px-2 bg-zinc-700 border-zinc-600"
                      disabled={savingTitle}
                    />
                  ) : (
                    <span className="text-sm font-semibold text-zinc-100 truncate">
                      {upload.title || upload.fileName || t('uploads.untitled')}
                    </span>
                  )}
                  <span className="text-[10px] font-bold uppercase text-zinc-500 bg-zinc-700/50 px-1.5 py-0.5 rounded flex-shrink-0">
                    <SourceLabel source={upload.source} t={t} />
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-1">
                  {upload.fileName && (
                    <span className="text-xs text-zinc-500 truncate max-w-[200px]">
                      {upload.fileName}
                    </span>
                  )}
                  {(upload.duration ?? 0) > 0 && (
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatTime(upload.duration ?? 0)}
                    </span>
                  )}
                </div>

                {upload.createdAt && (
                  <Tip content={formatInTimezone(upload.createdAt, timezone, {
                    dateStyle: 'full',
                    timeStyle: 'long'
                  }, i18n.resolvedLanguage || i18n.language)}>
                    <span className="text-[10px] text-zinc-600 mt-1 block">
                      {getRelativeTime(upload.createdAt, t, timezone, i18n.resolvedLanguage || i18n.language)}
                    </span>
                  </Tip>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                {editingId === upload.id ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleSaveTitle(e, upload.id)}
                      disabled={savingTitle}
                      className="text-primary/70 hover:text-primary hover:bg-primary/10 size-7"
                    >
                      {savingTitle ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCancelEdit}
                      disabled={savingTitle}
                      className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 size-7"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleStartEdit(e, upload)}
                      className="text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 size-7"
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDelete(e, upload.id, upload.title || upload.fileName)}
                      disabled={deletingId === upload.id}
                      className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 size-7"
                    >
                      {deletingId === upload.id
                        ? <Loader2 className="size-3.5 animate-spin" />
                        : <Trash2 className="size-3.5" />}
                    </Button>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      {confirmModal}
    </div>
  );
}
