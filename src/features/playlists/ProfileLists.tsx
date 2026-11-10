import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listPath, listsPath } from '@/features/profile/profile-path';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { EmptyState } from '@ui/EmptyState';
import { InitialsAvatar } from '@ui/InitialsAvatar';
import { Skeleton } from '@ui/skeleton';
import type { Playlist } from '@/types';
import { PlaylistCover } from './PlaylistCover';
import { PlaylistModal } from './PlaylistModal';
import { PlaylistTile, PlaylistTileSkeleton } from './PlaylistTile';
import { ListPager } from './ListPager';
import { pageCount, parsePage } from './list-pager';
import { usePlaylistsPage, useSavedPlaylistsPage } from './playlist.queries';

const CREATED_PER_PAGE = 6;
const SAVED_LIMIT = 4;
/** Search param holding the Created section's 1-based page. */
const PAGE_PARAM = 'lists';

type ProfileListsProps = {
  accountName: string;
  /** The viewer owns this profile (and isn't previewing it as others see it). */
  isOwner: boolean;
};

/** The profile's Lists tab: the lists this user made, then (owner only) the lists they saved. */
export function ProfileLists({ accountName, isOwner }: ProfileListsProps) {
  return (
    <div className="flex flex-col gap-8">
      <CreatedSection accountName={accountName} isOwner={isOwner} />
      {isOwner && <SavedSection accountName={accountName} />}
    </div>
  );
}

type SectionHeaderProps = {
  id: string;
  icon: ReactNode;
  /** Theme tint for the icon tile. */
  tint: string;
  title: string;
  count?: number;
  subtitle: string;
  actions?: ReactNode;
};

function SectionHeader({ id, icon, tint, title, count, subtitle, actions }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-[10px] ${tint}`}>{icon}</span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 id={id} className="font-heading text-lg font-semibold text-foreground">
          {title}
          {count !== undefined && <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">{count}</span>}
        </h2>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </div>
      <div className="flex-1" />
      {actions}
    </div>
  );
}

function CreatedSection({ accountName, isOwner }: ProfileListsProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get(PAGE_PARAM));
  const [creating, setCreating] = useState(false);

  const { data, isPending, isPlaceholderData } = usePlaylistsPage(accountName, {
    offset: (page - 1) * CREATED_PER_PAGE,
    limit: CREATED_PER_PAGE,
    sort: 'UPDATED',
    // The owner's "view as others" preview still sends the owner's session, so
    // the server would include private lists; ask for public ones explicitly.
    // The server ignores `visibility` for real visitors.
    ...(!isOwner && { visibility: 'PUBLIC' as const }),
  });
  const playlists = data?.playlists ?? [];
  const total = data?.total ?? 0;

  const setPage = (next: number) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next <= 1) params.delete(PAGE_PARAM);
      else params.set(PAGE_PARAM, String(next));
      return params;
    }, { replace: true });
  };

  // A page past the end (a stale link, or the last list on the last page was deleted): go to the last real page.
  const lastPage = pageCount(total, CREATED_PER_PAGE);
  const overshot = !!data && !isPlaceholderData && page > lastPage;
  useEffect(() => {
    if (overshot) setPage(lastPage);
    // setPage is rebuilt every render; overshot and lastPage are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overshot, lastPage]);

  return (
    <section aria-labelledby="lists-created" className="flex flex-col gap-4">
      <SectionHeader
        id="lists-created"
        icon={<Icon name="playlist_add" size={16} />}
        tint="bg-iris/15 text-iris"
        title={t('playlists.lists.created')}
        count={data ? total : undefined}
        subtitle={isOwner ? t('playlists.lists.createdSubtitleOwn') : t('playlists.lists.createdSubtitle', { name: accountName })}
        actions={
          <>
            {isOwner && (
              <Button variant="outline" size="sm" className="gap-1.5 rounded-pill" onClick={() => setCreating(true)}>
                <Icon name="add" size={15} />
                {t('playlists.lists.newList')}
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-pill text-iris border-iris/30">
              <Link to={listsPath(accountName)}>
                {t('playlists.lists.viewAll')}
                <Icon name="arrow_forward" size={15} />
              </Link>
            </Button>
          </>
        }
      />

      {isPending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(13.75rem,1fr))] gap-3.5">
          {Array.from({ length: CREATED_PER_PAGE }, (_, i) => <PlaylistTileSkeleton key={i} />)}
        </div>
      ) : playlists.length === 0 ? (
        <EmptyState art="lists" title={isOwner ? t('playlists.lists.emptyOwn') : t('playlists.lists.empty')} className="py-12" />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(13.75rem,1fr))] gap-3.5">
          {playlists.map((playlist) => (
            <PlaylistTile key={playlist.id} playlist={playlist} accountName={accountName} isOwner={isOwner} />
          ))}
        </div>
      )}

      <ListPager page={page} perPage={CREATED_PER_PAGE} total={total} shown={playlists.length} onPageChange={setPage} />

      {creating && (
        <PlaylistModal onClose={() => setCreating(false)} onSave={() => setCreating(false)} />
      )}
    </section>
  );
}

function SavedSection({ accountName }: { accountName: string }) {
  const { t } = useTranslation();
  const { data, isPending } = useSavedPlaylistsPage({ limit: SAVED_LIMIT });
  const playlists = data?.playlists ?? [];

  return (
    <section aria-labelledby="lists-saved" className="flex flex-col gap-4">
      <SectionHeader
        id="lists-saved"
        icon={<Icon name="bookmark" size={16} filled />}
        tint="bg-foam/15 text-foam"
        title={t('playlists.lists.saved')}
        count={data ? data.total : undefined}
        subtitle={t('playlists.lists.savedSubtitle')}
        actions={playlists.length > 0 && (
          <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-pill text-foam border-foam/30">
            <Link to={`${listsPath(accountName)}?tab=saved`}>
              {t('playlists.lists.viewAllSaved')}
              <Icon name="arrow_forward" size={15} />
            </Link>
          </Button>
        )}
      />

      {isPending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-2.5">
          {Array.from({ length: SAVED_LIMIT }, (_, i) => <Skeleton key={i} className="h-[86px] rounded-2xl" />)}
        </div>
      ) : playlists.length === 0 ? (
        <SavedListsEmpty />

      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-2.5">
          {playlists.map((playlist) => <SavedRow key={playlist.id} playlist={playlist} />)}
        </div>
      )}
    </section>
  );
}

/** Shown where the owner's saved lists would be. */
export function SavedListsEmpty() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-2.5 p-7 rounded-2xl border border-dashed border-border text-center">
      <span className="text-[15px] font-medium text-foreground">{t('playlists.lists.savedEmptyTitle')}</span>
      <span className="max-w-sm text-sm text-muted-foreground">{t('playlists.lists.savedEmptyBody')}</span>
      <Button asChild variant="outline" size="sm" className="rounded-pill text-foam border-foam/30">
        <Link to="/explore/playlists">{t('playlists.lists.browsePopular')}</Link>
      </Button>
    </div>
  );
}

/** A saved list in compact form. Links under the list's own owner, not the profile being viewed. */
function SavedRow({ playlist }: { playlist: Playlist }) {
  const { t } = useTranslation();
  const owner = playlist.owner;
  return (
    <Link
      to={listPath(owner?.accountName, playlist.id)}
      className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3.5 py-2.5 pl-2.5 pr-3 rounded-2xl border border-dashed border-border hover:border-solid hover:bg-card transition-colors"
    >
      <PlaylistCover playlist={playlist} className="size-16 rounded-[10px]" iconSize={22} />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-[15px] font-medium text-foreground">{playlist.name}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {owner?.avatarUrl ? (
            <img src={owner.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-[18px] shrink-0 rounded-full object-cover" />
          ) : (
            <InitialsAvatar name={owner?.displayName} handle={owner?.accountName} className="size-[18px] shrink-0 rounded-full text-[9px]" />
          )}
          <span className="truncate">{t('playlists.lists.by', { owner: owner?.accountName ?? '' })}</span>
        </span>
        <span className="text-xs text-muted-foreground">{t('playlists.detail.projects', { count: playlist.projectCount })}</span>
      </span>
      <span role="img" aria-label={t('playlists.lists.savedBadge')} className="flex size-9 items-center justify-center text-foam">
        <Icon name="bookmark" size={16} filled />
      </span>
    </Link>
  );
}
