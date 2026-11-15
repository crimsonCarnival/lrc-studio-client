import { lazy, Suspense, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import { cn } from '@/shared/utils/utils';
import { resolveCoverImage } from '@/shared/utils/cover-image';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { ToastBody } from '@/shared/ui/app-toast';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@ui/dropdown-menu';
import { listPath, profilePath } from '@/features/profile/profile-path';
import { createPlaylist } from '@/features/playlists/playlist.service';
import { projectPath } from '@/features/projects/project-path';
import { formatTrackLength } from '@/features/playlists/playlist-stats';
import { useSetShelfVisibility, useShelfArtist } from '../shelf.queries';
import type { ShelfAlbum, ShelfProject, ShelfTrack } from '../shelf.service';
import { SongConnections } from '@/features/project-view/SongConnections';
import { VisibilityChip } from './VisibilityChip';

const NotFoundPage = lazy(() => import('@/app/NotFoundPage'));

const GRID = 'grid grid-cols-[1.75rem_minmax(0,1fr)_3.5rem] md:grid-cols-[2rem_minmax(0,1fr)_9rem_6rem_3.5rem] items-center gap-3';

/** Saves tracks as a private snapshot playlist and offers a link to it. Failures toast; they never throw. */
function useSaveAsPlaylist(accountName: string) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const save = async (name: string, tracks: ShelfTrack[]) => {
    const publicIds = tracks.map((tr) => tr.project.publicId);
    if (publicIds.length === 0 || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      const playlist = await createPlaylist({ name, publicIds, isPublic: false });
      if (!playlist) throw new Error('no playlist returned');
      const id = `shelf-playlist-${playlist.id}`;
      toast.success(
        <ToastBody
          title={t('profile.artists.savedAsPlaylist')}
          action={{ label: t('profile.artists.viewPlaylist'), onClick: () => navigate(listPath(accountName, playlist.id)) }}
          toastId={id}
        />,
        { id },
      );
    } catch {
      toast.error(t('profile.artists.saveAsPlaylistFailed'));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  return { save, pending };
}

// The server rejects playlist names over 100 characters (playlist.model.ts).
const PLAYLIST_NAME_MAX = 100;

/** "<Artist> — <part>" capped at 100 chars: the artist is kept, the part is cut with an ellipsis. */
function playlistName(artist: string, part?: string): string {
  if (!part) return artist.slice(0, PLAYLIST_NAME_MAX);
  const full = `${artist} — ${part}`;
  if (full.length <= PLAYLIST_NAME_MAX) return full;
  const room = PLAYLIST_NAME_MAX - artist.length - 3 - 1;
  return room > 0 ? `${artist} — ${part.slice(0, room)}…` : artist.slice(0, PLAYLIST_NAME_MAX);
}

const isSynced = (p: ShelfProject) => (p.lineCount ?? 0) > 0 && (p.syncedLineCount ?? 0) >= (p.lineCount ?? 0);

function TrackRow({ track, ownerAccountName, artistName }: { track: ShelfTrack; ownerAccountName: string; artistName: string }) {
  const { t } = useTranslation();
  const [showConnections, setShowConnections] = useState(false);
  const { project } = track;
  const href = projectPath(project, ownerAccountName);
  const title = project.metadata?.songName || project.title || t('playlists.detail.untitled');
  const mode = project.kind === 'subtitles'
    ? t('project.kindSubtitles')
    : project.hasWordSync ? t('playlists.detail.wordSync') : t('playlists.detail.lineSync');
  const synced = isSynced(project);
  return (
    <li className="border-t border-border px-2 py-2.5 text-sm">
    <div className={GRID}>
      <span className="text-right font-mono text-muted-foreground">{track.trackNumber ?? '·'}</span>
      <span className="flex min-w-0 items-center gap-2">
        {href
          ? <Link to={href} className="truncate font-medium text-foreground hover:underline">{title}</Link>
          : <span className="truncate font-medium text-foreground">{title}</span>}
        {project.kind !== 'subtitles' && (
          <button
            type="button"
            aria-expanded={showConnections}
            onClick={() => setShowConnections((v) => !v)}
            className="shrink-0 rounded-pill border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('projectView.connections.toggle')}
          </button>
        )}
      </span>
      <span className="hidden text-xs text-muted-foreground md:block">{mode}</span>
      <span className={cn('hidden text-xs md:block', synced ? 'text-foam' : 'text-gold')}>
        {synced ? t('profile.artists.synced') : t('profile.artists.inProgress')}
      </span>
      <span className="text-right font-mono text-sm text-muted-foreground">{formatTrackLength(project.upload?.duration) ?? '—'}</span>
    </div>
    {showConnections && (
      <div className="mt-3 pl-11">
        <SongConnections track={title} artist={artistName} />
      </div>
    )}
    </li>
  );
}

type AlbumSectionProps = {
  album: ShelfAlbum;
  isOwner: boolean;
  ownerAccountName: string;
  artistName: string;
  onVisibility: (isPublic: boolean) => void;
  onSave: () => void;
  savePending: boolean;
};

function AlbumSection({ album, isOwner, ownerAccountName, artistName, onVisibility, onSave, savePending }: AlbumSectionProps) {
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
        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t('common.moreActions')}
                className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icon name="more_vert" size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onVisibility(!album.isPublic)} className="max-lg:min-h-11">
                <Icon name={album.isPublic ? 'lock' : 'public'} />
                {album.isPublic ? t('profile.artists.makeAlbumPrivate') : t('profile.artists.makeAlbumPublic')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSave} disabled={savePending} className="max-lg:min-h-11">
                <Icon name="playlist_add" />
                {t('profile.artists.saveAlbumAsPlaylist')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <ol className="flex flex-col">
        {album.tracks.map((track) => (
          <TrackRow key={track.project.id} track={track} ownerAccountName={ownerAccountName} artistName={artistName} />
        ))}
      </ol>
    </section>
  );
}

/** Private/Public as two real radios; the checked state is the cached (optimistic) value. */
function VisibilitySegment({ isPublic, onChange }: { isPublic: boolean; onChange: (isPublic: boolean) => void }) {
  const { t } = useTranslation();
  return (
    <div role="radiogroup" aria-label={t('profile.artists.visibilityLabel')} className="flex rounded-pill border border-border bg-card p-0.5">
      {([false, true] as const).map((value) => (
        <label
          key={String(value)}
          className="cursor-pointer rounded-pill px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
        >
          <input
            type="radio"
            name="artist-visibility"
            className="sr-only"
            checked={isPublic === value}
            onChange={() => onChange(value)}
          />
          {value ? t('profile.artists.public') : t('profile.artists.private')}
        </label>
      ))}
    </div>
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
  const setVisibility = useSetShelfVisibility(accountName ?? '');
  const { save: saveAsPlaylist, pending: savePending } = useSaveAsPlaylist(accountName ?? '');

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
        {isOwner && (
          <div className="flex flex-wrap items-center gap-3">
            <VisibilitySegment isPublic={artist.isPublic} onChange={(v) => setVisibility(artist.id, null, v)} />
            <button
              type="button"
              disabled={savePending}
              onClick={() => saveAsPlaylist(playlistName(artist.name), artist.albums.flatMap((a) => a.tracks))}
              className="flex items-center gap-1.5 rounded-pill border border-border px-3.5 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Icon name="playlist_add" size={16} />
              {t('profile.artists.saveAsPlaylist')}
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-col gap-5">
        {artist.albums.map((album) => (
          <AlbumSection
            key={album.key}
            album={album}
            isOwner={isOwner}
            ownerAccountName={accountName}
            artistName={artist.name}
            onVisibility={(v) => setVisibility(artist.id, album.key, v)}
            savePending={savePending}
            onSave={() => saveAsPlaylist(
              playlistName(artist.name, album.key === '' ? t('profile.artists.singles') : album.title ?? ''),
              album.tracks,
            )}
          />
        ))}
      </div>
    </div>
  );
}
