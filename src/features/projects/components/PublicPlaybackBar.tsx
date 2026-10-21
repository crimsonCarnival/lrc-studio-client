import { lazy, Suspense, useMemo, useRef } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayer } from '@features/player/PlayerContext';
import SpeedControl from '@features/player/components/SpeedControl';
import VolumeControl from '@features/player/components/VolumeControl';
import { useSettings } from '@/features/settings/useSettings';
import { Icon } from '@/shared/ui/Icon';
import { LogoLoader } from '@ui/LogoLoader';
import type { EditorLine } from '@/features/editor/services/editor.service';

const WaveformDisplay = lazy(() => import('@features/player/components/WaveformDisplay'));

interface Segment {
  start: number;
  end: number;
  label: string | null;
}

// One segment per section, sized by how long the section lasts. A section
// starts at its marker's own timestamp, or at its first timed line. Sections
// that cannot be placed (no timing, or out of order) are folded into the one
// before, and an unsectioned or unsynced song is a single segment.
function buildSegments(lines: EditorLine[], duration: number): Segment[] {
  if (!(duration > 0)) return [{ start: 0, end: 0, label: null }];

  const starts: { start: number; label: string | null }[] = [];
  const push = (start: number, label: string | null) => {
    const last = starts[starts.length - 1];
    if (start < duration && (!last || start > last.start)) starts.push({ start, label });
  };
  let pending: { label: string | null } | null = null;
  for (const line of lines) {
    if (line.type === 'section') {
      pending = { label: line.label || null };
      if (line.timestamp != null) {
        push(line.timestamp, pending.label);
        pending = null;
      }
    } else if (pending && line.timestamp != null && line.adLibOf == null) {
      push(line.timestamp, pending.label);
      pending = null;
    }
  }

  if (starts.length === 0) return [{ start: 0, end: duration, label: null }];
  // Anything before the first section is its own unnamed segment, unless it is
  // too short to be more than the song's lead-in.
  if (starts[0].start > 1) starts.unshift({ start: 0, label: null });
  else starts[0].start = 0;

  return starts.map((s, i) => ({ ...s, end: starts[i + 1]?.start ?? duration }));
}

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const TRANSPORT_BTN = 'inline-grid place-items-center size-12 lg:size-11 rounded-full text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';
const NUDGE_BTN = 'h-9 min-w-9 coarse:h-11 coarse:min-w-11 px-2 rounded-lg border border-border font-mono text-xs tabular-nums text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

interface PublicPlaybackBarProps {
  lines: EditorLine[];
  /** The project has media attached, whether or not it has finished loading. */
  hasInitialMedia: boolean;
  /** Omit both to hide the full-lyrics toggle. */
  fullLyrics?: boolean;
  onToggleFullLyrics?: () => void;
  /** In-flow at every width; without it the bar pins to the viewport below lg. */
  docked?: boolean;
  /** Only time, line stepping, play and speed (the editor preview's footer). */
  minimal?: boolean;
  /** Phone-only actions flanking the transport (fork / share in the mock). */
  startSlot?: ReactNode;
  endSlot?: ReactNode;
  children?: ReactNode;
}

export default function PublicPlaybackBar({
  lines,
  hasInitialMedia,
  fullLyrics = false,
  onToggleFullLyrics,
  docked = false,
  minimal = false,
  startSlot,
  endSlot,
  children,
}: PublicPlaybackBarProps) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const {
    source, isPlaying, currentTime, duration, playbackSpeed, hasMedia, isSeeking,
    loopA, loopB, local, yt, audioRef,
    MIN_SPEED, MAX_SPEED, speedPresets,
    togglePlay, seek, applySpeed, handleLoopChange,
  } = usePlayer();

  const barRef = useRef<HTMLDivElement>(null);
  const segments = useMemo(() => buildSegments(lines, duration), [lines, duration]);
  const lineStarts = useMemo(
    () => lines
      .filter((l) => l.type !== 'section' && l.timestamp != null && l.adLibOf == null)
      .map((l) => l.timestamp as number),
    [lines],
  );

  const ready = !!hasMedia;
  const seekTime: number = settings.playback?.seekTime ?? 5;
  const showWaveform = Boolean(settings.playback?.showWaveform && source === 'local' && local.localUrl);
  const hasLoop = loopA != null && loopB != null && duration > 0;

  const timeAt = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration;
  };

  const handleBarPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!ready || !duration) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    seek(timeAt(e.clientX));
  };
  const handleBarPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) seek(timeAt(e.clientX));
  };
  const handleBarKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') seek(Math.min(duration, currentTime + 5));
    else if (e.key === 'ArrowLeft') seek(Math.max(0, currentTime - 5));
  };

  // A-B loop handles stay draggable, as on the bar this one replaces.
  const handleLoopPointerDown = (e: PointerEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleLoopPointerMove = (which: 'a' | 'b') => (e: PointerEvent<HTMLSpanElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId) || loopA == null || loopB == null) return;
    const time = timeAt(e.clientX);
    if (which === 'a') handleLoopChange(Math.min(time, loopB - 0.1), loopB);
    else handleLoopChange(loopA, Math.max(time, loopA + 0.1));
  };

  const goToPreviousLine = () => {
    let current = -1;
    for (let i = 0; i < lineStarts.length && lineStarts[i] <= currentTime; i++) current = i;
    if (current >= 0) seek(lineStarts[Math.max(0, current - 1)]);
  };
  const goToNextLine = () => {
    const next = lineStarts.find((start) => start > currentTime);
    if (next != null) seek(next);
  };

  if (!hasMedia && !hasInitialMedia) {
    return (
      <footer className="flex-shrink-0 w-full border-t border-border bg-background px-4 lg:px-8 py-4">
        <p className="text-xs text-center text-muted-foreground">{t('projectView.noAudio')}</p>
        {children}
      </footer>
    );
  }

  const hasLabels = segments.some((s) => s.label);
  const canStepLines = ready && lineStarts.length > 0;

  return (
    <footer
      // Below lg the document scrolls as one column (the shell only clamps to
      // the viewport from lg up), so the bar is pinned to the viewport there;
      // the page carries matching bottom padding.
      className={`flex-shrink-0 w-full border-t border-border bg-background px-4 pt-3 pb-5 lg:px-8 lg:pt-3.5 flex flex-col gap-2.5 ${docked ? '' : 'max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30'}`}
    >
      {!hasMedia && yt.ytLoading && (
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground" role="status">
          <LogoLoader size={14} />
          {t('player.loading')}
        </p>
      )}
      {yt.ytEmbedBlocked && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5" role="alert">
          <Icon name="warning" size={14} className="text-warning shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">{t('player.embeddingDisabled')}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('player.embeddingBlockedDesc')}</p>
          </div>
          <a
            href={yt.ytUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs font-semibold text-warning hover:underline whitespace-nowrap"
          >
            {t('player.watchOnYoutube')} ↗
          </a>
        </div>
      )}
      {yt.ytError && !yt.ytEmbedBlocked && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-center text-xs text-destructive" role="alert">
          {yt.ytError}
        </p>
      )}

      {showWaveform && (
        <Suspense fallback={null}>
          <WaveformDisplay
            showWaveform={settings.playback?.showWaveform}
            waveformSnap={settings.playback?.waveformSnap}
            audioRef={audioRef}
            localUrl={local.localUrl}
            lines={lines}
            playbackPosition={currentTime}
            duration={duration}
            onSeek={seek}
            loopA={loopA}
            loopB={loopB}
            onLoopChange={handleLoopChange}
          />
        </Suspense>
      )}

      {/* Progress: one segment per section. The padding is hit area only. */}
      <div
        ref={barRef}
        role="slider"
        tabIndex={ready ? 0 : -1}
        aria-label={t('player.seekPlayback')}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${clock(currentTime)} / ${clock(duration)}`}
        aria-disabled={!ready}
        onPointerDown={handleBarPointerDown}
        onPointerMove={handleBarPointerMove}
        onKeyDown={handleBarKeyDown}
        className={`relative -my-2 py-2 coarse:-my-[19px] coarse:py-[19px] touch-none rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${ready ? 'cursor-pointer' : ''}`}
      >
        <div className="flex gap-[3px] lg:gap-1 h-[5px] lg:h-1.5">
          {segments.map((seg, i) => {
            const span = seg.end - seg.start;
            const filled = span > 0 ? Math.max(0, Math.min(1, (currentTime - seg.start) / span)) : 0;
            return (
              <span
                key={i}
                className="basis-0 min-w-0 h-full rounded-full bg-zinc-700 overflow-hidden"
                style={{ flexGrow: span || 1 }}
              >
                <span className="block h-full bg-primary" style={{ width: `${filled * 100}%` }} />
              </span>
            );
          })}
        </div>
        {hasLoop && (
          <>
            <span
              aria-hidden
              className="absolute top-1 bottom-1 rounded-sm bg-accent-purple/25 border-x border-accent-purple/60 pointer-events-none"
              style={{ left: `${(loopA / duration) * 100}%`, width: `${((loopB - loopA) / duration) * 100}%` }}
            />
            {(['a', 'b'] as const).map((which) => (
              <span
                key={which}
                role="presentation"
                onPointerDown={handleLoopPointerDown}
                onPointerMove={handleLoopPointerMove(which)}
                className="absolute inset-y-0 w-4 coarse:w-11 -translate-x-1/2 grid place-items-center cursor-ew-resize touch-none"
                style={{ left: `${((which === 'a' ? loopA : loopB) / duration) * 100}%` }}
              >
                <span className="w-1.5 h-4 rounded-full bg-accent-purple" />
              </span>
            ))}
          </>
        )}
      </div>

      {hasLabels && (
        <div className="max-lg:hidden flex gap-1" aria-hidden>
          {segments.map((seg, i) => (
            <span
              key={i}
              className={`basis-0 min-w-0 truncate text-xs ${currentTime >= seg.start && currentTime < seg.end ? 'text-foreground' : 'text-muted-foreground'}`}
              style={{ flexGrow: seg.end - seg.start || 1 }}
            >
              {seg.label}
            </span>
          ))}
        </div>
      )}

      <div className="lg:hidden flex justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
        <span>{clock(currentTime)}</span>
        <span>{clock(duration)}</span>
      </div>

      <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-x-2 gap-y-2.5 lg:grid-cols-[1fr_auto_1fr] lg:gap-x-4">
        <span className="max-lg:hidden font-mono text-sm tabular-nums text-foreground">
          {clock(currentTime)} <span className="text-muted-foreground">/ {clock(duration)}</span>
        </span>
        <div className="lg:hidden">{startSlot}</div>

        <div className="flex items-center justify-center gap-1.5 lg:gap-2">
          <button
            type="button"
            onClick={goToPreviousLine}
            disabled={!canStepLines}
            aria-label={t('projectView.previousLine')}
            className={TRANSPORT_BTN}
          >
            <Icon name="skip_previous" size={22} />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            disabled={!ready}
            aria-label={isSeeking ? t('player.loading') : isPlaying ? t('projectView.pause') : t('projectView.play')}
            className="inline-grid place-items-center size-16 lg:size-14 rounded-full bg-foreground text-background hover:opacity-90 active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
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
          </button>
          <button
            type="button"
            onClick={goToNextLine}
            disabled={!canStepLines}
            aria-label={t('projectView.nextLine')}
            className={TRANSPORT_BTN}
          >
            <Icon name="skip_next" size={22} />
          </button>
        </div>

        <div className="lg:hidden justify-self-end">{endSlot}</div>

        <div className="col-span-3 lg:col-span-1 flex flex-wrap items-center justify-center lg:justify-end gap-2">
          {!minimal && (
            <>
          <button
            type="button"
            onClick={() => seek(Math.max(0, currentTime - seekTime))}
            disabled={!ready}
            aria-label={t('shortcuts.seekBackward', { val: seekTime })}
            className={NUDGE_BTN}
          >
            −{seekTime}s
          </button>
          <button
            type="button"
            onClick={() => seek(Math.max(0, currentTime - 0.1))}
            disabled={!ready}
            aria-label={t('shortcuts.seekBackward', { val: 0.1 })}
            className={`max-lg:hidden ${NUDGE_BTN}`}
          >
            −0.1s
          </button>
          <button
            type="button"
            onClick={() => seek(currentTime + 0.1)}
            disabled={!ready}
            aria-label={t('shortcuts.seekForward', { val: 0.1 })}
            className={`max-lg:hidden ${NUDGE_BTN}`}
          >
            +0.1s
          </button>
          <button
            type="button"
            onClick={() => seek(Math.min(duration, currentTime + seekTime))}
            disabled={!ready}
            aria-label={t('shortcuts.seekForward', { val: seekTime })}
            className={NUDGE_BTN}
          >
            +{seekTime}s
          </button>
            </>
          )}
          <SpeedControl
            playbackSpeed={playbackSpeed}
            applySpeed={applySpeed}
            MIN_SPEED={MIN_SPEED}
            MAX_SPEED={MAX_SPEED}
            SPEED_PRESETS={speedPresets}
          />
          {!minimal && <VolumeControl />}
          {onToggleFullLyrics && (
          <button
            type="button"
            onClick={onToggleFullLyrics}
            aria-pressed={fullLyrics}
            className={`inline-flex items-center justify-center gap-1.5 h-9 coarse:h-11 max-lg:size-11 lg:px-3 rounded-lg border text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${fullLyrics ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border text-foreground hover:bg-muted'}`}
          >
            <Icon name="format_list_bulleted" size={18} className="lg:hidden" />
            <span className="max-lg:sr-only">{t('projectView.fullLyrics')}</span>
          </button>
          )}
        </div>
      </div>

      {children}
    </footer>
  );
}
