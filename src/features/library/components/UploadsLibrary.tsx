import { useState, useRef, useMemo, useEffect } from 'react';
import { useCachedList } from '@/shared/hooks/useCachedList';
import type { ChangeEvent, KeyboardEvent, MouseEvent, ReactNode, SyntheticEvent } from 'react';
import useDynamicTranslation from '@/shared/hooks/useDynamicTranslation';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { uploads as uploadsApi } from '@/app/api';
import { formatInTimezone, getRelativeTime } from '@/shared/utils/date';
import { useSettings } from '@/features/settings/useSettings';
import { Input } from '@ui/input';
import { Tip } from '@ui/tip';
import { Icon } from '@/shared/ui/Icon';
import { SearchField } from '@ui/search-field';
import { SegmentedControl } from '@ui/segmented-control';
import { WaveformBars } from '@/shared/ui/WaveformBars';
import { cn } from '@/shared/utils/utils';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent } from '@ui/context-menu';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@ui/dropdown-menu';
import { contextMenuComponents, dropdownMenuComponents, type MenuComponents } from '@ui/menu-components';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import toast from 'react-hot-toast';
import useConfirm from '@/shared/hooks/useConfirm';
import { Button } from '@ui/button';
import { LibrarySwitch } from './LibrarySwitch';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { projectEditPath } from '@/features/projects/project-path';

interface UploadProject {
  publicId: string;
  slug?: string | null;
  title?: string | null;
}

interface Upload {
  id: string;
  source?: string;
  title?: string;
  fileName?: string;
  uploadUrl?: string;
  duration?: number;
  createdAt?: string | number;
  projects?: UploadProject[] | null;
  [key: string]: unknown;
}

type FilterId = 'all' | 'youtube' | 'cloud' | 'unused';
type SortId = 'recent' | 'oldest' | 'title';
type ViewId = 'grid' | 'list';

const FILTERS: Record<FilterId, (u: Upload) => boolean> = {
  all: () => true,
  youtube: (u) => u.source === 'youtube',
  cloud: (u) => u.source !== 'youtube',
  unused: (u) => !u.projects?.length,
};

const displayTitle = (u: Upload, fallback: string) => u.title || u.fileName || fallback;
const createdMs = (u: Upload) => (u.createdAt ? new Date(Number(u.createdAt) || u.createdAt).getTime() || 0 : 0);

function formatDuration(seconds?: number) {
  if (!seconds || Number.isNaN(seconds)) return '—:—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function SourceBadge({ source, label, className }: { source?: string; label: ReactNode; className?: string }) {
  const isYt = source === 'youtube';
  return (
    <span className={cn(
      'flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-950/80 text-[11px] font-bold uppercase tracking-wide',
      isYt ? 'text-red-300' : 'text-blue-300',
      className,
    )}>
      <Icon name={isYt ? 'play_arrow' : 'cloud'} size={12} />
      {label}
    </span>
  );
}

export default function UploadsLibrary({ onSelect }: { onSelect?: (upload: Upload) => void }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { settings } = useSettings();
  const timezone = settings.advanced?.timezone;
  const locale = i18n.resolvedLanguage || i18n.language;
  const { items, loading, error, reload: fetchUploads, setItems } = useCachedList<Upload>(
    ['uploads', 'mine'],
    () => uploadsApi.listMedia() as Promise<Upload[]>,
  );
  const [requestConfirm, confirmModal] = useConfirm();
  const { dt } = useDynamicTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterId>('all');
  const [sort, setSort] = useState<SortId>('recent');
  const [view, setView] = useState<ViewId>('grid');
  const [query, setQuery] = useState('');

  // One preview player shared by every card, so starting one stops the other.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const untitled = t('uploads.untitled');

  const counts = useMemo(() => ({
    all: items.length,
    youtube: items.filter(FILTERS.youtube).length,
    cloud: items.filter(FILTERS.cloud).length,
    unused: items.filter(FILTERS.unused).length,
  }), [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter(FILTERS[filter])
      .filter((u) => !q || displayTitle(u, '').toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort === 'title') return displayTitle(a, untitled).localeCompare(displayTitle(b, untitled));
        return sort === 'oldest' ? createdMs(a) - createdMs(b) : createdMs(b) - createdMs(a);
      });
  }, [items, filter, query, sort, untitled]);

  const handleDelete = (e: SyntheticEvent, uploadId: string, title?: string) => {
    e.stopPropagation();
    requestConfirm(
      t('confirm.deleteUpload', { title: title || untitled }),
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

  const handleStartEdit = (e: SyntheticEvent, upload: Upload) => {
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

  const handlePreview = (e: MouseEvent, upload: Upload) => {
    e.stopPropagation();
    // YouTube audio can't be played outside the IFrame player, so open the detail page instead.
    if (upload.source === 'youtube' || !upload.uploadUrl) {
      onSelect?.(upload);
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('ended', () => setPlayingId(null));
    }
    const audio = audioRef.current;
    if (playingId === upload.id) {
      audio.pause();
      setPlayingId(null);
      return;
    }
    audio.src = upload.uploadUrl;
    setPlayingId(upload.id);
    audio.play().catch(() => setPlayingId(null));
  };

  const handleCreateProject = (e: SyntheticEvent, upload: Upload) => {
    e.stopPropagation();
    // In the URL, not in history state: the setup route resets app state on
    // entry and the draft can be reloaded or shared from there, both of which
    // drop `location.state` and left the upload silently unattached.
    navigate(`/project/new?uploadId=${encodeURIComponent(upload.id)}`);
  };

  const renderMenu = (upload: Upload) => (C: MenuComponents): ReactNode => (
    <>
      <C.Item onClick={(e: SyntheticEvent) => handleStartEdit(e, upload)}>
        <Icon name="edit" />
        {t('uploads.rename')}
      </C.Item>
      <C.Item
        variant="destructive"
        disabled={deletingId === upload.id}
        onClick={(e: SyntheticEvent) => handleDelete(e, upload.id, upload.title || upload.fileName)}
      >
        <Icon name="delete" />
        {t('common.delete')}
      </C.Item>
    </>
  );

  const titleNode = (upload: Upload, className: string) => editingId === upload.id ? (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <Input
        autoFocus
        value={editTitle}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => handleTitleKeyDown(e, upload.id)}
        className="text-sm font-semibold h-8 px-2 bg-zinc-800 border-zinc-600"
        disabled={savingTitle}
        aria-label={t('uploads.rename')}
      />
      <Button type="button" variant="ghost" size="icon" aria-label={t('common.save')} onClick={(e) => handleSaveTitle(e, upload.id)} loading={savingTitle}
        className="size-8 text-primary hover:bg-primary/10 hover:text-primary">
        {/* Icon is a font glyph, not an svg, so Button's loading state can't hide it. */}
        {!savingTitle && <Icon name="check" size={16} />}
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label={t('common.cancel')} onClick={handleCancelEdit} disabled={savingTitle}
        className="size-8">
        <Icon name="close" size={16} />
      </Button>
    </div>
  ) : (
    <span className={className}>{displayTitle(upload, untitled)}</span>
  );

  const menuButton = (upload: Upload) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('uploads.moreOptions')}
          onClick={(e) => e.stopPropagation()}
          className="size-8 coarse:size-11"
        >
          <Icon name="more_vert" size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{renderMenu(upload)(dropdownMenuComponents)}</DropdownMenuContent>
    </DropdownMenu>
  );

  const when = (upload: Upload) => upload.createdAt
    ? getRelativeTime(upload.createdAt, t, timezone, locale)
    : '';
  const whenTip = (upload: Upload, child: ReactNode) => upload.createdAt ? (
    <Tip content={formatInTimezone(upload.createdAt, timezone, { dateStyle: 'full', timeStyle: 'long' }, locale)}>
      {child as React.ReactElement}
    </Tip>
  ) : child;

  const sourceLabel = (upload: Upload) => upload.source === 'youtube'
    ? t('uploads.youtube')
    : upload.source === 'cloudinary' ? t('uploads.cloudAudio') : upload.source;

  const projectLink = (upload: Upload, size: 'card' | 'row') => {
    const project = upload.projects?.[0];
    if (!project) return null;
    // Uploads are the signed-in user's own, so their projects are too. Without
    // an account name there is no owner-scoped URL, so nothing is rendered.
    const href = projectEditPath(project, user?.accountName);
    if (!href) return null;
    const extra = (upload.projects?.length ?? 1) - 1;
    return (
      <Link
        to={href}
        onClick={(e) => e.stopPropagation()}
        className={cn('flex items-center gap-1.5 font-semibold text-teal-300 hover:text-teal-200 min-w-0', size === 'card' ? 'text-[13px]' : 'text-[13px]')}
      >
        <Icon name="music_note" size={14} className="shrink-0" />
        <span className="truncate uppercase">{project.title || untitled}</span>
        {extra > 0 && <span className="text-zinc-500 font-medium shrink-0">+{extra}</span>}
      </Link>
    );
  };

  const playButton = (upload: Upload, className: string, iconSize = 14) => (
    <button
      type="button"
      aria-label={playingId === upload.id ? t('uploads.pausePreview') : t('uploads.preview')}
      onClick={(e) => handlePreview(e, upload)}
      className={className}
    >
      <Icon name={playingId === upload.id ? 'pause' : 'play_arrow'} size={iconSize} />
    </button>
  );

  const renderCard = (upload: Upload) => (
    <ContextMenu key={upload.id}>
      <ContextMenuTrigger asChild>
        <article
          onClick={() => onSelect?.(upload)}
          className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-colors [-webkit-touch-callout:none]"
        >
          <div className="relative h-36 bg-zinc-800/60 px-6">
            <WaveformBars seed={displayTitle(upload, upload.id)} />
            <SourceBadge source={upload.source} label={sourceLabel(upload)} className="absolute left-3 top-3" />
            <span className="absolute right-3 bottom-3 px-2 py-0.5 rounded-md bg-zinc-950/80 text-zinc-100 font-mono text-xs">
              {formatDuration(upload.duration)}
            </span>
            {playButton(upload, 'absolute left-3 bottom-2.5 size-9 rounded-full bg-zinc-100 text-zinc-900 grid place-items-center hover:bg-white coarse:size-11')}
          </div>
          <div className="p-4 flex flex-col gap-1.5 flex-1">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0 min-h-[2.6rem]">
                {titleNode(upload, 'text-base font-bold leading-snug line-clamp-2 text-zinc-100')}
              </div>
              <div className="-mr-1.5 -mt-1">{menuButton(upload)}</div>
            </div>
            {whenTip(upload, (
              <span className="text-[13px] text-zinc-400 w-fit">{t('uploads.uploadedWhen', { when: when(upload) })}</span>
            ))}
            <div className="mt-auto pt-3 border-t border-zinc-800 flex items-center justify-between gap-2 min-h-[2.75rem]">
              {upload.projects?.length ? projectLink(upload, 'card') : (
                <>
                  <span className="text-[13px] text-zinc-400">{t('uploads.noProject')}</span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => handleCreateProject(e, upload)}
                    className="h-8 px-2.5 text-[13px] text-primary"
                  >
                    + {t('uploads.createProject')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </article>
      </ContextMenuTrigger>
      <ContextMenuContent>{renderMenu(upload)(contextMenuComponents)}</ContextMenuContent>
    </ContextMenu>
  );

  const ROW_GRID = 'grid grid-cols-[48px_minmax(0,3fr)_110px_90px_minmax(0,2fr)_120px_44px] gap-4 items-center px-4';

  const renderRow = (upload: Upload) => (
    <ContextMenu key={upload.id}>
      <ContextMenuTrigger asChild>
        <div role="row" onClick={() => onSelect?.(upload)} className={cn(ROW_GRID, 'py-2.5 border-b border-zinc-800/70 last:border-b-0 hover:bg-zinc-800/30 cursor-pointer [-webkit-touch-callout:none]')}>
          {playButton(upload, 'size-11 rounded-xl bg-zinc-800 text-primary grid place-items-center hover:bg-zinc-700')}
          <div role="cell" className="min-w-0">{titleNode(upload, 'block font-semibold truncate text-zinc-100')}</div>
          <span role="cell" className="text-[13px] text-zinc-200">{sourceLabel(upload)}</span>
          <span role="cell" className="font-mono text-[13px] text-zinc-400">{formatDuration(upload.duration)}</span>
          <div role="cell" className="min-w-0">
            {upload.projects?.length
              ? projectLink(upload, 'row')
              : <span className="text-[13px] text-zinc-400">{t('uploads.noProject')}</span>}
          </div>
          <span role="cell" className="text-[13px] text-zinc-400">{when(upload)}</span>
          <div role="cell">{menuButton(upload)}</div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>{renderMenu(upload)(contextMenuComponents)}</ContextMenuContent>
    </ContextMenu>
  );

  const filterTabs = (Object.keys(FILTERS) as FilterId[]).map((id) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={filter === id}
      onClick={() => setFilter(id)}
      className={cn(
        'h-9 px-3.5 rounded-full border text-sm font-semibold transition-colors coarse:h-11',
        filter === id
          ? 'bg-primary border-primary text-primary-foreground'
          : 'border-zinc-800 text-zinc-200 hover:border-zinc-600',
      )}
    >
      {t(`uploads.filters.${id}`)} <span className="opacity-70 font-medium">{counts[id]}</span>
    </button>
  ));

  return (
    <div className="h-full overflow-y-auto settings-scroll">
      {/* The scroller spans the full width so the gutters beside the centred content scroll it too. */}
      <div className="flex flex-col pt-8 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <LibrarySwitch active="uploads" />

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-7">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-100 tracking-tight">{t('uploads.title')}</h1>
            <p className="text-[15px] text-zinc-400 mt-2">
              {!loading && t('uploads.stats', { total: counts.all, used: counts.all - counts.unused, unused: counts.unused })}
            </p>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/project/new')}
              className="h-11 px-4 text-[15px] lg:h-11 lg:px-4 lg:text-[15px]"
            >
              <Icon name="link" size={18} />
              {t('uploads.fromLink')}
            </Button>
            <Button
              type="button"
              onClick={() => navigate('/project/new')}
              className="h-11 px-5 text-[15px] lg:h-11 lg:px-5 lg:text-[15px]"
            >
              <Icon name="upload" size={18} />
              {t('uploads.uploadAudio')}
            </Button>
          </div>
        </div>

        {!loading && !error && items.length > 0 && (
          <div className="flex items-center justify-between gap-4 flex-wrap mt-8 pb-3.5 border-b border-zinc-800">
            <div role="tablist" aria-label={t('uploads.filterLabel')} className="flex gap-1.5 flex-wrap">{filterTabs}</div>
            <div className="flex gap-2.5 items-center flex-wrap">
              <SearchField
                compact
                label={t('uploads.searchLabel')}
                placeholder={t('uploads.searchPlaceholder')}
                value={query}
                onValueChange={setQuery}
                clearLabel={t('common.clear')}
                className="w-60 max-w-full"
              />
              <div className="relative flex items-center h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100">
                <Icon name="sort" size={16} className="absolute left-3 pointer-events-none text-zinc-400" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortId)}
                  aria-label={t('uploads.sort.recent')}
                  className="appearance-none bg-transparent h-full pl-9 pr-4 text-sm outline-none cursor-pointer"
                >
                  {(['recent', 'oldest', 'title'] as SortId[]).map((id) => (
                    <option key={id} value={id} className="bg-zinc-900">{t(`uploads.sort.${id}`)}</option>
                  ))}
                </select>
              </div>
              <SegmentedControl<ViewId>
                label={t('uploads.gridView')}
                value={view}
                onChange={setView}
                options={[
                  { value: 'grid', label: <Icon name="grid_view" size={18} />, ariaLabel: t('uploads.gridView') },
                  { value: 'list', label: <Icon name="view_list" size={18} />, ariaLabel: t('uploads.listView') },
                ]}
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="size-14 rounded-2xl bg-zinc-800/80 flex items-center justify-center">
              <Icon name="error" size={28} className="text-zinc-500" />
            </div>
            <p className="text-sm text-zinc-400 font-medium">{t('common.loadError')}</p>
            <Button variant="link" size={null} onClick={fetchUploads} className="text-xs">
              {t('common.retry')}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="size-14 rounded-2xl bg-zinc-800/80 flex items-center justify-center">
              <Icon name="music_note" size={28} className="text-zinc-500" />
            </div>
            <p className="text-sm text-zinc-400 font-medium">{dt('uploads.empty')}</p>
            <p className="text-xs text-zinc-500">{dt('uploads.emptyHint')}</p>
          </div>
        ) : shown.length === 0 ? (
          <div className="mt-7 py-14 px-6 text-center border border-dashed border-zinc-700 rounded-2xl text-zinc-400">
            {t('uploads.noResults')}
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5 mt-7">
            {shown.map(renderCard)}
          </div>
        ) : (
          <div className="mt-5 border border-zinc-800 rounded-2xl overflow-x-auto bg-zinc-900">
            <div role="table" aria-label={t('uploads.title')} className="min-w-[760px]">
              <div role="row" className={cn(ROW_GRID, 'py-3 border-b border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-400')}>
                <span role="columnheader" />
                {(['title', 'source', 'duration', 'project', 'uploaded'] as const).map((c) => (
                  <span key={c} role="columnheader">{t(`uploads.columns.${c}`)}</span>
                ))}
                <span role="columnheader" />
              </div>
              {shown.map(renderRow)}
            </div>
          </div>
        )}
        {confirmModal}
      </div>
    </div>
  );
}
