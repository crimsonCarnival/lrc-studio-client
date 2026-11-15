import { lazy, Suspense } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import { cn } from '@/shared/utils/utils';
import { resolveCoverImage } from '@/shared/utils/cover-image';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { profilePath } from '@/features/profile/profile-path';
import { projectPath } from '@/features/projects/project-path';
import { formatTrackLength } from '@/features/playlists/playlist-stats';
import { useShelfArtist } from '../shelf.queries';
import type { ShelfAlbum, ShelfProject, ShelfTrack } from '../shelf.service';
import { VisibilityChip } from './VisibilityChip';

const NotFoundPage = lazy(() => import('@/app/NotFoundPage'));

const GRID = 'grid grid-cols-[1.75rem_minmax(0,1fr)_3.5rem] md:grid-cols-[2rem_minmax(0,1fr)_9rem_6rem_3.5rem] items-center gap-3';

const isSynced = (p: ShelfProject) => (p.lineCount ?? 0) > 0 && (p.syncedLineCount ?? 0) >= (p.lineCount ?? 0);

function TrackRow({ track, ownerAccountName }: { track: ShelfTrack; ownerAccountName: string }) {
  const { t } = useTranslation();
  const { project } = track;
  const href = projectPath(project, ownerAccountName);
  const title = project.metadata?.songName || project.title || t('playlists.detail.untitled');
  const mode = project.kind === 'subtitles'
    ? t('project.kindSubtitles')
    : project.hasWordSync ? t('playlists.detail.wordSync') : t('playlists.detail.lineSync');
  const synced = isSynced(project);
  return (
    <li className={cn(GRID, 'border-t border-border px-2 py-2.5 text-sm')}>
      <span className="text-right font-mono text-muted-foreground">{track.trackNumber ?? '·'}</span>
      {href
        ? <Link to={href} className="truncate font-medium text-foreground hover:underline">{title}</Link>
        : <span className="truncate font-medium text-foreground">{title}</span>}
      <span className="hidden text-xs text-muted-foreground md:block">{mode}</span>
      <span className={cn('hidden text-xs md:block', synced ? 'text-foam' : 'text-gold')}>
        {synced ? t('profile.artists.synced') : t('profile.artists.inProgress')}
      </span>
      <span className="text-right font-mono text-sm text-muted-foreground">{formatTrackLength(project.upload?.duration) ?? '—'}</span>
    </li>
  );
}

function AlbumSection({ album, isOwner, ownerAccountName }: { album: ShelfAlbum; isOwner: boolean; ownerAccountName: string }) {
  const { t } = useTranslation();
  const isSingles = album.key === '';
  const cover = album.coverImage || resolveCoverImage(album.tracks[0]?.project);
  const songs = t('profile.artists.songs', { count: album.trackCount });
  const meta = isSingles
    ? `${t('profile.artists.singlesHint')} · ${songs}`
    : [album.year, songs].filter(Boolean).join(' · ');
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
          {cover
            ? <img src={cover} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
            : <Icon name="music_note" size={20} />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="truncate font-heading text-lg font-semibold text-foreground">
            {isSingles ? t('profile.artists.singles') : album.title}
          </h2>
          <span className="text-sm text-muted-foreground">{meta}</span>
        </div>
        {isOwner && <VisibilityChip isPublic={album.isPublic} />}
      </div>
      <ol className="flex flex-col">
        {album.tracks.map((track) => (
          <TrackRow key={track.project.id} track={track} ownerAccountName={ownerAccountName} />
        ))}
      </ol>
    </section>
  );
}

/** `/:accountName/artists/:artistId`: one artist's albums and tracks. */
export default function ArtistPage() {
  const { t } = useTranslation();
  const { accountName, artistId } = useParams();
  const { user } = useAuthContext();
  const [searchParams] = useSearchParams();

  const isSelf = !!user && !!accountName && user.accountName === accountName;
  // Same preview switch as the profile: `?view=public` shows what a visitor sees.
  const viewAsOthers = isSelf && searchParams.get('view') === 'public';
  const isOwner = isSelf && !viewAsOthers;

  const { data: artist, isPending, isError } = useShelfArtist(accountName, artistId, viewAsOthers);

  if (isPending) {
    return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;
  }
  // The server answers null for a missing artist and for one hidden from this viewer.
  if (isError || !artist || !accountName) {
    return <Suspense fallback={null}><NotFoundPage /></Suspense>;
  }

  const hasSingles = artist.albums.some((a) => a.key === '');
  const realAlbums = artist.albums.length - (hasSingles ? 1 : 0);
  const synced = artist.albums.reduce((n, a) => n + a.tracks.filter((tr) => isSynced(tr.project)).length, 0);
  const summary = [
    realAlbums > 0 && (hasSingles ? t('profile.artists.albumsAndSingles', { count: realAlbums }) : t('profile.artists.albums', { count: realAlbums })),
    t('profile.artists.songs', { count: artist.songCount }),
    t('profile.artists.fullySynced', { count: synced }),
  ].filter(Boolean).join(' · ');
  const backTo = `${profilePath(accountName)}?tab=artists${viewAsOthers ? '&view=public' : ''}`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
      <Link to={backTo} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <Icon name="arrow_back" size={16} />
        {t('profile.artists.back', { name: accountName })}
      </Link>

      <header className="flex flex-wrap items-end gap-6">
        <span className="flex size-36 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted text-6xl font-bold text-muted-foreground sm:size-44">
          {artist.coverImage
            ? <img src={artist.coverImage} alt="" className="size-full object-cover" decoding="async" />
            : <span aria-hidden="true">{Array.from(artist.name)[0]?.toUpperCase()}</span>}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('profile.artists.kicker')}</span>
          <h1 className="break-words font-heading text-4xl font-bold text-foreground">{artist.name}</h1>
          <span className="text-sm text-muted-foreground">{summary}</span>
        </div>
        {isOwner && <VisibilityChip isPublic={artist.isPublic} />}
      </header>

      <div className="flex flex-col gap-5">
        {artist.albums.map((album) => (
          <AlbumSection key={album.key} album={album} isOwner={isOwner} ownerAccountName={accountName} />
        ))}
      </div>
    </div>
  );
}
