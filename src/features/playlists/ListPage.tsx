import { profilePath, listPath, listsPath } from '@/features/profile/profile-path';
import { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

const NotFoundPage = lazy(() => import('@/app/NotFoundPage'));
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { resolveCoverImage } from '@/shared/utils/cover-image';
import { formatInTimezone, getRelativeTime } from '@/shared/utils/date';
import { cn } from '@/shared/utils/utils';
import { projectPath } from '@/features/projects/project-path';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useSettings } from '@/features/settings/useSettings';
import { UserHoverCard } from '@ui/UserHoverCard';
import {
  savePlaylist,
  unsavePlaylist,
  incrementPlaylistShare,
} from './playlist.service';
import { usePlaylistDetail, usePlaylistsPage } from './playlist.queries';
import { PlaylistModal } from './PlaylistModal';
import { PlaylistCover } from './PlaylistCover';
import {
  distinctArtistCount,
  formatRuntime,
  formatTrackLength,
  topGenre,
  totalDurationSeconds,
  wordSyncedCount,
} from './playlist-stats';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import { Popover, PopoverContent, PopoverItem, PopoverTrigger } from '@ui/popover';
import { ReportDialog } from '@/features/reports/ReportDialog';
import { Tip } from '@ui/tip';
import type { PlaylistSortMode } from '@/types';

type PlaylistProject = {
  id: string;
  publicId: string;
  slug?: string | null;
  title?: string | null;
  starCount?: number | null;
  coverImage?: string | null;
  lineCount?: number | null;
  hasWordSync?: boolean | null;
  metadata?: { songArtist?: string | null; songName?: string | null; genre?: string | null } | null;
  /** The project's own owner — not the playlist's owner. */
  user?: { accountName?: string | null } | null;
  upload?: { source?: string | null; uploadUrl?: string | null; coverImage?: string | null; duration?: number | null } | null;
};

type Playlist = {
  id: string;
  name: string;
  description?: string | null;
  coverImage?: string | null;
  isPublic?: boolean;
  isSavedByMe?: boolean;
  savedCount?: number;
  viewCount?: number;
  shareCount?: number;
  projectCount?: number;
  sortMode?: PlaylistSortMode;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  owner?: { avatarUrl?: string | null; displayName?: string | null; accountName?: string | null };
  projects?: PlaylistProject[];
};

/** View-only ordering of the table; the list's persisted `sortMode` is untouched. */
type ViewSort = 'list' | 'stars' | 'az' | 'length';
const VIEW_SORTS: readonly ViewSort[] = ['list', 'stars', 'az', 'length'];

/** Projects tagged this way make up the auto-maintained Starred list (see useStarredPlaylist). */
const STARRED_TAG = 'starred';
const MORE_BY_LIMIT = 4;

// Narrow screens keep #, title and length; md+ adds genre, sync, lines and stars.
const GRID = 'grid grid-cols-[1.75rem_minmax(0,1fr)_3.5rem] md:grid-cols-[2rem_minmax(0,1fr)_7rem_6.5rem_3.5rem_3.5rem_3.5rem] items-center gap-4';

type IndexedProject = { project: PlaylistProject; position: number };

function sortTracks(rows: IndexedProject[], sort: ViewSort): IndexedProject[] {
  if (sort === 'list') return rows;
  const copy = [...rows];
  if (sort === 'stars') copy.sort((a, b) => (b.project.starCount ?? 0) - (a.project.starCount ?? 0) || a.position - b.position);
  if (sort === 'az') copy.sort((a, b) => (a.project.title ?? '').localeCompare(b.project.title ?? '') || a.position - b.position);
  // Longest first; unknown lengths go last.
  if (sort === 'length') copy.sort((a, b) => (b.project.upload?.duration ?? -1) - (a.project.upload?.duration ?? -1) || a.position - b.position);
  return copy;
}

function matchesQuery(project: PlaylistProject, query: string): boolean {
  const haystack = [
    project.title,
    project.metadata?.songName,
    project.metadata?.songArtist,
    project.metadata?.genre,
    project.user?.accountName,
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query);
}

export default function ListPage() {
  const { accountName, listId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuthContext();
  const { settings } = useSettings();
  const timezone = settings.advanced?.timezone || 'auto';
  const locale = (i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2);

  const { playlist, loading, notFound, forbidden, setPlaylist } = usePlaylistDetail<Playlist>(listId);
  // Saved state lives on the cached playlist, so it cannot drift from it.
  const isSaved = playlist?.isSavedByMe ?? false;
  const setIsSaved = useCallback(
    (value: boolean) => setPlaylist(prev => prev ? { ...prev, isSavedByMe: value } : prev),
    [setPlaylist],
  );
  const [saveLoading, setSaveLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [hoveringUnsave, setHoveringUnsave] = useState(false);
  const [find, setFind] = useState('');
  const [viewSort, setViewSort] = useState<ViewSort>('list');

  const isOwner = !!user && user.accountName === accountName;
  // Signed-in visitors can report the list from its ⋯ menu.
  const canReport = !!user && !user.isGuest && !isOwner && !!listId;
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const ownerName = playlist?.owner?.accountName ?? accountName;
  const ownerLabel = playlist?.owner?.displayName || ownerName || '';
  const { data: ownerPage } = usePlaylistsPage(ownerName, { limit: MORE_BY_LIMIT + 1 });
  const moreByOwner = useMemo(
    () => (ownerPage?.playlists ?? []).filter(p => p.id !== listId).slice(0, MORE_BY_LIMIT),
    [ownerPage, listId],
  );

  const projects = useMemo(() => playlist?.projects ?? [], [playlist]);
  const stats = useMemo(() => ({
    runtime: formatRuntime(totalDurationSeconds(projects)),
    wordSynced: wordSyncedCount(projects),
    genre: topGenre(projects),
    artists: distinctArtistCount(projects),
  }), [projects]);

  const rows = useMemo(() => {
    const query = find.trim().toLowerCase();
    const indexed = projects.map((project, position) => ({ project, position }));
    const filtered = query ? indexed.filter(r => matchesQuery(r.project, query)) : indexed;
    return sortTracks(filtered, viewSort);
  }, [projects, find, viewSort]);

  // `?list=` keeps the up-next panel on the project page; the canonical path
  // carries the project's OWN owner, which is not the playlist's owner.
  const trackPath = (project: PlaylistProject): string | null => {
    const base = projectPath(project);
    return base && `${base}?list=${listId}`;
  };
  const playAllPath = projects.length ? trackPath(projects[0]) : null;

  const handleSave = useCallback(async () => {
    if (!user) {
      navigate(`/auth/signin?redirect=${encodeURIComponent(listPath(accountName, listId))}`);
      return;
    }
    setSaveLoading(true);
    try {
      await savePlaylist(listId!);
      setIsSaved(true);
      setPlaylist(prev => prev ? { ...prev, savedCount: (prev.savedCount ?? 0) + 1 } : prev);
    } catch {
      setIsSaved(false);
      setPlaylist(prev => prev ? { ...prev, savedCount: Math.max(0, (prev.savedCount ?? 0) - 1) } : prev);
    } finally {
      setSaveLoading(false);
    }
  }, [user, listId, accountName, navigate, setIsSaved, setPlaylist]);

  const handleUnsave = useCallback(async () => {
    setSaveLoading(true);
    try {
      await unsavePlaylist(listId!);
      setIsSaved(false);
      setHoveringUnsave(false);
      setPlaylist(prev => prev ? { ...prev, savedCount: Math.max(0, (prev.savedCount ?? 0) - 1) } : prev);
    } catch {
      setIsSaved(true);
      setPlaylist(prev => prev ? { ...prev, savedCount: (prev.savedCount ?? 0) + 1 } : prev);
    } finally {
      setSaveLoading(false);
    }
  }, [listId, setIsSaved, setPlaylist]);

  const handleShare = useCallback(async () => {
    if (!listId) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${listPath(accountName, listId)}`);
    } catch {
      toast.error(t('share.sheet.copyFailed'));
      return;
    }
    toast.success(t('share.sheet.copied'));
    // Counted only once the link actually reached the clipboard.
    if (await incrementPlaylistShare(listId)) {
      setPlaylist(prev => prev ? { ...prev, shareCount: (prev.shareCount ?? 0) + 1 } : prev);
    }
  }, [listId, accountName, t, setPlaylist]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <Suspense fallback={null}>
        <NotFoundPage type="forbidden" />
      </Suspense>
    );
  }

  if (notFound || !playlist) {
    return (
      <Suspense fallback={null}>
        <NotFoundPage type="playlist" identifier={listId} />
      </Suspense>
    );
  }

  const isAuto = playlist.tags?.includes(STARRED_TAG) ?? false;
  const projectCount = playlist.projectCount ?? projects.length;
  const statItems = [
    { key: 'views', value: playlist.viewCount ?? 0, label: t('playlists.detail.views', { count: playlist.viewCount ?? 0 }) },
    { key: 'saves', value: playlist.savedCount ?? 0, label: t('playlists.detail.saves', { count: playlist.savedCount ?? 0 }) },
    { key: 'shares', value: playlist.shareCount ?? 0, label: t('playlists.detail.shares', { count: playlist.shareCount ?? 0 }) },
  ];

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
    <div className="flex flex-col">
      {/* Hero */}
      <section className="border-b border-border bg-card/40">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pt-10 pb-8 flex flex-col md:flex-row gap-6 md:gap-8 md:items-end">
          <PlaylistCover playlist={playlist} className="size-40 lg:size-56 rounded-2xl shadow-2xl" iconSize={40} />

          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {!playlist.isPublic && <Icon name="lock" size={14} />}
              <span>
                {playlist.isPublic ? t('playlists.detail.publicList') : t('playlists.detail.privateList')}
                {isAuto && ` · ${t('playlists.detail.auto')}`}
              </span>
            </div>

            <h1 className="font-heading text-3xl lg:text-6xl font-bold tracking-tight text-foreground leading-none break-words">
              {playlist.name}
            </h1>

            {playlist.description && (
              <p className="text-sm lg:text-base text-muted-foreground max-w-2xl leading-relaxed">{playlist.description}</p>
            )}

            {!!playlist.tags?.length && (
              <div className="flex flex-wrap gap-2">
                {playlist.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-pill bg-primary/10 text-primary text-xs font-medium">{tag}</span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
              <UserHoverCard accountName={ownerName ?? ''}>
                <Link
                  to={profilePath(ownerName)}
                  className="flex items-center gap-2 w-fit hover:opacity-80 transition-opacity"
                >
                  {playlist.owner?.avatarUrl ? (
                    <img src={playlist.owner.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-6 rounded-full object-cover" />
                  ) : (
                    <div className="size-6 rounded-full bg-muted" />
                  )}
                  <span className="font-medium text-foreground">{ownerLabel}</span>
                </Link>
              </UserHoverCard>
              <span aria-hidden="true">·</span>
              <span>{t('playlists.detail.projects', { count: projectCount })}</span>
              {stats.runtime && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{t(`playlists.detail.runtime.${stats.runtime.key}`, stats.runtime)}</span>
                </>
              )}
              {playlist.updatedAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{t('playlists.detail.updated', { when: getRelativeTime(playlist.updatedAt, t, timezone, locale) })}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions + stats */}
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pb-7 flex flex-wrap items-center gap-3">
          {playAllPath && (
            <Tip content={t('playlists.detail.playAll')}>
              <Button asChild size="icon" className="size-14 lg:size-14 rounded-full">
                <Link to={playAllPath} aria-label={t('playlists.detail.playAll')}>
                  <Icon name="play_arrow" size={24} filled />
                </Link>
              </Button>
            </Tip>
          )}
          {!isOwner && (
            isSaved ? (
              <Button
                variant="outline"
                size="lg"
                className="gap-2 rounded-pill"
                onClick={handleUnsave}
                disabled={saveLoading}
                onMouseEnter={() => setHoveringUnsave(true)}
                onMouseLeave={() => setHoveringUnsave(false)}
              >
                <Icon name="bookmark" size={16} filled />
                {hoveringUnsave ? t('playlists.remove') : t('playlists.saved')}
              </Button>
            ) : (
              <Button variant="outline" size="lg" className="gap-2 rounded-pill" onClick={handleSave} disabled={saveLoading}>
                <Icon name="bookmark" size={16} />
                {t('playlists.save')}
              </Button>
            )
          )}
          {playlist.isPublic && (
            <Button variant="outline" size="lg" className="gap-2 rounded-pill" onClick={handleShare}>
              <Icon name="ios_share" size={16} />
              {t('playlists.detail.share')}
            </Button>
          )}
          {isOwner && (
            <Button variant="outline" size="lg" className="gap-2 rounded-pill" onClick={() => setShowEdit(true)}>
              <Icon name="edit" size={16} />
              {t('playlists.detail.edit')}
            </Button>
          )}
          {canReport && (
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <Tip content={t('reports.menu.more')}>
                <PopoverTrigger asChild>
                  <Button size="icon-lg" variant="outline" className="rounded-full" aria-label={t('reports.menu.more')}>
                    <Icon name="more_horiz" size={16} />
                  </Button>
                </PopoverTrigger>
              </Tip>
              <PopoverContent align="start" className="w-52 lg:min-w-52">
                <PopoverItem onClick={() => { setMenuOpen(false); setReportOpen(true); }} className="text-sm">
                  <Icon name="flag" size={16} /> {t('reports.menu.reportPlaylist')}
                </PopoverItem>
              </PopoverContent>
            </Popover>
          )}

          <div className="flex-1" />

          <dl className="flex gap-6 text-xs text-muted-foreground">
            {statItems.map(s => (
              <div key={s.key} className="flex flex-col-reverse gap-0.5">
                <dt>{s.label}</dt>
                <dd className="font-mono text-lg text-foreground leading-none">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
        {/* Track list */}
        <main className="min-w-0 flex flex-col gap-3">
          {!projects.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">{t('playlists.detail.noProjects')}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 h-9 px-3 rounded-lg bg-card border border-border text-muted-foreground flex-[1_1_14rem] max-w-80 focus-within:border-primary/50">
                  <Icon name="search" size={16} />
                  <input
                    type="search"
                    value={find}
                    onChange={e => setFind(e.target.value)}
                    placeholder={t('playlists.detail.findPlaceholder')}
                    aria-label={t('playlists.detail.findPlaceholder')}
                    className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  />
                </label>
                <div role="group" aria-label={t('playlists.detail.viewSortLabel')} className="flex items-center gap-1 p-1 rounded-lg bg-card border border-border">
                  {VIEW_SORTS.map(s => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={viewSort === s}
                      onClick={() => setViewSort(s)}
                      className={cn(
                        'h-7 px-3 rounded-md text-xs font-medium transition-colors',
                        viewSort === s ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {t(`playlists.detail.viewSort.${s}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className={cn(GRID, 'px-4 py-2 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground')}>
                <span className="text-center">#</span>
                <span>{t('playlists.detail.columns.title')}</span>
                <span className="hidden md:block">{t('playlists.detail.columns.genre')}</span>
                <span className="hidden md:block">{t('playlists.detail.columns.sync')}</span>
                <span className="hidden md:block text-right">{t('playlists.detail.columns.lines')}</span>
                <span className="hidden md:block text-right">{t('playlists.detail.columns.stars')}</span>
                <span className="flex justify-end">
                  <Tip content={t('playlists.detail.columns.length')}>
                    <span role="img" aria-label={t('playlists.detail.columns.length')}><Icon name="schedule" size={14} /></span>
                  </Tip>
                </span>
              </div>

              {!rows.length ? (
                <p className="py-10 text-center text-sm text-muted-foreground">{t('playlists.detail.noMatches')}</p>
              ) : (
                <ol className="flex flex-col">
                  {rows.map(({ project, position }) => {
                    const thumb = resolveCoverImage(project);
                    // No owner account name means no canonical URL: the row renders
                    // non-navigable rather than pointing at a path that would 404.
                    const href = trackPath(project);
                    const title = project.title || t('playlists.detail.untitled');
                    const artist = project.metadata?.songArtist;
                    const syncedBy = project.user?.accountName;
                    const length = formatTrackLength(project.upload?.duration);
                    return (
                      <li key={project.id} className={cn(GRID, 'group relative px-4 py-2.5 rounded-xl hover:bg-accent/40 transition-colors')}>
                        <span className="flex justify-center text-sm font-mono text-muted-foreground">
                          <span className={cn(href && 'group-hover:hidden')}>{position + 1}</span>
                          {href && <Icon name="play_arrow" size={14} filled className="hidden group-hover:block text-foreground" />}
                        </span>

                        <span className="flex items-center gap-3 min-w-0">
                          <span className="size-10 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                            {thumb ? (
                              <img src={thumb} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
                            ) : (
                              <Icon name="music_note" size={16} className="text-muted-foreground" />
                            )}
                          </span>
                          <span className="flex flex-col min-w-0">
                            {href ? (
                              // The title's link covers the whole row; the "synced by" link sits above it.
                              <Link
                                to={href}
                                className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors outline-none after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-primary/50"
                              >
                                {title}
                              </Link>
                            ) : (
                              <span className="text-sm font-medium text-foreground line-clamp-1">{title}</span>
                            )}
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {artist && <>{artist}{syncedBy && ' · '}</>}
                              {syncedBy && (
                                <>
                                  {t('playlists.detail.syncedBy')}{' '}
                                  <Link to={profilePath(syncedBy)} className="relative z-10 text-primary hover:underline">@{syncedBy}</Link>
                                </>
                              )}
                            </span>
                          </span>
                        </span>

                        <span className="hidden md:block text-sm text-muted-foreground truncate">{project.metadata?.genre || '—'}</span>
                        <span className="hidden md:block">
                          <span className={cn(
                            'inline-block px-2 py-0.5 rounded-pill border text-xs font-medium',
                            project.hasWordSync ? 'border-foam/40 text-foam' : 'border-border text-muted-foreground',
                          )}>
                            {project.hasWordSync ? t('playlists.detail.wordSync') : t('playlists.detail.lineSync')}
                          </span>
                        </span>
                        <span className="hidden md:block text-right text-sm font-mono text-muted-foreground">{project.lineCount ?? '—'}</span>
                        <span className="hidden md:flex items-center justify-end gap-1 text-sm font-mono text-muted-foreground">
                          <Icon name="star" size={12} />
                          {project.starCount ?? 0}
                        </span>
                        <span className="text-right text-sm font-mono text-muted-foreground">{length ?? '—'}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </>
          )}
        </main>

        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col gap-5">
          <div className="p-5 rounded-2xl bg-card border border-border flex flex-col gap-3.5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('playlists.about.title')}</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
              {playlist.createdAt && (
                <>
                  <dt className="text-muted-foreground">{t('playlists.about.created')}</dt>
                  <dd className="text-foreground">{formatInTimezone(playlist.createdAt, timezone, { dateStyle: 'medium' }, locale)}</dd>
                </>
              )}
              {playlist.sortMode && (
                <>
                  <dt className="text-muted-foreground">{t('playlists.about.sort')}</dt>
                  <dd className="text-foreground">{t(`playlists.sortMode.${playlist.sortMode}`)}</dd>
                </>
              )}
              <dt className="text-muted-foreground">{t('playlists.about.wordSynced')}</dt>
              <dd className="text-foreground">{t('playlists.about.wordSyncedValue', { count: stats.wordSynced, total: projects.length })}</dd>
              <dt className="text-muted-foreground">{t('playlists.about.topGenre')}</dt>
              <dd className="text-foreground">{stats.genre ?? '—'}</dd>
              <dt className="text-muted-foreground">{t('playlists.about.artists')}</dt>
              <dd className="text-foreground">{stats.artists}</dd>
            </dl>
          </div>

          {moreByOwner.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground truncate">
                  {t('playlists.about.moreBy', { name: ownerLabel })}
                </h2>
                <Link to={listsPath(ownerName)} className="text-sm text-primary hover:underline shrink-0">
                  {t('playlists.about.viewAll')}
                </Link>
              </div>
              {moreByOwner.map(other => (
                <Link
                  key={other.id}
                  to={listPath(ownerName, other.id)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent/40 transition-colors"
                >
                  <PlaylistCover playlist={other} className="size-12 rounded-lg" iconSize={20} />
                  <span className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">{other.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {t('playlists.detail.projects', { count: other.projectCount })}
                      {' · '}
                      {other.isPublic ? t('playlists.public') : t('playlists.private')}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>

      {canReport && (
        <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="playlist" targetId={listId!} />
      )}

      {showEdit && (
        <PlaylistModal
          playlist={playlist}
          onClose={() => setShowEdit(false)}
          onSave={(updated: Playlist) => { setPlaylist(() => updated); setShowEdit(false); }}
          onProjectsChange={(updated: Playlist) => setPlaylist(() => updated)}
        />
      )}
    </div>
    </div>
  );
}
