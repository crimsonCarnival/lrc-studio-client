import { EmptyState } from '@ui/EmptyState';
import { lazy, Suspense, memo, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import useDynamicTranslation from '@/shared/hooks/useDynamicTranslation';
import { useSettings } from '@/features/settings/useSettings';

import { formatTime } from '@/shared/utils/format-time';
import { usePlayer } from '../PlayerContext';
import type { UploadItem } from '../PlayerContext';
const WaveformDisplay = lazy(() => import('./WaveformDisplay'));
import PlaybackProgress from './PlaybackProgress';
import VolumeControl from './VolumeControl';
import SpeedControl from './SpeedControl';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@ui/popover';
import { Icon } from '@/shared/ui/Icon';
import { Tip } from '@ui/tip';
import { getAccessToken } from '@/app/api';
import { YoutubeIcon } from '@/shared/ui/YoutubeIcon';
import { LogoLoader } from '@ui/LogoLoader';

const FOCUS_RING = 'focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 focus:ring-offset-zinc-950 focus:outline-none';

/**
 * Where "previous line" lands: the start of the current line, or of the one before it
 * when playback is within half a second of that start (so a second press keeps going back).
 */
function previousLineTime(times: number[], now: number): number {
  let target = 0;
  for (const time of times) {
    if (time < now - 0.5) target = time;
    else break;
  }
  return target;
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

export const ChangeMediaPopoverContent = memo(function ChangeMediaPopoverContent({
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
        <Icon name="folder_open" size={16} className="shrink-0 text-zinc-500" />
        {t('player.dropAudio')}
        <input id={fileInputId} type="file" accept="audio/*" onChange={onFileChange} className="hidden" />
      </label>
      <div className="flex gap-1.5 px-1 py-1">
        <div className="relative flex-1">
          {!ytUrl && <Icon name="link" size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />}
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
          {cdnLoading ? <LogoLoader size={12} /> : t('player.load')}
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
                  : <Icon name="cloud" size={12} className="text-blue-400" />}
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
          <Icon name="delete" size={16} className="shrink-0" />
          {t('player.remove')}
        </button>
      </div>
    </div>
  );
});

interface AudioLoadErrorProps {
  fileInputId: string;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRetry: () => void;
  canReplace: boolean;
}

/** Shown in place of the transport when the audio element could not load its source. */
function AudioLoadError({ fileInputId, onFileChange, onRetry, canReplace }: AudioLoadErrorProps) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-4 gap-y-3 w-full rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3.5 text-left animate-fade-in">
      <span className="grid place-items-center size-11 shrink-0 rounded-full bg-destructive/15 text-destructive">
        <Icon name="error" size={22} />
      </span>
      <div className="flex-[1_1_240px] min-w-0">
        <h3 className="text-base font-bold leading-snug text-foreground">{t('player.audioLoadFailedTitle')}</h3>
        <p className="mt-0.5 text-[13px] leading-snug text-foreground/65">
          {t(canReplace ? 'player.audioLoadFailedDesc' : 'player.audioLoadFailedDescViewer')}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canReplace && (
          <label
            htmlFor={fileInputId}
            className="inline-flex items-center h-11 px-[18px] rounded-[10px] bg-primary hover:bg-primary-dim text-zinc-950 text-sm font-bold cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-primary/50"
          >
            {t('player.reupload')}
            <input id={fileInputId} type="file" accept="audio/*" onChange={onFileChange} className="sr-only" />
          </label>
        )}
        <Button
          variant="outline"
          onClick={onRetry}
          className="h-11 lg:h-11 px-[18px] lg:px-[18px] rounded-[10px] bg-transparent border-zinc-700 text-sm lg:text-sm font-semibold text-foreground"
        >
          {t('player.retry')}
        </Button>
      </div>
    </div>
  );
}

export default function PlayerControls({ variant, youtubeAudioUrl }: { variant: 'editor' | 'header' | 'mobile', youtubeAudioUrl?: string | null }) {
  const {
    source, isPlaying, isSeeking, currentTime, duration, playbackSpeed,
    hasMedia, loopA, loopB, mediaTitle, songName,
    local, yt, mediaUploads, cdnLoading,
    syncMode, viewerMode,
    MIN_SPEED, MAX_SPEED, speedPresets: SPEED_PRESETS,
    lines, playbackPosition, audioRef,
    detectedUrlType, mediaPopoverProps, fetchUploads,
    togglePlay, seek, applySpeed, setLoop, handleLoopChange, clearLoop,
    handleUrlLoad, handleSelectUpload,
    failedAudioUrl, retryAudio,
  } = usePlayer();
  const audioLoadFailed = source === 'local' && failedAudioUrl != null && failedAudioUrl === local.localUrl;

  const { t } = useTranslation();
  const { dt } = useDynamicTranslation();
  const { settings } = useSettings();
  const seekStep = settings.playback?.seekTime ?? 5;
  // Start times of the timed lyric lines, in order: what the previous/next buttons step through.
  const timedLineTimes = useMemo(
    () => (lines ?? [])
      .filter((l) => l.type !== 'section' && l.timestamp != null)
      .map((l) => l.timestamp as number)
      .sort((a, b) => a - b),
    [lines],
  );

  // ── Header compact variant ──────────────────────────────────────────────────
  if (variant === 'header') {
    return (
      <div className="flex items-center gap-2 h-8 min-w-0 flex-1 max-w-xl animate-fade-in">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          aria-label={t('shortcuts.playPause')}
          className="size-7 rounded-full bg-primary flex items-center justify-center shrink-0 active:scale-95 transition-all duration-100 shadow-sm shadow-primary/20"
        >
          {isSeeking ? (
            <span
              className="eq-bars text-zinc-950"
              style={{ '--eq-h': '11px', '--eq-w': '2px', '--eq-gap': '1.5px' } as React.CSSProperties}
              aria-hidden
            >
              <i /><i /><i />
            </span>
          ) : isPlaying ? (
            <Icon name="pause" size={12} className="text-zinc-950" />
          ) : (
            <Icon name="play_arrow" size={12} className="text-zinc-950" />
          )}
        </button>

        {/* Song name (falls back to project title) */}
        {(songName || mediaTitle) && (
          <span className="text-xs text-zinc-300 truncate shrink min-w-0 max-w-[140px]">
            {songName || mediaTitle}
          </span>
        )}

        {/* Thin scrubber */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={playbackPosition ?? currentTime}
            aria-label={t('player.seekPlayback')}
            aria-valuenow={Math.round(playbackPosition ?? currentTime)}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="w-full h-1 appearance-none rounded-full outline-none"
            style={{
              background: `linear-gradient(to right, var(--color-primary) ${duration ? ((playbackPosition ?? currentTime) / duration) * 100 : 0}%, rgba(255,255,255,0.1) ${duration ? ((playbackPosition ?? currentTime) / duration) * 100 : 0}%)`,
            }}
          />
        </div>

        {/* Time */}
        <span className="text-[10px] font-mono tabular-nums text-zinc-500 shrink-0">
          {formatTime(playbackPosition ?? currentTime)}<span className="text-zinc-700">/</span>{formatTime(duration)}
        </span>

        {/* Overflow popover: speed + volume + change media */}
        {!viewerMode && (
          <Popover onOpenChange={(open) => { if (open) fetchUploads(); }}>
            <Tip content={t('player.moreActions')}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`size-7 shrink-0 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 ${FOCUS_RING}`}
                >
                  <Icon name="expand_more" size={14} />
                </Button>
              </PopoverTrigger>
            </Tip>
            <PopoverContent className="w-72 p-0 bg-zinc-900 border-zinc-800 shadow-xl" align="end" sideOffset={8}>
              <div className="flex flex-col gap-1 p-2 border-b border-zinc-800/60">
                <div className="flex items-center gap-3 px-1">
                  <span className="text-xs text-zinc-500 w-14 shrink-0">{t('player.speed')}</span>
                  <SpeedControl
                    playbackSpeed={playbackSpeed}
                    applySpeed={applySpeed}
                    MIN_SPEED={MIN_SPEED}
                    MAX_SPEED={MAX_SPEED}
                    SPEED_PRESETS={SPEED_PRESETS}
                  />
                </div>
                <div className="flex items-center gap-3 px-1">
                  <span className="text-xs text-zinc-500 w-14 shrink-0">{t('player.volume')}</span>
                  <VolumeControl />
                </div>
              </div>
              <ChangeMediaPopoverContent fileInputId="change-media-file-header" {...mediaPopoverProps} />
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  }

  return (
    <>
      {/* ─────────────── Desktop full bar content (hidden on mobile) ─────────────── */}
      <div className={`max-lg:hidden animate-fade-in flex flex-col items-center w-full min-w-0 ${variant === 'editor' ? 'overflow-hidden' : 'overflow-visible'}`}>
        {/* Header */}
        {!hasMedia && !viewerMode && (
          <div className="flex flex-row items-center justify-center gap-2 sm:gap-4 mb-2">
            <h2 className="text-xs sm:text-sm font-semibold tracking-widest text-zinc-400 flex items-center gap-2 overflow-hidden pb-0.5 min-w-0">
              <span className="uppercase shrink-0 text-xs sm:text-sm flex items-center gap-1.5"><Icon name="headphones" size={14} />{t('player.title')}</span>
              {mediaTitle && (
                <div className="flex items-center gap-2 px-1.5 py-0.5 rounded text-xs min-w-0">
                  <Icon name="music_note" size={10} className="text-primary shrink-0" />
                  <span className="text-primary normal-case tracking-normal truncate max-w-[300px]">{mediaTitle}</span>
                </div>
              )}
            </h2>
          </div>
        )}

        {/* Loading placeholder while YouTube initialises */}
        {!hasMedia && yt.ytLoading && (
          <div className="flex items-center justify-center gap-3 py-6 animate-fade-in">
            <LogoLoader size={20} />
            <span className="text-sm text-zinc-400">{t('player.loading')}</span>
          </div>
        )}

        {/* Unified media loader — shown when no media is loaded */}
        {!hasMedia && !yt.ytLoading && (
          <div className="animate-fade-in w-full max-w-[1000px] mx-auto flex flex-col items-center justify-center gap-3 relative">
            {/* Says what is missing before offering the ways to fix it (redesign sheet 11).
                Wide layouts only: the phone transport has no room for it. */}
            {!viewerMode && (
              <EmptyState art="song" card={false} title={t('player.emptyTitle')} description={t('player.emptyDesc')} className="hidden lg:flex pb-1" />
            )}
            {!viewerMode && (
              <div className="flex flex-wrap items-center justify-center gap-3 w-full">
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
                  <Icon name="folder_open" size={16} className="text-zinc-400 group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{t('player.dropAudio')}</span>
                  <input id="audio-file-input" type="file" accept="audio/*" onChange={local.handleFileChange} className="hidden" />
                </label>

                <div className="w-px h-6 bg-zinc-800/80 mx-1" />

                {/* URL Input (YouTube/CDN) */}
                <div className="flex items-center gap-2 flex-1 max-w-[450px]">
                  <div className="relative w-full">
                    {!yt.ytUrl && <Icon name="link" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />}
                    <Input
                      value={yt.ytUrl}
                      onChange={(e) => { yt.setYtUrl(e.target.value); yt.setYtError(''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleUrlLoad(); }}
                      placeholder={t('player.pasteUrl')}
                      // lg:pl-8 as well as pl-8: the base Input sets lg:px-2.5, which at that
                      // breakpoint overrides the plain pl-8 and let the link icon sit under the
                      // placeholder text. padding-left beats padding-inline in Tailwind's order.
                      className="pl-8 lg:pl-8 bg-zinc-900/50 border-zinc-700/50 text-sm h-10 rounded-xl shadow-inner w-full"
                    />
                  </div>
                  <Button
                    onClick={handleUrlLoad}
                    disabled={cdnLoading}
                    className="h-10 coarse:h-11 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50 font-medium shrink-0"
                  >
                    {cdnLoading ? <LogoLoader size={16} /> : t('player.load')}
                  </Button>
                </div>

                {getAccessToken() && (
                  <>
                    <div className="w-px h-6 bg-zinc-800/80 mx-1" />
                    <Popover onOpenChange={(open) => { if (open) fetchUploads(); }}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="flex items-center gap-2 h-10 coarse:h-11 px-4 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/60 border border-zinc-700/30 hover:border-zinc-700 transition-all text-zinc-300"
                        >
                          <Icon name="cloud" size={16} className="text-blue-400/80" />
                          <span className="text-sm font-medium">{t('uploads.title')}</span>
                          <Icon name="expand_more" size={14} className="opacity-50 ml-1" />
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
                                    : <Icon name="cloud" size={14} className="text-blue-400" />}
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
              </div>
            )}

            {/* Embed-blocked banner — inline within player bar */}
            {yt.ytEmbedBlocked && (
              <div className="w-full max-w-[1000px] mx-auto flex items-start gap-3 bg-orange-950/40 border border-orange-500/20 rounded-xl px-4 py-2.5 animate-fade-in">
                <Icon name="warning" size={14} className="text-orange-400 shrink-0 mt-0.5" />
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
              <div className="w-full max-w-[1000px] mx-auto bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-3 py-1.5 rounded-lg text-center">
                {yt.ytError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shared Audio waveform (Local or YouTube ASR) */}
      <div className="w-full flex flex-col items-center min-w-0 z-10">
        {(() => {
          const canShowWaveform = Boolean((source === 'local' && local.localUrl) || (source === 'youtube' && youtubeAudioUrl));
          const isShowingWaveform = Boolean(settings.playback?.showWaveform && canShowWaveform);
          return (
            <>
              {canShowWaveform && (
                <div className="animate-fade-in w-full max-w-[1200px] mx-auto">
                  <Suspense fallback={null}>
                    <WaveformDisplay
                      showWaveform={settings.playback?.showWaveform}
                      waveformSnap={settings.playback?.waveformSnap}
                      audioRef={audioRef}
                      localUrl={source === 'youtube' ? youtubeAudioUrl : local.localUrl}
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

              {!isShowingWaveform && hasMedia && (
                <div className="animate-fade-in w-full max-w-[1200px] mx-auto px-4">
                  <PlaybackProgress
                    lines={lines}
                    playbackPosition={playbackPosition ?? 0}
                    duration={duration}
                    onSeek={seek}
                    loopA={loopA}
                    loopB={loopB}
                    onLoopChange={handleLoopChange}
                  />
                </div>
              )}
            </>
          );
        })()}
      </div>

      <div className={`max-lg:hidden animate-fade-in flex flex-col items-center w-full min-w-0 ${variant === 'editor' ? 'overflow-hidden' : 'overflow-visible'}`}>
        {hasMedia && audioLoadFailed && (
          <div className="w-full max-w-[1200px] mx-auto pb-2">
            <AudioLoadError fileInputId="audio-reupload-desktop" onFileChange={local.handleFileChange} onRetry={retryAudio} canReplace={!viewerMode} />
          </div>
        )}
        {hasMedia && !audioLoadFailed && (
          <div className="animate-fade-in w-full max-w-[1200px] mx-auto">
            {/* Wide layout: time and jump on the left, transport centred, speed / loop / volume
                on the right. The jump group sits on the left (the mock has it on the right)
                because with the media button the right side no longer fits beside a centred
                play button. */}
            <div className={`${variant === 'editor' ? 'xl:grid hidden' : 'grid'} grid-cols-[1fr_auto_1fr] items-center gap-4 w-full min-h-[60px] pb-1.5 lg:pb-2`}>

              <div className="min-w-0 flex items-center gap-4">
                <div className="font-mono font-medium tabular-nums text-base whitespace-nowrap">
                  <span className="text-foreground">{formatTime(currentTime)}</span>
                  <span className="text-subtle"> / {formatTime(duration)}</span>
                </div>
                <div role="group" aria-label={t('player.jump')} className="flex gap-0.5 rounded-[var(--radius-control)] bg-card p-[3px] inset-ring inset-ring-hl">
                  {[-seekStep, -0.1, 0.1, seekStep].map((delta) => (
                    <Button
                      key={delta}
                      variant="ghost"
                      size={null}
                      onClick={() => seek(Math.min(duration, Math.max(0, currentTime + delta)))}
                      aria-label={t(delta < 0 ? 'player.seekBack' : 'player.seekForward', { seconds: Math.abs(delta) })}
                      className="h-[38px] rounded-[9px] px-2.5 font-mono text-[13px] font-medium text-subtle hover:bg-raised hover:text-foreground"
                    >
                      {delta < 0 ? '−' : '+'}{Math.abs(delta)}{Math.abs(delta) >= 1 ? 's' : ''}
                    </Button>
                  ))}
                </div>
              </div>

              {/* ── Transport: the buttons either side of play step by lyric line; jumping by
                  time is the group beside the clock (redesign sheet 14). ── */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Tip content={t('projectView.previousLine')}>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!timedLineTimes.length}
                    onClick={() => seek(previousLineTime(timedLineTimes, currentTime))}
                    aria-label={t('projectView.previousLine')}
                    className="size-11 lg:size-11"
                  >
                    <Icon name="skip_previous" size={20} />
                  </Button>
                </Tip>

                <Tip content={t('shortcuts.playPause')}>
                  <Button
                    id="play-pause-btn"
                    size="icon"
                    onClick={togglePlay}
                    aria-label={t('shortcuts.playPause')}
                    aria-pressed={isPlaying}
                    className="relative size-[60px] lg:size-[60px] rounded-full shadow-none active:scale-[.94] flex-shrink-0"
                  >
                    {/* Beat ring: a pulse off the button while audio is playing (sheet 02). */}
                    {isPlaying && <span aria-hidden className="beat-ring" />}
                    {isSeeking ? (
                      <span
                        className="eq-bars text-current"
                        style={{ '--eq-h': '20px', '--eq-w': '3.5px', '--eq-gap': '3px' } as React.CSSProperties}
                        aria-hidden
                      >
                        <i /><i /><i />
                      </span>
                    ) : (
                      <Icon name={isPlaying ? 'pause' : 'play_arrow'} size={26} filled />
                    )}
                  </Button>
                </Tip>

                <Tip content={t('projectView.nextLine')}>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!timedLineTimes.some((time) => time > currentTime)}
                    onClick={() => { const next = timedLineTimes.find((time) => time > currentTime); if (next != null) seek(next); }}
                    aria-label={t('projectView.nextLine')}
                    className="size-11 lg:size-11"
                  >
                    <Icon name="skip_next" size={20} />
                  </Button>
                </Tip>
              </div>

              {/* ── Speed, loop, volume, media ── */}
              <div className="min-w-0 flex items-center justify-end gap-2.5">
                <SpeedControl
                  playbackSpeed={playbackSpeed}
                  applySpeed={applySpeed}
                  MIN_SPEED={MIN_SPEED}
                  MAX_SPEED={MAX_SPEED}
                  SPEED_PRESETS={SPEED_PRESETS}
                />

                {/* A-B Loop: repeat the active line, or clear an active loop */}
                {!viewerMode && (
                  <Tip content={loopA != null && loopB != null ? t('player.clearLoop') : t('player.setLoop')}>
                    <Button
                      // Ghost icon button: aria-pressed gives it the soft iris "on" state.
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (loopA != null && loopB != null) {
                          clearLoop();
                          return;
                        }
                        if (!lines?.length) return;
                        let activeIdx = -1;
                        for (let i = 0; i < lines.length; i++) {
                          if (lines[i].timestamp != null && lines[i].timestamp! <= currentTime) activeIdx = i;
                        }
                        if (activeIdx < 0) return;
                        const a = lines[activeIdx].timestamp ?? null;
                        let b: number | null = lines[activeIdx].endTime ?? null;
                        if (b == null) {
                          b = duration;
                          for (let i = activeIdx + 1; i < lines.length; i++) {
                            if (lines[i].timestamp != null) { b = lines[i].timestamp ?? null; break; }
                          }
                        }
                        if (a != null && b != null) setLoop({ a, b });
                      }}
                      aria-pressed={loopA != null && loopB != null}
                      aria-label={loopA != null && loopB != null ? t('player.clearLoop') : t('player.setLoop')}
                      className="size-11 lg:size-11 shrink-0"
                    >
                      <Icon name="repeat" size={20} />
                    </Button>
                  </Tip>
                )}

                <VolumeControl />

                {/* Change Media */}
                {hasMedia && !viewerMode && (
                  <Popover onOpenChange={(open) => { if (open) fetchUploads(); }}>
                    <Tip content={t('player.changeSong')}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size={null}
                          aria-label={t('player.changeSong')}
                          className="h-11 shrink-0 gap-2 rounded-[var(--radius-control)] px-3 text-[13px] font-medium text-subtle inset-ring inset-ring-hl hover:bg-raised hover:text-foreground"
                        >
                          <Icon name="swap_horiz" size={18} />
                          <span className="max-2xl:sr-only">{t('player.changeSong')}</span>
                        </Button>
                      </PopoverTrigger>
                    </Tip>
                    <PopoverContent className="w-72 p-0 bg-zinc-900 border-zinc-800 shadow-xl" align="end" sideOffset={8}>
                      <ChangeMediaPopoverContent fileInputId="change-media-file-desktop" {...mediaPopoverProps} />
                    </PopoverContent>
                  </Popover>
                )}

              </div>
            </div>

            {/* Narrow editor layout (<480px container): inline flex, no absolute positioning */}
            {variant === 'editor' && (
              <div className="xl:hidden flex flex-col gap-1 w-full min-w-0 pb-1.5 transition-all">
                {/* Row 1: play + scrubber + time + overflow */}
                <div className="flex items-center gap-2 w-full min-w-0">
                  {/* Play/Pause */}
                  <Tip content={isPlaying ? t('shortcuts.playPause') : t('shortcuts.playPause')}>
                    <Button
                      id="play-pause-btn-narrow"
                      size="icon"
                      onClick={togglePlay}
                      aria-label={isPlaying ? t('shortcuts.playPause') : t('shortcuts.playPause')}
                      className="rounded-full bg-primary hover:bg-primary-dim text-zinc-950 hover:scale-105 active:scale-95 glow-primary shrink-0 transition-all duration-100"
                    >
                      {isPlaying ? (
                        <Icon name="pause" size={16} />
                      ) : (
                        <Icon name="play_arrow" size={16} />
                      )}
                    </Button>
                  </Tip>

                  {/* Scrubber */}
                  <div className="flex-1 min-w-0">
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      step={0.1}
                      value={playbackPosition ?? currentTime}
                      aria-label={t('player.seekPlayback')}
                      aria-valuenow={Math.round(playbackPosition ?? currentTime)}
                      aria-valuemin={0}
                      aria-valuemax={Math.round(duration)}
                      onChange={(e) => seek(parseFloat(e.target.value))}
                      className="w-full h-1 appearance-none rounded-full outline-none"
                      style={{
                        background: `linear-gradient(to right, var(--color-primary) ${duration ? ((playbackPosition ?? currentTime) / duration) * 100 : 0}%, rgba(255,255,255,0.1) ${duration ? ((playbackPosition ?? currentTime) / duration) * 100 : 0}%)`,
                      }}
                    />
                  </div>

                  {/* Time */}
                  <span className="text-[10px] font-mono tabular-nums text-zinc-500 shrink-0">
                    {formatTime(playbackPosition ?? currentTime)}<span className="text-zinc-700">/</span>{formatTime(duration)}
                  </span>

                  {/* Overflow popover: speed + volume + change media + loop */}
                  <Popover onOpenChange={(open) => { if (open) fetchUploads(); }}>
                    <Tip content={t('player.moreActions')}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`size-7 shrink-0 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 ${FOCUS_RING}`}
                        >
                          <Icon name="expand_more" size={14} />
                        </Button>
                      </PopoverTrigger>
                    </Tip>
                    <PopoverContent className="w-72 p-0 bg-zinc-900 border-zinc-800 shadow-xl" align="end" sideOffset={8}>
                      <div className="flex flex-col gap-1 p-2 border-b border-zinc-800/60">
                        <div className="flex items-center gap-3 px-1">
                          <span className="text-xs text-zinc-500 w-14 shrink-0">{t('player.speed')}</span>
                          <SpeedControl
                            playbackSpeed={playbackSpeed}
                            applySpeed={applySpeed}
                            MIN_SPEED={MIN_SPEED}
                            MAX_SPEED={MAX_SPEED}
                            SPEED_PRESETS={SPEED_PRESETS}
                          />
                        </div>
                        <div className="flex items-center gap-3 px-1">
                          <span className="text-xs text-zinc-500 w-14 shrink-0">{t('player.volume')}</span>
                          <VolumeControl />
                        </div>
                      </div>
                      {!viewerMode && (
                        <ChangeMediaPopoverContent fileInputId="change-media-file-editor-narrow" {...mediaPopoverProps} />
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Row 2 (≥360px only): nudge buttons + secondary actions */}
                <div className="flex items-center justify-between gap-1 px-1 min-w-0">
                  <div className="flex items-center gap-0.5">
                    <Tip content="-0.1s">
                      <Button variant="ghost" size="icon" onClick={() => seek(currentTime - 0.1)} className={`text-zinc-500 hover:text-zinc-200 ${FOCUS_RING}`}>
                        <Icon name="chevron_left" size={16} />
                      </Button>
                    </Tip>
                    <Tip content={`-${settings.playback?.seekTime ?? 5}s`}>
                      <Button variant="ghost" size="icon" onClick={() => seek(Math.max(0, currentTime - (settings.playback?.seekTime ?? 5)))} className={`text-zinc-500 hover:text-zinc-200 ${FOCUS_RING}`}>
                        <Icon name="skip_previous" size={16} />
                      </Button>
                    </Tip>
                    <Tip content={`+${settings.playback?.seekTime ?? 5}s`}>
                      <Button variant="ghost" size="icon" onClick={() => seek(Math.min(duration, currentTime + (settings.playback?.seekTime ?? 5)))} className={`text-zinc-500 hover:text-zinc-200 ${FOCUS_RING}`}>
                        <Icon name="skip_next" size={16} />
                      </Button>
                    </Tip>
                    <Tip content="+0.1s">
                      <Button variant="ghost" size="icon" onClick={() => seek(currentTime + 0.1)} className={`text-zinc-500 hover:text-zinc-200 ${FOCUS_RING}`}>
                        <Icon name="chevron_right" size={16} />
                      </Button>
                    </Tip>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─────────────── Compact mobile bar (hidden on desktop) ─────────────── */}
      <div className="lg:hidden w-full overflow-hidden">
        {/* No media */}
        {!hasMedia && (
          <div className="flex flex-col gap-1 px-3 py-2 relative">
            {yt.ytLoading ? (
              <div className="flex items-center gap-3 flex-1 py-2">
                <LogoLoader size={20} />
                <span className="text-sm text-zinc-400">{t('player.loading')}</span>
              </div>
            ) : (
              <>
                {!viewerMode && (
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor="audio-file-compact"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 text-sm font-medium text-zinc-300 cursor-pointer active:scale-95 transition-all duration-100 shrink-0"
                    >
                      <Icon name="folder_open" size={16} />
                      {t('player.dropAudio')}
                      <input id="audio-file-compact" type="file" accept="audio/*" onChange={local.handleFileChange} className="hidden" />
                    </label>
                    <div className="flex-1 flex gap-2 min-w-0 basis-56">
                      <div className="relative flex-1 min-w-0">
                        {detectedUrlType === 'cdn' ? (
                          <Icon name="cloud" size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-400/80 pointer-events-none" />
                        ) : detectedUrlType === 'youtube' ? (
                          <svg className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-red-500/70 pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                          </svg>
                        ) : (
                          <Icon name="link" size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                        )}
                        <Input
                          type="text"
                          value={yt.ytUrl}
                          onChange={(e) => { yt.setYtUrl(e.target.value); yt.setYtError(''); }}
                          onKeyDown={(e) => e.key === 'Enter' && handleUrlLoad()}
                          placeholder={t('player.pasteCdnUrl')}
                          className="flex-1 h-9 pl-6 bg-zinc-800/60 text-zinc-100 placeholder-zinc-500 border-zinc-700 text-xs"
                        />
                      </div>
                      <Button
                        onClick={handleUrlLoad}
                        disabled={cdnLoading}
                        className={`px-3 h-9 coarse:h-11 text-white text-xs font-medium rounded-lg shrink-0 ${detectedUrlType === 'cdn' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-red-600 hover:bg-red-500'
                          }`}
                      >
                        {cdnLoading ? '…' : t('player.load')}
                      </Button>
                    </div>
                  </div>
                )}
                {getAccessToken() && (
                  <Popover onOpenChange={(open) => { if (open) fetchUploads(); }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between bg-zinc-800/50 border-zinc-700/60 hover:bg-zinc-700/60 text-zinc-300 text-xs h-8"
                      >
                        <span className="flex items-center gap-1.5">
                          <Icon name="cloud" size={12} className="text-zinc-500" />
                          {t('uploads.selectFromUploads')}
                        </span>
                        <Icon name="expand_more" size={12} className="text-zinc-500" />
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
                                : <Icon name="cloud" size={14} className="text-blue-400 shrink-0" />}
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
                {/* Embed-blocked banner — inline */}
                {yt.ytEmbedBlocked && (
                  <div className="flex items-start gap-2 bg-orange-950/40 border border-orange-500/20 rounded-xl px-3 py-2.5 animate-fade-in">
                    <Icon name="warning" size={14} className="text-orange-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-100">{t('player.embeddingDisabled')}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{t('player.embeddingBlockedDesc')}</p>
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
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2 py-1 rounded-lg text-center w-full">
                    {yt.ytError}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {hasMedia && audioLoadFailed && (
          <div className="p-3">
            <AudioLoadError fileInputId="audio-reupload-mobile" onFileChange={local.handleFileChange} onRetry={retryAudio} canReplace={!viewerMode} />
          </div>
        )}

        {/* Has media: seekbar row + action row */}
        {hasMedia && !audioLoadFailed && (
          <>
            <div className="flex flex-col gap-3 p-4 w-full">
              {/* Top Row: Play/Pause, Seeker, Speed */}
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={togglePlay}
                  aria-label={t('shortcuts.playPause')}
                  className="size-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 active:scale-95 transition-all duration-100 shadow-lg shadow-primary/20"
                >
                  {isSeeking ? (
                    <span
                      className="eq-bars text-zinc-950"
                      style={{ '--eq-h': '16px', '--eq-w': '2.5px', '--eq-gap': '2px' } as React.CSSProperties}
                      aria-hidden
                    >
                      <i /><i /><i />
                    </span>
                  ) : isPlaying ? (
                    <Icon name="pause" size={16} className="text-zinc-950" />
                  ) : (
                    <Icon name="play_arrow" size={16} className="text-zinc-950" />
                  )}
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
                      aria-label={t('player.seekPlayback')} aria-valuenow={Math.round(currentTime)} aria-valuemin={0} aria-valuemax={Math.round(duration)}
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
                  <Icon name="skip_previous" size={24} />
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
                    <Icon name="repeat" size={24} />
                    <span className="text-[9px] font-bold mt-1 opacity-60 uppercase tracking-tight">{t('player.loop')}</span>
                  </button>
                )}

                <div className="size-14 flex items-center justify-center shrink-0">
                  <VolumeControl />
                </div>

                <button
                  onClick={() => seek(Math.min(duration, currentTime + (settings.playback?.seekTime ?? 5)))}
                  className="flex flex-col items-center justify-center size-14 rounded-2xl text-zinc-400 active:text-zinc-100 active:bg-zinc-800 active:scale-95 transition-all duration-100 shrink-0"
                >
                  <Icon name="skip_next" size={24} />
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
                          <Icon name="swap_horiz" size={24} />
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
