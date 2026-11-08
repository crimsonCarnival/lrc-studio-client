import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { segmentAt, type SectionSegment } from './section-segments';

const KEY_STEP = 5;

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

type SectionStringProps = {
  segments: SectionSegment[];
  currentTime: number;
  duration: number;
  ready: boolean;
  onSeek: (time: number) => void;
};

/**
 * Phone progress bar: one thin line cut into a segment per song section, with the
 * elapsed time, the current section's name and the total on the single row below it.
 * The 44px touch target is an overlay on the spare space around the line, so it adds
 * no height. There are no transitions, so reduced-motion needs no special case.
 */
export function SectionString({ segments, currentTime, duration, ready, onSeek }: SectionStringProps) {
  const { t } = useTranslation();
  const stripRef = useRef<HTMLDivElement>(null);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const enabled = ready && duration > 0;

  const timeAt = (clientX: number) => {
    const rect = stripRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration;
  };

  const handleDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const time = timeAt(e.clientX);
    setDragTime(time);
    onSeek(time);
  };
  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragTime == null) return;
    const time = timeAt(e.clientX);
    setDragTime(time);
    onSeek(time);
  };
  const endDrag = () => setDragTime(null);
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const keys: Record<string, number> = {
      ArrowRight: Math.min(duration, currentTime + KEY_STEP),
      ArrowUp: Math.min(duration, currentTime + KEY_STEP),
      ArrowLeft: Math.max(0, currentTime - KEY_STEP),
      ArrowDown: Math.max(0, currentTime - KEY_STEP),
      Home: 0,
      End: duration,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    onSeek(keys[e.key]);
  };

  const current = segmentAt(segments, currentTime);
  const fraction = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
  const currentLabel = current?.label ?? '';

  return (
    <div className="lg:hidden">
      <div className="relative">
        <div
          ref={stripRef}
          role="slider"
          tabIndex={enabled ? 0 : -1}
          aria-label={t('player.seekPlayback')}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          aria-valuetext={`${currentLabel ? `${currentLabel}, ` : ''}${clock(currentTime)} / ${clock(duration)}`}
          aria-disabled={!enabled}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={handleKeyDown}
          style={{ touchAction: 'none' }}
          className="relative flex h-1.5 items-center gap-[3px] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 before:absolute before:inset-x-0 before:-inset-y-[19px] before:content-['']"
        >
          {segments.length === 0 ? (
            <span className="block h-1 flex-1 rounded-pill bg-muted" />
          ) : (
            segments.map((seg, i) => {
              const span = seg.end - seg.start;
              const filled = span > 0 ? Math.max(0, Math.min(1, (currentTime - seg.start) / span)) : 0;
              const isCurrent = seg === current;
              return (
                <span
                  key={i}
                  data-segment=""
                  className={`relative block min-w-0 basis-0 overflow-hidden rounded-pill bg-muted ${isCurrent ? 'h-1.5' : 'h-1'}`}
                  style={{ flexGrow: span }}
                >
                  <span className="block h-full bg-primary" style={{ width: `${filled * 100}%` }} />
                </span>
              );
            })
          )}
          {enabled && (
            <span
              aria-hidden
              data-thumb=""
              className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-sm"
              style={{ left: `${fraction * 100}%` }}
            />
          )}
        </div>
        {dragTime != null && (
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded-pill border border-border bg-card px-2 py-0.5 font-mono text-[11px] tabular-nums text-foreground"
            style={{ left: `${(dragTime / duration) * 100}%` }}
          >
            {clock(dragTime)}
          </span>
        )}
      </div>
      <div className="mt-1 grid grid-cols-[auto_1fr_auto] items-center gap-2 font-mono text-[11px] leading-4 tabular-nums text-muted-foreground">
        <span>{clock(currentTime)}</span>
        <span className="truncate text-center text-foreground">{currentLabel}</span>
        <span>{clock(duration)}</span>
      </div>
    </div>
  );
}
