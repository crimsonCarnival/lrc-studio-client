import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Music2, GitFork, Pencil } from 'lucide-react';
import { SettingsProvider } from '@/features/settings/SettingsContext';
import { TooltipProvider } from '@ui/tooltip';
import { Spinner } from '@ui/skeleton';
import { Button } from '@ui/button';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import Player from '@features/player/components/Player';
import { resolveCoverImage } from '@/shared/utils/cover-image';
import WatchLayout from './WatchLayout';
import MediaStage from './MediaStage';
import LyricsStage from './LyricsStage';
import ProjectMetaBlock from './ProjectMetaBlock';
import { ProjectUpNextPanel } from './ProjectUpNextPanel';
import { usePublicProject } from '../hooks/usePublicProject';
import { getPlaylist } from '@features/playlists/playlist.service';
import { CommentSection } from '@features/comments/components/CommentSection';
import { ReactionBar } from '@features/comments/components/ReactionBar';
import { useProjectReactions } from '@features/comments/hooks/useReactions';

/**
 * Public, read-only project view at /project/:projectId.
 *
 * Watch layout: MediaStage (blurred cover + LyricsStage) | ProjectMetaBlock | optional ProjectUpNextPanel rail.
 * Fixed player bar at the bottom; CTA strip below the AppHeader (rendered by the app shell).
 *
 * Player wiring mirrors SharedProjectViewer: the project upload is passed as
 * initialYtUrl (YouTube) or initialCloudinaryUpload (everything else), and time /
 * playback state flows back via the on* callbacks.
 */
function PublicProjectViewPageInner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const listId = searchParams.get('list');

  const { user } = useAuthContext();
  const { project, loading, notFound } = usePublicProject(projectId);
  const { reactions: projectReactions, myReaction: myProjectReaction, react: reactToProject } = useProjectReactions(project?.projectId ?? null);

  // ── Player / preview state ──
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [hasMedia, setHasMedia] = useState(false);

  // ── Up-next playlist ──
  const [playlist, setPlaylist] = useState(null);

  // Derive read-only data from the fetched project (no effect needed)
  const lines = useMemo(
    () => (project?.lyrics?.lines || []).map((l) => ({
      text: l.text || '',
      timestamp: l.timestamp ?? null,
      endTime: l.endTime ?? undefined,
      secondary: l.secondary || '',
      translation: l.translation || '',
      id: crypto.randomUUID(),
      words: l.words,
      secondaryWords: l.secondaryWords,
    })),
    [project],
  );
  const editorMode = project?.lyrics?.editorMode || 'lrc';
  const projectTitle = project?.metadata?.songName || project?.title || '';

  const { initialYtUrl, initialCloudinaryUpload } = useMemo(() => {
    if (project?.upload?.source === 'youtube' && project?.upload?.youtubeUrl) {
      return { initialYtUrl: project.upload.youtubeUrl, initialCloudinaryUpload: null };
    }
    if (project?.upload?.cloudinaryUrl) {
      return { initialYtUrl: '', initialCloudinaryUpload: project.upload };
    }
    return { initialYtUrl: '', initialCloudinaryUpload: null };
  }, [project]);

  // mediaTitle is stateful because the Player can update it via onTitleChange
  const [mediaTitleOverride, setMediaTitle] = useState(null);
  const mediaTitle = mediaTitleOverride ?? projectTitle;

  usePageTitle(mediaTitle);

  // Fetch playlist when ?list= is present
  useEffect(() => {
    if (!listId) return;
    let cancelled = false;
    getPlaylist(listId)
      .then((pl) => { if (!cancelled) setPlaylist(pl); })
      .catch(() => { if (!cancelled) setPlaylist(null); });
    return () => { cancelled = true; };
  }, [listId]);

  const handleTimeUpdate = useCallback((time) => setPlaybackPosition(time), []);
  const handleMediaChange = useCallback((v) => setHasMedia(v), []);

  // ── Ownership / CTA ──
  const isOwner = !!(user && project?.user?.id && user.id === project.user.id);
  const accountName = project?.user?.accountName;

  const handleFork = useCallback(() => {
    window.location.href = `/project/fork/${projectId}`;
  }, [projectId]);

  const handleSignUp = useCallback(() => {
    navigate(`/auth/signup?redirect=${encodeURIComponent(`/project/${projectId}`)}`);
  }, [navigate, projectId]);

  const handleEdit = useCallback(() => {
    navigate(`/project/${projectId}/edit`);
  }, [navigate, projectId]);

  // ── Prev / next track within the list context ──
  const { prevTrack, nextTrack } = useMemo(() => {
    const items = playlist?.projects || [];
    const idx = items.findIndex((p) => p.projectId === projectId);
    if (idx === -1) return { prevTrack: null, nextTrack: null };
    return {
      prevTrack: idx > 0 ? items[idx - 1] : null,
      nextTrack: idx < items.length - 1 ? items[idx + 1] : null,
    };
  }, [playlist, projectId]);

  const goToTrack = useCallback((track) => {
    if (!track) return;
    navigate(`/project/${track.projectId}?list=${listId}`);
  }, [navigate, listId]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Spinner size={28} className="text-primary" />
      </div>
    );
  }

  // ── Not found ──
  if (notFound || !project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <Music2 className="size-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">{t('projectView.notFound')}</h1>
        <p className="text-sm text-muted-foreground">{t('projectView.notFoundSub')}</p>
      </div>
    );
  }

  const meta = project.metadata || {};
  const cover = resolveCoverImage(project);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      {/* CTA strip — non-owners only, fixed below the AppHeader */}
      {!isOwner && (
        <div className="fixed left-0 right-0 top-[60px] sm:top-[72px] lg:top-[88px] z-[60] bg-background/95 border-b border-border backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-2 max-w-7xl mx-auto w-full">
            <p className="text-xs text-muted-foreground flex-1 truncate">
              {user ? t('projectView.ctaAuth') : t('projectView.ctaGuest')}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              {!user && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSignUp}
                  className="h-7 px-2.5 text-[11px] font-medium rounded-lg"
                >
                  {t('projectView.signUpButton')}
                </Button>
              )}
              {project.forksEnabled !== false && (
                <Button
                  size="sm"
                  onClick={handleFork}
                  className="h-7 px-2.5 text-[11px] font-medium gap-1 rounded-lg"
                >
                  <GitFork className="size-3" />
                  {t('projectView.forkButton')}
                </Button>
              )}
            </div>
            <ReactionBar
              reactions={projectReactions}
              myReaction={myProjectReaction}
              onReact={user && !user.isGuest ? reactToProject : undefined}
              disabled={!user || !!user.isGuest}
            />
          </div>
        </div>
      )}

      {/* Edit button for owner — fixed top-right below header */}
      {isOwner && (
        <div className="fixed right-4 top-[60px] sm:top-[72px] lg:top-[88px] z-[60]">
          <Button
            size="sm"
            onClick={handleEdit}
            className="h-7 px-2.5 text-[11px] font-medium gap-1 rounded-lg"
          >
            <Pencil className="size-3" />
            {t('projectView.editButton')}
          </Button>
        </div>
      )}

      {/* Content area: watch layout */}
      <div className={`flex-1 min-h-0 overflow-y-auto ${!isOwner ? 'pt-[36px]' : ''}`}>
        <WatchLayout
          stage={
            <MediaStage cover={cover}>
              <LyricsStage
                lines={lines}
                playbackPosition={playbackPosition}
                editorMode={editorMode}
                playerRef={playerRef}
                hasMedia={hasMedia}
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
              />
            </MediaStage>
          }
          meta={
            <ProjectMetaBlock
              project={project}
              cover={cover}
              ctaSlot={
                !isOwner ? (
                  project.forksEnabled !== false ? (
                    <Button size="sm" onClick={handleFork} className="h-8 px-3 text-xs font-medium gap-1 rounded-full shrink-0">
                      <GitFork className="size-3.5" />
                      {t('projectView.forkButton')}
                    </Button>
                  ) : null
                ) : null
              }
            />
          }
          upNext={
            listId && playlist ? (
              <ProjectUpNextPanel
                playlist={playlist}
                currentProjectId={projectId}
                listId={listId}
                accountName={playlist.owner?.accountName || accountName}
              />
            ) : null
          }
        />
      </div>

      {/* ── Fixed player bar ── */}
      <div className="flex-shrink-0 w-full border-t border-border bg-card/80 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          {!hasMedia && !initialYtUrl && !initialCloudinaryUpload ? (
            <p className="text-xs text-muted-foreground text-center py-2">{t('projectView.noAudio')}</p>
          ) : null}
          <Player
            ref={playerRef}
            mediaTitle={mediaTitle}
            onTimeUpdate={handleTimeUpdate}
            onPlayingChange={setIsPlaying}
            onSpeedChange={setPlaybackSpeed}
            onDurationChange={() => {}}
            onMediaChange={handleMediaChange}
            onYtUrlChange={() => {}}
            onTitleChange={setMediaTitle}
            initialYtUrl={initialYtUrl}
            initialCloudinaryUpload={initialCloudinaryUpload}
            initialSeek={0}
            initialSpeed={1}
            lines={lines}
            playbackPosition={playbackPosition}
            syncMode={false}
            onCloudinaryUpload={() => {}}
            projectMetadata={meta}
            viewerMode={true}
          />
          {/* Prev / next track navigation when in a list context */}
          {listId && (prevTrack || nextTrack) && (
            <div className="flex items-center justify-between mt-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={!prevTrack}
                onClick={() => goToTrack(prevTrack)}
                className="h-7 px-2.5 text-[11px]"
              >
                {t('projectView.prevTrack')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!nextTrack}
                onClick={() => goToTrack(nextTrack)}
                className="h-7 px-2.5 text-[11px]"
              >
                {t('projectView.nextTrack')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Comment section */}
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        {project && <CommentSection projectId={project.projectId} />}
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
