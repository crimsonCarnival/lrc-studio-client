import { useRef, useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
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
import ImmersiveLyricsDisplay from './ImmersiveLyricsDisplay';
import ProjectInfoPanel from './ProjectInfoPanel';
import { getPlaylist } from '@features/playlists/playlist.service';
import { ReactionBar } from '@features/reactions/components/ReactionBar';
import { ScrollProgress } from '@/shared/ui/magicui/scroll-progress';
import { useProjectReactions } from '@features/reactions/hooks/useReactions';
import { sectionsToFlat } from '@/features/editor/utils/sections';
import { projects as projectsApi } from '@/app/api';

// Player is a large untyped component; alias to bypass prop checking until migrated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Player = PlayerRaw as any;

interface PublicProject {
  publicId?: string;
  isStarredByMe?: boolean;
  starCount?: number;
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
  const starCount = (project?.starCount ?? 0) + starDelta;

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

  // ── Derived data ─────────────────────────────────────────────
  const lines = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => sectionsToFlat(project?.lyrics?.sections || []).map((l: any) => ({ ...l, id: l.id || crypto.randomUUID() })),
    [project],
  );
  const editorMode = project?.lyrics?.editorMode || 'lrc';
  const projectTitle = project?.metadata?.songName || project?.title || '';

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

        {/* Left: immersive lyrics — ~70% on desktop, full-width on mobile */}
        <div className="flex-1 min-h-0 flex flex-col" style={{ minHeight: '50vh' }}>
          <ImmersiveLyricsDisplay
            lines={lines}
            playbackPosition={playbackPosition}
            editorMode={editorMode}
            playerRef={playerRef}
            hasMedia={hasMedia}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            palette={palette}
            showTranslations
          />
        </div>

        {/* Right: info panel — fixed width on desktop, stacked below on mobile */}
        <div
          ref={rightPanelRef}
          className="relative lg:w-80 xl:w-96 lg:flex-shrink-0 overflow-y-auto scrollbar-none"
        >
          <ScrollProgress containerRef={rightPanelRef} className="absolute top-0 z-20" />
          <div className="p-4 flex flex-col gap-4">
            <ProjectInfoPanel
              project={project}
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
              lines={lines}
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

      {/* ── Fixed player bar ────────────────────────────────── */}
      <div
        className="flex-shrink-0 w-full"
        style={{
          borderTop: `1px solid ${palette?.faded ?? 'hsl(var(--border))'}44`,
          background: palette ? `${palette.bgDeep}e0` : 'hsl(var(--card) / 0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3">
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
