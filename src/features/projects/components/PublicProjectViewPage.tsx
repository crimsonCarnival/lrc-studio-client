import { useRef, useState, useEffect, useLayoutEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
const NotFoundPage = lazy(() => import('@/app/NotFoundPage'));
import { SettingsProvider } from '@/features/settings/SettingsContext';
import { TooltipProvider } from '@ui/tooltip';
import { Tip } from '@ui/tip';
import { Button } from '@ui/button';
import { Icon } from '@/shared/ui/Icon';
import { Spinner } from '@ui/skeleton';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { PlayerEngineProvider } from '@features/player/PlayerEngine';
import { resolveCoverImage } from '@/shared/utils/cover-image';
import { parseDeepLink } from '@/shared/utils/url-params';
import { ProjectUpNextPanel } from './ProjectUpNextPanel';
import { usePublicProject } from '../hooks/usePublicProject';
import { useStarredPlaylist } from '../hooks/useStarredPlaylist';
import ImmersiveLyricsDisplay, { type DisplayLine } from './ImmersiveLyricsDisplay';
import ProjectInfoPanel from './ProjectInfoPanel';
import PublicPlaybackBar from './PublicPlaybackBar';
import { ShareOgButton } from './ShareOgButton';
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
import { artistRoster } from '@/features/artists/artist-credits';
import { buildSingerRoster } from '@features/editor/utils/singer-colors';
import { projectPath, publicIdFromSlugId, canonicalPathFromParams, projectDisplayName, projectPageTitle } from '@features/projects/project-path';

interface PublicProject {
  publicId?: string;
  slug?: string | null;
  isStarredByMe?: boolean;
  starCount?: number;
  forkCount?: number;
  forksEnabled?: boolean;
  isForkedByMe?: boolean;
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

const INFO_COLLAPSED_KEY = 'lrc_project_info_collapsed';

interface UpNextTrack {
  publicId: string;
  slug?: string | null;
  title?: string | null;
  metadata?: { songName?: string; songArtist?: string } | null;
  // Each track carries its own owner: a playlist can collect other people's
  // projects, and every project URL is owner-scoped.
  user?: { accountName?: string | null } | null;
}

interface UpNextPlaylist {
  projects?: UpNextTrack[];
  owner?: { accountName?: string };
  [key: string]: unknown;
}

function PublicProjectViewPageInner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { accountName, slugId } = useParams();
  // The slug half of the segment is cosmetic — the project resolves by the
  // publicId in its tail.
  const publicId = publicIdFromSlugId(slugId) ?? undefined;
  // The router's location, not window.location: the canonical-URL correction
  // below has to re-run when navigation changes the path in place.
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const listId = searchParams.get('list');
  // Shares the parser with the editor route so `?s=` and `?loop=` mean exactly
  // the same thing on both. Previously `s` was parsed here with parseInt, which
  // read `s=1e5` as 1 and discarded any sub-second precision.
  const { seek: deepLinkSeek, loop: deepLinkLoop } = useMemo(
    () => parseDeepLink(searchParams),
    [searchParams]
  );
  const initialSeek = deepLinkSeek ?? 0;

  const rightPanelRef = useRef<HTMLDivElement>(null);

  const { user } = useAuthContext();
  const { project, loading, notFound } = usePublicProject(publicId) as { project: PublicProject | null; loading: boolean; notFound: boolean };

  // The publicId is the real key; account name and slug in the URL are cosmetic. Whenever
  // they are stale (renamed song/account), absent (legacy /project/:id) or differently
  // cased, swap in the canonical URL. This is the "slug history": old links keep working.
  const canonicalPath = project?.publicId && project.publicId === publicId
    ? projectPath({ ...project, publicId: project.publicId })
    : null;
  useEffect(() => {
    if (canonicalPath && canonicalPath !== location.pathname) {
      navigate(`${canonicalPath}${location.search}${location.hash}`, { replace: true });
    }
  }, [canonicalPath, location.pathname, location.search, location.hash, navigate]);

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

  // Playback state lives in the player context (PlayerEngineProvider below);
  // the stage and the playback bar read the clock from there, so a tick never
  // re-renders this page or the info aside.
  const [fullLyrics, setFullLyrics] = useState(false);
  const toggleFullLyrics = useCallback(() => setFullLyrics((v) => !v), []);

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
    () => artistRoster(project?.metadata as Parameters<typeof artistRoster>[0]),
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
               fileName: upload.fileName, title: upload.title,
               duration: upload.duration ?? null, publicId: upload.publicId ?? null };
    return null;
  }, [project]);

  const [mediaTitleOverride, setMediaTitle] = useState<string | null>(null);
  const mediaTitle = mediaTitleOverride ?? projectTitle;
  // The tab title is the song and artist the owner entered, not whatever the player reports
  // for the media (a YouTube video's title, a file name).
  // usePageTitle's JS param type is mis-inferred; it accepts a title string at runtime.
  (usePageTitle as (title?: string | null) => void)(
    projectPageTitle(
      projectDisplayName({ title: project?.title, metadata: project?.metadata as Parameters<typeof projectDisplayName>[0]['metadata'] }),
      project?.user?.accountName,
      (name) => (t as (k: string, o?: object) => string)('app.titles.syncedBy', { name }),
    ) || mediaTitle,
  );

  const cover = resolveCoverImage(project);

  // Details panel collapse — a viewer preference, remembered across projects.
  // On desktop it hides the whole right column so lyrics and player take the
  // full width; below lg the column is stacked, so the card folds in place.
  const [infoCollapsed, setInfoCollapsed] = useState(() => {
    try { return localStorage.getItem(INFO_COLLAPSED_KEY) === '1'; } catch { return false; }
  });
  const toggleInfoCollapsed = useCallback(() => {
    setInfoCollapsed((prev) => {
      try { localStorage.setItem(INFO_COLLAPSED_KEY, prev ? '0' : '1'); } catch { /* still applies for this session */ }
      return !prev;
    });
  }, []);

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

  const goToTrack = useCallback((track: UpNextTrack | null) => {
    if (!track) return;
    const dest = projectPath(track);
    if (!dest) return;
    navigate(`${dest}?list=${listId}`);
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

  // Rebuilt from the loaded project, NOT from the path this page happens to sit
  // on. The account segment is cosmetic — the project resolves by the id at the
  // tail of the slug segment — so a link can carry any account name, and a
  // percent-encoded slash in it decodes to one that would make these handlers
  // navigate off-site. projectPath encodes what it builds; the params fallback
  // encodes too, for a project that has not loaded yet.
  // Action targets hang off the canonical path above, which is built from the
  // loaded project. While it is still loading, the params stand in — re-encoded
  // by canonicalPathFromParams, never interpolated raw: a percent-encoded slash
  // in the (cosmetic) account segment would otherwise decode into a
  // protocol-relative URL and send a fork click off-site.
  const actionPath = canonicalPath ?? canonicalPathFromParams(accountName, slugId);

  const handleFork = useCallback(() => {
    window.location.href = `${actionPath}/fork`;
  }, [actionPath]);

  const handleEdit = useCallback(() => {
    navigate(`${actionPath}/edit`);
  }, [navigate, actionPath]);

  const handleSignUp = useCallback(() => {
    navigate(`/auth/signup?redirect=${encodeURIComponent(actionPath)}`);
  }, [navigate, actionPath]);

  // A segment too short to hold a publicId can never name a project, so there
  // is nothing to fetch — go straight to 404 instead of spinning forever.
  if (!publicId) {
    return (
      <Suspense fallback={null}>
        <NotFoundPage type="project" identifier={slugId} />
      </Suspense>
    );
  }

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
        <NotFoundPage type="project" identifier={slugId} />
      </Suspense>
    );
  }

  const meta = project.metadata || {};
  const canFork = project.forksEnabled !== false && !project.isForkedByMe && !isOwner;

  return (
    <PlayerEngineProvider
      mediaTitle={mediaTitle}
      onTitleChange={setMediaTitle}
      initialMedia={initialMedia}
      initialSeek={initialSeek}
      initialSpeed={1}
      initialLoop={deepLinkLoop}
      lines={lines}
      syncMode={false}
      projectMetadata={meta}
      viewerMode
    >
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
      {/* ── Guest CTA strip ─────────────────────────────────── */}
      {/* Phones and tablets only. On desktop the lyrics run under the fixed header, so the
          strip sat hidden behind it while still pushing the page 49px down; the header
          already has Sign up there. */}
      {!user && (
        <div className="w-full flex-shrink-0 border-b border-border bg-card/60 lg:hidden">
          <div className="flex items-center gap-3 px-4 py-2.5 max-w-screen-xl mx-auto">
            <p className="text-xs flex-1 min-w-0 truncate text-muted-foreground">
              {t('projectView.ctaGuest')}
            </p>
            <Button variant="outline" size="sm" onClick={handleSignUp} className="h-8 shrink-0 rounded-full px-3 text-xs coarse:h-11">
              {t('projectView.signUpButton')}
            </Button>
          </div>
        </div>
      )}

      {/* ── Main content: 2-col (lyrics | info panel), player always full width below ── */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">

          {/* Left: lyrics — natural DOM order puts it first both stacked
              (mobile) and in the row (desktop), so no order-* juggling needed. */}
          <div className="relative flex-1 min-h-0 flex flex-col" style={{ minHeight: '50vh' }}>
            {/* Desktop only: the column that holds the card's own toggle is hidden.
                top-23 / right-7 = the 64px header + the card's 28px padding, i.e. exactly
                where that toggle sat, so the button does not jump when the card collapses. */}
            {infoCollapsed && (
              <div className="hidden lg:block absolute top-23 right-7 z-20">
                <Tip content={t('projectView.expandInfo')}>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleInfoCollapsed}
                    aria-expanded={false}
                    aria-label={t('projectView.expandInfo')}
                    className="size-9 lg:size-9 rounded-full bg-card/70 backdrop-blur-md border border-border"
                  >
                    <Icon name="chevron_left" size={16} />
                  </Button>
                </Tip>
              </div>
            )}
            <ImmersiveLyricsDisplay
              lines={lines as unknown as DisplayLine[]}
              editorMode={editorMode}
              fullLyrics={fullLyrics}
              reserveCorner={infoCollapsed}
              showTranslations
              songSingers={songSingers}
              singerColors={singerColors}
            />
          </div>

          {/* Right: info panel — fixed width on desktop, stacked below on mobile.
              Its own min-h-0/overflow-y-auto scrolls internally within the row's
              bounded height; it never pushes the page itself into scrolling.
              On desktop this route drops the layout's top padding so the lyrics run
              full-bleed behind the fixed header (AppLayout, `lg:pt-0`). The panel does too,
              so there is no empty band between the header and it; its content starts
              below the header instead (lg:pt-23 = the 64px header + the card's 28px). */}
          <div
            ref={rightPanelRef}
            tabIndex={0}
            aria-label={t('projectView.aboutProject')}
            className={`lrc-scroll relative min-h-0 lg:w-[400px] xl:w-[460px] lg:flex-shrink-0 overflow-y-auto border-border lg:border-l max-lg:border-t bg-card/40 max-lg:pb-64 ${infoCollapsed ? 'lg:hidden' : ''}`}
          >
            <ScrollProgress containerRef={rightPanelRef} className="absolute top-0 z-20 lg:top-16" />
            <div className="px-5 pt-6 pb-6 lg:px-7 lg:pt-23 flex flex-col gap-4 min-h-full">
              <ProjectInfoPanel
                project={displayProject!}
                cover={cover}
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
                collapsed={infoCollapsed}
                onToggleCollapsed={toggleInfoCollapsed}
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

        {/* ── Playback bar: a sibling of the 2-col row, so it spans the page.
            Below lg it pins itself to the viewport (see PublicPlaybackBar); the
            info column carries matching bottom padding. ── */}
        <PublicPlaybackBar
          lines={lines}
          hasInitialMedia={!!initialMedia}
          fullLyrics={fullLyrics}
          onToggleFullLyrics={toggleFullLyrics}
          startSlot={canFork ? (
            <Tip content={t('projectView.forkButton')}>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleFork}
                aria-label={t('projectView.forkButton')}
                className="size-11 rounded-full bg-transparent text-subtle hover:text-foreground lg:size-11"
              >
                <Icon name="call_split" size={18} />
              </Button>
            </Tip>
          ) : undefined}
          endSlot={project.publicId ? <ShareOgButton publicId={project.publicId} title={projectTitle} projectName={project.title} subtitle={project.metadata?.songArtist as string | undefined} coverImage={cover} genre={project.metadata?.genre as string | undefined} /> : undefined}
        >
          {/* Prev / next in playlist context */}
          {listId && (prevTrack || nextTrack) && (
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!prevTrack}
                onClick={() => goToTrack(prevTrack)}
                className="h-9 lg:h-9 coarse:h-11"
              >
                {t('projectView.prevTrack')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!nextTrack}
                onClick={() => goToTrack(nextTrack)}
                className="h-9 lg:h-9 coarse:h-11"
              >
                {t('projectView.nextTrack')}
              </Button>
            </div>
          )}
        </PublicPlaybackBar>
      </div>
    </div>
    </PlayerEngineProvider>
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