import { lazy, Suspense, memo } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import useDynamicTranslation from '@/shared/hooks/useDynamicTranslation';
import { useSettings } from '@/features/settings/useSettings';

import { formatTime } from '@/shared/utils/format-time';
import { usePlayer } from '../PlayerContext';
const WaveformDisplay = lazy(() => import('./WaveformDisplay'));
import PlaybackProgress from './PlaybackProgress';
import VolumeControl from './VolumeControl';
import SpeedControl from './SpeedControl';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@ui/popover';
import { Music2, AlertTriangle, Play, Pause, Headphones, FolderOpen, Repeat, SkipBack, SkipForward, Cloud, ChevronDown, Link2, PanelTop, PanelBottom, Bookmark, ChevronLeft, ChevronRight, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { Tip } from '@ui/tip';
import { getAccessToken } from '@/app/api';
import { YoutubeIcon } from '@/shared/ui/YoutubeIcon';

const FOCUS_RING = 'focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 focus:ring-offset-zinc-950 focus:outline-none';

interface UploadItem {
  id?: string;
  title?: string;
  fileName?: string;
  source?: string;
  uploadUrl?: string;
}

interface ChangeMediaPopoverContentProps {
  fileInputId: string;
  ytUrl: string;
  onYtUrlChange: (v: string) => void;
  onYtErrorChange: (v: string) => void;
  onUrlLoad: () => void;
  cdnLoading: boolean;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  uploads: UploadItem[];
  onSelectUpload: (upload: UploadItem) => void;
  onClearMedia: () => void;
}

const ChangeMediaPopoverContent = memo(function ChangeMediaPopoverContent({
  fileInputId, ytUrl, onYtUrlChange, onYtErrorChange, onUrlLoad,
  cdnLoading, onFileChange, uploads, onSelectUpload, onClearMedia,
}: ChangeMediaPopoverContentProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1 p-1">
      <label
        htmlFor={fileInputId}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer transition-colors"
      >
        <FolderOpen className="size-4 shrink-0 text-zinc-500" />
        {t('player.dropAudio')}
        <input id={fileInputId} type="file" accept="audio/*" onChange={onFileChange} className="hidden" />
      </label>
      <div className="flex gap-1.5 px-1 py-1">
        <div className="relative flex-1">
          <Link2 className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-zinc-500 pointer-events-none" />
          <Input
            value={ytUrl}
            onChange={(e) => { onYtUrlChange(e.target.value); onYtErrorChange(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') onUrlLoad(); }}
            placeholder={t('player.pasteCdnUrl')}
            className="h-8 pl-6 text-xs bg-zinc-800/60 border-zinc-700"
          />
        </div>
        <Button
          size="sm"
          onClick={onUrlLoad}
          disabled={!ytUrl.trim() || cdnLoading}
          className="h-8 px-3 text-xs shrink-0 bg-zinc-700 hover:bg-zinc-600 border-zinc-600"
        >
          {cdnLoading ? <Loader2 className="size-3 animate-spin" /> : t('player.load')}
        </Button>
      </div>
      {getAccessToken() && uploads.length > 0 && (
        <div className="max-h-32 overflow-y-auto border-t border-zinc-800/60 pt-1 mt-0.5">
          {uploads.map((upload) => (
            <button
              key={upload.id}
              onClick={() => onSelectUpload(upload)}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left hover:bg-zinc-800 transition-colors group"
            >
              <div className="size-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                {upload.source === 'youtube'
                  ? <svg preserveAspectRatio="xMidYMid" viewBox="0 0 256 180"><path fill="red" d="M250.346 28.075A32.18 32.18 0 0 0 227.69 5.418C207.824 0 127.87 0 127.87 0S47.912.164 28.046 5.582A32.18 32.18 0 0 0 5.39 28.24c-6.009 35.298-8.34 89.084.165 122.97a32.18 32.18 0 0 0 22.656 22.657c19.866 5.418 99.822 5.418 99.822 5.418s79.955 0 99.82-5.418a32.18 32.18 0 0 0 22.657-22.657c6.338-35.348 8.291-89.1-.164-123.134Z" /><path fill="#FFF" d="m102.421 128.06 66.328-38.418-66.328-38.418z" className="size-3 text-red-400" /></svg>
                  : <Cloud className="size-3 text-blue-400" />}
              </div>
              <span className="text-xs text-zinc-300 truncate group-hover:text-white transition-colors">
                {upload.title || upload.fileName || t('uploads.untitled')}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="border-t border-zinc-800/60 mt-0.5 pt-1">
        <button
          onClick={onClearMedia}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <Trash2 className="size-4 shrink-0" />
          {t('player.remove')}
        </button>
      </div>
    </div>
  );
});

export default function PlayerControls({ variant }: { variant: 'editor' | 'header' | 'mobile' }) {
  const {
    source, isPlaying, currentTime, duration, playbackSpeed,
    hasMedia, loopA, loopB, mediaTitle, projectCoverImage,
    local, yt, mediaUploads, cdnLoading,
    syncMode, viewerMode, playerTop, onDockToggle,
    MIN_SPEED, MAX_SPEED, speedPresets: SPEED_PRESETS,
    lines, playbackPosition, audioRef,
    detectedUrlType, mediaPopoverProps, fetchUploads,
    togglePlay, seek, applySpeed, setLoop, handleLoopChange, clearLoop,
    handleUrlLoad, handleSelectUpload,
  } = usePlayer();

  const { t } = useTranslation();
  const { dt } = useDynamicTranslation();
  const { settings, updateSetting } = useSettings();

  // variant is accepted but not yet branched on — Task 1 renders both blocks identically to original
  void variant;

  return (
    <>
      {/* ─────────────── Desktop full bar content (hidden on mobile) ─────────────── */}
      <div className="max-lg:hidden animate-fade-in overflow-visible flex flex-col items-center w-full">
        {/* Header */}
        {!hasMedia && !viewerMode && (
          <div className="flex flex-row items-center justify-center gap-2 sm:gap-4 mb-2">
            <h2 className="text-xs sm:text-sm font-semibold tracking-widest text-zinc-400 flex items-center gap-2 overflow-hidden pb-0.5 min-w-0">
              <span className="uppercase shrink-0 text-xs sm:text-sm flex items-center gap-1.5"><Headphones className="size-3.5" />{t('player.title')}</span>
              {mediaTitle && (
                <div className="flex items-center gap-2 px-1.5 py-0.5 rounded text-xs min-w-0">
                  <Music2 className="size-2.5 text-primary shrink-0" strokeWidth={2.5} />
                  <span className="text-primary normal-case tracking-normal truncate max-w-[300px]">{mediaTitle}</span>
                </div>
              )}
            </h2>
          </div>
        )}

        {/* Loading placeholder while YouTube initialises */}
        {!hasMedia && yt.ytLoading && (
          <div className="flex items-center justify-center gap-3 py-6 animate-fade-in">
            <svg className="size-5 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-sm text-zinc-400">{t('player.loading') || 'Loading…'}</span>
          </div>
        )}

        {/* Unified media loader — shown when no media is loaded */}
        {!hasMedia && !yt.ytLoading && !viewerMode && (
          <div className="animate-fade-in w-full max-w-[1000px] mx-auto flex items-center justify-center gap-3">
            {/* Local Audio */}
            <label
              htmlFor="audio-file-input"
              className="flex items-center gap-2 px-4 py-2 h-10 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-700/50 hover:border-primary/40 transition-all cursor-pointer shadow-sm group"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) local.handleFileChange(file);
              }}
            >
              <FolderOpen className="size-4 text-zinc-400 group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{t('player.dropAudio')}</span>
              <input id="audio-file-input" type="file" accept="audio/*" onChange={local.handleFileChange} className="hidden" />
            </label>

            <div className="w-px h-6 bg-zinc-800/80 mx-1" />

            {/* URL Input (YouTube/CDN) */}
            <div className="flex items-center gap-2 flex-1 max-w-[450px]">
              <div className="relative w-full">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500 pointer-events-none" />
                <Input
                  value={yt.ytUrl}
                  onChange={(e) => { yt.setYtUrl(e.target.value); yt.setYtError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleUrlLoad(); }}
                  placeholder={t('player.pasteUrl') || "Paste YouTube or CDN URL..."}
                  className="pl-8 bg-zinc-900/50 border-zinc-700/50 text-sm h-10 rounded-xl shadow-inner w-full"
                />
              </div>
              <Button
                onClick={handleUrlLoad}
                disabled={cdnLoading}
                className="h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50 font-medium shrink-0"
              >
                {cdnLoading ? <Loader2 className="size-4 animate-spin" /> : t('player.load')}
              </Button>
            </div>

            {getAccessToken() && (
              <>
                <div className="w-px h-6 bg-zinc-800/80 mx-1" />
                <Popover onOpenChange={(open) => { if (open) fetchUploads(); }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 h-10 px-4 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/60 border border-zinc-700/30 hover:border-zinc-700 transition-all text-zinc-300"
                    >
                      <Cloud className="size-4 text-blue-400/80" />
                      <span className="text-sm font-medium">{t('uploads.title')}</span>
                      <ChevronDown className="size-3.5 opacity-50 ml-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] max-h-[300px] overflow-y-auto p-1 glass-dark border-zinc-700/50 shadow-2xl" align="end" sideOffset={12}>
                    {(mediaUploads as UploadItem[]).length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-6">{(dt as (k: string) => string)("uploads.empty")}</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-1">
                        {(mediaUploads as UploadItem[]).map((upload) => (
                          <button
                            key={upload.id}
                            onClick={() => handleSelectUpload(upload)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-zinc-800/80 transition-all group"
                          >
                            <div className="size-8 rounded bg-zinc-800 border border-zinc-700 group-hover:border-primary/40 flex items-center justify-center shrink-0">
                              {upload.source === 'youtube'
                                ? <YoutubeIcon className="size-5" />
                                : <Cloud className="size-3.5 text-blue-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-primary transition-colors">
                                {upload.title || upload.fileName || t('uploads.untitled')}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </>
            )}

            {/* Embed-blocked overlay */}
            {yt.ytEmbedBlocked && (
              <div className="absolute inset-x-0 -top-24 mx-2 bg-zinc-900/95 border border-orange-500/30 rounded-xl px-4 py-3 flex items-start gap-3 animate-fade-in shadow-lg">
                <AlertTriangle className="size-4 text-orange-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-100">{t('player.embeddingDisabled')}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{t('player.embeddingBlockedDesc')}</p>
                </div>
                <a
                  href={yt.ytUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[10px] font-semibold text-orange-400 hover:text-orange-300 transition-colors whitespace-nowrap mt-0.5"
                >
                  {t('player.watchOnYoutube')} ↗
                </a>
              </div>
            )}
            {/* Generic error chip */}
            {yt.ytError && !yt.ytEmbedBlocked && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded">
                {yt.ytError}
              </div>
            )}
          </div>
        )}

        {/* Local audio waveform */}
        {source === 'local' && local.localUrl && (
          <div className="animate-fade-in w-full max-w-[1200px] mx-auto">
            <Suspense fallback={null}>
              <WaveformDisplay
                showWaveform={settings.playback?.showWaveform}
                waveformSnap={settings.playback?.waveformSnap}
                audioRef={audioRef}
                localUrl={local.localUrl}
                lines={lines}
                playbackPosition={playbackPosition ?? 0}
                duration={duration}
                onSeek={seek}
                loopA={loopA}
                loopB={loopB}
                onLoopChange={handleLoopChange}
              />
            </Suspense>
          </div>
        )}

        {source !== 'local' && hasMedia && (
          <div className="animate-fade-in w-full max-w-[1200px] mx-auto px-4">
            <PlaybackProgress
              playbackPosition={playbackPosition ?? 0}
              duration={duration}
              onSeek={seek}
              loopA={loopA}
              loopB={loopB}
              onLoopChange={handleLoopChange}
            />
          </div>
        )}

        {hasMedia && (
          <div className="animate-fade-in w-full max-w-[1200px] mx-auto">
            <div className="flex items-center justify-between gap-3 w-full relative min-h-[48px] pb-1.5 lg:pb-2">

              {/* ── Left: Dock Toggle + Album Art ── */}
              <div className="flex items-center gap-2 z-10">
                <Tip content={playerTop ? (t('player.moveToBottom') || 'Move to bottom') : (t('player.moveToTop') || 'Move to top')}>
                  <Button
                    id="dock-toggle-btn"
                    variant="ghost"
                    size="icon"
                    onClick={() => onDockToggle?.()}
                    className={`shrink-0 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 ${FOCUS_RING}`}
                  >
                    {playerTop ? <PanelBottom className="size-4" /> : <PanelTop className="size-4" />}
                  </Button>
                </Tip>
                {projectCoverImage && (
                  <img
                    src={projectCoverImage}
                    alt=""
                    className="size-9 rounded-md object-cover border border-zinc-700/50 shrink-0"
                  />
                )}
              </div>

              {/* ── CENTERED: Transport Cluster (Times + Speed + Nudges + Play + Volume) ── */}
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 sm:gap-4 z-20">
                {/* Current Time on the left */}
                <span className="text-xs text-zinc-400 font-mono tabular-nums shrink-0 min-w-[44px] text-right">
                  {formatTime(currentTime)}
                </span>

                <div className="w-px h-4 bg-zinc-800/60 shrink-0 mx-1" />

                {/* Speed */}
                <SpeedControl
                  playbackSpeed={playbackSpeed}
                  applySpeed={applySpeed}
                  MIN_SPEED={MIN_SPEED}
                  MAX_SPEED={MAX_SPEED}
                  SPEED_PRESETS={SPEED_PRESETS}
                />

                <div className="flex items-center gap-0.5 sm:gap-1.5">
                  <Tip content="-0.1s">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => seek(currentTime - 0.1)}
                      className={`text-zinc-500 hover:text-zinc-200 ${FOCUS_RING}`}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                  </Tip>

                  <Tip content={`-${settings.playback?.seekTime ?? 5}s`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => seek(Math.max(0, currentTime - (settings.playback?.seekTime ?? 5)))}
                      className={`text-zinc-500 hover:text-zinc-200 ${FOCUS_RING}`}
                    >
                      <SkipBack className="size-4" />
                    </Button>
                  </Tip>

                  <Tip content={isPlaying ? t('shortcuts.playPause') || 'Pause' : t('shortcuts.playPause') || 'Play'}>
                    <Button
                      id="play-pause-btn"
                      size="icon"
                      onClick={togglePlay}
                      aria-label={isPlaying ? t('shortcuts.playPause') || 'Pause' : t('shortcuts.playPause') || 'Play'}
                      className="rounded-full bg-primary hover:bg-primary-dim text-zinc-950 hover:scale-105 active:scale-95 glow-primary flex-shrink-0 transition-all duration-100"
                    >
                      {isPlaying ? (
                        <Pause className="size-4" fill="currentColor" />
                      ) : (
                        <Play className="size-4 ml-0.5" fill="currentColor" />
                      )}
                    </Button>
                  </Tip>

                  <Tip content={`+${settings.playback?.seekTime ?? 5}s`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => seek(Math.min(duration, currentTime + (settings.playback?.seekTime ?? 5)))}
                      className={`text-zinc-500 hover:text-zinc-200 ${FOCUS_RING}`}
                    >
                      <SkipForward className="size-4" />
                    </Button>
                  </Tip>

                  <Tip content="+0.1s">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => seek(currentTime + 0.1)}
                      className={`text-zinc-500 hover:text-zinc-200 ${FOCUS_RING}`}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </Tip>
                </div>

                {/* Volume */}
                <VolumeControl />

                <div className="w-px h-4 bg-zinc-800/60 shrink-0 mx-1" />

                {/* Total Duration on the right */}
                <span className="text-xs text-zinc-500 font-mono tabular-nums shrink-0 min-w-[44px]">
                  {formatTime(duration)}
                </span>
              </div>

              {/* ── Right Section: Actions, Loop ── */}
              <div className="flex items-center gap-2 sm:gap-3 z-10">

                {/* Change Media */}
                {hasMedia && !viewerMode && (
                  <Popover onOpenChange={(open) => { if (open) fetchUploads(); }}>
                    <Tip content={t('player.changeSong')}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`shrink-0 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 ${FOCUS_RING}`}
                        >
                          <RefreshCw className="size-4" />
                        </Button>
                      </PopoverTrigger>
                    </Tip>
                    <PopoverContent className="w-72 p-0 bg-zinc-900 border-zinc-800 shadow-xl" align="end" sideOffset={8}>
                      <ChangeMediaPopoverContent fileInputId="change-media-file-desktop" {...mediaPopoverProps} />
                    </PopoverContent>
                  </Popover>
                )}

                {syncMode && (
                  <Tip content={t('player.mark') || 'Mark'}>
                    <Button
                      id="mark-btn"
                      variant="ghost"
                      size="icon"
                      onPointerDown={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('editor:mark')); }}
                      className={`shrink-0 text-zinc-400 hover:text-primary hover:bg-primary/10 ${FOCUS_RING}`}
                    >
                      <Bookmark className="size-4" />
                    </Button>
                  </Tip>
                )}

                {!viewerMode && (
                  <Tip content={settings.playback?.loopCurrentLine
                    ? (loopA != null && loopB != null)
                      ? `${t('player.loopActive')}: ${formatTime(loopA)} – ${formatTime(loopB)} · ${t('player.clickToDisable')}`
                      : t('player.setLoop')
                    : t('player.setLoop') || 'Loop current line'
                  }>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => updateSetting('playback.loopCurrentLine', !settings.playback?.loopCurrentLine)}
                      className={`rounded-full shrink-0 ${FOCUS_RING} ${settings.playback?.loopCurrentLine
                        ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border border-violet-500/30'
                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                        }`}
                    >
                      <Repeat className="size-4" />
                    </Button>
                  </Tip>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────── Compact mobile bar (hidden on desktop) ─────────────── */}
      <div className="lg:hidden w-full overflow-hidden">
        {/* No media */}
        {!hasMedia && !viewerMode && (
          <div className="flex flex-col gap-1 px-3 py-2">
            {yt.ytLoading ? (
              <div className="flex items-center gap-3 flex-1 py-2">
                <svg className="size-5 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="text-sm text-zinc-400">{t('player.loading') || 'Loading…'}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="audio-file-compact"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 text-sm font-medium text-zinc-300 cursor-pointer active:scale-95 transition-all duration-100 shrink-0"
                  >
                    <FolderOpen className="size-4" />
                    {t('player.dropAudio') || 'Load audio'}
                    <input id="audio-file-compact" type="file" accept="audio/*" onChange={local.handleFileChange} className="hidden" />
                  </label>
                  <div className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                      {detectedUrlType === 'cdn' ? (
                        <Cloud className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-blue-400/80 pointer-events-none" />
                      ) : detectedUrlType === 'youtube' ? (
                        <svg className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-red-500/70 pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                      ) : (
                        <Link2 className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-zinc-500 pointer-events-none" />
                      )}
                      <Input
                        type="text"
                        value={yt.ytUrl}
                        onChange={(e) => { yt.setYtUrl(e.target.value); yt.setYtError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleUrlLoad()}
                        placeholder={t('player.pasteCdnUrl') || 'Paste YouTube or CDN URL...'}
                        className="flex-1 h-9 pl-6 bg-zinc-800/60 text-zinc-100 placeholder-zinc-500 border-zinc-700 text-xs"
                      />
                    </div>
                    <Button
                      onClick={handleUrlLoad}
                      disabled={cdnLoading}
                      className={`px-3 h-9 text-white text-xs font-medium rounded-lg shrink-0 ${detectedUrlType === 'cdn' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-red-600 hover:bg-red-500'
                        }`}
                    >
                      {cdnLoading ? '…' : t('player.load')}
                    </Button>
                  </div>
                </div>
                {getAccessToken() && (
                  <Popover onOpenChange={(open) => { if (open) fetchUploads(); }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between bg-zinc-800/50 border-zinc-700/60 hover:bg-zinc-700/60 text-zinc-300 text-xs h-8"
                      >
                        <span className="flex items-center gap-1.5">
                          <Cloud className="size-3 text-zinc-500" />
                          {t('uploads.selectFromUploads')}
                        </span>
                        <ChevronDown className="size-3 text-zinc-500" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-h-[180px] overflow-y-auto p-1" align="start">
                      {(mediaUploads as UploadItem[]).length === 0 ? (
                        <p className="text-xs text-zinc-500 text-center py-3">{(t as (k: string) => string)('uploads.empty')}</p>
                      ) : (
                        (mediaUploads as UploadItem[]).map((upload) => (
                          <button
                            key={upload.id}
                            onClick={() => handleSelectUpload(upload)}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left hover:bg-zinc-700/60 transition-colors"
                          >
                            <div className="size-8 rounded flex-shrink-0 overflow-hidden bg-zinc-700/50 flex items-center justify-center">
                              {upload.source === 'youtube'
                                ? <YoutubeIcon className="size-5" />
                                : <Cloud className="size-3.5 text-blue-400 shrink-0" />}
                            </div>
                            <span className="text-xs font-medium text-zinc-200 truncate">
                              {upload.title || upload.fileName || t('uploads.untitled')}
                            </span>
                          </button>
                        ))
                      )}
                    </PopoverContent>
                  </Popover>
                )}
              </>
            )}
          </div>
        )}

        {/* Has media: seekbar row + action row */}
        {hasMedia && (
          <>
            <div className="flex flex-col gap-3 p-4 w-full">
              {/* Top Row: Play/Pause, Seeker, Speed */}
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="size-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 active:scale-95 transition-all duration-100 shadow-lg shadow-primary/20"
                >
                  {isPlaying
                    ? <Pause className="size-4 text-zinc-950" fill="currentColor" />
                    : <Play className="size-4 text-zinc-950 ml-0.5" fill="currentColor" />}
                </button>

                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex-1 relative min-w-0 h-6 flex items-center">
                    {loopA != null && loopB != null && duration > 0 && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-1 bg-accent-purple/30 border-x border-accent-purple/50 rounded-sm pointer-events-none z-base"
                        style={{
                          left: `${(loopA / duration) * 100}%`,
                          width: `${((loopB - loopA) / duration) * 100}%`,
                        }}
                      />
                    )}
                    <input
                      type="range" min={0} max={duration || 0} step={0.1} value={currentTime}
                      aria-label="Seek" aria-valuenow={Math.round(currentTime)} aria-valuemin={0} aria-valuemax={Math.round(duration)}
                      onChange={(e) => seek(parseFloat(e.target.value))}
                      className="w-full relative z-raised h-1 appearance-none bg-zinc-800 rounded-full outline-none"
                      style={{ background: `linear-gradient(to right, var(--color-primary) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255, 255, 255, 0.1) ${duration ? (currentTime / duration) * 100 : 0}%)` }}
                    />
                  </div>
                  <div className="flex justify-between items-center px-0.5">
                    <span className="text-[10px] font-mono tabular-nums text-zinc-500">
                      {formatTime(currentTime)}
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-zinc-500">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  <SpeedControl playbackSpeed={playbackSpeed} applySpeed={applySpeed} MIN_SPEED={MIN_SPEED} MAX_SPEED={MAX_SPEED} SPEED_PRESETS={SPEED_PRESETS} />
                </div>
              </div>

              {/* Bottom Row: Secondary Controls */}
              <div className="flex items-center justify-between w-full gap-1 px-1">
                <button
                  onClick={() => seek(Math.max(0, currentTime - (settings.playback?.seekTime ?? 5)))}
                  className="flex flex-col items-center justify-center size-14 rounded-2xl text-zinc-400 active:text-zinc-100 active:bg-zinc-800 active:scale-95 transition-all duration-100 shrink-0"
                >
                  <SkipBack className="size-6" />
                  <span className="text-[10px] font-bold mt-1 text-zinc-500">{settings.playback?.seekTime ?? 5}</span>
                </button>

                {!viewerMode && (
                  <button
                    onClick={() => {
                      if (loopA != null && loopB != null) {
                        clearLoop();
                      } else {
                        const now = currentTime;
                        if (lines?.length) {
                          let activeIdx = -1;
                          for (let i = 0; i < lines.length; i++) {
                            if (lines[i].timestamp != null && lines[i].timestamp! <= now) activeIdx = i;
                          }
                          if (activeIdx >= 0) {
                            const a = lines[activeIdx].timestamp ?? null;
                            let b: number | null = lines[activeIdx].endTime ?? null;
                            if (b == null) {
                              b = duration;
                              for (let i = activeIdx + 1; i < lines.length; i++) {
                                if (lines[i].timestamp != null) { b = lines[i].timestamp ?? null; break; }
                              }
                            }
                            setLoop({ a, b });
                          }
                        }
                      }
                    }}
                    className={`flex flex-col items-center justify-center size-14 rounded-2xl transition-all duration-100 shrink-0 active:scale-95 ${loopA != null && loopB != null ? 'text-accent-purple bg-accent-purple/10' : 'text-zinc-400 active:bg-zinc-800'}`}
                  >
                    <Repeat className="size-6" />
                    <span className="text-[9px] font-bold mt-1 opacity-60 uppercase tracking-tight">{t('player.loop') || 'Loop'}</span>
                  </button>
                )}

                <div className="size-14 flex items-center justify-center shrink-0">
                  <VolumeControl />
                </div>

                <button
                  onClick={() => seek(Math.min(duration, currentTime + (settings.playback?.seekTime ?? 5)))}
                  className="flex flex-col items-center justify-center size-14 rounded-2xl text-zinc-400 active:text-zinc-100 active:bg-zinc-800 active:scale-95 transition-all duration-100 shrink-0"
                >
                  <SkipForward className="size-6" />
                  <span className="text-[10px] font-bold mt-1 text-zinc-500">{settings.playback?.seekTime ?? 5}</span>
                </button>

                {syncMode && (
                  <button
                    onPointerDown={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('editor:mark')); }}
                    className="size-14 rounded-3xl bg-primary/20 border border-primary/40 text-primary active:bg-primary/30 active:scale-95 transition-all flex items-center justify-center shrink-0"
                  >
                    <div className="size-4 rounded-full bg-current shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.6)]" />
                  </button>
                )}

                {hasMedia && !viewerMode && (
                  <Popover onOpenChange={(open) => { if (open) fetchUploads(); }}>
                    <Tip content={t('player.changeSong')}>
                      <PopoverTrigger asChild>
                        <button className="flex flex-col items-center justify-center size-14 rounded-2xl text-zinc-400 active:text-zinc-100 active:bg-zinc-800 active:scale-95 transition-all duration-100 shrink-0">
                          <RefreshCw className="size-6" />
                          <span className="text-[9px] font-bold mt-1 opacity-60 uppercase tracking-tight">
                            {t('player.changeSong')}
                          </span>
                        </button>
                      </PopoverTrigger>
                    </Tip>
                    <PopoverContent className="w-[280px] p-0 bg-zinc-900 border-zinc-800 shadow-xl" side="top" align="center" sideOffset={8}>
                      <ChangeMediaPopoverContent fileInputId="change-media-file-mobile" {...mediaPopoverProps} />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </>
        )}
      </div>

    </>
  );
}
