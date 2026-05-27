import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { SettingsProvider } from '@/features/settings/SettingsContext';
import { TooltipProvider } from '@ui/tooltip';
import { Spinner } from '@ui/skeleton';
import { Button } from '@ui/button';
import { projects } from '@/app/api';
import Player from '@features/player/components/Player';
import Preview from '@features/preview/components/Preview';
import SharedProjectError from './SharedProjectError';
import { SharedProjectViewerLayout } from './SharedProjectViewerLayout';
import useInputMethod from '@/shared/hooks/useInputMethod';
import { LogIn, UserPlus, Music2, Copy, Check, ExternalLink, Star, GitFork } from 'lucide-react';
import { Tip } from '@ui/tip';
import { useAuthContext } from '@/features/auth/useAuthContext';
import { AppHeader } from '@/app/layout/AppHeader';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import ClientOnlyDate from '@shared/ui/ClientOnlyDate';

/**
 * Full-page, unauthenticated shared-project viewer.
 * Rendered when pathname matches /share/:id — no auth required.
 *
 * Layout: Preview (flex-1) → Player bar → Login CTA banner
 * Player is in viewerMode: only seek/play controls, no upload/load actions.
 */
function SharedProjectViewerInner({ projectId }) {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const inputMethod = useInputMethod();
  const isMobile = inputMethod === 'touch';
  const getStartTime = () => {
    const s = searchParams.get('s') || searchParams.get('t');
    if (s) return parseInt(s);
    // Fallback for malformed URLs (e.g., ?readonly=1?s=55)
    const match = window.location.search.match(/[?&][st]=(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };
  const startTime = getStartTime();
  const [hasMedia, setHasMedia] = useState(false);
  const { user, logout, loading } = useAuthContext();

  // Clear query params after initial parse to prevent "reload to seek" tricks
  useEffect(() => {
    if (window.location.search.includes('s=') || window.location.search.includes('t=')) {
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete('s');
      newUrl.searchParams.delete('t');
      window.history.replaceState(null, '', newUrl.toString());
    }
  }, []);

  // ── Minimal state ──
  const [lines, setLines] = useState([]);
  const [editorMode, setEditorMode] = useState('lrc');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [mediaTitle, setMediaTitle] = useState('');
  const [initialYtUrl, setInitialYtUrl] = useState('');
  const [initialCloudinaryUpload, setInitialCloudinaryUpload] = useState(null);

  // ── Fetch state ──
  const [loadStatus, setLoadStatus] = useState('loading'); // 'loading' | 'ok' | 403 | 404
  const [projectData, setProjectData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [starCount, setStarCount] = useState(0);
  const [forkCount, setForkCount] = useState(0);
  const [starLoading, setStarLoading] = useState(false);
  const playerRef = useRef(null);

  usePageTitle(mediaTitle);

  // ── Load project on mount ──
  useEffect(() => {
    let cancelled = false;
    projects.getShare(projectId)
      .then((result) => {
        if (cancelled) return;
        const project = result?.project;
        if (!project) {
          setLoadStatus(404);
          return;
        }
        const rawLines = (project.lyrics?.lines || []).map((l) => ({
          text: l.text || '',
          timestamp: l.timestamp ?? null,
          endTime: l.endTime ?? undefined,
          secondary: l.secondary || '',
          translation: l.translation || '',
          id: crypto.randomUUID(),
          words: l.words,
          secondaryWords: l.secondaryWords,
        }));
        setLines(rawLines);
        setEditorMode(project.lyrics?.editorMode || 'lrc');
        setMediaTitle(project.upload?.title || project.title || '');
        setProjectData(project);
        setIsStarred(project.isStarredByMe ?? false);
        setStarCount(project.starCount ?? 0);
        setForkCount(project.forkCount ?? 0);
        if (project.upload?.source === 'youtube' && project.upload?.youtubeUrl) {
          setInitialYtUrl(project.upload.youtubeUrl);
        } else if (project.upload) {
          // Handle cloudinary and spotify via initialCloudinaryUpload
          // Player checks upload.source to determine how to play
          setInitialCloudinaryUpload(project.upload);
        }

        // ── Guard: reject projects with no playable media ──
        const hasPlayableMedia = !!(
          (project.upload?.source === 'youtube' && project.upload?.youtubeUrl) ||
          (project.upload?.source === 'cloudinary' && project.upload?.cloudinaryUrl) ||
          (project.upload?.source === 'spotify' && project.upload?.spotifyTrackId)
        );
        setLoadStatus(hasPlayableMedia ? 'ok' : 'no-media');
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadStatus(err.status === 403 ? 403 : 404);
      });
    return () => { cancelled = true; };
  }, [projectId]);

  const handleTimeUpdate = useCallback((t) => setPlaybackPosition(t), []);
  const handleMediaChange = useCallback((v) => setHasMedia(v), []);

  // ── Clone project handler ──
  const handleClone = useCallback(() => {
    window.location.href = `/project/fork/${projectId}`;
  }, [projectId]);

  useEffect(() => {
    if (loading) return;
    if (searchParams.get('clone') === '1') {
      window.location.href = `/project/fork/${projectId}`;
    }
  }, [loading, searchParams, projectId]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleStar = useCallback(async () => {
    if (!user) { window.location.href = '/auth?redirect=' + encodeURIComponent(window.location.pathname); return; }
    if (starLoading) return;
    setStarLoading(true);
    const wasStarred = isStarred;
    setIsStarred(!wasStarred);
    setStarCount((c) => c + (wasStarred ? -1 : 1));
    try {
      if (wasStarred) {
        await projects.unstar(projectId);
      } else {
        await projects.star(projectId);
      }
    } catch {
      setIsStarred(wasStarred);
      setStarCount((c) => c + (wasStarred ? 1 : -1));
    } finally {
      setStarLoading(false);
    }
  }, [user, starLoading, isStarred, projectId]);

  // ── Memoized slots (must be before early returns to satisfy Rules of Hooks) ──
  const MetadataSection = useMemo(() => (
    <div className={`px-2 sm:px-4 lg:px-6 mb-4 sm:mb-6 animate-fade-in flex flex-col ${isMobile ? 'gap-4' : 'sm:flex-row sm:items-start justify-between gap-6'}`}>
      <div className="flex-1 min-w-0">
        <div className={`flex flex-wrap items-center ${isMobile ? 'gap-2' : 'gap-3'} mb-3`}>
          <h1 className={`${isMobile ? 'text-xl' : 'text-2xl sm:text-3xl'} font-semibold text-zinc-100 tracking-tight leading-tight`}>
            {projectData?.title || t('library.untitled')}
          </h1>
          {/* Author info inline */}
          <div className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-zinc-900/50 border border-zinc-800/80 ${isMobile ? 'text-[9px]' : 'text-[10px] sm:text-xs'} font-medium text-zinc-400 shrink-0`}>
            <Music2 className={isMobile ? 'size-3' : 'size-3.5'} style={{ color: 'currentColor' }} />
            <span>
              {t('share.by')}{' '}
              {projectData?.user?.accountName ? (
                <Link
                  to={`/profile/${projectData.user.accountName}`}
                  className="text-zinc-200 hover:text-primary transition-colors"
                >
                  {projectData.user.displayName || `@${projectData.user.accountName}`}
                </Link>
              ) : (
                <span className="text-zinc-200">{t('share.guest')}</span>
              )}
            </span>
            {projectData?.createdAt && (
              <>
                <span className="size-1 h-1 rounded-full bg-zinc-700 mx-1" />
                <span><ClientOnlyDate date={projectData.createdAt} /></span>
              </>
            )}
          </div>
          {projectData?.forkedFrom?.projectId && (
            <Tip content={projectData.forkedFrom.accountName ? t('share.forkedFrom', { username: projectData.forkedFrom.accountName, defaultValue: `Forked from {{username}}` }) : t('share.forkedProject', 'Forked project')}>
              <div className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 ${isMobile ? 'text-[9px]' : 'text-[10px] sm:text-xs'} font-bold text-accent-blue uppercase shrink-0`}>
                <ExternalLink className={isMobile ? 'size-2.5' : 'size-3'} />
                <span>{t('share.forkedBadge', 'Forked')}</span>
              </div>
            </Tip>
          )}

          {/* Fork count */}
          {forkCount > 0 && (
            <div className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-zinc-800/60 border border-zinc-700/40 ${isMobile ? 'text-[9px]' : 'text-[10px] sm:text-xs'} text-zinc-400 shrink-0`}>
              <GitFork className={isMobile ? 'size-2.5' : 'size-3'} />
              <span>{forkCount}</span>
            </div>
          )}

          {/* Star button */}
          <Tip content={user ? (isStarred ? t('share.unstar', 'Unstar') : t('share.star', 'Star')) : t('share.starLoginRequired', 'Log in to star')}>
            <button
              onClick={handleStar}
              disabled={starLoading}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border transition-all shrink-0 ${
                isStarred
                  ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
                  : 'bg-zinc-800/60 border-zinc-700/40 text-zinc-400 hover:text-yellow-400 hover:border-yellow-400/30 hover:bg-yellow-400/10'
              } ${isMobile ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}
            >
              <Star className={`${isMobile ? 'size-2.5' : 'size-3'} ${isStarred ? 'fill-yellow-400' : ''}`} />
              <span>{starCount}</span>
            </button>
          </Tip>
        </div>
        {/* Song info */}
        {(projectData?.metadata?.songName || projectData?.metadata?.songArtist) && (
          <div className={`flex flex-wrap items-center gap-2 mb-2 ${isMobile ? 'text-xs' : 'text-sm'} text-zinc-400`}>
            {projectData.metadata.songName && (
              <span className="font-medium text-zinc-300">{projectData.metadata.songName}</span>
            )}
            {projectData.metadata.songArtist && (
              <span className="before:content-['·'] before:mr-2">{projectData.metadata.songArtist}</span>
            )}
            {projectData.metadata.songAlbum && (
              <span className="before:content-['·'] before:mr-2 italic">{projectData.metadata.songAlbum}</span>
            )}
            {projectData.metadata.songYear && (
              <span className="before:content-['·'] before:mr-2 text-zinc-500">{projectData.metadata.songYear}</span>
            )}
          </div>
        )}
        {/* Description */}
        <p className={`${isMobile ? 'text-xs' : 'text-sm sm:text-base'} text-zinc-400 max-w-3xl leading-relaxed whitespace-pre-wrap text-left`}>
          {projectData?.metadata?.description || t('share.noDescription')}
        </p>
      </div>

      {/* Tags on the right */}
      <div className={`flex flex-wrap ${isMobile ? 'gap-1.5' : 'gap-2 sm:justify-end sm:max-w-[40%]'}`}>
        {projectData?.metadata?.tags?.length > 0 ? (
          projectData.metadata.tags.map((tag, i) => (
            <span key={`${tag}-${i}`} className={`px-2 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700/50 ${isMobile ? 'text-[9px]' : 'text-[10px] sm:text-xs'} text-zinc-300 font-medium tracking-wide`}>
              {tag}
            </span>
          ))
        ) : (
          <span className={`${isMobile ? 'text-[9px]' : 'text-xs'} text-zinc-600 italic`}>{t('share.noTags')}</span>
        )}
      </div>
    </div>
  ), [isMobile, projectData, forkCount, isStarred, starLoading, starCount, handleStar, user, t]);

  // Compact top CTA bar
  const CTABanner = useMemo(() => (
    <div className="flex items-center gap-3 px-4 py-2 max-w-7xl mx-auto w-full">
      <img
        src="https://res.cloudinary.com/dzjid2tos/image/upload/v1778106770/lrc-logo_dkumwz.png"
        alt="LRC Studio"
        className="size-5 object-contain shrink-0"
        loading="lazy"
        decoding="async"
      />
      <p className="text-xs text-zinc-400 flex-1 truncate">
        <span className="text-zinc-200 font-medium">{t('share.likeThisProject', 'Like this project?')}</span>
        {' '}
        <span className="hidden sm:inline">{t('share.createCopyDesc', 'Create your own editable copy and customize it')}</span>
      </p>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopyLink}
          disabled={copied}
          className="h-7 px-2.5 text-[11px] bg-zinc-800 border-zinc-700/60 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 font-medium gap-1 rounded-lg transition-all"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? t('share.copied', 'Copied') : t('share.copyLink', 'Copy Link')}
        </Button>
        <Button
          size="sm"
          onClick={handleClone}
          className="h-7 px-2.5 text-[11px] bg-primary hover:bg-primary-dim text-zinc-950 font-medium gap-1 rounded-lg"
        >
          <Copy className="size-3" />
          {t('share.createCopy', 'Create Copy')}
        </Button>
      </div>
    </div>
  ), [handleCopyLink, copied, handleClone, t]);

  const PreviewSlot = useMemo(() => (
    <>
      {MetadataSection}
      <Preview
        lines={lines}
        setLines={() => { }} // read-only — no edits
        playbackPosition={playbackPosition}
        mediaTitle={mediaTitle}
        playerRef={playerRef}
        duration={0}
        editorMode={editorMode}
        exportToUrl={() => { }}
        isSharedProject={true}
        sharedReadOnly={true}
        setSharedReadOnly={() => { }}
        shareModal={null}
        setShareModal={() => { }}
        hasMedia={hasMedia}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        activeProjectId={projectId}
        project={projectData}
        projectMetadata={projectData?.metadata}
        viewerMode={true}
      />
    </>
  ), [MetadataSection, lines, playbackPosition, mediaTitle, playerRef, editorMode, hasMedia, isPlaying, playbackSpeed, projectId, projectData]);

  const PlayerSlot = useMemo(() => (
    <Player
      ref={playerRef}
      mediaTitle={mediaTitle}
      onTimeUpdate={handleTimeUpdate}
      onPlayingChange={setIsPlaying}
      onSpeedChange={setPlaybackSpeed}
      onDurationChange={() => { }}
      onMediaChange={handleMediaChange}
      onYtUrlChange={() => { }}
      onTitleChange={setMediaTitle}
      initialYtUrl={initialYtUrl}
      initialCloudinaryUpload={initialCloudinaryUpload}
      initialSeek={startTime}
      initialSpeed={1}
      lines={lines}
      playbackPosition={playbackPosition}
      syncMode={false}
      onCloudinaryUpload={() => { }}
      projectMetadata={projectData?.metadata}
      viewerMode={true}
    />
  ), [playerRef, mediaTitle, handleTimeUpdate, setIsPlaying, setPlaybackSpeed, handleMediaChange, setMediaTitle, initialYtUrl, initialCloudinaryUpload, startTime, lines, playbackPosition, projectData]);

  // ── Loading ──
  if (loadStatus === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size={28} className="text-primary" />
      </div>
    );
  }

  // ── Error ──
  if (loadStatus !== 'ok') {
    return <SharedProjectError status={loadStatus} projectId={projectId} />;
  }

  // ── Viewer ──
  return (
    <>
      {user && (
        <AppHeader
          user={user}
          logout={logout}
          isReady={true}
          lines={lines}
          mediaTitle={mediaTitle}
          setMediaTitle={() => {}}
          triggerImportSave={() => {}}
          hasUnsavedChanges={() => false}
          activeProjectId={projectId}
          setShowSettings={() => {}}
          setShowKeyboardHelp={() => {}}
          focusMode="default"
          setFocusMode={() => {}}
          hideEditor={false}
          setHideEditor={() => {}}
          setUnsavedModalTarget={() => {}}
        />
      )}

      <SharedProjectViewerLayout
        isMobile={isMobile}
        hasHeader={!!user}
        preview={PreviewSlot}
        player={PlayerSlot}
        ctaBanner={CTABanner}
      />
    </>
  );
}

/**
 * Wrapper that provides SettingsProvider and TooltipProvider
 * so the viewer can use settings (font size, scroll) without
 * the full app context.
 */
export default function SharedProjectViewer({ projectId }) {
  return (
    <SettingsProvider>
      <TooltipProvider>
        <SharedProjectViewerInner projectId={projectId} />
      </TooltipProvider>
    </SettingsProvider>
  );
}
