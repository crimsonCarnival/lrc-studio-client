import { useRef, useState, useEffect, useLayoutEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
const NotFoundPage = lazy(() => import('@/app/NotFoundPage'));
import { SettingsProvider } from '@/features/settings/SettingsContext';
import { TooltipProvider } from '@ui/tooltip';
import { Spinner } from '@ui/skeleton';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import PlayerRaw from '@features/player/components/Player';
import { resolveCoverImage } from '@/shared/utils/cover-image';
import { ProjectUpNextPanel } from './ProjectUpNextPanel';
import { usePublicProject } from '../hooks/usePublicProject';
import { useColorPalette } from '../hooks/useColorPalette';
import { useStarredPlaylist } from '../hooks/useStarredPlaylist';
import ImmersiveLyricsDisplay, { type DisplayLine } from './ImmersiveLyricsDisplay';
import ProjectInfoPanel from './ProjectInfoPanel';
import { useProjectViewers } from '../hooks/useProjectViewers';
import { ViewerBadges } from './ViewerBadges';
import { getPlaylist } from '@features/playlists/playlist.service';
import { ReactionBar } from '@features/reactions/components/ReactionBar';
import { ScrollProgress } from '@/shared/ui/magicui/scroll-progress';
import { useProjectReactions } from '@features/reactions/hooks/useReactions';
import { connectSocket } from '@/app/socket.client';
import toast from 'react-hot-toast';
import { sectionsToFlat } from '@/features/editor/utils/sections';
import type { EditorLine } from '@/features/editor/services/editor.service';
import { projects as projectsApi } from '@/app/api';
import { projectsService } from '@features/projects/services/projects.service';
import { splitArtists } from '@/shared/utils/lrc';
import { buildSingerRoster } from '@features/editor/utils/singer-colors';

// Player is a large untyped component; alias to bypass prop checking until migrated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Player = PlayerRaw as any;

interface PublicProject {
  publicId?: string;
  isStarredByMe?: boolean;
  starCount?: number;
  forkCount?: number;
  title?: string;
  metadata?: { songName?: string; [key: string]: unknown };
  lyrics?: { sections?: unknown[]; editorMode?: string };
  upload?: {
    source?: string;
    uploadUrl?: string;
    id?: string;
    fileName?: string;
    title?: string;
    duration?: number;
    publicId?: string;
  };
  user?: { id?: string; accountName?: string };
  [key: string]: unknown;
}

interface UpNextPlaylist {
  projects?: { publicId: string }[];
  owner?: { accountName?: string };
  [key: string]: unknown;
}

function PublicProjectViewPageInner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { publicId } = useParams();
  const [searchParams] = useSearchParams();
  const listId = searchParams.get('list');
  const initialSeek = parseInt(searchParams.get('s') || '0', 10) || 0;

  const rightPanelRef = useRef<HTMLDivElement>(null);

  const { user } = useAuthContext();
  const { project, loading, notFound } = usePublicProject(publicId) as { project: PublicProject | null; loading: boolean; notFound: boolean };
  const { reactions: projectReactions, myReaction: myProjectReaction, react: reactToProject } = useProjectReactions(project?.publicId ?? null) as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reactions: any; myReaction: any; react: (...args: any[]) => void;
  };

  // ── Star / Starred-playlist ──────────────────────────────────
  // Local deltas let us apply optimistic updates while deriving base from the server response.
  const [starredOverride, setStarredOverride] = useState<boolean | null>(null);
  const [starDelta, setStarDelta] = useState(0);
  const [starring, setStarring] = useState(false);
  const { addToStarred, removeFromStarred } = useStarredPlaylist(user) as {
    addToStarred: (id?: string) => void; removeFromStarred: (id?: string) => void;
  };

  // Derive star state — no effect needed; reset local override when the project changes
  const isStarred = starredOverride ?? project?.isStarredByMe ?? false;
  // Each live counter is tagged with the publicId it was computed for, rather than
  // reset in an effect on navigation. This page has three differently-shaped live-
  // counter mechanisms: star and fork counts are pushed over Socket.IO as they
  // happen elsewhere, while the view count is pulled once per publicId from the
  // "Track view" registerView response below. (View isn't socket-pushed because a
  // view is registered by the viewer's own request — only that viewer needs to see
  // it immediately; the owner's page doesn't subscribe to other people's views.)
  // Tagging with pid — instead of clearing the state in an effect keyed on
  // project?.publicId — means a stale count from the previous project can never
  // render even for a single frame while navigating in place (e.g. the up-next
  // panel), since the value is only used when its pid matches the current project.
  type LiveCount = { pid: string; count: number } | null;
  const [liveStarCount, setLiveStarCount] = useState<LiveCount>(null);
  const [liveForkCount, setLiveForkCount] = useState<LiveCount>(null);
  const [liveViewCount, setLiveViewCount] = useState<LiveCount>(null);
  const viewRegisteredForRef = useRef<string | null>(null);
  // Tracks the most recently rendered publicId so an in-flight registerView
  // call can tell, at resolution time, whether the user has since navigated
  // to a different project — see the "Track view" effect below. Synced in a
  // layout effect (not during render) since refs must not be written while
  // rendering, and it must be current before any paint-triggered network
  // callback could read it.
  const latestPublicIdRef = useRef<string | null | undefined>(project?.publicId);
  useLayoutEffect(() => {
    latestPublicIdRef.current = project?.publicId;
  }, [project?.publicId]);
  const liveStarValue = liveStarCount && liveStarCount.pid === project?.publicId ? liveStarCount.count : null;
  const liveForkValue = liveForkCount && liveForkCount.pid === project?.publicId ? liveForkCount.count : null;
  const liveViewValue = liveViewCount && liveViewCount.pid === project?.publicId ? liveViewCount.count : null;
  const starCount = liveStarValue ?? ((project?.starCount ?? 0) + starDelta);

  // ── Live socket updates: star count, fork notifications ───────
  useEffect(() => {
    const pid = project?.publicId;
    if (!pid) return;
    const socket = connectSocket();

    const onStarUpdate = (payload: { publicId: string; starCount: number }) => {
      if (payload.publicId !== pid) return;
      // Absolute replace, not additive — avoids double-counting our own optimistic delta.
      setLiveStarCount({ pid, count: payload.starCount });
      setStarDelta(0);
    };
    const onForked = (payload: { publicId: string }) => {
      if (payload.publicId !== pid) return;
      setLiveForkCount((prev) => ({
        pid,
        count: (prev?.pid === pid ? prev.count : (project?.forkCount ?? 0)) + 1,
      }));
      toast(t('projectView.someoneForked'));
    };

    socket.on('star:update', onStarUpdate);
    socket.on('project:forked', onForked);
    return () => {
      socket.off('star:update', onStarUpdate);
      socket.off('project:forked', onForked);
    };
  }, [project?.publicId, project?.forkCount, t]);

  const displayProject = project && (liveForkValue !== null || liveViewValue !== null)
    ? {
        ...project,
        ...(liveForkValue !== null ? { forkCount: liveForkValue } : {}),
        ...(liveViewValue !== null ? { viewCount: liveViewValue } : {}),
      }
    : project;

  // ── Player / playback state ──────────────────────────────────
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [hasMedia, setHasMedia] = useState(false);

  // ── Up-next playlist ─────────────────────────────────────────
  const [playlist, setPlaylist] = useState<UpNextPlaylist | null>(null);
  useEffect(() => {
    if (!listId) return;
    let cancelled = false;
    getPlaylist(listId)
      .then((pl) => { if (!cancelled) setPlaylist(pl as UpNextPlaylist); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [listId]);

  // ── Track view ───────────────────────────────────────────────
  // The ref only absorbs StrictMode's double effect invocation; real
  // deduplication (per viewer, per UTC day, owner excluded) is the server's
  // job now. The old sessionStorage guard was per-tab, so reopening the
  // project in a new tab counted again.
  //
  // Staleness is decided at *resolution* time by comparing against
  // latestPublicIdRef, not by a `cancelled` flag captured in this run's
  // cleanup. Under StrictMode, React mounts, cleans up, and remounts this
  // effect synchronously before the network call can resolve — a cleanup-
  // based `cancelled` flag would be flipped by that synthetic unmount and
  // permanently discard this run's own eventual result, even though it's
  // the only call that ever fires (the remount is skipped by the
  // viewRegisteredForRef gate below). Comparing pids instead lets this run's
  // result land normally, while still discarding it if the user has since
  // navigated to a different project.
  useEffect(() => {
    const pid = project?.publicId;
    if (!pid || viewRegisteredForRef.current === pid) return;
    viewRegisteredForRef.current = pid;
    projectsService.registerView(pid).then((res) => {
      if (res && latestPublicIdRef.current === pid) setLiveViewCount({ pid, count: res.viewCount });
    });
  }, [project?.publicId]);

  // ── Derived data ─────────────────────────────────────────────
  const lines = useMemo(() => {
    const raw = sectionsToFlat(project?.lyrics?.sections || []);
    const result: EditorLine[] = [];
    let currentSingers: string[] | undefined = undefined;
    for (const l of raw) {
      if (l.type === 'section') currentSingers = l.singers as string[] | undefined;
      result.push({ ...l, id: l.id || crypto.randomUUID(), singers: l.singers ?? currentSingers });
    }
    return result;
  }, [project]);
  const editorMode = project?.lyrics?.editorMode || 'lrc';
  const projectTitle = project?.metadata?.songName || project?.title || '';

  const songArtists = useMemo(
    () => splitArtists(project?.metadata?.songArtist as string | undefined),
    [project?.metadata],
  );
  const songSingers = useMemo(
    () => buildSingerRoster(lines, songArtists),
    [lines, songArtists],
  );
  const singerColors = (project?.metadata?.singerColors as string[] | undefined) || [];

  const initialMedia = useMemo(() => {
    const upload = project?.upload;
    if (!upload) return null;
    if (upload.source === 'youtube' && upload.uploadUrl)
      return { type: 'youtube', url: upload.uploadUrl };
    if (upload.source === 'cloudinary' && upload.uploadUrl)
      return { type: 'cloudinary', id: upload.id, url: upload.uploadUrl,
               fileName: upload.fileName ?? null, title: upload.title ?? null,
               duration: upload.duration ?? null, publicId: upload.publicId ?? null };
    return null;
  }, [project]);

  const [mediaTitleOverride, setMediaTitle] = useState<string | null>(null);
  const mediaTitle = mediaTitleOverride ?? projectTitle;
  // usePageTitle's JS param type is mis-inferred; it accepts a title string at runtime.
  (usePageTitle as (title?: string | null) => void)(mediaTitle);

  const cover = resolveCoverImage(project);
  const palette = useColorPalette(cover);

  // ── Ownership ────────────────────────────────────────────────
  const isOwner = !!(user && project?.user?.id && user.id === project.user.id);

  // The owner gate here is UI-only. The server independently refuses to send
  // the roster to anyone who is not the owner.
  const { viewers: rawViewers, anonymousCount } = useProjectViewers(project?.publicId ?? null, isOwner);
  // The owner also emits viewers:join for their own project (harmless — see
  // useProjectViewers), so filter their own entry out of the roster shown to
  // them. anonymousCount is untouched: it doesn't include the owner's socket.
  const viewers = useMemo(
    () => (user ? rawViewers.filter((v) => v.userId !== user.id) : rawViewers),
    [rawViewers, user],
  );

  // ── Prev / next within list ──────────────────────────────────
  const { prevTrack, nextTrack } = useMemo(() => {
    const items = playlist?.projects || [];
    const idx = items.findIndex((p) => p.publicId === publicId);
    if (idx === -1) return { prevTrack: null, nextTrack: null };
    return {
      prevTrack: idx > 0 ? items[idx - 1] : null,
      nextTrack: idx < items.length - 1 ? items[idx + 1] : null,
    };
  }, [playlist, publicId]);

  const goToTrack = useCallback((track: { publicId: string } | null) => {
    if (!track) return;
    navigate(`/project/${track.publicId}?list=${listId}`);
  }, [navigate, listId]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleStar = async () => {
    if (!user || starring || !project?.publicId) return;
    setStarring(true);
    const wasStarred = isStarred;
    setStarredOverride(!wasStarred);
    setStarDelta((d) => wasStarred ? d - 1 : d + 1);
    try {
      if (wasStarred) {
        await projectsApi.unstar(project.publicId);
        removeFromStarred(project.publicId);
      } else {
        await projectsApi.star(project.publicId);
        addToStarred(project.publicId);
      }
    } catch {
      setStarredOverride(wasStarred);
      setStarDelta((d) => wasStarred ? d + 1 : d - 1);
    } finally {
      setStarring(false);
    }
  };

  const handleFork = useCallback(() => {
    window.location.href = `/project/fork/${publicId}`;
  }, [publicId]);

  const handleEdit = useCallback(() => {
    navigate(`/project/${publicId}/edit`);
  }, [navigate, publicId]);

  const handleSignUp = useCallback(() => {
    navigate(`/auth/signup?redirect=${encodeURIComponent(`/project/${publicId}`)}`);
  }, [navigate, publicId]);

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Spinner size={28} className="text-primary" />
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <Suspense fallback={null}>
        <NotFoundPage type="project" identifier={publicId} />
      </Suspense>
    );
  }

  const meta = project.metadata || {};

  // Palette-driven page background (transitions when navigating between projects)
  const pageBg = palette
    ? `linear-gradient(180deg, ${palette.bgDeep} 0%, ${palette.bg} 40%, ${palette.bgDeep} 100%)`
    : 'hsl(var(--background))';

  return (
    <div
      className="flex-1 flex flex-col min-h-0 overflow-hidden"
      style={{ background: pageBg, transition: 'background 0.8s ease' }}
    >
      {/* ── Guest CTA strip ─────────────────────────────────── */}
      {!user && (
        <div
          className="w-full flex-shrink-0"
          style={{
            borderBottom: `1px solid ${palette?.faded ?? 'hsl(var(--border))'}44`,
            background: palette ? `${palette.bg}cc` : 'hsl(var(--card) / 0.6)',
          }}
        >
          <div className="flex items-center gap-3 px-4 py-2.5 max-w-screen-xl mx-auto">
            <p className="text-xs flex-1 min-w-0 truncate" style={{ color: palette?.faded ?? 'hsl(var(--muted-foreground))' }}>
              {t('projectView.ctaGuest')}
            </p>
            <button
              onClick={handleSignUp}
              className="shrink-0 h-7 px-3 text-[11px] font-medium rounded-full border transition-colors"
              style={{
                color: palette?.fg ?? 'hsl(var(--foreground))',
                borderColor: palette?.faded ?? 'hsl(var(--border))',
              }}
            >
              {t('projectView.signUpButton')}
            </button>
          </div>
        </div>
      )}

      {/* ── Main content: 2-col (lyrics | info panel) ────────── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">

        {/* Left: lyrics + player — ~70% on desktop. On mobile the wrapper dissolves
            (display: contents) so the order-* classes put the player below the info panel. */}
        <div className="contents lg:flex lg:flex-1 lg:min-h-0 lg:flex-col">
          <div className="order-1 flex-1 min-h-0 flex flex-col" style={{ minHeight: '50vh' }}>
            <ImmersiveLyricsDisplay
              lines={lines as unknown as DisplayLine[]}
              playbackPosition={playbackPosition}
              editorMode={editorMode}
              playerRef={playerRef}
              hasMedia={hasMedia}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              palette={palette}
              showTranslations
              songSingers={songSingers}
              singerColors={singerColors}
            />
          </div>

          {/* ── Player bar: bottom of the lyrics panel on desktop, bottom of the page on mobile ── */}
          <div
            className="order-3 flex-shrink-0 w-full"
            style={{
              borderTop: `1px solid ${palette?.faded ?? 'hsl(var(--border))'}44`,
              background: palette ? `${palette.bgDeep}e0` : 'hsl(var(--card) / 0.8)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <div className="px-4 sm:px-6 py-3">
              {!hasMedia && !initialMedia
                ? <p className="text-xs text-center py-2" style={{ color: palette?.faded ?? 'hsl(var(--muted-foreground))' }}>{t('projectView.noAudio')}</p>
                : null}

              <Player
                ref={playerRef}
                mediaTitle={mediaTitle}
                onTimeUpdate={setPlaybackPosition}
                onPlayingChange={setIsPlaying}
                onSpeedChange={setPlaybackSpeed}
                onDurationChange={() => {}}
                onMediaChange={setHasMedia}
                onYtUrlChange={() => {}}
                onTitleChange={setMediaTitle}
                initialMedia={initialMedia}
                initialSeek={initialSeek}
                initialSpeed={1}
                lines={lines}
                playbackPosition={playbackPosition}
                syncMode={false}
                onMediaUpload={() => {}}
                projectMetadata={meta}
                viewerMode
              />

              {/* Prev / next in playlist context */}
              {listId && (prevTrack || nextTrack) && (
                <div className="flex items-center justify-between mt-2">
                  <button
                    disabled={!prevTrack}
                    onClick={() => goToTrack(prevTrack)}
                    className="h-7 px-2.5 text-[11px] disabled:opacity-30 transition-opacity"
                    style={{ color: palette?.nearer ?? 'hsl(var(--foreground))' }}
                  >
                    {t('projectView.prevTrack')}
                  </button>
                  <button
                    disabled={!nextTrack}
                    onClick={() => goToTrack(nextTrack)}
                    className="h-7 px-2.5 text-[11px] disabled:opacity-30 transition-opacity"
                    style={{ color: palette?.nearer ?? 'hsl(var(--foreground))' }}
                  >
                    {t('projectView.nextTrack')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: info panel — fixed width on desktop, stacked below on mobile */}
        <div
          ref={rightPanelRef}
          className="order-2 lg:order-none relative lg:w-80 xl:w-96 lg:flex-shrink-0 overflow-y-auto scrollbar-none"
        >
          <ScrollProgress containerRef={rightPanelRef} className="absolute top-0 z-20" />
          <div className="p-4 flex flex-col gap-4">
            <ProjectInfoPanel
              project={displayProject!}
              cover={cover}
              palette={palette}
              isOwner={isOwner}
              user={user}
              isStarred={isStarred}
              starCount={starCount}
              starring={starring}
              onStar={handleStar}
              onFork={handleFork}
              onEdit={handleEdit}
              reactionsSlot={
                <ReactionBar
                  reactions={projectReactions}
                  myReaction={myProjectReaction}
                  onReact={user ? reactToProject : undefined}
                  disabled={!user}
                />
              }
              viewersSlot={isOwner ? <ViewerBadges viewers={viewers} anonymousCount={anonymousCount} /> : undefined}
              lines={lines}
              songSingers={songSingers}
              singerColors={singerColors}
            />

            {/* Up-next panel (list context) */}
            {listId && playlist && (
              <ProjectUpNextPanel
                playlist={playlist as Parameters<typeof ProjectUpNextPanel>[0]['playlist']}
                currentpublicId={publicId}
                listId={listId}
                accountName={playlist.owner?.accountName || project?.user?.accountName}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicProjectViewPage() {
  return (
    <SettingsProvider>
      <TooltipProvider>
        <PublicProjectViewPageInner />
      </TooltipProvider>
    </SettingsProvider>
  );
}