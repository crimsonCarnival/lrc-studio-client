import { useState, useEffect, useCallback, useRef } from 'react';
import useDynamicTranslation from '@/shared/hooks/useDynamicTranslation';
import { useTranslation } from 'react-i18next';
import { uploads as uploadsApi } from '@/app/api';
import { formatTime } from '@/shared/utils/format-time';
import { formatInTimezone, getRelativeTime } from '@/shared/utils/date';
import { useSettings } from '@/features/settings/useSettings';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Tip } from '@ui/tip';
import { Cloud, Video, Trash2, Loader2, Music2, Clock, Edit2, Check, X } from 'lucide-react';
import { SkeletonCard } from '@ui/skeleton';
import SpotifyIcon from '@features/player/components/SpotifyIcon';
import toast from 'react-hot-toast';
import useConfirm from '@/shared/hooks/useConfirm';


function SourceIcon({ source }) {
  if (source === 'youtube') return <Video className="size-4 text-red-400" />;
  if (source === 'spotify') return <SpotifyIcon className="size-4 text-green-400" />;
  return <Cloud className="size-4 text-blue-400" />;
}

function SourceLabel({ source, t }) {
  if (source === 'youtube') return t('uploads.youtube');
  if (source === 'cloudinary') return t('uploads.cloudinary');
  if (source === 'spotify') return t('uploads.spotify');
  return source;
}

export default function UploadsLibrary({ onSelect }) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const timezone = settings.advanced?.timezone;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestConfirm, confirmModal] = useConfirm();
  const { dt } = useDynamicTranslation();
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const editInputRef = useRef(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchUploads = useCallback(async () => {
    try {
      const uploads = await uploadsApi.listMedia();
      setItems(uploads || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUploads(); }, [fetchUploads]);

  const handleDelete = (e, uploadId, title) => {
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

  const handleStartEdit = (e, upload) => {
    e.stopPropagation();
    setEditingId(upload.id);
    setEditTitle(upload.title || upload.fileName || upload.youtubeUrl || '');
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingId(null);
    setEditTitle('');
  };

  const handleSaveTitle = async (e, uploadId) => {
    e.stopPropagation();
    if (!editTitle.trim()) {
      toast.error(t('uploads.titleRequired'));
      return;
    }

    setSavingTitle(true);
    try {
      const { upload } = await uploadsApi.updateMedia(uploadId, { title: editTitle.trim() });
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

  const handleTitleKeyDown = (e, uploadId) => {
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
        <div className="flex-1 space-y-2 animate-fade-in">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
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
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => handleTitleKeyDown(e, upload.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-semibold h-7 px-2 bg-zinc-700 border-zinc-600"
                      disabled={savingTitle}
                    />
                  ) : (
                    <span className="text-sm font-semibold text-zinc-100 truncate">
                      {upload.title || upload.fileName || upload.youtubeUrl || t('uploads.untitled')}
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
                  {upload.duration > 0 && (
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatTime(upload.duration)}
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
