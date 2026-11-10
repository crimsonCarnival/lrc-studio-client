import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listPath, profilePath } from '@/features/profile/profile-path';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { useSettings } from '@/features/settings/useSettings';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { getRelativeTime } from '@/shared/utils/date';
import { cn } from '@/shared/utils/utils';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { CountTabs } from '@ui/count-tabs';
import { EmptyState } from '@ui/EmptyState';
import { SearchField } from '@ui/search-field';
import { SegmentedControl } from '@ui/segmented-control';
import { SelectField } from '@ui/select-field';
import { Skeleton } from '@ui/skeleton';
import type { Playlist, PlaylistListSort, PlaylistVisibilityFilter } from '@/types';
import { PlaylistCover } from './PlaylistCover';
import { PlaylistModal } from './PlaylistModal';
import { PlaylistTile, PlaylistTileSkeleton } from './PlaylistTile';
import { ListPager } from './ListPager';
import { SavedListsEmpty } from './ProfileLists';
import { pageCount, parseOption, parsePage } from './list-pager';
import { usePlaylistsPage, useSavedPlaylistsPage } from './playlist.queries';

const PER_PAGE = 12;
const SEARCH_DEBOUNCE_MS = 300;
const LAYOUT_KEY = 'lrc-lists-layout';

type Tab = 'created' | 'saved';
type Layout = 'grid' | 'table';
const TABS: readonly Tab[] = ['created', 'saved'];
const SORTS: readonly PlaylistListSort[] = ['UPDATED', 'NEWEST', 'SAVES', 'NAME'];
const VISIBILITIES: readonly PlaylistVisibilityFilter[] = ['ALL', 'PUBLIC', 'UNLISTED', 'PRIVATE'];
const LAYOUTS: readonly Layout[] = ['grid', 'table'];

/** URL params that reset the page when they change, so a filter never lands on an empty page 5. */
type FilterParam = 'tab' | 'q' | 'sort' | 'vis';

// Narrow screens keep cover, name and updated; md+ adds the numbers.
const ROW = 'grid grid-cols-[3.5rem_minmax(0,1fr)_6rem] md:grid-cols-[3.5rem_minmax(0,1fr)_6rem_5rem_5rem_7rem] items-center gap-4';

function readLayout(): Layout {
  try {
    return parseOption(localStorage.getItem(LAYOUT_KEY), LAYOUTS, 'grid');
  } catch {
    return 'grid';
  }
}

/** Every list a user made (and, for the owner, saved), with search, sort, visibility and paging in the URL. */
export default function AllListsPage() {
  const { accountName = '' } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuthContext();
  const { settings } = useSettings();
  const timezone = settings.advanced?.timezone || 'auto';
  const locale = (i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2);
  const isOwner = !!user && user.accountName === accountName;

  const [searchParams, setSearchParams] = useSearchParams();
  // Saved lists are shown to their owner only; anyone else asking for them gets the created tab.
  const requestedTab = parseOption(searchParams.get('tab'), TABS, 'created');
  const tab: Tab = isOwner ? requestedTab : 'created';
  const sort = parseOption(searchParams.get('sort'), SORTS, 'UPDATED');
  const visibility = isOwner ? parseOption(searchParams.get('vis'), VISIBILITIES, 'ALL') : 'ALL';
  const page = parsePage(searchParams.get('page'));
  const qParam = searchParams.get('q') ?? '';

  const [layout, setLayoutState] = useState<Layout>(readLayout);
  const setLayout = (next: Layout) => {
    setLayoutState(next);
    try { localStorage.setItem(LAYOUT_KEY, next); } catch { /* storage unavailable: the choice lasts this visit */ }
  };

  const [creating, setCreating] = useState(false);

  /** Writes params; any filter change also drops `page`. Defaults are removed so URLs stay short. */
  const updateParams = (changes: Partial<Record<FilterParam | 'page', string | null>>, replace = false) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(changes)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      if (!('page' in changes)) params.delete('page');
      return params;
    }, { replace });
  };

  // The input updates instantly; the URL (and the query) follow once typing pauses.
  // Back/forward changes the URL under the input, so the input follows it too.
  const [query, setQuery] = useState(qParam);
  const [syncedQ, setSyncedQ] = useState(qParam);
  if (qParam !== syncedQ) {
    setSyncedQ(qParam);
    if (qParam !== query.trim()) setQuery(qParam);
  }
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  useEffect(() => {
    if (debouncedQuery !== qParam) updateParams({ q: debouncedQuery || null }, true);
    // Only a settled query should write; qParam is read, not watched, so back/forward doesn't loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const offset = (page - 1) * PER_PAGE;
  const createdQuery = usePlaylistsPage(tab === 'created' ? accountName : undefined, {
    offset,
    limit: PER_PAGE,
    sort,
    ...(isOwner && { visibility }),
    ...(qParam && { search: qParam }),
  });
  const savedQuery = useSavedPlaylistsPage({ offset, limit: PER_PAGE }, isOwner && tab === 'saved');
  const active = tab === 'saved' ? savedQuery : createdQuery;

  // Unfiltered totals for the header and tab chips.
  const { data: createdTotals } = usePlaylistsPage(accountName || undefined, { limit: 1 });
  const { data: savedTotals } = useSavedPlaylistsPage({ limit: 1 }, isOwner);

  const playlists: Playlist[] = active.data?.playlists ?? [];
  const total = active.data?.total ?? 0;

  // Past the last page (stale link, or the last list on it was deleted): go to the last real page.
  const lastPage = pageCount(total, PER_PAGE);
  const overshot = !!active.data && !active.isPlaceholderData && page > lastPage;
  useEffect(() => {
    if (overshot) updateParams({ page: lastPage > 1 ? String(lastPage) : null }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overshot, lastPage]);

  const setPage = (next: number) => updateParams({ page: next > 1 ? String(next) : null });

  const relative = (iso: string | null | undefined) => (iso ? getRelativeTime(iso, t, timezone, locale) : '—');
  /** Saved lists belong to someone else: they link under their own owner. */
  const ownerOf = (playlist: Playlist) => (tab === 'saved' ? playlist.owner?.accountName : accountName);

  const createdCount = createdTotals?.total ?? 0;
  const savedCount = savedTotals?.total ?? 0;
  const filtered = tab === 'created' && (!!qParam || visibility !== 'ALL');

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 pt-8 pb-12 flex flex-col gap-6">
        <Link to={profilePath(accountName)} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Icon name="arrow_back" size={14} />
          {accountName}
        </Link>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex min-w-60 flex-1 flex-col gap-1.5">
            <h1 className="font-heading text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-none">
              {t('playlists.lists.title')}
            </h1>
            {createdTotals && (
              <span className="text-sm text-muted-foreground">
                {t('playlists.lists.createdCount', { count: createdCount })}
                {isOwner && savedTotals && <> · {t('playlists.lists.savedCount', { count: savedCount })}</>}
              </span>
            )}
          </div>
          {isOwner && (
            <Button className="gap-1.5 rounded-pill" onClick={() => setCreating(true)}>
              <Icon name="add" size={16} />
              {t('playlists.lists.newList')}
            </Button>
          )}
        </div>

        {isOwner && (
          <div className="border-b border-border">
            <CountTabs
              label={t('playlists.lists.tabsLabel')}
              value={tab}
              onChange={(next) => updateParams({ tab: next === 'created' ? null : next, q: null })}
              tabs={[
                { value: 'created', label: t('playlists.lists.created'), count: createdTotals ? createdCount : undefined },
                { value: 'saved', label: t('playlists.lists.saved'), count: savedTotals ? savedCount : undefined },
              ]}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {/* The saved query is ordered by save date and takes no filters, so its tab has none. */}
          {tab === 'created' && (
            <>
              <SearchField
                compact
                value={query}
                onValueChange={setQuery}
                label={t('playlists.lists.searchLabel')}
                placeholder={t('playlists.lists.searchPlaceholder')}
                clearLabel={t('playlists.lists.clearSearch')}
                className="flex-[1_1_15rem] max-w-sm"
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                {t('playlists.lists.sortLabel')}
                <SelectField
                  aria-label={t('playlists.lists.sortLabel')}
                  value={sort}
                  onValueChange={(next) => updateParams({ sort: next === 'UPDATED' ? null : next })}
                  options={SORTS.map((s) => ({ value: s, label: t(`playlists.lists.sort.${s}`) }))}
                  className="min-w-44"
                />
              </label>
              {isOwner && (
                <SegmentedControl
                  label={t('playlists.lists.visibilityLabel')}
                  value={visibility}
                  onChange={(next) => updateParams({ vis: next === 'ALL' ? null : next })}
                  options={VISIBILITIES.map((v) => ({ value: v, label: t(`playlists.lists.visibility.${v}`) }))}
                  className="[&_button]:h-8 [&_button]:px-3 [&_button]:text-sm"
                />
              )}
            </>
          )}
          <div className="flex-1" />
          <SegmentedControl
            label={t('playlists.lists.layoutLabel')}
            value={layout}
            onChange={setLayout}
            options={[
              { value: 'grid', label: <Icon name="grid_view" size={16} />, ariaLabel: t('playlists.lists.gridView') },
              { value: 'table', label: <Icon name="view_list" size={16} />, ariaLabel: t('playlists.lists.tableView') },
            ]}
            className="[&_button]:h-8 [&_button]:px-2.5"
          />
        </div>

        {active.isPending ? (
          layout === 'grid' ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(13.75rem,1fr))] gap-4">
              {Array.from({ length: PER_PAGE }, (_, i) => <PlaylistTileSkeleton key={i} />)}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[4.75rem] rounded-xl" />)}
            </div>
          )
        ) : playlists.length === 0 ? (
          tab === 'saved' ? (
            <SavedListsEmpty />

          ) : (
            <EmptyState
              art={filtered ? 'search' : 'lists'}
              title={filtered ? t('playlists.lists.noMatches') : isOwner ? t('playlists.lists.emptyOwn') : t('playlists.lists.empty')}
              className="py-12"
            />
          )
        ) : layout === 'grid' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(13.75rem,1fr))] gap-4">
            {playlists.map((playlist) => (
              <PlaylistTile
                key={playlist.id}
                playlist={playlist}
                accountName={ownerOf(playlist) ?? accountName}
                isOwner={isOwner && tab === 'created'}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            <div className={cn(ROW, 'px-3.5 py-2 border-b border-border text-[11px] font-semibold uppercase tracking-widest text-muted-foreground')}>
              <span />
              <span>{t('playlists.lists.columns.list')}</span>
              <span className="hidden md:block text-right">{t('playlists.lists.columns.projects')}</span>
              <span className="hidden md:block text-right">{t('playlists.lists.columns.saves')}</span>
              <span className="hidden md:block text-right">{t('playlists.lists.columns.views')}</span>
              <span className="text-right">{t('playlists.lists.columns.updated')}</span>
            </div>
            {playlists.map((playlist) => (
              <Link
                key={playlist.id}
                to={listPath(ownerOf(playlist), playlist.id)}
                className={cn(ROW, 'group px-3.5 py-2.5 rounded-xl hover:bg-accent/40 transition-colors')}
              >
                <PlaylistCover playlist={playlist} className="size-14 rounded-[10px]" iconSize={20} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[15px] font-medium text-foreground group-hover:text-primary transition-colors">{playlist.name}</span>
                    {!playlist.isPublic && (
                      <Icon name="lock" size={13} className="shrink-0 text-muted-foreground" />
                    )}
                    {playlist.isPublic && playlist.listed === false && (
                      <Icon name="link" size={13} className="shrink-0 text-muted-foreground" aria-label={t('playlists.unlisted')} />
                    )}
                  </span>
                  <span className={cn('truncate text-sm text-muted-foreground', !playlist.description && 'italic opacity-60')}>
                    {playlist.description || t('playlists.lists.noDescription')}
                  </span>
                </span>
                <span className="hidden md:block text-right font-mono text-sm text-muted-foreground">{playlist.projectCount}</span>
                <span className="hidden md:block text-right font-mono text-sm text-muted-foreground">{playlist.savedCount}</span>
                <span className="hidden md:block text-right font-mono text-sm text-muted-foreground">{playlist.viewCount}</span>
                <span className="truncate text-right text-sm text-muted-foreground">{relative(playlist.updatedAt)}</span>
              </Link>
            ))}
          </div>
        )}

        <ListPager page={page} perPage={PER_PAGE} total={total} shown={playlists.length} onPageChange={setPage} />
      </div>

      {creating && (
        <PlaylistModal onClose={() => setCreating(false)} onSave={() => setCreating(false)} />
      )}
    </div>
  );
}
