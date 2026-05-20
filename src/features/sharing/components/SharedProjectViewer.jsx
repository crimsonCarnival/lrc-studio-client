import { useRef, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
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
import { LogIn, UserPlus, Music2, Copy, Check, ExternalLink } from 'lucide-react';
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
  const playerRef = useRef(null);

  usePageTitle(mediaTitle);

  // ── Load project on mount ──
  useEffect(() => {
    let cancelled = false;
    projects.getShare(projectId)
      .then((result) => {
        if (cancelled) return;
        const project = result?.project;
        console.log('[SharedProjectViewer] getShare result:', result);
        console.log('[SharedProjectViewer] project.upload:', project?.upload);
        console.log('[SharedProjectViewer] project.uploadId:', project?.uploadId);
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
      handleClone();
    }
  }, [loading, searchParams, handleClone]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

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
  // Create metadata section component for mobile optimization
  const MetadataSection = (
    <div className={`px-2 sm:px-4 lg:px-6 mb-4 sm:mb-6 animate-fade-in flex flex-col ${isMobile ? 'gap-4' : 'sm:flex-row sm:items-start justify-between gap-6'}`}>
      <div className="flex-1 min-w-0">
        <div className={`flex flex-wrap items-center ${isMobile ? 'gap-2' : 'gap-3'} mb-3`}>
          <h1 className={`${isMobile ? 'text-xl' : 'text-2xl sm:text-3xl'} font-semibold text-zinc-100 tracking-tight leading-tight`}>
            {projectData?.title || t('library.untitled')}
          </h1>
          {/* Author info inline */}
          <div className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-zinc-900/50 border border-zinc-800/80 ${isMobile ? 'text-[9px]' : 'text-[10px] sm:text-xs'} font-medium text-zinc-400 shrink-0`}>
            <Music2 className={isMobile ? 'size-3' : 'size-3.5'} style={{ color: 'currentColor' }} />
            <span>{t('share.by')} <span className="text-zinc-200">{projectData?.user?.username || t('share.guest')}</span></span>
            {projectData?.createdAt && (
              <>
                <span className="size-1 h-1 rounded-full bg-zinc-700 mx-1" />
                <span><ClientOnlyDate date={projectData.createdAt} /></span>
              </>
            )}
          </div>
          {projectData?.forkedFrom?.projectId && (
            <Tip content={projectData.forkedFrom.username ? t('share.forkedFrom', { username: projectData.forkedFrom.username, defaultValue: `Forked from {{username}}` }) : t('share.forkedProject', 'Forked project')}>
              <div className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 ${isMobile ? 'text-[9px]' : 'text-[10px] sm:text-xs'} font-bold text-accent-blue uppercase shrink-0`}>
                <ExternalLink className={isMobile ? 'size-2.5' : 'size-3'} />
                <span>{t('share.forkedBadge', 'Forked')}</span>
              </div>
            </Tip>
          )}
        </div>
        {/* Description */}
        <p className={`${isMobile ? 'text-xs' : 'text-sm sm:text-base'} text-zinc-400 max-w-3xl leading-relaxed whitespace-pre-wrap text-left`}>
          {projectData?.metadata?.description || t('share.noDescription')}
        </p>
      </div>

      {/* Tags on the right */}
      <div className={`flex flex-wrap ${isMobile ? 'gap-1.5' : 'gap-2 sm:justify-end sm:max-w-[40%]'}`}>
        {projectData?.metadata?.tags?.length > 0 ? (
          projectData.metadata.tags.map((tag, i) => (
            <span key={i} className={`px-2 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700/50 ${isMobile ? 'text-[9px]' : 'text-[10px] sm:text-xs'} text-zinc-300 font-medium tracking-wide`}>
              {tag}
            </span>
          ))
        ) : (
          <span className={`${isMobile ? 'text-[9px]' : 'text-xs'} text-zinc-600 italic`}>{t('share.noTags')}</span>
        )}
      </div>
    </div>
  );

  // Create CTA banner component
  const CTABanner = (
    <div className={`max-w-7xl mx-auto ${isMobile ? 'px-3 py-3' : 'px-4 sm:px-6 py-4'} flex flex-col ${isMobile ? 'gap-3' : 'sm:flex-row'} items-start ${!isMobile && 'sm:items-center'} justify-between`}>
      {/* Callout Box */}
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="size-8 flex items-center justify-center flex-shrink-0 mt-0.5">
          <img
            src="https://res.cloudinary.com/dzjid2tos/image/upload/v1778106770/lrc-logo_dkumwz.png"
            alt="LRC Studio"
            className="size-full object-contain"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-zinc-100 truncate`}>
            {t('share.likeThisProject', "Like this project?")}
          </p>
          <p className={`${isMobile ? 'text-[11px]' : 'text-xs'} text-zinc-400 mt-0.5`}>
            {t('share.createCopyDesc', "Create your own editable copy and customize it")}
          </p>
        </div>
      </div>
      {/* Action Buttons */}
      <div className={`flex items-center ${isMobile ? 'gap-2 w-full' : 'gap-2'} ${isMobile ? 'flex-shrink-0' : 'flex-shrink-0'}`}>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopyLink}
          disabled={copied}
          className={`${isMobile ? 'h-11 px-3 flex-1 text-[11px]' : 'h-9 px-2.5 text-xs'} bg-zinc-800 border-zinc-700/60 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 font-semibold gap-1.5 rounded-lg transition-all`}
        >
          {copied ? <Check className={isMobile ? 'size-3' : 'size-3.5'} /> : <Copy className={isMobile ? 'size-3' : 'size-3.5'} />}
          {copied ? t('share.copied', 'Copied') : t('share.copyLink', 'Copy Link')}
        </Button>
        <Button
          size="sm"
          onClick={handleClone}
          className={`${isMobile ? 'h-11 px-3 flex-1 text-[11px]' : 'h-9 px-2.5 text-xs'} bg-primary hover:bg-primary-dim text-zinc-950 font-semibold gap-1.5 rounded-lg disabled:opacity-50`}
        >
          <Copy className={isMobile ? 'size-3' : 'size-3.5'} />
          {t('share.createCopy', 'Create Copy')}
        </Button>
      </div>
    </div>
  );

  // Render using responsive layout
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
        preview={
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
        }
        player={
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
        }
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
